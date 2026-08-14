import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin, requireFactoryOwner } from '@/lib/factory/tenant';
import { parseJson, bad } from '@/lib/factory/server';
import { MODULES, capabilityMap } from '@/lib/factory/modules';
import { listValueActions } from '@/lib/factory/value-actions';
import { listTools } from '@/lib/factory/tools';
import { TEMPLATES, allTemplates } from '@/lib/factory/templates';
import { listPlans } from '@/lib/factory/plans';
import { platformMargins, unprofitableTenants } from '@/lib/factory/usage';
import { deploymentEffort, productOpportunities, capabilitySummary, logRequest, normalizeRequest } from '@/lib/factory/productization';
import { queueDepth, requeueStale } from '@/lib/factory/queue';
import { bootstrapFactoryPlatform } from '@/lib/factory/bootstrap';
import { audit } from '@/lib/factory/audit-log';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * THE PLATFORM VIEW: what MMS can do, what it costs, and where the company's
 * own bottleneck is.
 *
 * This is the screen that answers the question the secondary directive is
 * actually about: is the customer count rising faster than the labour. Human
 * minutes per launch, the automation percentage, the productization ratio and
 * the repeated-request queue all live here, because if they are not measured
 * they will not fall.
 */
export async function GET() {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const [templates, plans, margins, effort, opportunities, queues, customRows] = await Promise.all([
    allTemplates(guard.supabase),
    listPlans(guard.supabase),
    platformMargins(guard.supabase),
    deploymentEffort(guard.supabase),
    productOpportunities(guard.supabase),
    queueDepth(guard.supabase),
    guard.supabase.from('factory_custom_code').select('*').eq('status', 'active').limit(200),
  ]);

  const customerTenants = margins.filter((m) => m.kind === 'customer');
  const mrrCents = customerTenants.reduce((s, m) => s + (m.mrrCents ?? 0), 0);
  const costCents = margins.reduce((s, m) => s + m.margin.costCents, 0);

  return NextResponse.json({
    registry: {
      modules: MODULES,
      valueActions: listValueActions(),
      tools: listTools(),
      templates: templates.length ? templates : TEMPLATES,
      capabilities: capabilityMap(),
      summary: capabilitySummary(),
    },
    plans,
    economics: {
      customerTenants: customerTenants.length,
      mrrCents,
      variableCostCents: costCents,
      grossMarginPct: mrrCents > 0 ? ((mrrCents - costCents) / mrrCents) * 100 : null,
      arpaCents: customerTenants.length ? Math.round(mrrCents / customerTenants.length) : null,
      unprofitable: unprofitableTenants(margins),
      byTenant: margins,
    },
    delivery: {
      effort,
      opportunities,
      customCode: customRows.data ?? [],
      bottleneck: companyBottleneck(effort, opportunities.length, unprofitableTenants(margins).length),
    },
    queues,
  });
}

/**
 * THE MMS SCALE BOTTLENECK. One sentence, from the same discipline the Factory
 * bottleneck engine uses: name the single thing limiting growth, not a list.
 */
function companyBottleneck(
  effort: Awaited<ReturnType<typeof deploymentEffort>>,
  openOpportunities: number,
  unprofitableCount: number,
): { area: string; verdict: string; recommendation: string } | null {
  if (effort.trend === 'rising') {
    return {
      area: 'Onboarding',
      verdict: `Median human minutes per launch is rising (${effort.medianMinutes} minutes across ${effort.count} deployments).`,
      recommendation: 'Find what operators are doing by hand on every launch and move it into a template or a module.',
    };
  }
  if (unprofitableCount > 0) {
    return {
      area: 'Unit economics',
      verdict: `${unprofitableCount} customer${unprofitableCount === 1 ? '' : 's'} run below 40% gross margin.`,
      recommendation: 'Check their usage mix against the plan limits before adding customers on the same plan.',
    };
  }
  if (openOpportunities >= 5) {
    return {
      area: 'Template coverage',
      verdict: `${openOpportunities} distinct customer requests are unproductized.`,
      recommendation: 'Build the ones three or more customers asked for. Those are modules, not favours.',
    };
  }
  if (effort.medianMinutes !== null && effort.medianMinutes > 60) {
    return {
      area: 'Deployment effort',
      verdict: `A standard launch still takes about ${effort.medianMinutes} human minutes.`,
      recommendation: 'The target for a standard template is under sixty. Look at what preflight keeps blocking on.',
    };
  }
  return null;
}

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('bootstrap') }),
  z.object({ action: z.literal('requeue_stale') }),
  z.object({
    action: z.literal('log_request'),
    title: z.string().trim().min(3).max(200),
    detail: z.string().trim().max(2000).optional(),
    kind: z.enum(['capability', 'integration', 'value_action', 'template', 'fix']).optional(),
    tenantId: z.string().uuid().optional(),
    factoryId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal('register_custom_code'),
    title: z.string().trim().min(3).max(200),
    purpose: z.string().trim().max(1000).optional(),
    location: z.string().trim().max(300).optional(),
    tenantId: z.string().uuid().optional(),
    factoryId: z.string().uuid().optional(),
    reusable: z.boolean().optional(),
    maintenanceRisk: z.enum(['low', 'medium', 'high']).optional(),
  }),
  z.object({
    action: z.literal('publish_template'),
    key: z.string().trim().min(2).max(60),
    version: z.number().int().min(1),
    channel: z.enum(['internal', 'beta', 'stable', 'deprecated']),
  }),
]);

export async function POST(req: Request) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseJson(req, postSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  switch (input.action) {
    case 'bootstrap': {
      const result = await bootstrapFactoryPlatform(guard.supabase, { actor: guard.user.email });
      return NextResponse.json(result);
    }

    case 'requeue_stale': {
      const requeued = await requeueStale(guard.supabase);
      return NextResponse.json({ requeued });
    }

    case 'log_request': {
      await logRequest(guard.supabase, {
        tenantId: input.tenantId ?? null,
        factoryId: input.factoryId ?? null,
        title: input.title,
        detail: input.detail,
        kind: input.kind,
        createdBy: guard.user.email,
      });
      const all = await productOpportunities(guard.supabase);
      const mine = all.find((o) => o.requestKey === normalizeRequest(input.title));
      return NextResponse.json({ logged: true, opportunity: mine ?? null });
    }

    case 'register_custom_code': {
      const { error } = await guard.supabase.from('factory_custom_code').insert({
        tenant_id: input.tenantId ?? null,
        factory_id: input.factoryId ?? null,
        title: input.title,
        purpose: input.purpose ?? null,
        location: input.location ?? null,
        owner: guard.user.email,
        reusable: input.reusable ?? null,
        maintenance_risk: input.maintenanceRisk ?? 'medium',
      });
      if (error) return bad(error.message, 500);
      return NextResponse.json({ registered: true });
    }

    case 'publish_template': {
      // Release channels move a template toward every future customer, so this
      // one is the owner's call rather than any admin's.
      const owner = await requireFactoryOwner();
      if ('error' in owner) return owner.error;

      const { data, error } = await guard.supabase
        .from('factory_templates')
        .update({ channel: input.channel, updated_at: new Date().toISOString() })
        .eq('key', input.key)
        .eq('version', input.version)
        .select('key, version, channel')
        .maybeSingle();
      if (error) return bad(error.message, 500);
      if (!data) return bad('Template version not found.', 404);

      await audit(guard.supabase, {
        actor: guard.user.email,
        actorKind: 'admin',
        action: input.channel === 'deprecated' ? 'template.deprecated' : 'template.published',
        target: `${input.key}@${input.version}`,
        meta: { channel: input.channel },
      });
      return NextResponse.json({ template: data });
    }
  }
}
