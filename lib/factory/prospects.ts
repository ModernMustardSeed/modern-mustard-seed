import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Blueprint, ProspectState } from './types';
import { prospectKey, PROSPECT_STATES } from './types';
import { checkSuppressed } from './campaigns';
import { audit } from './audit-log';
import { recordUsage } from './usage';

/**
 * THE PROSPECT RESERVOIR.
 *
 * Every Factory has its own, isolated by tenant, with a state machine rather
 * than a status column somebody types into:
 *
 *   discovered -> qualified -> ready -> active -> engaged -> hot -> won
 *                                   \-> nurture, suppressed, lost
 *
 * SCORING IS EXPLAINED, NOT JUST COMPUTED. Every score carries the reasons that
 * produced it. A number with no reasons cannot be argued with, tuned, or
 * trusted, and the first question anyone asks about a lead score is "why".
 *
 * ONLY PUBLIC, OBSERVABLE CHARACTERISTICS. Industry, geography, size, review
 * count, whether they have online booking, what their site says. Never inferred
 * demographics, never protected attributes. That is a hard line in the scoring
 * function, not a guideline in a doc.
 */

/* ────────────────────────────── scoring ────────────────────────────── */

export type ScoreReason = { signal: string; weight: number; why: string };

export type ScoredProspect = { score: number; reasons: ScoreReason[]; state: ProspectState };

export type ScorableProspect = {
  company: string;
  domain?: string | null;
  website?: string | null;
  email?: string | null;
  contact_name?: string | null;
  industry?: string | null;
  city?: string | null;
  region?: string | null;
  employee_count?: number | null;
  signals?: Record<string, unknown>;
  enrichment?: Record<string, unknown>;
};

/** Signals that are never allowed to influence a score, whatever a blueprint asks for. */
const FORBIDDEN_SIGNALS = new Set([
  'age', 'gender', 'race', 'ethnicity', 'religion', 'national_origin', 'disability',
  'sexual_orientation', 'marital_status', 'political', 'health', 'veteran_status',
]);

/**
 * Score one prospect against a blueprint.
 *
 * Weights come from the blueprint so a customer's Factory can be tuned without
 * a deploy; the SIGNALS are computed here so a weight can never conjure a
 * signal that does not exist. A blueprint weighting a forbidden signal has that
 * weight dropped and the reason recorded, rather than silently obeyed.
 */
export function scoreProspect(bp: Blueprint, p: ScorableProspect): ScoredProspect {
  const weights = bp.scoring.weights ?? {};
  const icp = bp.icp[0];
  const signals = p.signals ?? {};
  const reasons: ScoreReason[] = [];

  const add = (signal: string, present: boolean, why: string) => {
    if (!present) return;
    if (FORBIDDEN_SIGNALS.has(signal)) {
      reasons.push({ signal, weight: 0, why: 'Ignored: scoring never uses protected or inferred personal attributes.' });
      return;
    }
    const weight = weights[signal];
    if (typeof weight !== 'number' || weight === 0) return;
    reasons.push({ signal, weight, why });
  };

  const domain = (p.domain || '').toLowerCase();
  const hasSite = !!(domain || p.website);
  add('has_website', hasSite, 'Has a real website.');
  add('no_website', !hasSite, 'No website found.');

  const industry = (p.industry ?? '').toLowerCase();
  add(
    'icp_industry_match',
    !!industry && (icp?.industries ?? []).some((i) => industry.includes(i.toLowerCase()) || i.toLowerCase().includes(industry)),
    'Industry matches the ICP.',
  );

  const geo = [p.city, p.region].filter(Boolean).join(', ').toLowerCase();
  add(
    'icp_geo_match',
    !!geo && (icp?.geographies ?? []).some((g) => geo.includes(g.toLowerCase()) || g.toLowerCase().includes(geo)),
    'In a target geography.',
  );

  const size = p.employee_count ?? null;
  add(
    'icp_size_match',
    size !== null && (icp?.employee_min == null || size >= icp.employee_min) && (icp?.employee_max == null || size <= icp.employee_max),
    'Company size is inside the ICP band.',
  );

  add('named_contact', !!p.contact_name, 'A named person, not just an inbox.');
  add('verified_email', !!p.email && signals.email_verified === true, 'Deliverable address.');
  add('engaged_before', signals.engaged_before === true, 'Has engaged with this Factory before.');
  add('review_count_high', Number(signals.review_count ?? 0) >= 20, 'Enough public reviews to suggest real volume.');
  add('review_pain', signals.review_pain === true, 'Public reviews mention not being able to reach them.');
  add('no_online_booking', signals.online_booking === false, 'No online booking, so the phone carries everything.');
  add('single_location', Number(signals.location_count ?? 0) === 1, 'Single location.');
  add('chain_or_franchise', signals.chain === true, 'Chain or franchise: the decision is not made here.');

  const raw = reasons.reduce((sum, r) => sum + r.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const state: ProspectState = score >= bp.scoring.threshold_ready ? 'ready' : 'qualified';

  return { score, reasons, state };
}

/* ─────────────────────────────── import ────────────────────────────── */

export const importRowSchema = z.object({
  company: z.string().trim().min(1).max(200),
  domain: z.string().trim().max(200).optional(),
  website: z.string().trim().max(300).optional(),
  contact_name: z.string().trim().max(200).optional(),
  contact_title: z.string().trim().max(200).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  industry: z.string().trim().max(120).optional(),
  employee_count: z.coerce.number().int().min(0).max(5_000_000).optional(),
  source: z.string().trim().max(120).optional(),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export type ImportOutcome = {
  inserted: number;
  duplicates: number;
  suppressed: number;
  invalid: { row: number; reason: string }[];
  overLimit: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeDomain(row: ImportRow): string | null {
  const raw = row.domain || row.website || (row.email?.includes('@') ? row.email.split('@')[1] : '');
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase().trim() || null;
}

/**
 * Import a customer-supplied list.
 *
 * Four things happen to every row and none of them are optional: it is
 * validated, it is deduped inside the batch AND against the reservoir, it is
 * checked against this tenant's suppression list, and it is scored. A row that
 * is already suppressed is counted and dropped, never inserted in a state that
 * a later bug could promote back into a send.
 */
export async function importProspects(input: {
  supabase: SupabaseClient;
  tenantId: string;
  factoryId: string;
  blueprint: Blueprint;
  rows: unknown[];
  source?: string;
  isTest?: boolean;
  remaining?: number | null;
  actor: string;
}): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { inserted: 0, duplicates: 0, suppressed: 0, invalid: [], overLimit: 0 };
  const seen = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];

  for (const [index, raw] of input.rows.entries()) {
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      outcome.invalid.push({ row: index + 1, reason: parsed.error.issues[0]?.message ?? 'Invalid row.' });
      continue;
    }
    const row = parsed.data;
    if (row.email && !EMAIL_RE.test(row.email)) {
      outcome.invalid.push({ row: index + 1, reason: `"${row.email}" is not a valid address.` });
      continue;
    }

    const domain = normalizeDomain(row);
    const key = prospectKey({ domain, email: row.email ?? null, company: row.company, city: row.city ?? null });
    if (seen.has(key)) {
      outcome.duplicates++;
      continue;
    }
    seen.add(key);

    if (row.email) {
      const hit = await checkSuppressed(input.supabase, input.tenantId, row.email);
      if (hit) {
        outcome.suppressed++;
        continue;
      }
    }

    if (input.remaining !== null && input.remaining !== undefined && toInsert.length >= input.remaining) {
      outcome.overLimit++;
      continue;
    }

    const scored = scoreProspect(input.blueprint, { ...row, domain });
    toInsert.push({
      tenant_id: input.tenantId,
      factory_id: input.factoryId,
      company: row.company,
      domain,
      website: row.website ?? (domain ? `https://${domain}` : null),
      contact_name: row.contact_name ?? null,
      contact_title: row.contact_title ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      city: row.city ?? null,
      region: row.state ?? null,
      industry: row.industry ?? null,
      employee_count: row.employee_count ?? null,
      source: row.source ?? input.source ?? 'import',
      provider: 'client_list',
      score: scored.score,
      score_reasons: scored.reasons,
      state: scored.state,
      is_test: input.isTest ?? false,
      dedupe_key: key,
    });
  }

  // Chunked so one oversized paste does not become one oversized statement.
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { data, error } = await input.supabase
      .from('factory_prospects')
      .upsert(chunk, { onConflict: 'factory_id,dedupe_key', ignoreDuplicates: true })
      .select('id');
    if (error) {
      outcome.invalid.push({ row: i + 1, reason: error.message });
      continue;
    }
    const added = ((data as { id: string }[]) ?? []).length;
    outcome.inserted += added;
    outcome.duplicates += chunk.length - added;
  }

  if (outcome.inserted && !input.isTest) {
    await recordUsage(input.supabase, {
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      metric: 'prospects_sourced',
      moduleKey: 'data.csv_import',
      quantity: outcome.inserted,
      costCents: 0,
      idempotencyKey: `import:${input.factoryId}:${Date.now()}`,
    });
  }

  await audit(input.supabase, {
    tenantId: input.tenantId,
    factoryId: input.factoryId,
    actor: input.actor,
    actorKind: 'admin',
    action: 'prospects.imported',
    meta: outcome,
  });

  return outcome;
}

/* ───────────────────────────── reservoir ───────────────────────────── */

export type ReservoirCounts = Record<ProspectState, number> & { total: number };

export async function reservoirCounts(
  supabase: SupabaseClient,
  tenantId: string,
  factoryId: string,
): Promise<ReservoirCounts> {
  const { data } = await supabase
    .from('factory_prospects')
    .select('state')
    .eq('tenant_id', tenantId)
    .eq('factory_id', factoryId)
    .eq('is_test', false)
    .limit(50_000);

  const counts = Object.fromEntries(PROSPECT_STATES.map((s) => [s, 0])) as Record<ProspectState, number>;
  for (const r of ((data as { state: ProspectState }[]) ?? [])) counts[r.state] = (counts[r.state] ?? 0) + 1;
  return { ...counts, total: ((data as unknown[]) ?? []).length };
}

/** The next prospects a campaign may legitimately contact, hottest first. */
export async function nextReady(
  supabase: SupabaseClient,
  input: { tenantId: string; factoryId: string; limit: number; minScore: number; isTest: boolean },
) {
  const { data } = await supabase
    .from('factory_prospects')
    .select('*')
    .eq('tenant_id', input.tenantId)
    .eq('factory_id', input.factoryId)
    .eq('is_test', input.isTest)
    .in('state', ['ready', 'qualified'])
    .gte('score', input.minScore)
    .not('email', 'is', null)
    .is('suppressed_at', null)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(input.limit);
  return data ?? [];
}

/* ───────────────────────────── hot right now ───────────────────────── */

export type HotProspect = {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  score: number;
  heat: number;
  reasons: string[];
  last_engagement_at: string | null;
};

/**
 * HOT RIGHT NOW.
 *
 * Ranked on tracked behaviour only: a reply we received, a value action they
 * opened, a conversation they had, a pricing question they asked. No inferred
 * intent, no third-party "in-market" signal, nothing we cannot show them the
 * evidence for.
 */
export async function hotRightNow(
  supabase: SupabaseClient,
  tenantId: string,
  factoryId: string,
  limit = 20,
): Promise<HotProspect[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: prospects }, { data: replies }, { data: runs }, { data: convos }] = await Promise.all([
    supabase
      .from('factory_prospects')
      .select('id, company, contact_name, email, score, state, last_engagement_at')
      .eq('tenant_id', tenantId).eq('factory_id', factoryId).eq('is_test', false)
      .in('state', ['active', 'engaged', 'hot']).limit(2000),
    supabase
      .from('factory_messages')
      .select('prospect_id, classification, created_at')
      .eq('factory_id', factoryId).eq('direction', 'inbound').gte('created_at', since).limit(2000),
    supabase
      .from('factory_action_runs')
      .select('prospect_id, view_count, viewed_at')
      .eq('factory_id', factoryId).gte('created_at', since).limit(2000),
    supabase
      .from('factory_conversations')
      .select('prospect_id, outcome, started_at')
      .eq('factory_id', factoryId).gte('started_at', since).limit(2000),
  ]);

  type P = { id: string; company: string; contact_name: string | null; email: string | null; score: number; state: string; last_engagement_at: string | null };
  const out: HotProspect[] = [];

  for (const p of ((prospects as P[]) ?? [])) {
    let heat = 0;
    const reasons: string[] = [];

    const mine = ((replies as { prospect_id: string; classification: string | null }[]) ?? []).filter((r) => r.prospect_id === p.id);
    if (mine.some((r) => r.classification === 'meeting')) { heat += 50; reasons.push('Asked for a meeting'); }
    if (mine.some((r) => r.classification === 'pricing')) { heat += 40; reasons.push('Asked about pricing'); }
    if (mine.some((r) => r.classification === 'positive')) { heat += 30; reasons.push('Replied, interested'); }
    if (mine.some((r) => r.classification === 'question')) { heat += 20; reasons.push('Asked a question'); }

    const views = ((runs as { prospect_id: string; view_count: number; viewed_at: string | null }[]) ?? []).filter((r) => r.prospect_id === p.id);
    const totalViews = views.reduce((s, v) => s + (v.view_count ?? 0), 0);
    if (totalViews > 0) { heat += Math.min(30, totalViews * 10); reasons.push(`Opened what we made for them ${totalViews} time${totalViews === 1 ? '' : 's'}`); }

    const talked = ((convos as { prospect_id: string; outcome: string | null }[]) ?? []).filter((c) => c.prospect_id === p.id);
    if (talked.some((c) => c.outcome === 'qualified')) { heat += 35; reasons.push('Qualified in conversation'); }
    else if (talked.length) { heat += 15; reasons.push('Had a conversation'); }

    if (p.state === 'hot') { heat += 10; reasons.push('Marked hot'); }
    if (heat > 0) out.push({ id: p.id, company: p.company, contact_name: p.contact_name, email: p.email, score: p.score, heat, reasons, last_engagement_at: p.last_engagement_at });
  }

  return out.sort((a, b) => b.heat - a.heat || b.score - a.score).slice(0, limit);
}
