import type { SupabaseClient } from '@supabase/supabase-js';
import { UNIT_COST_CENTS, type UsageMetric } from './types';
import { monthStartIso } from './plans';

/**
 * USAGE ACCOUNTING AND MARGIN.
 *
 * Every operation with a real variable cost writes a row here, attributed to a
 * tenant, a Factory, a campaign and a module. That is the only way the sentence
 * "this customer pays $X and costs us $Y" is ever true rather than felt.
 *
 * IDEMPOTENCY IS THE POINT. A retried job must not bill twice, so `record`
 * takes a key and the table holds a unique index on (tenant_id,
 * idempotency_key). A duplicate insert is not an error condition to log and
 * worry about, it is the guard working: it returns `{ recorded: false }` and
 * the caller carries on.
 */

export type RecordUsageInput = {
  tenantId: string;
  factoryId?: string | null;
  campaignId?: string | null;
  metric: UsageMetric;
  moduleKey?: string | null;
  quantity?: number;
  /** Override the standard unit cost when a provider charged something specific. */
  costCents?: number;
  meta?: Record<string, unknown>;
  /** Stable across retries of the SAME work. Omit only for genuinely fire-once events. */
  idempotencyKey?: string;
};

export async function recordUsage(
  supabase: SupabaseClient,
  input: RecordUsageInput,
): Promise<{ recorded: boolean; costCents: number }> {
  const quantity = input.quantity ?? 1;
  const costCents = input.costCents ?? UNIT_COST_CENTS[input.metric] * quantity;

  const { error } = await supabase.from('factory_usage').insert({
    tenant_id: input.tenantId,
    factory_id: input.factoryId ?? null,
    campaign_id: input.campaignId ?? null,
    metric: input.metric,
    module_key: input.moduleKey ?? null,
    quantity,
    cost_cents: costCents,
    meta: input.meta ?? {},
    idempotency_key: input.idempotencyKey ?? null,
  });

  // 23505 = unique violation: this exact work was already billed. Correct outcome.
  if (error && (error as { code?: string }).code === '23505') return { recorded: false, costCents: 0 };
  if (error) {
    console.error('recordUsage failed', input.metric, error.message);
    return { recorded: false, costCents: 0 };
  }
  return { recorded: true, costCents };
}

export type UsageRollup = {
  byMetric: Record<string, { quantity: number; costCents: number }>;
  totalCostCents: number;
  from: string;
};

export async function usageForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  sinceIso = monthStartIso(),
): Promise<UsageRollup> {
  const { data } = await supabase
    .from('factory_usage')
    .select('metric, quantity, cost_cents')
    .eq('tenant_id', tenantId)
    .gte('occurred_at', sinceIso);

  const rows = (data as { metric: string; quantity: number; cost_cents: number }[]) ?? [];
  const byMetric: UsageRollup['byMetric'] = {};
  let totalCostCents = 0;
  for (const r of rows) {
    const bucket = (byMetric[r.metric] ??= { quantity: 0, costCents: 0 });
    bucket.quantity += Number(r.quantity || 0);
    bucket.costCents += Number(r.cost_cents || 0);
    totalCostCents += Number(r.cost_cents || 0);
  }
  return { byMetric, totalCostCents, from: sinceIso };
}

export type Margin = {
  revenueCents: number;
  costCents: number;
  grossCents: number;
  /** Null rather than 0 when there is no revenue: 0% margin and "not priced yet" are different facts. */
  grossPct: number | null;
};

export function marginOf(revenueCents: number | null, costCents: number): Margin {
  const revenue = revenueCents ?? 0;
  const gross = revenue - costCents;
  return {
    revenueCents: revenue,
    costCents,
    grossCents: gross,
    grossPct: revenue > 0 ? (gross / revenue) * 100 : null,
  };
}

/**
 * Platform-wide margin, one row per tenant.
 *
 * Internal tenants are included but flagged: MMS's own Factory has real cost and
 * no revenue, and quietly dropping it would understate what the platform
 * actually costs to run.
 */
export type TenantMargin = {
  tenantId: string;
  name: string;
  kind: string;
  planCode: string | null;
  mrrCents: number | null;
  margin: Margin;
};

export async function platformMargins(supabase: SupabaseClient, sinceIso = monthStartIso()): Promise<TenantMargin[]> {
  const [{ data: tenants }, { data: usage }] = await Promise.all([
    supabase.from('factory_tenants').select('id, name, kind, plan_code, mrr_cents'),
    supabase.from('factory_usage').select('tenant_id, cost_cents').gte('occurred_at', sinceIso),
  ]);

  const costs = new Map<string, number>();
  for (const r of (usage as { tenant_id: string; cost_cents: number }[]) ?? []) {
    costs.set(r.tenant_id, (costs.get(r.tenant_id) ?? 0) + Number(r.cost_cents || 0));
  }

  type T = { id: string; name: string; kind: string; plan_code: string | null; mrr_cents: number | null };
  return ((tenants as T[]) ?? []).map((t) => ({
    tenantId: t.id,
    name: t.name,
    kind: t.kind,
    planCode: t.plan_code,
    mrrCents: t.mrr_cents,
    margin: marginOf(t.kind === 'internal' ? 0 : t.mrr_cents, costs.get(t.id) ?? 0),
  }));
}

/** A tenant whose variable cost is eating the subscription. The alert that matters. */
export const MARGIN_ALERT_PCT = 40;

export function unprofitableTenants(rows: TenantMargin[]): TenantMargin[] {
  return rows.filter(
    (r) => r.kind !== 'internal' && r.margin.revenueCents > 0 && (r.margin.grossPct ?? 100) < MARGIN_ALERT_PCT,
  );
}
