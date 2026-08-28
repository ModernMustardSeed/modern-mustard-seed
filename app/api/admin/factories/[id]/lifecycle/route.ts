import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { loadBundle, parseJson, bad } from '@/lib/factory/server';
import { deployBlueprint, activateFactory } from '@/lib/factory/compiler';
import { simulateAgent } from '@/lib/factory/simulate';
import { preflight } from '@/lib/factory/preflight';
import { sendStep, render, unknownVariables } from '@/lib/factory/campaigns';
import { runValueAction } from '@/lib/factory/value-actions';
import { saveBlueprint } from '@/lib/factory/blueprint';
import { stripTenantData } from '@/lib/factory/templates';
import { prospectKey, slugify, type Blueprint, type FactoryRow } from '@/lib/factory/types';
import { audit } from '@/lib/factory/audit-log';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Params = Promise<{ id: string }>;

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('deploy'), blueprintId: z.string().uuid().optional(), humanMinutes: z.number().min(0).max(10_000).optional(), force: z.boolean().optional() }),
  z.object({ action: z.literal('activate') }),
  z.object({ action: z.literal('simulate') }),
  z.object({ action: z.literal('test_run') }),
  z.object({ action: z.literal('preflight') }),
  z.object({ action: z.literal('clone'), tenantId: z.string().uuid(), name: z.string().trim().min(1).max(120) }),
]);

/**
 * THE FACTORY LIFECYCLE: deploy, activate, simulate, test, clone.
 *
 * One route because these are the steps of a single sequence and an operator
 * moves through them in order. BUILD -> REVIEW -> DEPLOY -> TEST -> SIMULATE ->
 * ACTIVATE is the workflow the whole product is built to make short, and
 * splitting it across five endpoints would make the client stitch it back
 * together.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, schema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const bundle = await loadBundle(guard, id, { prefer: input.action === 'activate' ? 'deployed' : 'latest' });
  if ('error' in bundle) return bundle.error;
  const { factory, tenantId, plan, blueprint, blueprintRow } = bundle;

  if (!blueprint || !blueprintRow) {
    return bad('This Factory has no valid blueprint yet. Run the Build or fix the configuration first.');
  }

  switch (input.action) {
    case 'preflight': {
      const report = await preflight({ supabase: guard.supabase, tenantId, factory, blueprint, plan });
      return NextResponse.json({ preflight: report });
    }

    case 'deploy': {
      let target = blueprintRow;
      if (input.blueprintId && input.blueprintId !== blueprintRow.id) {
        const { data } = await guard.supabase
          .from('factory_blueprints')
          .select('*')
          .eq('id', input.blueprintId)
          .eq('factory_id', factory.id)
          .maybeSingle();
        if (!data) return bad('That blueprint version does not belong to this Factory.', 404);
        target = data as typeof blueprintRow;
      }
      if (input.force && guard.user.role !== 'owner') return bad('Only the owner can force a deploy past the checklist.', 403);

      const result = await deployBlueprint({
        supabase: guard.supabase,
        tenantId,
        factory,
        blueprintRow: target,
        actor: guard.user.email,
        humanMinutes: input.humanMinutes,
        force: input.force,
      });
      return result.ok
        ? NextResponse.json({ deployed: true, deploymentId: result.deploymentId, changes: result.changes, preflight: result.report })
        : NextResponse.json({ deployed: false, error: result.error, blockers: result.blockers, preflight: result.report }, { status: 400 });
    }

    case 'activate': {
      const result = await activateFactory({ supabase: guard.supabase, tenantId, factory, blueprint, actor: guard.user.email });
      return result.ok
        ? NextResponse.json({ activated: true, factory: result.factory })
        : NextResponse.json({ activated: false, error: result.error, blockers: result.blockers }, { status: 400 });
    }

    case 'simulate': {
      const result = await simulateAgent({
        supabase: guard.supabase,
        tenantId,
        factory,
        blueprint,
        blueprintId: blueprintRow.id,
        entitledModules: bundle.entitledModules,
        actor: guard.user.email,
      });
      return 'error' in result ? bad(result.error, 503) : NextResponse.json(result);
    }

    case 'test_run':
      return NextResponse.json(await testRun(guard.supabase, tenantId, factory, blueprint, guard.user.email));

    case 'clone':
      return cloneFactory(guard, tenantId, factory, blueprintRow.doc as unknown as Record<string, unknown>, input.tenantId, input.name);
  }
}

/* ────────────────────────────── test run ───────────────────────────── */

export type TestRunStep = { step: string; ok: boolean; detail: string };

/**
 * TEST MODE, end to end.
 *
 * Creates a test prospect, renders and "sends" every sequence step through the
 * real send path, and fires the configured value action. Nothing leaves the
 * building: the Factory is in test mode, the prospect is flagged is_test, and
 * the send gate refuses any address that is not a test record.
 *
 * The point is that this exercises the SAME code production uses. A test
 * harness that took a different path would prove nothing about the path that
 * mails strangers.
 */
async function testRun(
  supabase: SupabaseClient,
  tenantId: string,
  factory: FactoryRow,
  blueprint: Blueprint,
  actor: string,
): Promise<{ ok: boolean; steps: TestRunStep[] }> {
  const steps: TestRunStep[] = [];
  const bp = blueprint;

  if (factory.mode !== 'test') {
    return { ok: false, steps: [{ step: 'Mode', ok: false, detail: 'A test run only happens in test mode. Switch the Factory to test first.' }] };
  }

  const company = 'Test Prospect Co';
  const key = prospectKey({ domain: 'example.com', company, city: 'Phoenix' });
  const { data: prospectRow, error: prospectError } = await supabase
    .from('factory_prospects')
    .upsert(
      {
        tenant_id: tenantId,
        factory_id: factory.id,
        company,
        domain: 'example.com',
        website: 'https://example.com',
        contact_name: 'Alex Rivera',
        contact_title: 'Owner',
        email: 'test@example.com',
        city: 'Phoenix',
        region: 'AZ',
        industry: bp.icp[0]?.industries[0] ?? null,
        source: 'test',
        provider: 'test',
        state: 'ready',
        score: 100,
        is_test: true,
        dedupe_key: key,
        signals: { missed_calls_week: 12, review_count: 84, online_booking: false, email_verified: true },
      },
      { onConflict: 'factory_id,dedupe_key' },
    )
    .select('*')
    .single();

  if (prospectError || !prospectRow) {
    return { ok: false, steps: [{ step: 'Test prospect', ok: false, detail: prospectError?.message ?? 'Could not create the test prospect.' }] };
  }
  steps.push({ step: 'Test prospect', ok: true, detail: `${company} created as a test record. It can never be mailed for real.` });

  const { data: campaignRow } = await supabase
    .from('factory_campaigns')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('factory_id', factory.id)
    .limit(1)
    .maybeSingle();
  const campaign = campaignRow as { id: string; name: string } | null;
  if (!campaign) {
    steps.push({ step: 'Campaign', ok: false, detail: 'No campaign row. Deploy the blueprint first: campaigns are created by the compiler.' });
    return { ok: false, steps };
  }

  const prospect = prospectRow as {
    id: string; company: string; email: string | null; contact_name: string | null; contact_title: string | null;
    domain: string | null; website: string | null; city: string | null; region: string | null; industry: string | null; is_test: boolean;
  };

  // Value action first: its output feeds the sequence variables, which is the
  // order production runs in too.
  const configured = bp.value_actions[0];
  let valueActionUrl: string | null = null;
  let valueSummary: string | null = null;
  if (configured) {
    const res = await runValueAction(
      {
        supabase,
        tenantId,
        factory,
        blueprint: bp,
        prospect: { ...prospect, phone: null, signals: { missed_calls_week: 12 }, enrichment: {} },
        config: configured.config,
      },
      configured.key,
    );
    if ('error' in res) steps.push({ step: `Value action: ${configured.key}`, ok: false, detail: res.error });
    else {
      valueActionUrl = res.run.output_url;
      valueSummary = typeof res.run.output?.summary === 'string' ? (res.run.output.summary as string) : null;
      steps.push({
        step: `Value action: ${configured.key}`,
        ok: res.run.status === 'ready' || res.run.status === 'queued',
        detail: res.run.status === 'ready' ? 'Produced a real result against the test target.' : res.run.status === 'queued' ? 'Queued for the worker, as it would be in production.' : `Status ${res.run.status}.`,
      });
    }
  } else {
    steps.push({ step: 'Value action', ok: true, detail: 'None configured. The Factory will ask for a meeting without doing anything first.' });
  }

  const vars = {
    value_action_url: valueActionUrl ?? 'https://modernmustardseed.com/example-value-action',
    audit_top_three: valueSummary ?? 'Three specific findings would appear here.',
    monthly_leak: '$4,300',
    research_note: 'A specific observation from their own site would appear here.',
  };

  for (const c of bp.campaigns) {
    for (const step of c.sequence) {
      const unresolved = [...unknownVariables(step.subject), ...unknownVariables(step.body)];
      if (unresolved.length) {
        steps.push({ step: `${c.name} step ${step.step}`, ok: false, detail: `Unresolvable variables: ${unresolved.join(', ')}.` });
        continue;
      }
      const sent = await sendStep(supabase, tenantId, {
        factory,
        blueprint: bp,
        campaignId: campaign.id,
        prospect,
        step,
        vars,
      });
      steps.push(
        sent.ok
          ? { step: `${c.name} step ${step.step}`, ok: true, detail: `Rendered and gated cleanly: "${render(step.subject, { company: prospect.company, first_name: 'Alex', ...vars })}"` }
          : { step: `${c.name} step ${step.step}`, ok: false, detail: `${sent.reason} (${sent.code})` },
      );
    }
  }

  const ok = steps.every((s) => s.ok);
  await audit(supabase, {
    tenantId,
    factoryId: factory.id,
    actor,
    actorKind: 'admin',
    action: 'admin.action',
    target: 'test_run',
    meta: { ok, steps: steps.length },
  });
  return { ok, steps };
}

/* ─────────────────────────────── clone ─────────────────────────────── */

/**
 * CLONE FACTORY into another tenant.
 *
 * Structure only. `stripTenantData` removes the business facts, economics,
 * pricing, sender, owner, booking links and notes before the copy is written,
 * so a clone can never carry one customer's data into another customer's
 * account. What survives is the part worth copying: the workflow, the pipeline,
 * the scoring shape, the agent's role and the campaign skeleton.
 */
async function cloneFactory(
  guard: Extract<Awaited<ReturnType<typeof requireFactoryAdmin>>, { crossTenant: true }>,
  sourceTenantId: string,
  source: FactoryRow,
  sourceDoc: Record<string, unknown>,
  targetTenantId: string,
  name: string,
) {
  const { data: targetRow } = await guard.supabase
    .from('factory_tenants')
    .select('id, name, status')
    .eq('id', targetTenantId)
    .maybeSingle();
  const target = targetRow as { id: string; name: string; status: string } | null;
  if (!target) return bad('Target tenant not found.', 404);
  if (target.status !== 'active') return bad('That tenant is not active.');

  const { data: created, error } = await guard.supabase
    .from('factories')
    .insert({
      tenant_id: target.id,
      name,
      slug: slugify(name),
      template_key: source.template_key,
      template_version: source.template_version,
      status: 'draft',
      mode: 'test',
      autonomy: 'manual',
    })
    .select('*')
    .single();
  if (error) return bad(error.message, 400);
  const clone = created as FactoryRow;

  const stripped = stripTenantData(sourceDoc) as Record<string, unknown>;
  const { blueprintFromTemplate } = await import('@/lib/factory/blueprint');
  const built = blueprintFromTemplate(
    (source.template_key as string) ?? 'b2b-service',
    stripped as never,
    target.name,
  );

  let version: number | null = null;
  if (built.ok) {
    const saved = await saveBlueprint(guard.supabase, {
      tenantId: target.id,
      factoryId: clone.id,
      doc: built.doc,
      source: 'clone',
      createdBy: guard.user.email,
      changeSummary: `Cloned the structure of "${source.name}". No customer data was copied.`,
    });
    if ('row' in saved) version = saved.row.version;
  }

  await audit(guard.supabase, {
    tenantId: target.id,
    factoryId: clone.id,
    actor: guard.user.email,
    actorKind: 'admin',
    action: 'factory.cloned',
    target: source.id,
    meta: { from: source.name, fromTenant: sourceTenantId },
  });

  return NextResponse.json({
    factory: { id: clone.id, name: clone.name },
    blueprintVersion: version,
    stripped: ['business', 'economics', 'offer.packages', 'compliance senders', 'crm.owner_email', 'scheduling links', 'notes'],
    note: 'Structure only. Fill in the new customer\'s facts, economics and sender before this can deploy.',
  });
}
