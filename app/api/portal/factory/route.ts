import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePortalTenant, requireWriteRole, loadFactory } from '@/lib/factory/tenant';
import { parseJson, bad, entitledModuleSet } from '@/lib/factory/server';
import { deployedBlueprint } from '@/lib/factory/blueprint';
import { validateBlueprint } from '@/lib/factory/blueprint';
import { getPlan, allLimitStates, limitWarnings } from '@/lib/factory/plans';
import { factorySummary } from '@/lib/factory/analytics';
import { reservoirCounts, hotRightNow } from '@/lib/factory/prospects';
import { pipelineSnapshot } from '@/lib/factory/crm';
import { usageForTenant } from '@/lib/factory/usage';
import { scoreHealth } from '@/lib/factory/health';
import { setControl, type ControlSwitch } from '@/lib/factory/compiler';
import { INBOX_CLASSES, type FactoryRow } from '@/lib/factory/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE CUSTOMER'S VIEW OF THEIR CLIENT FACTORY.
 *
 * Tenant scope comes from the SIGNED-IN EMAIL, never from the request: a
 * factoryId in the query string is at most a request to narrow what this person
 * already owns, and it is intersected with their memberships before a row is
 * read. That is the whole multi-tenancy guarantee, and it lives in
 * lib/factory/tenant.ts rather than being restated per route.
 *
 * WHAT A CUSTOMER SEES. Their results, their pipeline, what needs their
 * attention, what it is costing them against their plan, and the controls to
 * stop it. What they do NOT see: MMS's variable cost, our margin, other
 * tenants, or the template internals. Those are the product, not the
 * deliverable.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = await requirePortalTenant(url.searchParams.get('tenantId'));
  if ('error' in scope) return scope.error;

  const { data: factoryRows } = await scope.supabase
    .from('factories')
    .select('*')
    .eq('tenant_id', scope.tenantId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true });
  const factories = (factoryRows as FactoryRow[]) ?? [];
  if (!factories.length) {
    return NextResponse.json({ tenant: scope.tenant, factories: [], factory: null, note: 'Your Client Factory is being configured.' });
  }

  const wanted = url.searchParams.get('factoryId');
  const factory = (wanted && factories.find((f) => f.id === wanted)) || factories[0];

  const plan = await getPlan(scope.supabase, scope.tenant.plan_code);
  const row = await deployedBlueprint(scope.supabase, factory.id);
  const parsed = row ? validateBlueprint(row.doc) : null;
  const blueprint = parsed && parsed.ok ? parsed.doc : null;

  const [reservoir, hot, inbox, usage, limits, meetings] = await Promise.all([
    reservoirCounts(scope.supabase, scope.tenantId, factory.id),
    hotRightNow(scope.supabase, scope.tenantId, factory.id, 15),
    scope.supabase
      .from('factory_messages')
      .select('id, prospect_id, subject, body, classification, created_at')
      .eq('tenant_id', scope.tenantId)
      .eq('factory_id', factory.id)
      .eq('direction', 'inbound')
      .in('classification', INBOX_CLASSES)
      .order('created_at', { ascending: false })
      .limit(30),
    usageForTenant(scope.supabase, scope.tenantId),
    allLimitStates(scope.supabase, scope.tenantId, plan),
    scope.supabase
      .from('factory_meetings')
      .select('id, starts_at, attendee_name, attendee_email, status')
      .eq('tenant_id', scope.tenantId)
      .eq('factory_id', factory.id)
      .eq('is_test', false)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(20),
  ]);

  const summary = blueprint ? await factorySummary(scope.supabase, scope.tenantId, factory, blueprint) : null;
  const pipeline = blueprint ? await pipelineSnapshot(scope.supabase, scope.tenantId, factory.id, blueprint.crm.pipeline) : null;
  const health = await scoreHealth({ supabase: scope.supabase, tenantId: scope.tenantId, factory, plan, mrrCents: null });

  return NextResponse.json({
    tenant: { id: scope.tenant.id, name: scope.tenant.name, plan: plan ? { code: plan.code, name: plan.name } : null },
    role: scope.role,
    factories: factories.map((f) => ({ id: f.id, name: f.name, status: f.status, mode: f.mode })),
    factory: {
      id: factory.id,
      name: factory.name,
      status: factory.status,
      mode: factory.mode,
      autonomy: factory.autonomy,
      activatedAt: factory.activated_at,
      paused: {
        sourcing: factory.sourcing_paused,
        outreach: factory.outreach_paused,
        ai: factory.ai_paused,
        followup: factory.followup_paused,
      },
      pauseReason: factory.pause_reason,
    },
    agent: blueprint ? { name: blueprint.agent.name, role: blueprint.agent.role } : null,
    // Health without the cost dimension: our margin is not the customer's business.
    health: { overall: health.overall, band: health.band, reasons: health.reasons },
    summary,
    pipeline,
    reservoir,
    hot,
    inbox: inbox.data ?? [],
    meetings: meetings.data ?? [],
    usage: {
      limits,
      warnings: limitWarnings(limits),
      valueActions: usage.byMetric.value_actions?.quantity ?? 0,
      emails: usage.byMetric.emails_sent?.quantity ?? 0,
      conversations: usage.byMetric.ai_conversations?.quantity ?? 0,
    },
    entitledModules: [...entitledModuleSet(plan)],
  });
}

const controlSchema = z.object({
  factoryId: z.string().uuid(),
  control: z.enum(['factory', 'sourcing', 'outreach', 'ai', 'followup']),
  paused: z.boolean(),
  reason: z.string().trim().max(400).optional(),
});

/**
 * CUSTOMER CONTROLS. Pause the whole Factory, or just the sourcing, the
 * sending, the AI, or the follow-up.
 *
 * A customer can always stop their own machine without emailing us, which is
 * both the right default and the single biggest reduction in support load.
 * Resuming is equally theirs. What is NOT here: changing pricing, claims,
 * limits or the blueprint, which go through MMS.
 */
export async function POST(req: Request) {
  const scope = await requirePortalTenant();
  if ('error' in scope) return scope.error;

  const readOnly = requireWriteRole(scope);
  if (readOnly) return readOnly;

  const parsed = await parseJson(req, controlSchema);
  if ('error' in parsed) return parsed.error;

  const loaded = await loadFactory(scope, parsed.data.factoryId);
  if ('error' in loaded) return loaded.error;

  const res = await setControl({
    supabase: scope.supabase,
    tenantId: scope.tenantId,
    factory: loaded.factory,
    control: parsed.data.control as ControlSwitch,
    paused: parsed.data.paused,
    reason: parsed.data.reason,
    actor: scope.email,
    actorKind: 'client',
  });
  if ('error' in res) return bad(res.error, 500);

  return NextResponse.json({
    factory: {
      id: res.factory.id,
      status: res.factory.status,
      paused: {
        sourcing: res.factory.sourcing_paused,
        outreach: res.factory.outreach_paused,
        ai: res.factory.ai_paused,
        followup: res.factory.followup_paused,
      },
      pauseReason: res.factory.pause_reason,
    },
  });
}
