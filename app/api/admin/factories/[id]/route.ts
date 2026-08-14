import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { loadBundle, parseJson, bad } from '@/lib/factory/server';
import { preflight } from '@/lib/factory/preflight';
import { blueprintHistory } from '@/lib/factory/blueprint';
import { reservoirCounts, hotRightNow } from '@/lib/factory/prospects';
import { factorySummary, winningSegments, findMoreLikeWinners } from '@/lib/factory/analytics';
import { pipelineSnapshot } from '@/lib/factory/crm';
import { usageForTenant, marginOf } from '@/lib/factory/usage';
import { allLimitStates } from '@/lib/factory/plans';
import { scoreHealth } from '@/lib/factory/health';
import { setControl, type ControlSwitch } from '@/lib/factory/compiler';
import { implementationComplexity, productizationRatio } from '@/lib/factory/productization';
import { recentAudit } from '@/lib/factory/audit-log';
import { queueDepth } from '@/lib/factory/queue';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Params = Promise<{ id: string }>;

/**
 * THE FACTORY CONTROL CENTRE, in one payload.
 *
 * Every panel on the detail screen comes from this route rather than from nine
 * chatty endpoints, because the panels are read together and a page that fires
 * nine requests is a page that renders in nine stages.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const bundle = await loadBundle(guard, id, { prefer: 'deployed' });
  if ('error' in bundle) return bundle.error;

  const { factory, tenantId, plan, blueprint, blueprintRow } = bundle;

  const { data: tenantRow } = await guard.supabase
    .from('factory_tenants')
    .select('id, name, slug, kind, plan_code, mrr_cents, client_email, status')
    .eq('id', tenantId)
    .maybeSingle();
  const tenant = tenantRow as { id: string; name: string; kind: string; mrr_cents: number | null } | null;

  const [history, reservoir, hot, usage, limits, events, queues] = await Promise.all([
    blueprintHistory(guard.supabase, factory.id),
    reservoirCounts(guard.supabase, tenantId, factory.id),
    hotRightNow(guard.supabase, tenantId, factory.id, 12),
    usageForTenant(guard.supabase, tenantId),
    allLimitStates(guard.supabase, tenantId, plan),
    recentAudit(guard.supabase, { factoryId: factory.id, limit: 30 }),
    queueDepth(guard.supabase, tenantId),
  ]);

  const health = await scoreHealth({
    supabase: guard.supabase,
    tenantId,
    factory,
    plan,
    mrrCents: tenant?.kind === 'internal' ? null : tenant?.mrr_cents ?? null,
  });

  // Everything below needs a valid blueprint. A Factory whose configuration
  // does not parse still renders its shell and says so, rather than 500ing.
  let report = null;
  let summary = null;
  let pipeline = null;
  let segments = null;
  let similar = null;
  let complexity = null;
  let ratio = null;

  if (blueprint) {
    [report, summary, pipeline, segments] = await Promise.all([
      preflight({ supabase: guard.supabase, tenantId, factory, blueprint, plan }),
      factorySummary(guard.supabase, tenantId, factory, blueprint),
      pipelineSnapshot(guard.supabase, tenantId, factory.id, blueprint.crm.pipeline),
      winningSegments(guard.supabase, tenantId, factory.id, 'industry'),
    ]);
    similar = findMoreLikeWinners(segments, 'industry');
    complexity = implementationComplexity(blueprint);
    ratio = await productizationRatio(guard.supabase, factory.id, blueprint);
  }

  return NextResponse.json({
    factory,
    tenant: tenantRow,
    plan: plan ? { code: plan.code, name: plan.name, limits: plan.limits, managed: plan.managed } : null,
    blueprint,
    blueprintMeta: blueprintRow
      ? { id: blueprintRow.id, version: blueprintRow.version, status: blueprintRow.status, changeSummary: blueprintRow.change_summary, createdBy: blueprintRow.created_by, createdAt: blueprintRow.created_at }
      : null,
    blueprintValid: !!blueprint,
    history: history.map((h) => ({ id: h.id, version: h.version, status: h.status, summary: h.change_summary, by: h.created_by, at: h.created_at })),
    preflight: report,
    health,
    reservoir,
    hot,
    summary,
    pipeline,
    segments,
    findMoreLike: similar,
    complexity,
    productization: ratio,
    usage: { ...usage, margin: marginOf(tenant?.kind === 'internal' ? 0 : tenant?.mrr_cents ?? null, usage.totalCostCents) },
    limits,
    queues,
    events,
  });
}

const patchSchema = z.object({
  control: z.enum(['factory', 'sourcing', 'outreach', 'ai', 'followup']).optional(),
  paused: z.boolean().optional(),
  reason: z.string().trim().max(400).optional(),
  autonomy: z.enum(['manual', 'assisted', 'factory']).optional(),
  mode: z.enum(['test', 'live']).optional(),
  name: z.string().trim().min(1).max(120).optional(),
});

/**
 * The control switches, autonomy, and the test/live flip.
 *
 * Going from live back to TEST is always allowed and is the safe direction.
 * Going test -> live is NOT done here: that is activation, which runs the
 * checklist. A route that could flip a Factory live without preflight would
 * make the checklist optional, and the checklist is the product.
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, patchSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const bundle = await loadBundle(guard, id);
  if ('error' in bundle) return bundle.error;
  const { factory, tenantId } = bundle;

  if (input.control && typeof input.paused === 'boolean') {
    const res = await setControl({
      supabase: guard.supabase,
      tenantId,
      factory,
      control: input.control as ControlSwitch,
      paused: input.paused,
      reason: input.reason,
      actor: guard.user.email,
      actorKind: 'admin',
    });
    if ('error' in res) return bad(res.error, 500);
    return NextResponse.json({ factory: res.factory });
  }

  if (input.mode === 'live') {
    return bad('Use the activation checklist to put a Factory live.');
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.autonomy) patch.autonomy = input.autonomy;
  if (input.mode === 'test') {
    patch.mode = 'test';
    patch.status = factory.status === 'live' ? 'testing' : factory.status;
  }
  if (input.name) patch.name = input.name;
  if (Object.keys(patch).length === 1) return bad('Nothing to change.');

  const { data, error } = await guard.supabase
    .from('factories')
    .update(patch)
    .eq('id', factory.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();
  if (error) return bad(error.message, 500);

  const { audit } = await import('@/lib/factory/audit-log');
  await audit(guard.supabase, {
    tenantId,
    factoryId: factory.id,
    actor: guard.user.email,
    actorKind: 'admin',
    action: input.autonomy ? 'factory.autonomy_changed' : input.mode ? 'factory.mode_changed' : 'factory.updated',
    meta: { autonomy: input.autonomy ?? null, mode: input.mode ?? null },
  });

  return NextResponse.json({ factory: data });
}
