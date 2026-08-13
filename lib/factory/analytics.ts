import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint, FactoryRow } from './types';
import { usageForTenant } from './usage';
import { monthStartIso } from './plans';

/**
 * WHAT DID THE CLIENT FACTORY DO?
 *
 * The funnel, the bottleneck, the winning segments, and the ROI, all computed
 * from rows that exist rather than from anything modelled. Where a number is
 * not knowable it is null and the UI says so. A dashboard that fills a gap with
 * a plausible figure is worse than an empty one: it teaches the customer to
 * distrust the numbers that ARE real.
 *
 * THE BOTTLENECK ENGINE IS THE POINT. Any tool can show a funnel. The useful
 * output is the single sentence "this is where you are losing them", including
 * when the answer is "your people are not closing", which is not a problem more
 * leads will fix and is the answer most acquisition tools are structurally
 * unable to give.
 */

export type FunnelStage = { key: string; label: string; count: number; rateFromPrevious: number | null };

export type Funnel = {
  stages: FunnelStage[];
  from: string;
};

export async function funnel(
  supabase: SupabaseClient,
  tenantId: string,
  factoryId: string,
  sinceIso = monthStartIso(),
): Promise<Funnel> {
  const scope = { tenantId, factoryId, sinceIso };
  const [found, ready, contacted, engaged, aiTalked, demoed, qualified, meetings, won] = await Promise.all([
    countProspects(supabase, scope, {}),
    countProspects(supabase, scope, { states: ['ready', 'active', 'engaged', 'hot', 'won'] }),
    countDistinct(supabase, 'factory_messages', scope, (q) => q.eq('direction', 'outbound').eq('is_test', false), 'prospect_id'),
    countDistinct(supabase, 'factory_messages', scope, (q) => q.eq('direction', 'inbound'), 'prospect_id'),
    countDistinct(supabase, 'factory_conversations', scope, (q) => q.eq('is_test', false), 'prospect_id', 'started_at'),
    countDistinct(supabase, 'factory_action_runs', scope, (q) => q.eq('status', 'ready').eq('is_test', false), 'prospect_id'),
    countProspects(supabase, scope, { states: ['hot', 'won'] }),
    countDistinct(supabase, 'factory_meetings', scope, (q) => q.eq('is_test', false), 'prospect_id', 'created_at'),
    countOpportunities(supabase, scope, 'won'),
  ]);

  const raw: [string, string, number][] = [
    ['found', 'Found', found],
    ['ready', 'Ready', ready],
    ['contacted', 'Contacted', contacted],
    ['engaged', 'Engaged', engaged],
    ['ai', 'AI conversation', aiTalked],
    ['demo', 'Value delivered', demoed],
    ['qualified', 'Qualified', qualified],
    ['meeting', 'Meeting', meetings],
    ['won', 'Won', won],
  ];

  const stages: FunnelStage[] = raw.map(([key, label, count], i) => {
    const prev = i === 0 ? null : raw[i - 1][2];
    return { key, label, count, rateFromPrevious: prev === null ? null : prev === 0 ? null : (count / prev) * 100 };
  });

  return { stages, from: sinceIso };
}

type Scope = { tenantId: string; factoryId: string; sinceIso: string };

async function countProspects(
  supabase: SupabaseClient,
  scope: Scope,
  opts: { states?: string[] },
): Promise<number> {
  let q = supabase
    .from('factory_prospects')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', scope.tenantId)
    .eq('factory_id', scope.factoryId)
    .eq('is_test', false)
    .gte('created_at', scope.sinceIso);
  if (opts.states) q = q.in('state', opts.states);
  const { count } = await q;
  return count ?? 0;
}

/** The filter shape countDistinct needs: chainable eq, awaitable to rows. */
type Filterable = {
  eq: (column: string, value: unknown) => Filterable;
  then: <R>(onfulfilled: (v: { data: unknown }) => R) => Promise<R>;
};

async function countDistinct(
  supabase: SupabaseClient,
  table: string,
  scope: Scope,
  refine: (q: Filterable) => Filterable,
  column: string,
  dateColumn = 'created_at',
): Promise<number> {
  // PostgREST has no COUNT(DISTINCT), so the ids come back and are deduped
  // here. Capped: a factory with more than 20k touched prospects in a month
  // needs a materialized rollup, not a bigger fetch.
  const base = supabase
    .from(table)
    .select(column)
    .eq('tenant_id', scope.tenantId)
    .eq('factory_id', scope.factoryId)
    .gte(dateColumn, scope.sinceIso)
    .limit(20_000) as unknown as Filterable;
  const { data } = await refine(base);
  const ids = new Set(((data as Record<string, string>[]) ?? []).map((r) => r[column]).filter(Boolean));
  return ids.size;
}

async function countOpportunities(supabase: SupabaseClient, scope: Scope, stage: string): Promise<number> {
  const { count } = await supabase
    .from('factory_opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', scope.tenantId)
    .eq('factory_id', scope.factoryId)
    .eq('is_test', false)
    .eq('stage', stage)
    .gte('created_at', scope.sinceIso);
  return count ?? 0;
}

/* ──────────────────────── the bottleneck engine ────────────────────── */

export type Bottleneck = {
  stage: string;
  label: string;
  rate: number;
  benchmark: number;
  /** Plain sentence naming where it is failing. Shown verbatim. */
  verdict: string;
  recommendation: string;
} | null;

/**
 * Benchmarks for a healthy cold-outbound funnel, from what MMS's own machine
 * actually does. They are reference points for spotting the WORST step, not
 * promises: the verdict is always relative, never "you are below industry
 * average".
 */
const BENCHMARKS: Record<string, { rate: number; label: string; fix: string }> = {
  ready: { rate: 55, label: 'Sourcing to ready', fix: 'The ICP is too loose or the data is thin. Tighten the criteria before sourcing more.' },
  contacted: { rate: 70, label: 'Ready to contacted', fix: 'Prospects are sitting in the reservoir. Check the send cap, the sender, and whether outreach is paused.' },
  engaged: { rate: 6, label: 'Contacted to engaged', fix: 'The hook is not landing. Test a different opening observation before adding volume.' },
  ai: { rate: 55, label: 'Engaged to AI conversation', fix: 'Replies are arriving and the agent is not picking them up. Check reply classification and whether the AI is paused.' },
  demo: { rate: 60, label: 'Conversation to value delivered', fix: 'The value action is not firing. Check its cost ceiling, its inputs, and whether it needs approval.' },
  qualified: { rate: 40, label: 'Value delivered to qualified', fix: 'They see the work and do not move. The offer or the qualification bar needs a look.' },
  meeting: { rate: 55, label: 'Qualified to meeting', fix: 'Qualified prospects are not booking. Check calendar availability and how the agent asks.' },
  won: { rate: 25, label: 'Meeting to won', fix: 'The bottleneck is the human close, not the pipeline. More leads will not fix this.' },
};

/**
 * The single worst step, measured as the biggest shortfall against its own
 * benchmark. Deliberately returns ONE answer: a list of six things to improve
 * is a list nobody acts on.
 */
export function findBottleneck(f: Funnel): Bottleneck {
  let worst: Bottleneck = null;
  let worstGap = 0;

  for (const stage of f.stages) {
    const bench = BENCHMARKS[stage.key];
    if (!bench || stage.rateFromPrevious === null) continue;
    const gap = bench.rate - stage.rateFromPrevious;
    if (gap > worstGap) {
      worstGap = gap;
      worst = {
        stage: stage.key,
        label: bench.label,
        rate: stage.rateFromPrevious,
        benchmark: bench.rate,
        verdict: `${bench.label} is running at ${stage.rateFromPrevious.toFixed(1)}%, against ${bench.rate}% for a healthy funnel.`,
        recommendation: bench.fix,
      };
    }
  }
  return worst;
}

/* ─────────────────────────── winning segments ──────────────────────── */

export type Segment = {
  key: string;
  label: string;
  sample: number;
  engaged: number;
  qualified: number;
  won: number;
  engagementRate: number;
  /** Null below MIN_SAMPLE. A 2-of-3 win rate is not a finding. */
  winRate: number | null;
};

/** Below this, a segment reports its counts and refuses to claim a rate. */
export const MIN_SAMPLE = 30;

/**
 * WINNING SEGMENTS. Which kinds of prospect actually convert for this customer.
 *
 * Grouped on public business characteristics: industry, geography, size band,
 * cohort. Never on anything about a person. Sample size travels with every row
 * so nobody reads a 3-prospect segment as a strategy.
 */
export async function winningSegments(
  supabase: SupabaseClient,
  tenantId: string,
  factoryId: string,
  by: 'industry' | 'region' | 'cohort' | 'source' = 'industry',
): Promise<Segment[]> {
  const [{ data: prospects }, { data: opps }] = await Promise.all([
    supabase
      .from('factory_prospects')
      .select('id, industry, region, cohort, source, state')
      .eq('tenant_id', tenantId).eq('factory_id', factoryId).eq('is_test', false).limit(20_000),
    supabase
      .from('factory_opportunities')
      .select('prospect_id, stage')
      .eq('tenant_id', tenantId).eq('factory_id', factoryId).eq('is_test', false).limit(20_000),
  ]);

  type P = { id: string; industry: string | null; region: string | null; cohort: string | null; source: string | null; state: string };
  const rows = (prospects as P[]) ?? [];
  const oppByProspect = new Map(((opps as { prospect_id: string; stage: string }[]) ?? []).map((o) => [o.prospect_id, o.stage]));

  const groups = new Map<string, P[]>();
  for (const p of rows) {
    const raw = by === 'region' ? p.region : by === 'cohort' ? p.cohort : by === 'source' ? p.source : p.industry;
    const key = (raw ?? 'unknown').toString().trim() || 'unknown';
    const bucket = groups.get(key) ?? [];
    if (!groups.has(key)) groups.set(key, bucket);
    bucket.push(p);
  }

  const out: Segment[] = [];
  for (const [key, members] of groups) {
    const engaged = members.filter((m) => ['engaged', 'hot', 'won'].includes(m.state)).length;
    const qualified = members.filter((m) => ['hot', 'won'].includes(m.state)).length;
    const won = members.filter((m) => oppByProspect.get(m.id) === 'won').length;
    out.push({
      key,
      label: key === 'unknown' ? 'Not recorded' : key,
      sample: members.length,
      engaged,
      qualified,
      won,
      engagementRate: members.length ? (engaged / members.length) * 100 : 0,
      winRate: members.length >= MIN_SAMPLE ? (won / members.length) * 100 : null,
    });
  }

  return out.sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.engagementRate - a.engagementRate);
}

/**
 * FIND MORE LIKE THESE. The ICP criteria a proven segment implies.
 *
 * Only offered when the evidence is real: a segment at or above MIN_SAMPLE with
 * a win rate above the Factory's own average. Everything it returns is a public
 * business characteristic that sourcing can actually search on.
 */
export function findMoreLikeWinners(segments: Segment[], by: string): { criteria: string[]; evidence: string } | null {
  const eligible = segments.filter((s) => s.winRate !== null && s.key !== 'unknown');
  if (!eligible.length) return null;

  const totalWon = eligible.reduce((sum, s) => sum + s.won, 0);
  const totalSample = eligible.reduce((sum, s) => sum + s.sample, 0);
  const average = totalSample ? (totalWon / totalSample) * 100 : 0;

  const winners = eligible.filter((s) => (s.winRate as number) > average && s.won > 0);
  if (!winners.length) return null;

  return {
    criteria: winners.map((w) => `${by}: ${w.label}`),
    evidence: winners
      .map((w) => `${w.label}: ${w.won} of ${w.sample} (${(w.winRate as number).toFixed(1)}%), against ${average.toFixed(1)}% overall`)
      .join('; '),
  };
}

/* ────────────────────────────── the summary ────────────────────────── */

export type FactorySummary = {
  funnel: Funnel;
  bottleneck: Bottleneck;
  pipelineCents: number;
  closedCents: number;
  costCents: number;
  /** Null when no revenue is connected. Never a placeholder. */
  roi: number | null;
  timeToValue: Record<string, number | null>;
};

export async function factorySummary(
  supabase: SupabaseClient,
  tenantId: string,
  factory: FactoryRow,
  _blueprint: Blueprint,
  sinceIso = monthStartIso(),
): Promise<FactorySummary> {
  const [f, { data: opps }, usage] = await Promise.all([
    funnel(supabase, tenantId, factory.id, sinceIso),
    supabase
      .from('factory_opportunities')
      .select('stage, value_cents')
      .eq('tenant_id', tenantId).eq('factory_id', factory.id).eq('is_test', false).gte('created_at', sinceIso),
    usageForTenant(supabase, tenantId, sinceIso),
  ]);

  const rows = (opps as { stage: string; value_cents: number | null }[]) ?? [];
  const pipelineCents = rows.filter((o) => o.stage !== 'won' && o.stage !== 'lost').reduce((s, o) => s + (o.value_cents ?? 0), 0);
  const closedCents = rows.filter((o) => o.stage === 'won').reduce((s, o) => s + (o.value_cents ?? 0), 0);

  return {
    funnel: f,
    bottleneck: findBottleneck(f),
    pipelineCents,
    closedCents,
    costCents: usage.totalCostCents,
    roi: closedCents > 0 && usage.totalCostCents > 0 ? ((closedCents - usage.totalCostCents) / usage.totalCostCents) * 100 : null,
    timeToValue: timeToValue(factory),
  };
}

/** Days from activation to each milestone. Null until the milestone happens. */
export function timeToValue(f: FactoryRow): Record<string, number | null> {
  const start = f.activated_at ? new Date(f.activated_at).getTime() : new Date(f.created_at).getTime();
  const days = (iso: string | null) => (iso ? Math.round((new Date(iso).getTime() - start) / 86_400_000 * 10) / 10 : null);
  return {
    'First prospect': days(f.first_prospect_at),
    'First contact': days(f.first_contact_at),
    'First engagement': days(f.first_engagement_at),
    'First opportunity': days(f.first_opportunity_at),
    'First customer': days(f.first_customer_at),
  };
}

/**
 * Reverse-engineer what a goal requires, from THIS Factory's own measured
 * rates. Labelled an estimate everywhere it is shown, and it refuses to
 * estimate at all when the funnel has not produced enough evidence.
 */
export function requirementsForGoal(f: Funnel, customersPerMonth: number): { prospects: number; contacts: number; note: string } | null {
  const rate = (key: string) => f.stages.find((s) => s.key === key)?.rateFromPrevious ?? null;
  const chain = ['ready', 'contacted', 'engaged', 'ai', 'demo', 'qualified', 'meeting', 'won'].map(rate);
  if (chain.some((r) => r === null || r === 0)) return null;

  const conversion = chain.reduce<number>((acc, r) => acc * ((r as number) / 100), 1);
  if (conversion <= 0) return null;

  const prospects = Math.ceil(customersPerMonth / conversion);
  const contactRate = ((rate('ready') as number) / 100) * ((rate('contacted') as number) / 100);
  return {
    prospects,
    contacts: Math.ceil(prospects * contactRate),
    note: 'Estimate, from this Factory\'s own measured conversion rates. It moves as the rates move.',
  };
}
