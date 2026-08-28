import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { parseJson, bad } from '@/lib/factory/server';
import { refreshAllHealth, needsAttention } from '@/lib/factory/health';
import { platformMargins, unprofitableTenants } from '@/lib/factory/usage';
import { getPlan, factoryAllowance } from '@/lib/factory/plans';
import { blueprintFromTemplate, saveBlueprint } from '@/lib/factory/blueprint';
import { getTemplate } from '@/lib/factory/templates';
import { audit } from '@/lib/factory/audit-log';
import { slugify, type FactoryRow } from '@/lib/factory/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * ALL CLIENT FACTORIES. The MMS master view and the operations centre.
 *
 * The list is health-ranked rather than alphabetical, because at scale nobody
 * scrolls: the queue is "what needs a person today" and everything healthy is
 * meant to be invisible.
 */
export async function GET(req: Request) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

  const rows = await refreshAllHealth(guard.supabase, { limit: refresh ? 500 : 200 });
  const margins = await platformMargins(guard.supabase);

  const customerTenants = margins.filter((m) => m.kind === 'customer');
  const mrrCents = customerTenants.reduce((s, m) => s + (m.mrrCents ?? 0), 0);
  const costCents = margins.reduce((s, m) => s + m.margin.costCents, 0);

  return NextResponse.json({
    factories: rows.map((r) => ({
      id: r.factory.id,
      name: r.factory.name,
      slug: r.factory.slug,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      planCode: r.planCode,
      status: r.factory.status,
      mode: r.factory.mode,
      autonomy: r.factory.autonomy,
      templateKey: r.factory.template_key,
      activatedAt: r.factory.activated_at,
      health: r.health,
      paused: {
        sourcing: r.factory.sourcing_paused,
        outreach: r.factory.outreach_paused,
        ai: r.factory.ai_paused,
        followup: r.factory.followup_paused,
      },
    })),
    attention: needsAttention(rows).length,
    platform: {
      factories: rows.length,
      live: rows.filter((r) => r.factory.status === 'live').length,
      tenants: margins.length,
      customerTenants: customerTenants.length,
      mrrCents,
      variableCostCents: costCents,
      grossMarginPct: mrrCents > 0 ? ((mrrCents - costCents) / mrrCents) * 100 : null,
      unprofitable: unprofitableTenants(margins).map((t) => ({ name: t.name, grossPct: t.margin.grossPct })),
    },
  });
}

const createSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  templateKey: z.string().trim().min(1).max(80),
  /** An overlay from the Build, if this is being created straight out of the wizard. */
  overlay: z.record(z.string(), z.unknown()).optional(),
  businessName: z.string().trim().min(1).max(200).optional(),
});

/**
 * + NEW CLIENT FACTORY.
 *
 * Creates the Factory AND its first blueprint in one call, from a template, so
 * an operator never faces an empty configuration screen. It lands in draft and
 * test mode: nothing this route creates can contact anybody.
 */
export async function POST(req: Request) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseJson(req, createSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  if (!getTemplate(input.templateKey)) return bad(`Unknown template "${input.templateKey}".`);

  const { data: tenantRow } = await guard.supabase
    .from('factory_tenants')
    .select('id, name, plan_code, status')
    .eq('id', input.tenantId)
    .maybeSingle();
  const tenant = tenantRow as { id: string; name: string; plan_code: string | null; status: string } | null;
  if (!tenant) return bad('Tenant not found.', 404);
  if (tenant.status !== 'active') return bad('That tenant is not active.');

  const plan = await getPlan(guard.supabase, tenant.plan_code);
  const allowance = factoryAllowance(plan);
  if (allowance !== null) {
    const { count } = await guard.supabase
      .from('factories')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .neq('status', 'archived');
    if ((count ?? 0) >= allowance) {
      return bad(`${plan?.name ?? 'This plan'} includes ${allowance} Factor${allowance === 1 ? 'y' : 'ies'}. Upgrade to add another.`);
    }
  }

  const slug = slugify(input.name);
  const { data: created, error } = await guard.supabase
    .from('factories')
    .insert({
      tenant_id: tenant.id,
      name: input.name,
      slug,
      template_key: input.templateKey,
      template_version: getTemplate(input.templateKey)?.version ?? 1,
      status: 'draft',
      mode: 'test',
      autonomy: 'manual',
    })
    .select('*')
    .single();
  if (error) {
    return bad(
      (error as { code?: string }).code === '23505'
        ? `This tenant already has a Factory called "${input.name}".`
        : error.message,
      400,
    );
  }
  const factory = created as FactoryRow;

  const built = blueprintFromTemplate(
    input.templateKey,
    (input.overlay ?? {}) as Record<string, never>,
    input.businessName ?? tenant.name,
  );
  let blueprintVersion: number | null = null;
  let blueprintErrors: { path: string; message: string }[] = [];

  if (built.ok) {
    const saved = await saveBlueprint(guard.supabase, {
      tenantId: tenant.id,
      factoryId: factory.id,
      doc: built.doc,
      source: input.overlay ? 'forge' : 'template',
      createdBy: guard.user.email,
      changeSummary: `Created from the ${input.templateKey} template.`,
    });
    if ('row' in saved) blueprintVersion = saved.row.version;
  } else {
    blueprintErrors = built.errors;
  }

  await audit(guard.supabase, {
    tenantId: tenant.id,
    factoryId: factory.id,
    actor: guard.user.email,
    actorKind: 'admin',
    action: 'factory.created',
    meta: { template: input.templateKey, blueprintVersion },
  });

  return NextResponse.json({
    factory: { id: factory.id, name: factory.name, slug: factory.slug, status: factory.status, mode: factory.mode },
    blueprintVersion,
    // A blueprint that did not validate is reported, never swallowed: the
    // operator needs to know the Factory exists but its configuration does not.
    blueprintErrors,
  });
}
