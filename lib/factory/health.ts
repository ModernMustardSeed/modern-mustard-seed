import type { SupabaseClient } from '@supabase/supabase-js';
import type { FactoryHealth, FactoryRow, HealthDimension } from './types';
import { monthStartIso, type PlanRow, allLimitStates, limitWarnings } from './plans';
import { usageForTenant, marginOf } from './usage';

/**
 * FACTORY HEALTH, AND MANAGEMENT BY EXCEPTION.
 *
 * At a thousand tenants nobody opens a thousand dashboards. The only workable
 * model is that healthy Factories are invisible and the software says which
 * ones are not. Every Factory scores six dimensions, the worst ones set the
 * band, and the operations centre sorts by band.
 *
 * THE SCORE IS MADE OF FACTS. Sends that actually went out, bounces that
 * actually came back, integrations that actually answered, cost that was
 * actually spent. Nothing here is a proxy for "it feels fine", because the
 * whole value of the number is that somebody can act on it without opening the
 * account.
 *
 * A NEW FACTORY IS NOT AN UNHEALTHY ONE. Fourteen days of grace, banded 'new',
 * so a launch does not drown the operations queue in red.
 */

const NEW_GRACE_DAYS = 14;

export type HealthInput = {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow;
  plan: PlanRow | null;
  /** Monthly revenue, for the cost dimension. Null for the internal tenant. */
  mrrCents: number | null;
};

export async function scoreHealth(input: HealthInput): Promise<FactoryHealth> {
  const { supabase, tenantId, factory } = input;
  const since = monthStartIso();
  const reasons: string[] = [];

  const [prospect, sender, ai, conversion, integration, cost] = await Promise.all([
    prospectHealth(supabase, tenantId, factory, reasons),
    senderHealth(supabase, tenantId, factory, reasons),
    aiHealth(supabase, tenantId, factory, reasons),
    conversionHealth(supabase, tenantId, factory, since, reasons),
    integrationHealth(supabase, tenantId, reasons),
    costHealth(supabase, tenantId, input.plan, input.mrrCents, since, reasons),
  ]);

  const dimensions: Record<HealthDimension, { score: number; note: string }> = {
    prospect, sender, ai, conversion, integration, cost,
  };

  // The overall is dragged toward the WORST dimension rather than averaged.
  // A Factory with a dead sender and perfect everything else is broken, and an
  // average would report it at 85 and hide it.
  const scores = Object.values(dimensions).map((d) => d.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const worst = Math.min(...scores);
  const overall = Math.round(mean * 0.4 + worst * 0.6);

  return { overall, band: band(factory, overall, reasons), dimensions, reasons, at: new Date().toISOString() };
}

function band(f: FactoryRow, overall: number, reasons: string[]): FactoryHealth['band'] {
  if (f.status === 'paused') return 'paused';
  const ageDays = (Date.now() - new Date(f.activated_at ?? f.created_at).getTime()) / 86_400_000;
  if (f.status !== 'live') return 'new';
  if (ageDays < NEW_GRACE_DAYS) return 'new';
  if (overall < 45) return 'critical';
  if (overall < 70) return 'attention';
  if (overall >= 88 && !reasons.length) return 'growth';
  return 'healthy';
}

async function prospectHealth(supabase: SupabaseClient, tenantId: string, factory: FactoryRow, reasons: string[]) {
  const { count: ready } = await supabase
    .from('factory_prospects')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('factory_id', factory.id).eq('is_test', false)
    .in('state', ['ready', 'qualified']);

  const n = ready ?? 0;
  if (n === 0) {
    reasons.push('No prospect inventory. The Factory has nobody left to contact.');
    return { score: 0, note: 'Empty reservoir.' };
  }
  if (n < 50) {
    reasons.push(`Only ${n} contactable prospects left.`);
    return { score: 45, note: `${n} ready.` };
  }
  if (n < 200) return { score: 75, note: `${n} ready.` };
  return { score: 100, note: `${n} ready.` };
}

async function senderHealth(supabase: SupabaseClient, tenantId: string, factory: FactoryRow, reasons: string[]) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await supabase
    .from('factory_messages')
    .select('status')
    .eq('tenant_id', tenantId).eq('factory_id', factory.id)
    .eq('direction', 'outbound').eq('is_test', false)
    .gte('created_at', since).limit(10_000);

  const rows = (data as { status: string }[]) ?? [];
  if (!rows.length) return { score: 100, note: 'Nothing sent yet.' };

  const bounced = rows.filter((r) => r.status === 'bounced').length;
  const complained = rows.filter((r) => r.status === 'complained').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const bounceRate = (bounced / rows.length) * 100;
  const complaintRate = (complained / rows.length) * 100;

  let score = 100;
  if (bounceRate > 2) { score -= 30; reasons.push(`Bounce rate ${bounceRate.toFixed(1)}%. Above 2% puts the sending domain at risk.`); }
  if (bounceRate > 5) { score -= 30; }
  if (complaintRate > 0.1) { score -= 40; reasons.push(`Complaint rate ${complaintRate.toFixed(2)}%. Pause and fix the targeting before sending more.`); }
  if (failed > rows.length * 0.1) { score -= 20; reasons.push(`${failed} sends failed outright. Check the sender configuration.`); }

  return { score: Math.max(0, score), note: `${rows.length} sent, ${bounceRate.toFixed(1)}% bounced.` };
}

async function aiHealth(supabase: SupabaseClient, tenantId: string, factory: FactoryRow, reasons: string[]) {
  if (factory.ai_paused) {
    reasons.push('The AI is paused.');
    return { score: 50, note: 'Paused.' };
  }
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: convos }, { count: unanswered }] = await Promise.all([
    supabase
      .from('factory_conversations')
      .select('outcome')
      .eq('tenant_id', tenantId).eq('factory_id', factory.id).eq('is_test', false)
      .gte('started_at', since).limit(2000),
    supabase
      .from('factory_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('factory_id', factory.id)
      .eq('direction', 'inbound').is('replied_at', null)
      .gte('created_at', since),
  ]);

  const rows = (convos as { outcome: string | null }[]) ?? [];
  if (!rows.length && !(unanswered ?? 0)) return { score: 100, note: 'No conversations yet.' };

  const escalated = rows.filter((r) => r.outcome === 'escalated').length;
  const escalationRate = rows.length ? (escalated / rows.length) * 100 : 0;

  let score = 100;
  if ((unanswered ?? 0) > 5) { score -= 40; reasons.push(`${unanswered} replies have had no answer in two weeks.`); }
  if (escalationRate > 60 && rows.length >= 10) { score -= 25; reasons.push(`${escalationRate.toFixed(0)}% of conversations escalate. The agent is missing knowledge it needs.`); }

  return { score: Math.max(0, score), note: `${rows.length} conversations, ${escalationRate.toFixed(0)}% escalated.` };
}

async function conversionHealth(supabase: SupabaseClient, tenantId: string, factory: FactoryRow, since: string, reasons: string[]) {
  const [{ count: contacted }, { count: replies }, { count: meetings }] = await Promise.all([
    supabase.from('factory_messages').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('factory_id', factory.id).eq('direction', 'outbound').eq('is_test', false).gte('created_at', since),
    supabase.from('factory_messages').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('factory_id', factory.id).eq('direction', 'inbound').gte('created_at', since),
    supabase.from('factory_meetings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('factory_id', factory.id).eq('is_test', false).gte('created_at', since),
  ]);

  const sent = contacted ?? 0;
  if (sent < 50) return { score: 100, note: 'Too early to judge conversion.' };

  const replyRate = ((replies ?? 0) / sent) * 100;
  let score = 100;
  if (replyRate < 1) { score = 30; reasons.push(`Reply rate ${replyRate.toFixed(1)}% on ${sent} sends. The hook is not working.`); }
  else if (replyRate < 3) { score = 65; reasons.push(`Reply rate ${replyRate.toFixed(1)}%. Worth a hook test.`); }

  if (!(meetings ?? 0) && sent > 500) { score = Math.min(score, 40); reasons.push('Five hundred sends and no meetings booked.'); }

  return { score, note: `${sent} sent, ${replyRate.toFixed(1)}% replied, ${meetings ?? 0} meetings.` };
}

async function integrationHealth(supabase: SupabaseClient, tenantId: string, reasons: string[]) {
  const { data } = await supabase.from('factory_integrations').select('provider, status, last_error').eq('tenant_id', tenantId);
  const rows = (data as { provider: string; status: string; last_error: string | null }[]) ?? [];
  if (!rows.length) return { score: 100, note: 'No integrations configured.' };

  const broken = rows.filter((r) => r.status === 'error' || r.status === 'expired');
  if (broken.length) {
    for (const b of broken) reasons.push(`${b.provider} needs reconnecting${b.status === 'expired' ? ' (authorization expired)' : ''}.`);
    return { score: Math.max(0, 100 - broken.length * 40), note: `${broken.length} of ${rows.length} broken.` };
  }
  return { score: 100, note: `${rows.length} connected.` };
}

async function costHealth(
  supabase: SupabaseClient,
  tenantId: string,
  plan: PlanRow | null,
  mrrCents: number | null,
  since: string,
  reasons: string[],
) {
  const [usage, limits] = await Promise.all([
    usageForTenant(supabase, tenantId, since),
    allLimitStates(supabase, tenantId, plan),
  ]);

  for (const w of limitWarnings(limits)) reasons.push(w);

  if (mrrCents === null || mrrCents === 0) {
    return { score: 100, note: `${(usage.totalCostCents / 100).toFixed(2)} spent this month.` };
  }

  const margin = marginOf(mrrCents, usage.totalCostCents);
  const pct = margin.grossPct ?? 100;
  if (pct < 0) { reasons.push('This Factory costs more to run than it bills.'); return { score: 0, note: 'Negative margin.' }; }
  if (pct < 40) { reasons.push(`Gross margin ${pct.toFixed(0)}%. Usage is eating the subscription.`); return { score: 35, note: `${pct.toFixed(0)}% margin.` }; }
  if (pct < 65) return { score: 70, note: `${pct.toFixed(0)}% margin.` };
  return { score: 100, note: `${pct.toFixed(0)}% margin.` };
}

/* ────────────────────── the operations centre ──────────────────────── */

export type OpsRow = {
  factory: FactoryRow;
  tenantName: string;
  tenantId: string;
  planCode: string | null;
  health: FactoryHealth;
};

const BAND_ORDER: Record<FactoryHealth['band'], number> = {
  critical: 0, attention: 1, new: 2, paused: 3, healthy: 4, growth: 5,
};

/**
 * Score every Factory and sort by what needs a human. The refresh is
 * deliberately a batch job rather than a per-page computation: at scale, the
 * board has to render from `factories.health` and this is what fills it.
 */
export async function refreshAllHealth(
  supabase: SupabaseClient,
  opts: { tenantId?: string; limit?: number } = {},
): Promise<OpsRow[]> {
  let q = supabase.from('factories').select('*').neq('status', 'archived').limit(opts.limit ?? 500);
  if (opts.tenantId) q = q.eq('tenant_id', opts.tenantId);
  const { data: factories } = await q;

  const [{ data: tenants }, { data: plans }] = await Promise.all([
    supabase.from('factory_tenants').select('id, name, plan_code, mrr_cents, kind'),
    supabase.from('factory_plans').select('*'),
  ]);
  type T = { id: string; name: string; plan_code: string | null; mrr_cents: number | null; kind: string };
  const tenantById = new Map(((tenants as T[]) ?? []).map((t) => [t.id, t]));
  const planByCode = new Map(((plans as PlanRow[]) ?? []).map((p) => [p.code, p]));

  const out: OpsRow[] = [];
  for (const f of ((factories as FactoryRow[]) ?? [])) {
    const tenant = tenantById.get(f.tenant_id);
    const plan = tenant?.plan_code ? planByCode.get(tenant.plan_code) ?? null : null;
    const health = await scoreHealth({
      supabase,
      tenantId: f.tenant_id,
      factory: f,
      plan,
      mrrCents: tenant?.kind === 'internal' ? null : tenant?.mrr_cents ?? null,
    });
    await supabase.from('factories').update({ health, health_at: health.at }).eq('id', f.id);
    out.push({ factory: f, tenantName: tenant?.name ?? 'Unknown', tenantId: f.tenant_id, planCode: tenant?.plan_code ?? null, health });
  }

  return out.sort((a, b) => BAND_ORDER[a.health.band] - BAND_ORDER[b.health.band] || a.health.overall - b.health.overall);
}

/** Factories needing attention: the only queue the success team should work. */
export function needsAttention(rows: OpsRow[]): OpsRow[] {
  return rows.filter((r) => r.health.band === 'critical' || r.health.band === 'attention');
}
