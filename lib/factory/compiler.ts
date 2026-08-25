import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint, BlueprintRow, FactoryRow, PreflightReport } from './types';
import { preflight, blockers } from './preflight';
import { getPlan, type PlanRow } from './plans';
import { validateBlueprint } from './blueprint';
import { audit } from './audit-log';

/**
 * THE FACTORY COMPILER: blueprint in, live Factory out.
 *
 * Staff do not configure campaigns, scoring, the pipeline, the agent and the
 * limits one screen at a time. They approve a blueprint, and this compiles it.
 * Everything a Factory does is derived from one document, which is what makes
 * the whole thing versionable, diffable, clonable and reversible: there is no
 * second place where configuration hides.
 *
 * COMPILING IS IDEMPOTENT. Deploying the same blueprint twice produces the same
 * live state, because campaigns are matched by name and updated rather than
 * appended. A deploy is safe to retry, which matters when the thing being
 * retried is the step that puts a customer's acquisition live.
 *
 * NOTHING DEPLOYS OVER A BLOCKER. Preflight runs first, its report is stored
 * with the deployment, and a failing blocker refuses the deploy rather than
 * warning about it. The whole point of the checklist is that it is not advisory.
 */

export type DeployResult =
  | { ok: true; deploymentId: string; report: PreflightReport; changes: string[] }
  | { ok: false; report: PreflightReport | null; error: string; blockers: string[] };

export type DeployInput = {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow;
  blueprintRow: BlueprintRow;
  actor: string;
  /** Minutes of MMS human time this deployment took. The scale metric that matters. */
  humanMinutes?: number;
  /** Skip the preflight gate. Owner-only, always recorded, for a deliberate override. */
  force?: boolean;
};

export async function deployBlueprint(input: DeployInput): Promise<DeployResult> {
  const { supabase, tenantId, factory, blueprintRow } = input;

  const parsed = validateBlueprint(blueprintRow.doc);
  if (!parsed.ok) {
    return {
      ok: false,
      report: null,
      error: 'The blueprint is not structurally valid.',
      blockers: parsed.errors.map((e) => `${e.path}: ${e.message}`),
    };
  }
  const bp = parsed.doc;

  const { data: tenantRow } = await supabase.from('factory_tenants').select('plan_code').eq('id', tenantId).maybeSingle();
  const plan = await getPlan(supabase, (tenantRow as { plan_code: string | null } | null)?.plan_code ?? null);

  const report = await preflight({ supabase, tenantId, factory, blueprint: bp, plan });
  const failing = blockers(report);
  if (failing.length && !input.force) {
    return {
      ok: false,
      report,
      error: `${failing.length} blocker${failing.length === 1 ? '' : 's'} must be cleared before this Factory can deploy.`,
      blockers: failing.map((c) => `${c.label}: ${c.detail}`),
    };
  }

  const changes = await compile(supabase, tenantId, factory, bp, plan);

  const automationPct = estimateAutomation(bp);
  const { data: deployment, error } = await supabase
    .from('factory_deployments')
    .insert({
      tenant_id: tenantId,
      factory_id: factory.id,
      blueprint_id: blueprintRow.id,
      status: 'succeeded',
      report: { preflight: report, changes, forced: !!input.force },
      human_minutes: input.humanMinutes ?? null,
      automation_pct: automationPct,
      deployed_by: input.actor,
    })
    .select('id')
    .single();
  if (error) return { ok: false, report, error: error.message, blockers: [] };

  await Promise.all([
    supabase
      .from('factory_blueprints')
      .update({ status: 'deployed', deployed_at: new Date().toISOString(), validation: report })
      .eq('id', blueprintRow.id),
    supabase
      .from('factory_blueprints')
      .update({ status: 'superseded' })
      .eq('factory_id', factory.id)
      .eq('status', 'deployed')
      .neq('id', blueprintRow.id),
    supabase
      .from('factories')
      .update({
        template_key: bp.template_key ?? factory.template_key,
        template_version: bp.template_version ?? factory.template_version,
        status: factory.status === 'draft' || factory.status === 'forging' || factory.status === 'review' ? 'testing' : factory.status,
        goals: bp.goals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', factory.id)
      .eq('tenant_id', tenantId),
    audit(supabase, {
      tenantId,
      factoryId: factory.id,
      actor: input.actor,
      actorKind: 'admin',
      action: 'blueprint.deployed',
      target: blueprintRow.id,
      meta: { version: blueprintRow.version, changes: changes.length, forced: !!input.force, automationPct },
      severity: input.force ? 'warning' : 'info',
    }),
  ]);

  return { ok: true, deploymentId: deployment.id as string, report, changes };
}

/**
 * Turn the document into rows. Campaigns are the only part of a blueprint that
 * needs its own table, because they accumulate live state (sends, replies,
 * variants) that a document cannot hold. Everything else is read from the
 * deployed blueprint at the point of use, which keeps exactly one source of
 * truth rather than a copy that drifts.
 */
async function compile(
  supabase: SupabaseClient,
  tenantId: string,
  factory: FactoryRow,
  bp: Blueprint,
  _plan: PlanRow | null,
): Promise<string[]> {
  const changes: string[] = [];

  const { data: existingRows } = await supabase
    .from('factory_campaigns')
    .select('id, name, status')
    .eq('tenant_id', tenantId)
    .eq('factory_id', factory.id);
  const existing = new Map(((existingRows as { id: string; name: string; status: string }[]) ?? []).map((c) => [c.name, c]));

  for (const c of bp.campaigns) {
    const row = {
      tenant_id: tenantId,
      factory_id: factory.id,
      name: c.name,
      channel: c.channel,
      icp: bp.icp.find((i) => i.label === c.icp_label) ?? bp.icp[0],
      offer: c.offer_headline ?? bp.offer.headline,
      hook: c.hook,
      secondary_hook: c.secondary_hook,
      cta: c.cta,
      value_action_key: c.value_action_key,
      sequence: c.sequence,
      qualification: { questions: bp.agent.qualification_questions },
      conversion_event: c.conversion_event,
      daily_send_cap: c.daily_send_cap,
      budget_cents: bp.limits.monthly_budget_cents || null,
      goal: c.goal,
      updated_at: new Date().toISOString(),
    };

    const prior = existing.get(c.name);
    if (prior) {
      await supabase.from('factory_campaigns').update(row).eq('id', prior.id).eq('tenant_id', tenantId);
      changes.push(`Updated campaign "${c.name}".`);
      existing.delete(c.name);
    } else {
      await supabase.from('factory_campaigns').insert({ ...row, status: 'draft' });
      changes.push(`Created campaign "${c.name}".`);
    }
  }

  // A campaign the blueprint dropped is PAUSED, never deleted: its messages,
  // replies and attribution are history and history does not get removed
  // because somebody edited a document.
  for (const [name, row] of existing) {
    if (row.status === 'running') {
      await supabase.from('factory_campaigns').update({ status: 'paused' }).eq('id', row.id).eq('tenant_id', tenantId);
      changes.push(`Paused campaign "${name}" (no longer in the blueprint).`);
    }
  }

  return changes;
}

/**
 * How much of this deployment the software did by itself.
 *
 * A rough, honest estimate: every area the blueprint filled from a template or
 * the Build counts as automated, every area still carrying a placeholder counts
 * as manual. It is not precision, it is a trend line, and the trend is the
 * metric the company is actually steering by.
 */
export function estimateAutomation(bp: Blueprint): number {
  const areas: [string, boolean][] = [
    ['template', !!bp.template_key],
    ['business', bp.business.services.length > 0],
    ['claims', bp.business.approved_claims.length > 0],
    ['icp', (bp.icp[0]?.industries.length ?? 0) + (bp.icp[0]?.geographies.length ?? 0) > 0],
    ['pain', bp.pain.primary !== 'Not captured yet.'],
    ['objections', bp.pain.objections.length > 0],
    ['agent', bp.agent.tools.length > 0],
    ['campaign', (bp.campaigns[0]?.sequence.length ?? 0) > 0],
    ['value_action', bp.value_actions.length > 0],
    ['scoring', Object.keys(bp.scoring.weights).length > 0],
    ['crm', bp.crm.pipeline.length >= 2],
    ['modules', bp.modules.length > 0],
  ];
  return Math.round((areas.filter(([, done]) => done).length / areas.length) * 100);
}

/* ─────────────────────── activation and controls ───────────────────── */

export type ActivationResult = { ok: true; factory: FactoryRow } | { ok: false; error: string; blockers: string[] };

/**
 * ACTIVATE FACTORY. The moment it can touch a real person.
 *
 * Preflight runs again here, against the deployed blueprint, because a Factory
 * can pass preflight on Tuesday and have its sender disconnected on Wednesday.
 * The checklist is a gate, not a certificate.
 */
export async function activateFactory(input: {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow;
  blueprint: Blueprint;
  actor: string;
}): Promise<ActivationResult> {
  const { supabase, tenantId, factory } = input;

  const { data: tenantRow } = await supabase.from('factory_tenants').select('plan_code, status').eq('id', tenantId).maybeSingle();
  const tenant = tenantRow as { plan_code: string | null; status: string } | null;
  if (tenant?.status !== 'active') return { ok: false, error: 'This tenant is not active.', blockers: [] };

  const plan = await getPlan(supabase, tenant.plan_code);
  const report = await preflight({ supabase, tenantId, factory, blueprint: input.blueprint, plan });
  const failing = blockers(report);
  if (failing.length) {
    return { ok: false, error: 'The activation checklist is not clear.', blockers: failing.map((c) => `${c.label}: ${c.detail}`) };
  }

  const { data, error } = await supabase
    .from('factories')
    .update({
      status: 'live',
      mode: 'live',
      activated_at: factory.activated_at ?? new Date().toISOString(),
      outreach_paused: false,
      sourcing_paused: false,
      ai_paused: false,
      followup_paused: false,
      pause_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', factory.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message, blockers: [] };

  await supabase
    .from('factory_campaigns')
    .update({ status: 'running' })
    .eq('factory_id', factory.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'ready');

  await audit(supabase, {
    tenantId,
    factoryId: factory.id,
    actor: input.actor,
    actorKind: 'admin',
    action: 'factory.activated',
    meta: { overall: report.overall },
  });

  return { ok: true, factory: data as FactoryRow };
}

export type ControlSwitch = 'factory' | 'sourcing' | 'outreach' | 'ai' | 'followup';

/**
 * The control centre switches. Independent by design: a customer who wants to
 * stop sending while the AI keeps answering replies should not have to choose
 * between running and stopped.
 */
export async function setControl(input: {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow;
  control: ControlSwitch;
  paused: boolean;
  reason?: string;
  actor: string;
  actorKind: 'admin' | 'client' | 'system';
}): Promise<{ ok: true; factory: FactoryRow } | { error: string }> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.control === 'factory') {
    patch.status = input.paused ? 'paused' : 'live';
    patch.pause_reason = input.paused ? (input.reason ?? 'Paused by request') : null;
    if (input.paused) {
      patch.sourcing_paused = true;
      patch.outreach_paused = true;
      patch.followup_paused = true;
    }
  } else {
    patch[`${input.control}_paused`] = input.paused;
  }

  const { data, error } = await input.supabase
    .from('factories')
    .update(patch)
    .eq('id', input.factory.id)
    .eq('tenant_id', input.tenantId)
    .select('*')
    .single();
  if (error) return { error: error.message };

  await audit(input.supabase, {
    tenantId: input.tenantId,
    factoryId: input.factory.id,
    actor: input.actor,
    actorKind: input.actorKind,
    action: input.paused ? 'factory.paused' : 'factory.resumed',
    target: input.control,
    meta: { reason: input.reason ?? null },
    severity: input.paused ? 'warning' : 'info',
  });
  return { ok: true, factory: data as FactoryRow };
}
