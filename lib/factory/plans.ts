import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_LIMIT_FOR_METRIC, type UsageMetric } from './types';

/**
 * PLANS, ENTITLEMENTS AND LIMITS.
 *
 * Two separate jobs, deliberately not merged:
 *
 *   ENTITLEMENT  may this tenant use this capability at all?
 *   LIMIT        has this tenant used more of it than they bought?
 *
 * Both are enforced HERE, server-side, on the write path. Hiding a button is a
 * courtesy to the customer; it is not enforcement, and a product that relies on
 * it has no plans, only suggestions. Every capability check in Client Factory
 * ends at `assertEntitled` or `assertWithinLimit` before anything is spent.
 *
 * The '*' entitlement means everything, and exists for the internal tenant and
 * for Enterprise. It is checked explicitly rather than by string matching, so a
 * customer whose module list happens to contain a literal asterisk gains
 * nothing.
 */

export type PlanRow = {
  code: string;
  name: string;
  blurb: string | null;
  entitlements: { modules?: string[]; value_actions?: string[] };
  limits: Record<string, number>;
  setup_price_cents: number | null;
  monthly_price_cents: number | null;
  overage_cents: Record<string, number>;
  managed: boolean;
  status: 'private' | 'beta' | 'public' | 'retired';
  sort_order: number;
};

export async function getPlan(supabase: SupabaseClient, code: string | null): Promise<PlanRow | null> {
  if (!code) return null;
  const { data } = await supabase.from('factory_plans').select('*').eq('code', code).maybeSingle();
  return (data as PlanRow) ?? null;
}

export async function listPlans(supabase: SupabaseClient): Promise<PlanRow[]> {
  const { data } = await supabase.from('factory_plans').select('*').order('sort_order');
  return (data as PlanRow[]) ?? [];
}

function grants(list: string[] | undefined, key: string): boolean {
  if (!list || list.length === 0) return false;
  if (list.includes('*')) return true;
  return list.includes(key);
}

export type EntitlementResult = { allowed: true } | { allowed: false; reason: string };

/** May this plan use this module? A tenant with no plan can use nothing. */
export function checkModule(plan: PlanRow | null, moduleKey: string): EntitlementResult {
  if (!plan) return { allowed: false, reason: 'This account has no Client Factory plan.' };
  if (grants(plan.entitlements.modules, moduleKey)) return { allowed: true };
  return { allowed: false, reason: `${plan.name} does not include ${moduleKey}.` };
}

export function checkValueAction(plan: PlanRow | null, actionKey: string): EntitlementResult {
  if (!plan) return { allowed: false, reason: 'This account has no Client Factory plan.' };
  if (grants(plan.entitlements.value_actions, actionKey)) return { allowed: true };
  return { allowed: false, reason: `${plan.name} does not include the ${actionKey} value action.` };
}

/** Every module the blueprint asks for, checked at once. Deploy calls this. */
export function checkModules(plan: PlanRow | null, keys: string[]): { allowed: boolean; denied: string[] } {
  const denied = keys.filter((k) => !checkModule(plan, k).allowed);
  return { allowed: denied.length === 0, denied };
}

/* ─────────────────────────────── limits ─────────────────────────────── */

export type LimitState = {
  metric: UsageMetric;
  limitKey: string | null;
  limit: number | null;
  used: number;
  remaining: number | null;
  /** Percent of allowance consumed, 0..∞. Null when the metric is uncapped. */
  pct: number | null;
  exceeded: boolean;
};

/** First day of the current calendar month, UTC, as an ISO timestamp. */
export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * How much of one metric this tenant has spent this month, against their plan.
 *
 * `limit === null` means the metric is uncapped on this plan (the internal
 * tenant, or a metric the plan does not meter). Uncapped is NOT the same as
 * zero, and conflating the two is how a plan silently blocks a feature it was
 * supposed to include.
 */
export async function limitState(
  supabase: SupabaseClient,
  tenantId: string,
  plan: PlanRow | null,
  metric: UsageMetric,
): Promise<LimitState> {
  const limitKey = PLAN_LIMIT_FOR_METRIC[metric] ?? null;
  const raw = limitKey && plan ? plan.limits?.[limitKey] : undefined;
  const limit = typeof raw === 'number' ? raw : null;

  const { data } = await supabase
    .from('factory_usage')
    .select('quantity')
    .eq('tenant_id', tenantId)
    .eq('metric', metric)
    .gte('occurred_at', monthStartIso());

  const used = ((data as { quantity: number }[]) ?? []).reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  return {
    metric,
    limitKey,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    pct: limit === null || limit === 0 ? null : (used / limit) * 100,
    exceeded: limit !== null && used >= limit,
  };
}

export type LimitCheck = { allowed: true; state: LimitState } | { allowed: false; reason: string; state: LimitState };

/**
 * May this tenant spend `qty` more of this metric right now?
 *
 * Checked BEFORE the work, not after, because the point of a limit is to stop
 * an unbounded cost rather than to explain one. Overage-capable plans are
 * handled by `overage_cents`: a plan that prices the overage lets the work
 * through and meters it; a plan that does not, refuses.
 */
export async function assertWithinLimit(
  supabase: SupabaseClient,
  tenantId: string,
  plan: PlanRow | null,
  metric: UsageMetric,
  qty = 1,
): Promise<LimitCheck> {
  const state = await limitState(supabase, tenantId, plan, metric);
  if (state.limit === null) return { allowed: true, state };
  if (state.used + qty <= state.limit) return { allowed: true, state };

  const overagePrice = plan?.overage_cents?.[state.limitKey ?? ''] ?? null;
  if (typeof overagePrice === 'number' && overagePrice > 0) return { allowed: true, state };

  return {
    allowed: false,
    reason: `Monthly ${state.limitKey ?? metric} allowance reached (${state.used} of ${state.limit}). Upgrade or raise the limit to continue.`,
    state,
  };
}

/** The whole limit picture for a tenant, for the usage panel and the alerts. */
export async function allLimitStates(
  supabase: SupabaseClient,
  tenantId: string,
  plan: PlanRow | null,
): Promise<LimitState[]> {
  const metrics = Object.keys(PLAN_LIMIT_FOR_METRIC) as UsageMetric[];
  return Promise.all(metrics.map((m) => limitState(supabase, tenantId, plan, m)));
}

/** Warn the customer before the bill surprises them, not after. */
export const OVERAGE_WARN_PCT = 80;

export function limitWarnings(states: LimitState[]): string[] {
  return states
    .filter((s) => s.pct !== null && s.pct >= OVERAGE_WARN_PCT)
    .map((s) =>
      s.exceeded
        ? `${s.limitKey} allowance is used up (${s.used} of ${s.limit}).`
        : `${s.limitKey} is at ${Math.round(s.pct as number)}% of the monthly allowance.`,
    );
}

/** How many Factories a plan allows. Checked when a new one is created. */
export function factoryAllowance(plan: PlanRow | null): number | null {
  const n = plan?.limits?.factories;
  return typeof n === 'number' ? n : null;
}
