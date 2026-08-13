import type { SupabaseClient } from '@supabase/supabase-js';
import { blueprintSchema, type Blueprint, type BlueprintInput, type BlueprintRow } from './types';
import { composeTemplate, deepMerge, getTemplate, type DeepPartial } from './templates';

/**
 * THE BLUEPRINT: generate, validate, version, diff, deploy, roll back.
 *
 * A Factory's configuration is never edited in place. Every change writes the
 * next version, marks the previous one superseded, and keeps the doc that was
 * actually live. That is what makes "what changed, why, and what do we roll
 * back to" answerable at a thousand tenants without anybody's memory, and it is
 * the difference between a product and a pile of settings.
 *
 * VALIDATION IS STRUCTURAL, NOT EDITORIAL. This file answers "is this a
 * well-formed blueprint". Whether it is SAFE to put live (sender connected,
 * claims approved, consent configured, test run passed) is preflight's job, in
 * lib/factory/preflight.ts, and both have to pass before anything sends.
 */

export type ValidateResult =
  | { ok: true; doc: Blueprint }
  | { ok: false; errors: { path: string; message: string }[] };

export function validateBlueprint(input: unknown): ValidateResult {
  const parsed = blueprintSchema.safeParse(input);
  if (parsed.success) return { ok: true, doc: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
  };
}

/**
 * The minimum a blueprint needs to exist at all. Used as the floor under a
 * template so a half-answered Forge still produces a document that validates
 * and can be edited, rather than an error the operator has to decode.
 */
export function emptyBlueprint(businessName: string): BlueprintInput {
  return {
    schema_version: 1,
    business: {
      name: businessName,
      services: [], locations: [], current_lead_sources: [], competitors: [],
      approved_claims: [], prohibited_claims: [],
    },
    offer: { headline: `What ${businessName} sells`, packages: [], incentives: [], ai_may_quote_price: false, ai_may_discount: false },
    icp: [{ label: 'Primary', industries: [], job_titles: [], geographies: [], technology_signals: [], business_signals: [], exclusions: [], audience: 'b2b' }],
    economics: { value_drivers: [] },
    pain: { primary: 'Not captured yet.', trigger_events: [], fears: [], objections: [], alternatives: [] },
    agent: {
      name: 'Assistant', role: 'AI Sales Specialist',
      languages: [], may_discuss: [], must_not_discuss: [], escalation_rules: [], escalation_to: [],
      tools: [], qualification_questions: [], voice_enabled: false,
    },
    campaigns: [{ name: 'Campaign 1', hook: 'Not written yet.', cta: 'Reply if useful.', sequence: [] }],
    value_actions: [],
    modules: [],
    kpis: [],
    integrations: [],
  };
}

/**
 * Build a starting blueprint: template chain first, then whatever the Forge or
 * an operator learned about this specific business layered on top. Template
 * supplies structure, the overlay supplies facts, and facts always win.
 */
export function blueprintFromTemplate(
  templateKey: string,
  overlay: DeepPartial<BlueprintInput>,
  businessName: string,
): ValidateResult {
  const template = getTemplate(templateKey);
  const layers = [
    emptyBlueprint(businessName) as unknown as Record<string, unknown>,
    (template ? composeTemplate(templateKey) : {}) as Record<string, unknown>,
    overlay as Record<string, unknown>,
    { template_key: templateKey, template_version: template?.version ?? null },
  ];
  const merged = layers.reduce((acc, layer) => deepMerge(acc, layer));
  return validateBlueprint(merged);
}

/* ────────────────────────────── versions ───────────────────────────── */

export async function currentBlueprint(
  supabase: SupabaseClient,
  factoryId: string,
): Promise<BlueprintRow | null> {
  const { data } = await supabase
    .from('factory_blueprints')
    .select('*')
    .eq('factory_id', factoryId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BlueprintRow) ?? null;
}

/** The doc that is actually live right now, which is not always the newest one. */
export async function deployedBlueprint(
  supabase: SupabaseClient,
  factoryId: string,
): Promise<BlueprintRow | null> {
  const { data } = await supabase
    .from('factory_blueprints')
    .select('*')
    .eq('factory_id', factoryId)
    .eq('status', 'deployed')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BlueprintRow) ?? null;
}

export async function blueprintHistory(supabase: SupabaseClient, factoryId: string): Promise<BlueprintRow[]> {
  const { data } = await supabase
    .from('factory_blueprints')
    .select('*')
    .eq('factory_id', factoryId)
    .order('version', { ascending: false })
    .limit(50);
  return (data as BlueprintRow[]) ?? [];
}

export type SaveBlueprintInput = {
  tenantId: string;
  factoryId: string;
  doc: Blueprint;
  source: BlueprintRow['source'];
  createdBy: string;
  changeSummary?: string;
};

/**
 * Write the next version.
 *
 * The version number comes from a fresh read rather than a counter held in
 * memory, so two operators saving at once produce two versions rather than one
 * overwriting the other. The unique index on (factory_id, version) is the
 * backstop: a genuine race surfaces as a conflict the caller can retry, which
 * is strictly better than a silently lost edit.
 */
export async function saveBlueprint(
  supabase: SupabaseClient,
  input: SaveBlueprintInput,
): Promise<{ row: BlueprintRow } | { error: string }> {
  const latest = await currentBlueprint(supabase, input.factoryId);
  const version = (latest?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from('factory_blueprints')
    .insert({
      tenant_id: input.tenantId,
      factory_id: input.factoryId,
      version,
      status: 'draft',
      doc: input.doc,
      source: input.source,
      change_summary: input.changeSummary ?? (latest ? summarizeDiff(diffBlueprints(latest.doc, input.doc)) : 'Initial blueprint.'),
      created_by: input.createdBy,
    })
    .select('*')
    .single();

  if (error) {
    return {
      error:
        (error as { code?: string }).code === '23505'
          ? 'Someone else saved a new version while you were editing. Reload and reapply your change.'
          : error.message,
    };
  }

  if (latest && latest.status === 'draft') {
    await supabase.from('factory_blueprints').update({ status: 'superseded' }).eq('id', latest.id);
  }
  return { row: data as BlueprintRow };
}

/* ──────────────────────────────── diff ─────────────────────────────── */

export type BlueprintChange = {
  path: string;
  before: unknown;
  after: unknown;
  kind: 'added' | 'removed' | 'changed';
  /** Changes to what the AI may say or charge are held to a higher bar. */
  sensitive: boolean;
};

/** Paths where a change needs human sign-off however small it looks. */
const SENSITIVE_PREFIXES = [
  'offer.', 'business.approved_claims', 'business.prohibited_claims',
  'agent.disclosure', 'agent.must_not_discuss', 'agent.tools',
  'compliance.', 'checkout.', 'limits.', 'economics.',
];

function isSensitive(path: string): boolean {
  return SENSITIVE_PREFIXES.some((p) => path === p.replace(/\.$/, '') || path.startsWith(p));
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: BlueprintChange[],
): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return;

  const bothObjects =
    before && after && typeof before === 'object' && typeof after === 'object' &&
    !Array.isArray(before) && !Array.isArray(after);

  if (bothObjects) {
    const keys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
    for (const k of keys) {
      walk((before as Record<string, unknown>)[k], (after as Record<string, unknown>)[k], path ? `${path}.${k}` : k, out);
    }
    return;
  }

  out.push({
    path,
    before,
    after,
    kind: before === undefined ? 'added' : after === undefined ? 'removed' : 'changed',
    sensitive: isSensitive(path),
  });
}

export function diffBlueprints(before: unknown, after: unknown): BlueprintChange[] {
  const out: BlueprintChange[] = [];
  walk(before, after, '', out);
  return out;
}

export function summarizeDiff(changes: BlueprintChange[]): string {
  if (!changes.length) return 'No changes.';
  const sensitive = changes.filter((c) => c.sensitive).length;
  const head = changes.slice(0, 4).map((c) => c.path).join(', ');
  const rest = changes.length > 4 ? `, and ${changes.length - 4} more` : '';
  return `${changes.length} change${changes.length === 1 ? '' : 's'}: ${head}${rest}.${sensitive ? ` ${sensitive} need approval.` : ''}`;
}

/** Does this change need a human before it can go live? */
export function requiresApproval(changes: BlueprintChange[]): boolean {
  return changes.some((c) => c.sensitive);
}

/* ─────────────────────────── rollback ──────────────────────────────── */

/**
 * Roll back by rewriting the old doc forward as a NEW version rather than
 * resurrecting the old row. History stays append-only, so the log still shows
 * that a rollback happened and what it reverted, which a mutation would erase.
 */
export async function rollbackTo(
  supabase: SupabaseClient,
  opts: { tenantId: string; factoryId: string; version: number; actor: string },
): Promise<{ row: BlueprintRow } | { error: string }> {
  const { data } = await supabase
    .from('factory_blueprints')
    .select('*')
    .eq('factory_id', opts.factoryId)
    .eq('version', opts.version)
    .maybeSingle();
  const target = data as BlueprintRow | null;
  if (!target) return { error: `Version ${opts.version} not found.` };

  return saveBlueprint(supabase, {
    tenantId: opts.tenantId,
    factoryId: opts.factoryId,
    doc: target.doc,
    source: 'manual',
    createdBy: opts.actor,
    changeSummary: `Rolled back to version ${opts.version}.`,
  });
}
