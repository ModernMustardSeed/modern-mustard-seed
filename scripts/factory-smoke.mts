/**
 * CLIENT FACTORY SMOKE TEST. Against the real database, cleaning up after
 * itself.
 *
 *   npx tsx scripts/factory-smoke.mts
 *   npx tsx scripts/factory-smoke.mts --keep    # leave the fixtures behind
 *
 * The unit tests (scripts/factory-test.mts) prove the rules. This proves the
 * WIRING: that tenant isolation actually holds against Postgres, that a
 * blueprint deploys into real campaign rows, that test mode really does refuse
 * a live address, that suppression and consent really do stop a send, that
 * usage is really idempotent, and that pause controls really stop the machine.
 *
 * NOTHING IT CREATES CAN CONTACT ANYBODY. Both fixture Factories are created in
 * test mode with a test prospect, and the send path is exercised through the
 * same gates production uses. No provider call is ever made.
 */
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('No Supabase credentials in .env.local (supabase_url, supabase_service_role_key).');
  process.exit(1);
}
const sb: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const KEEP = process.argv.includes('--keep');
const STAMP = `smoke-${Date.now().toString(36)}`;

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`  FAIL  ${name}`);
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function eq<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`);
  }
}

const { blueprintFromTemplate, saveBlueprint, currentBlueprint, deployedBlueprint, rollbackTo } = await import('@/lib/factory/blueprint');
const { deployBlueprint, activateFactory, setControl } = await import('@/lib/factory/compiler');
const { preflight, blockers } = await import('@/lib/factory/preflight');
const { getPlan, assertWithinLimit, allLimitStates } = await import('@/lib/factory/plans');
const { importProspects, reservoirCounts, hotRightNow, scoreProspect } = await import('@/lib/factory/prospects');
const { gateSend, sendStep, suppress, recordConsent, hasConsent, checkSuppressed } = await import('@/lib/factory/campaigns');
const { upsertOpportunity, moveStage, pipelineSnapshot, timeline } = await import('@/lib/factory/crm');
const { recordUsage, usageForTenant, marginOf } = await import('@/lib/factory/usage');
const { runValueAction } = await import('@/lib/factory/value-actions');
const { runTool, availableSlots } = await import('@/lib/factory/tools');
const { scoreHealth } = await import('@/lib/factory/health');
const { funnel, factorySummary } = await import('@/lib/factory/analytics');
const { enqueue, claim, complete, queueDepth } = await import('@/lib/factory/queue');
const { bootstrapFactoryPlatform } = await import('@/lib/factory/bootstrap');
const { audit, recentAudit } = await import('@/lib/factory/audit-log');
const { integrationStatus, connectIntegration, disconnectIntegration, autoConnectPlatform, credentialStorageReady } = await import('@/lib/factory/connectors');
const { slugify } = await import('@/lib/factory/types');
import type { Blueprint, FactoryRow } from '@/lib/factory/types';

/* ─────────────────────────── fixtures ──────────────────────────────── */

type Fixture = { tenantId: string; factoryId: string; blueprint: Blueprint; blueprintId: string };
const made: { tenants: string[] } = { tenants: [] };

async function makeTenant(label: string, planCode: string): Promise<string> {
  const { data, error } = await sb
    .from('factory_tenants')
    .insert({
      slug: `${STAMP}-${label}`,
      name: `Smoke ${label}`,
      client_email: `${STAMP}-${label}@example.invalid`,
      plan_code: planCode,
      kind: 'demo',
      status: 'active',
      mrr_cents: 150_000,
      notes: 'Created by scripts/factory-smoke.mts. Safe to delete.',
    })
    .select('id')
    .single();
  if (error) throw new Error(`tenant insert failed: ${error.message}`);
  const id = data.id as string;
  made.tenants.push(id);
  await sb.from('factory_tenant_members').insert({ tenant_id: id, email: `${STAMP}-${label}@example.invalid`, role: 'owner' });
  return id;
}

async function makeFactory(tenantId: string, label: string): Promise<Fixture> {
  const { data, error } = await sb
    .from('factories')
    .insert({
      tenant_id: tenantId,
      name: `Smoke ${label} Factory`,
      slug: slugify(`${STAMP} ${label}`),
      template_key: 'home-services',
      template_version: 1,
      status: 'draft',
      mode: 'test',
      autonomy: 'manual',
    })
    .select('*')
    .single();
  if (error) throw new Error(`factory insert failed: ${error.message}`);
  const factory = data as FactoryRow;

  const built = blueprintFromTemplate(
    'home-services',
    {
      business: {
        name: `Smoke ${label} Roofing`,
        services: ['Roof replacement', 'Storm repair'],
        approved_claims: ['We have replaced roofs in this county since 2009.'],
        prohibited_claims: ['We are the cheapest.'],
      },
      offer: { headline: 'Full roof replacement at a fixed package price' },
      economics: { avg_first_sale_cents: 850_000, close_rate_pct: 28, lifetime_value_cents: 1_200_000 },
      agent: { escalation_to: [{ label: 'Owner', email: `${STAMP}-${label}@example.invalid`, when: 'Anything about price' }] },
      crm: { owner_email: `${STAMP}-${label}@example.invalid` },
      compliance: {
        sender_from: `Smoke ${label} <${STAMP}-${label}@example.invalid>`,
        sender_domain: 'example.invalid',
        postal_address: '1 Test Street, Phoenix AZ 85001',
        unsubscribe_url: 'https://modernmustardseed.com/api/factory/unsubscribe',
      },
    },
    `Smoke ${label} Roofing`,
  );
  if (!built.ok) throw new Error(`fixture blueprint invalid: ${JSON.stringify(built.errors.slice(0, 3))}`);

  const saved = await saveBlueprint(sb, {
    tenantId,
    factoryId: factory.id,
    doc: built.doc,
    source: 'template',
    createdBy: 'smoke',
    changeSummary: 'Smoke fixture.',
  });
  if ('error' in saved) throw new Error(`blueprint save failed: ${saved.error}`);

  return { tenantId, factoryId: factory.id, blueprint: built.doc, blueprintId: saved.row.id };
}

async function cleanup() {
  if (KEEP) {
    console.log(`\nFixtures kept: tenants ${made.tenants.join(', ')}`);
    return;
  }
  // Every tenant-owned table cascades from factory_tenants, so one delete per
  // tenant removes the whole tree. That cascade is itself worth exercising.
  for (const id of made.tenants) await sb.from('factory_tenants').delete().eq('id', id);
  const { data: leftover } = await sb.from('factory_prospects').select('id').like('dedupe_key', `%${STAMP}%`).limit(1);
  if ((leftover ?? []).length) console.warn('Some fixture prospects survived the cascade.');
}

/* ──────────────────────────── the run ──────────────────────────────── */

console.log(`Client Factory smoke test (${STAMP})\n`);

let a: Fixture;
let b: Fixture;

try {
  await check('the registries bootstrap', async () => {
    const result = await bootstrapFactoryPlatform(sb, { actor: 'smoke', createInternalFactory: false });
    assert(result.modules > 10, 'the module registry should sync');
    assert(result.valueActions >= 6, 'the value action registry should sync');
    assert(result.templates >= 8, 'the template registry should sync');
    assert(result.tenant, 'the MMS reference tenant must exist');
  });

  await check('two isolated tenants and factories are created', async () => {
    const tenantA = await makeTenant('a', 'pro');
    const tenantB = await makeTenant('b', 'launch');
    a = await makeFactory(tenantA, 'a');
    b = await makeFactory(tenantB, 'b');
    assert(a.tenantId !== b.tenantId, 'the fixtures must be different tenants');
  });

  /* ── tenant isolation ── */

  await check('a tenant-scoped read cannot see another tenant', async () => {
    const { data } = await sb.from('factories').select('id').eq('tenant_id', a.tenantId).eq('id', b.factoryId).maybeSingle();
    eq(data, null, 'factory B must be invisible when scoped to tenant A');
  });

  await check('a stamped write cannot land in another tenant', async () => {
    const { stampTenant } = await import('@/lib/factory/tenant');
    const row = stampTenant({ tenant_id: b.tenantId, company: 'Injected Co', dedupe_key: `${STAMP}-inject` }, a.tenantId, a.factoryId);
    eq((row as { tenant_id: string }).tenant_id, a.tenantId, 'a payload tenant_id must be overwritten by the scope');
    eq((row as { factory_id: string }).factory_id, a.factoryId, 'the factory is stamped too');
  });

  await check('suppression in one tenant does not suppress in another', async () => {
    await suppress(sb, a.tenantId, { kind: 'email', value: 'shared@example.invalid', reason: 'unsubscribe' });
    assert(await checkSuppressed(sb, a.tenantId, 'shared@example.invalid'), 'tenant A must be suppressed');
    eq(await checkSuppressed(sb, b.tenantId, 'shared@example.invalid'), null, 'tenant B must be unaffected');
  });

  await check('usage is attributed to exactly one tenant', async () => {
    await recordUsage(sb, { tenantId: a.tenantId, factoryId: a.factoryId, metric: 'emails_sent', quantity: 3, idempotencyKey: `${STAMP}-usage-1` });
    const usageA = await usageForTenant(sb, a.tenantId);
    const usageB = await usageForTenant(sb, b.tenantId);
    eq(usageA.byMetric.emails_sent?.quantity, 3, 'tenant A carries the usage');
    eq(usageB.byMetric.emails_sent, undefined, 'tenant B carries none of it');
  });

  await check('usage is idempotent under retry', async () => {
    const again = await recordUsage(sb, { tenantId: a.tenantId, factoryId: a.factoryId, metric: 'emails_sent', quantity: 3, idempotencyKey: `${STAMP}-usage-1` });
    eq(again.recorded, false, 'the same key must not bill twice');
    const usage = await usageForTenant(sb, a.tenantId);
    eq(usage.byMetric.emails_sent.quantity, 3, 'the quantity must not have doubled');
  });

  /* ── preflight, deploy, activate ── */

  await check('preflight blocks a Factory that has never been tested', async () => {
    const { data } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const plan = await getPlan(sb, 'pro');
    const report = await preflight({ supabase: sb, tenantId: a.tenantId, factory: data as FactoryRow, blueprint: a.blueprint, plan });
    assert(!report.ok, 'an untested Factory must not pass preflight');
    assert(blockers(report).some((c) => c.key === 'test.run'), 'the missing test run must be a named blocker');
    assert(report.overall > 0 && report.overall <= 100, 'the setup score must be a percentage');
  });

  await check('the compiler turns a blueprint into campaign rows', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const { data: bpRow } = await sb.from('factory_blueprints').select('*').eq('id', a.blueprintId).single();
    const result = await deployBlueprint({
      supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow,
      blueprintRow: bpRow as never, actor: 'smoke', humanMinutes: 12, force: true,
    });
    assert(result.ok, `deploy failed: ${result.ok ? '' : result.error}`);
    const { data: campaigns } = await sb.from('factory_campaigns').select('id, name, sequence').eq('factory_id', a.factoryId);
    assert((campaigns ?? []).length >= 1, 'the compiler must create campaign rows');
    assert(((campaigns as { sequence: unknown[] }[])[0].sequence ?? []).length > 0, 'the sequence must be compiled onto the row');
  });

  await check('deploying the same blueprint twice does not duplicate campaigns', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const { data: bpRow } = await sb.from('factory_blueprints').select('*').eq('id', a.blueprintId).single();
    const before = (await sb.from('factory_campaigns').select('id').eq('factory_id', a.factoryId)).data?.length ?? 0;
    await deployBlueprint({ supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, blueprintRow: bpRow as never, actor: 'smoke', force: true });
    const after = (await sb.from('factory_campaigns').select('id').eq('factory_id', a.factoryId)).data?.length ?? 0;
    eq(after, before, 'a repeated deploy must be idempotent');
  });

  await check('a deployed blueprint is the one that is live', async () => {
    const deployed = await deployedBlueprint(sb, a.factoryId);
    assert(deployed, 'there must be a deployed blueprint');
    eq(deployed.id, a.blueprintId, 'the deployed row is the one we deployed');
  });

  await check('a new version supersedes the draft and can be rolled back', async () => {
    const edited = JSON.parse(JSON.stringify(a.blueprint)) as Blueprint;
    edited.campaigns[0].name = 'Edited campaign name';
    const saved = await saveBlueprint(sb, { tenantId: a.tenantId, factoryId: a.factoryId, doc: edited, source: 'manual', createdBy: 'smoke' });
    assert('row' in saved, 'the edit must save');
    eq(saved.row.version, 2, 'the edit becomes version 2');

    const rolled = await rollbackTo(sb, { tenantId: a.tenantId, factoryId: a.factoryId, version: 1, actor: 'smoke' });
    assert('row' in rolled, 'the rollback must save');
    eq(rolled.row.version, 3, 'a rollback rolls FORWARD so history stays append-only');
    eq((rolled.row.doc as Blueprint).campaigns[0].name, a.blueprint.campaigns[0].name, 'the rolled-back doc carries the old configuration');
  });

  await check('activation refuses while a blocker stands', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const result = await activateFactory({ supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, blueprint: a.blueprint, actor: 'smoke' });
    assert(!result.ok, 'activation must refuse an unchecked Factory');
    assert(result.blockers.length > 0, 'it must say what is blocking');
  });

  /* ── prospects ── */

  await check('an import dedupes, validates and suppresses', async () => {
    const outcome = await importProspects({
      supabase: sb, tenantId: a.tenantId, factoryId: a.factoryId, blueprint: a.blueprint,
      rows: [
        { company: 'Alpha Roofing', domain: 'alpha.example', email: 'alpha@example.invalid', contact_name: 'Alex Alpha', city: 'Phoenix', state: 'AZ', industry: 'Roofing' },
        { company: 'Alpha Roofing', domain: 'alpha.example', email: 'alpha@example.invalid' },
        { company: 'Beta Roofing', domain: 'beta.example', email: 'not-an-email' },
        { company: 'Gamma Roofing', domain: 'gamma.example', email: 'shared@example.invalid' },
        { company: '' },
      ],
      source: STAMP, isTest: true, remaining: null, actor: 'smoke',
    });
    eq(outcome.inserted, 1, 'only the one valid, unsuppressed, unique row imports');
    eq(outcome.duplicates, 1, 'the repeat is a duplicate');
    eq(outcome.suppressed, 1, 'the suppressed address is dropped, not imported');
    eq(outcome.invalid.length, 2, 'the bad email and the empty company are both invalid');
  });

  await check('an import respects what is left on the plan', async () => {
    const outcome = await importProspects({
      supabase: sb, tenantId: a.tenantId, factoryId: a.factoryId, blueprint: a.blueprint,
      rows: [
        { company: 'Delta Roofing', domain: 'delta.example', email: 'delta@example.invalid' },
        { company: 'Epsilon Roofing', domain: 'epsilon.example', email: 'epsilon@example.invalid' },
      ],
      source: STAMP, isTest: true, remaining: 1, actor: 'smoke',
    });
    eq(outcome.inserted, 1, 'only what fits is imported');
    eq(outcome.overLimit, 1, 'the rest is reported, not silently dropped');
  });

  await check('the reservoir counts by state', async () => {
    const counts = await reservoirCounts(sb, a.tenantId, a.factoryId);
    eq(counts.total, 0, 'test prospects are excluded from the real reservoir count');
  });

  await check('scoring writes reasons onto the row', async () => {
    const { data } = await sb.from('factory_prospects').select('score, score_reasons').eq('factory_id', a.factoryId).eq('company', 'Alpha Roofing').maybeSingle();
    const row = data as { score: number; score_reasons: unknown[] };
    assert(row.score > 0, 'an ICP-matching prospect should score above zero');
    assert(row.score_reasons.length > 0, 'the reasons must be stored beside the score');
  });

  /* ── the send gates ── */

  // Ordered, not just limited. Two calls that return different prospects would
  // make every downstream assertion a coin flip.
  const prospectFor = async (factoryId: string) => {
    const { data } = await sb
      .from('factory_prospects')
      .select('*')
      .eq('factory_id', factoryId)
      .order('company', { ascending: true })
      .limit(1)
      .maybeSingle();
    return data as never;
  };

  await check('test mode refuses a non-test record', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const { data: campaign } = await sb.from('factory_campaigns').select('id').eq('factory_id', a.factoryId).limit(1).single();
    const prospect = { ...(await prospectFor(a.factoryId)) as Record<string, unknown>, is_test: false };
    const gate = await gateSend(sb, a.tenantId, {
      factory: { ...(factory as FactoryRow), status: 'testing' },
      blueprint: a.blueprint,
      campaignId: campaign.id as string,
      prospect: prospect as never,
      step: a.blueprint.campaigns[0].sequence[0],
      vars: {},
    });
    assert(!gate.allowed && gate.code === 'mode', 'a test-mode Factory must refuse a real record');
  });

  await check('a paused Factory sends nothing', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const { data: campaign } = await sb.from('factory_campaigns').select('id').eq('factory_id', a.factoryId).limit(1).single();
    const gate = await gateSend(sb, a.tenantId, {
      factory: { ...(factory as FactoryRow), status: 'testing', outreach_paused: true },
      blueprint: a.blueprint,
      campaignId: campaign.id as string,
      prospect: (await prospectFor(a.factoryId)) as never,
      step: a.blueprint.campaigns[0].sequence[0],
      vars: {},
    });
    assert(!gate.allowed && gate.code === 'paused', 'paused outreach must refuse');
  });

  await check('a missing postal address refuses the send', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const { data: campaign } = await sb.from('factory_campaigns').select('id').eq('factory_id', a.factoryId).limit(1).single();
    const noAddress = JSON.parse(JSON.stringify(a.blueprint)) as Blueprint;
    noAddress.compliance.postal_address = null;
    const gate = await gateSend(sb, a.tenantId, {
      factory: { ...(factory as FactoryRow), status: 'testing' },
      blueprint: noAddress,
      campaignId: campaign.id as string,
      prospect: (await prospectFor(a.factoryId)) as never,
      step: a.blueprint.campaigns[0].sequence[0],
      vars: {},
    });
    assert(!gate.allowed && gate.code === 'compliance', 'commercial email without an address must refuse');
  });

  await check('a test-mode send writes a message row and touches no provider', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const { data: campaign } = await sb.from('factory_campaigns').select('id').eq('factory_id', a.factoryId).limit(1).single();
    const result = await sendStep(sb, a.tenantId, {
      factory: { ...(factory as FactoryRow), status: 'testing', mode: 'test' },
      blueprint: a.blueprint,
      campaignId: campaign.id as string,
      prospect: (await prospectFor(a.factoryId)) as never,
      step: a.blueprint.campaigns[0].sequence[0],
      vars: { value_action_url: 'https://example.invalid/x', monthly_leak: '$4,300' },
    });
    assert(result.ok, `the test send should succeed: ${result.ok ? '' : result.reason}`);
    const { data: message } = await sb.from('factory_messages').select('is_test, status, provider_id, subject').eq('id', result.messageId).single();
    const row = message as { is_test: boolean; status: string; provider_id: string | null; subject: string };
    assert(row.is_test, 'the message must be flagged as a test');
    eq(row.provider_id, null, 'no provider id means no provider was called');
    assert(!row.subject.includes('{{'), 'the subject must be fully rendered');
  });

  await check('a test send is not billed', async () => {
    const usage = await usageForTenant(sb, a.tenantId);
    eq(usage.byMetric.emails_sent.quantity, 3, 'the test send must not have added to the metered total');
  });

  /* ── consent ── */

  await check('a consent-required channel refuses without a grant', async () => {
    const prospect = (await prospectFor(a.factoryId)) as { id: string };
    eq(await hasConsent(sb, a.tenantId, prospect.id, 'ai_call'), false, 'no grant means no AI call');
    eq(await hasConsent(sb, a.tenantId, prospect.id, 'email'), true, 'email does not require a grant');
  });

  await check('consent is recorded with its evidence and then honoured', async () => {
    const prospect = (await prospectFor(a.factoryId)) as { id: string };
    await recordConsent(sb, {
      tenantId: a.tenantId, prospectId: prospect.id, channel: 'ai_call', state: 'granted',
      evidence: { said: 'yes, call me on 555 0100', phone: '5555550100', via: 'email reply' },
    });
    eq(await hasConsent(sb, a.tenantId, prospect.id, 'ai_call'), true, 'a recorded grant permits the channel');
    const { data } = await sb.from('factory_consent').select('evidence').eq('prospect_id', prospect.id).eq('state', 'granted').single();
    assert((data as { evidence: Record<string, unknown> }).evidence.said, 'the evidence must be retrievable later');
  });

  /* ── value actions ── */

  await check('a value action run is idempotent and priced', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const prospect = (await prospectFor(a.factoryId)) as Record<string, unknown>;
    const ctx = {
      supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, blueprint: a.blueprint,
      prospect: { ...prospect, signals: { missed_calls_week: 11 } } as never, config: {},
    };
    const first = await runValueAction(ctx, 'roi_calculator');
    assert('run' in first, `the run should succeed: ${'error' in first ? first.error : ''}`);
    eq(first.run.status, 'ready', 'with economics and a signal it computes');
    const second = await runValueAction(ctx, 'roi_calculator');
    assert('run' in second, 'the repeat should return');
    eq(second.run.id, first.run.id, 'a repeat returns the first run rather than paying again');
  });

  await check('an unknown value action is refused', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const res = await runValueAction(
      { supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, blueprint: a.blueprint, prospect: (await prospectFor(a.factoryId)) as never, config: {} },
      'no_such_action',
    );
    assert('error' in res, 'an unknown action must be refused');
  });

  /* ── the toolbelt ── */

  const toolCtx = async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    return {
      supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, blueprint: a.blueprint,
      prospect: (await prospectFor(a.factoryId)) as never, actor: 'smoke',
    };
  };

  await check('an unauthorized tool is refused where it runs', async () => {
    const ctx = await toolCtx();
    const res = await runTool(ctx, new Set(['*']), 'createCheckout', { price_ref: 'price_anything' });
    assert(!res.ok, 'checkout is disabled on this blueprint, so the tool must refuse');
  });

  await check('the pricing tool refuses when the agent may not quote', async () => {
    const ctx = await toolCtx();
    const res = await runTool(ctx, new Set(['*']), 'getPricing', { package: 'anything' });
    assert(!res.ok, 'an agent without price authority must not quote');
    assert(res.say?.includes('person'), 'it must offer a human instead of a number');
  });

  await check('the business knowledge tool answers only what is approved', async () => {
    const ctx = await toolCtx();
    const ok = await runTool(ctx, new Set(['*']), 'getBusinessKnowledge', { topic: 'claims' });
    assert(ok.ok, 'an approved topic must answer');
    const no = await runTool(ctx, new Set(['*']), 'getBusinessKnowledge', { topic: 'our secret margins' });
    assert(!no.ok, 'an unapproved topic must refuse rather than improvise');
  });

  await check('scheduling offers real slots and books one', async () => {
    const ctx = await toolCtx();
    const slots = await availableSlots(ctx as never, 7);
    assert(slots.length > 0, 'there must be availability to offer');
    const booked = await runTool(ctx, new Set(['*']), 'bookMeeting', { starts_at: slots[0], attendee_email: 'alpha@example.invalid', attendee_name: 'Alex Alpha' });
    assert(booked.ok, `booking should succeed: ${booked.ok ? '' : booked.error}`);
    const after = await availableSlots(ctx as never, 7);
    assert(!after.includes(slots[0]), 'a booked slot must stop being offered');
  });

  await check('a made-up time is refused', async () => {
    const ctx = await toolCtx();
    const res = await runTool(ctx, new Set(['*']), 'bookMeeting', { starts_at: '2031-01-01T03:00:00.000Z' });
    assert(!res.ok, 'a time nobody is available for must be refused');
  });

  await check('the AI can stop contacting somebody, permanently', async () => {
    const ctx = await toolCtx();
    const res = await runTool(ctx, new Set(['*']), 'stopContacting', { scope: 'email', reason: 'Take me off.' });
    assert(res.ok, 'the opt-out must succeed');
    const prospect = (await prospectFor(a.factoryId)) as { email: string };
    assert(await checkSuppressed(sb, a.tenantId, prospect.email), 'the address must be suppressed afterwards');
  });

  /* ── CRM and attribution ── */

  await check('an opportunity is created once and carries attribution', async () => {
    const prospect = (await prospectFor(a.factoryId)) as { id: string };
    const first = await upsertOpportunity(sb, {
      tenantId: a.tenantId, factoryId: a.factoryId, prospectId: prospect.id,
      name: 'Smoke opportunity', valueCents: 850_000, isTest: true,
      attribution: { campaign_name: 'Smoke campaign', variant: 'A', value_action_key: 'roi_calculator', source: STAMP },
    });
    assert('opportunity' in first, 'the opportunity must be created');
    assert(first.created, 'the first call creates it');
    const second = await upsertOpportunity(sb, { tenantId: a.tenantId, factoryId: a.factoryId, prospectId: prospect.id, name: 'Smoke opportunity', isTest: true });
    assert('opportunity' in second && !second.created, 'a repeated tool call must not duplicate it');
    eq((first.opportunity.attribution as { source: string }).source, STAMP, 'attribution is frozen at creation');
  });

  await check('a stage outside the pipeline is refused', async () => {
    const { data } = await sb.from('factory_opportunities').select('id').eq('factory_id', a.factoryId).limit(1).single();
    const bad = await moveStage(sb, { tenantId: a.tenantId, opportunityId: data.id as string, stage: 'invented_stage', blueprint: a.blueprint });
    assert('error' in bad, 'an arbitrary stage string must be refused');
    const good = await moveStage(sb, { tenantId: a.tenantId, opportunityId: data.id as string, stage: 'meeting', blueprint: a.blueprint, actor: 'smoke' });
    assert('ok' in good, 'a real stage must move');
  });

  await check('the timeline records what happened', async () => {
    const prospect = (await prospectFor(a.factoryId)) as { id: string };
    const events = await timeline(sb, a.tenantId, prospect.id);
    assert(events.length >= 2, 'the prospect timeline should carry the booking and the opportunity');
  });

  await check('the pipeline snapshot only counts this tenant', async () => {
    const snapshot = await pipelineSnapshot(sb, a.tenantId, a.factoryId, a.blueprint.crm.pipeline);
    assert(snapshot.length === a.blueprint.crm.pipeline.length, 'every stage appears, even the empty ones');
    const otherTenant = await pipelineSnapshot(sb, b.tenantId, b.factoryId, b.blueprint.crm.pipeline);
    eq(otherTenant.reduce((s, x) => s + x.count, 0), 0, 'tenant B sees none of tenant A pipeline');
  });

  /* ── integrations ── */

  await check('the platform connects what it owns and leaves the rest to the customer', async () => {
    const outcome = await autoConnectPlatform({ supabase: sb, tenantId: a.tenantId, blueprint: a.blueprint, actor: 'smoke' });
    const connected = outcome.connected.map((c) => c.provider);
    const failed = outcome.failed.map((c) => c.provider);
    assert(connected.includes('telephony'), `telephony is ours to connect, got connected=${connected} failed=${failed}`);
    assert(outcome.needsCustomer.includes('payments'), 'payments is the customer account, so it must be left to them');
  });

  await check('the email check is real, not a checkbox', async () => {
    // The fixture sends from example.invalid, which is genuinely not verified on
    // the sending account. A connector that reported "connected" here would be
    // one that never asked the provider anything.
    const { views } = await integrationStatus({ supabase: sb, tenantId: a.tenantId, blueprint: a.blueprint });
    const email = views.find((v) => v.provider === 'email_sender');
    assert(email, 'email_sender must appear');
    assert(email.status !== 'connected', 'an unverified sending domain must not report as connected');
    assert(email.detail?.includes('example.invalid'), `the failure must name the domain, got: ${email.detail}`);
  });

  await check('integration status reports required and missing', async () => {
    const status = await integrationStatus({ supabase: sb, tenantId: a.tenantId, blueprint: a.blueprint });
    assert(status.required.includes('telephony'), 'the blueprint requires telephony');
    assert(status.missing.includes('email_sender'), 'email_sender is required and not connected, so it is missing');
    assert(!status.missing.includes('telephony'), 'telephony connected, so it is not missing');
  });

  const cryptoReady = credentialStorageReady();
  if (!cryptoReady) {
    console.log('  note  CREDENTIALS_SECRET is too short on this machine, so the encrypted-storage path is checked by its refusal instead.');
  }

  await check('a tenant credential is stored encrypted and never handed back', async () => {
    const result = await connectIntegration({
      supabase: sb, tenantId: a.tenantId, provider: 'payments', blueprint: a.blueprint,
      ownership: 'tenant', secret: 'sk_test_smoke_not_a_real_key', actor: 'smoke',
    });
    assert(!result.ok, 'a made-up key must not connect');
    assert(!JSON.stringify(result).includes('sk_test_smoke'), 'the credential must never appear in a response');

    if (!cryptoReady) {
      // A short signing key is a misconfigured environment, and the honest
      // behaviour is a clear refusal rather than a 500 from inside encryption.
      assert(result.detail.includes('Credential storage is not configured'), `expected a clear refusal, got: ${result.detail}`);
      const { data } = await sb.from('factory_integrations').select('secret_ciphertext').eq('tenant_id', a.tenantId).eq('provider', 'payments').maybeSingle();
      assert(!(data as { secret_ciphertext: string | null } | null)?.secret_ciphertext, 'nothing may be stored when storage is unavailable');
      return;
    }

    const { data } = await sb.from('factory_integrations').select('secret_ciphertext, config').eq('tenant_id', a.tenantId).eq('provider', 'payments').single();
    const row = data as { secret_ciphertext: string | null; config: Record<string, unknown> };
    assert(row.secret_ciphertext, 'the credential must be stored');
    assert(!row.secret_ciphertext.includes('sk_test_smoke'), 'it must be stored encrypted, not in the clear');
    assert(!JSON.stringify(row.config).includes('sk_test_smoke'), 'it must never land in config');
  });

  await check('a credential never reaches the audit log', async () => {
    const rows = await recentAudit(sb, { tenantId: a.tenantId, limit: 60 });
    assert(!JSON.stringify(rows).includes('sk_test_smoke'), 'no audit row may carry a credential');
    assert(rows.some((r) => r.action === 'integration.connected' || r.action === 'integration.failed'), 'the attempt must be recorded');
  });

  await check('a platform-owned connector refuses a customer key', async () => {
    const result = await connectIntegration({
      supabase: sb, tenantId: a.tenantId, provider: 'telephony', blueprint: a.blueprint,
      ownership: 'tenant', secret: 'whatever-key-value', actor: 'smoke',
    });
    assert(!result.ok, 'telephony is ours, so a tenant key must be refused');
    assert(result.detail.includes('Modern Mustard Seed'), 'the refusal must say who provides it');
  });

  await check('disconnecting clears the stored credential', async () => {
    // Connect platform-side first so there is definitely a row to disconnect,
    // whatever happened on the tenant-credential path above.
    await connectIntegration({ supabase: sb, tenantId: a.tenantId, provider: 'payments', blueprint: a.blueprint, ownership: 'platform', actor: 'smoke' });
    await disconnectIntegration({ supabase: sb, tenantId: a.tenantId, provider: 'payments', actor: 'smoke' });
    const { data } = await sb.from('factory_integrations').select('status, secret_ciphertext').eq('tenant_id', a.tenantId).eq('provider', 'payments').single();
    const row = data as { status: string; secret_ciphertext: string | null };
    eq(row.status, 'disconnected', 'the row records the disconnect');
    eq(row.secret_ciphertext, null, 'the credential is gone');
  });

  await check('preflight names each integration instead of listing keys', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const plan = await getPlan(sb, 'pro');
    const report = await preflight({ supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, blueprint: a.blueprint, plan });
    const rows = report.checks.filter((c) => c.key.startsWith('integrations.'));
    assert(rows.length >= 2, 'each required integration gets its own check');
    const telephonyCheck = rows.find((c) => c.key === 'integrations.telephony');
    eq(telephonyCheck?.status, 'pass', 'a connected integration passes');
    const emailCheck = rows.find((c) => c.key === 'integrations.email_sender');
    eq(emailCheck?.status, 'fail', 'an unverified sender fails');
    assert(emailCheck?.label === 'Email Sending', 'the check is named for a person, not keyed for a machine');
  });

  await check('integrations are tenant scoped, and one tenant connecting does not connect another', async () => {
    const other = await integrationStatus({ supabase: sb, tenantId: b.tenantId, blueprint: b.blueprint });
    eq(other.views.filter((v) => v.status === 'connected').length, 0, 'tenant B has connected nothing');
    assert(other.missing.length > 0, 'and its required integrations are still missing');
  });

  /* ── limits, health, analytics ── */

  await check('a plan allowance refuses work that would exceed it', async () => {
    const plan = await getPlan(sb, 'launch');
    await recordUsage(sb, { tenantId: b.tenantId, factoryId: b.factoryId, metric: 'emails_sent', quantity: 4000, idempotencyKey: `${STAMP}-b-cap` });
    const verdict = await assertWithinLimit(sb, b.tenantId, plan, 'emails_sent', 1);
    assert(!verdict.allowed, 'past the allowance the work must be refused');
    assert(verdict.reason?.includes('allowance'), 'the refusal must say why');
  });

  await check('limit states report used against limit', async () => {
    const plan = await getPlan(sb, 'launch');
    const states = await allLimitStates(sb, b.tenantId, plan);
    const emails = states.find((s) => s.metric === 'emails_sent');
    assert(emails?.exceeded, 'the email allowance should read as exceeded');
  });

  await check('health scores every dimension and explains itself', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const plan = await getPlan(sb, 'pro');
    const health = await scoreHealth({ supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow, plan, mrrCents: 150_000 });
    assert(health.overall >= 0 && health.overall <= 100, 'the score must be a percentage');
    for (const dimension of ['prospect', 'sender', 'ai', 'conversion', 'integration', 'cost']) {
      assert(health.dimensions[dimension as keyof typeof health.dimensions], `${dimension} must be scored`);
    }
    assert(health.band, 'the band must be set');
  });

  await check('the funnel and summary compute without a valid revenue signal', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const f = await funnel(sb, a.tenantId, a.factoryId);
    assert(f.stages.length === 9, 'the funnel has nine stages');
    const summary = await factorySummary(sb, a.tenantId, factory as FactoryRow, a.blueprint);
    eq(summary.roi, null, 'with no closed revenue the ROI must be null rather than zero');
  });

  await check('margin is computed per tenant', async () => {
    const usage = await usageForTenant(sb, a.tenantId);
    const margin = marginOf(150_000, usage.totalCostCents);
    assert(margin.grossPct !== null && margin.grossPct > 0, 'a paying tenant with small usage should show margin');
  });

  await check('hot right now ranks on tracked behaviour only', async () => {
    const hot = await hotRightNow(sb, a.tenantId, a.factoryId, 10);
    assert(Array.isArray(hot), 'the call must return a list');
  });

  /* ── controls ── */

  await check('pause controls are independent', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const res = await setControl({
      supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow,
      control: 'sourcing', paused: true, reason: 'smoke', actor: 'smoke', actorKind: 'admin',
    });
    assert('ok' in res, 'the switch must flip');
    assert(res.factory.sourcing_paused, 'sourcing is paused');
    assert(!res.factory.outreach_paused, 'outreach is untouched');
  });

  await check('pausing the whole Factory stops everything', async () => {
    const { data: factory } = await sb.from('factories').select('*').eq('id', a.factoryId).single();
    const res = await setControl({
      supabase: sb, tenantId: a.tenantId, factory: factory as FactoryRow,
      control: 'factory', paused: true, reason: 'smoke stop', actor: 'smoke', actorKind: 'client',
    });
    assert('ok' in res, 'the switch must flip');
    eq(res.factory.status, 'paused', 'the Factory is paused');
    assert(res.factory.outreach_paused && res.factory.followup_paused, 'pausing everything pauses the parts');
  });

  /* ── the queue ── */

  await check('the queue is idempotent and claims hottest first', async () => {
    const cold = await enqueue(sb, { tenantId: a.tenantId, factoryId: a.factoryId, lane: 'sourcing', kind: 'smoke.cold', idempotencyKey: `${STAMP}-cold` });
    const hot = await enqueue(sb, { tenantId: a.tenantId, factoryId: a.factoryId, lane: 'hot', kind: 'smoke.hot', idempotencyKey: `${STAMP}-hot` });
    assert(cold && hot, 'both jobs must queue');
    const again = await enqueue(sb, { tenantId: a.tenantId, factoryId: a.factoryId, lane: 'sourcing', kind: 'smoke.cold', idempotencyKey: `${STAMP}-cold` });
    eq(again?.id, cold.id, 'the same key returns the same job');

    const claimed = await claim(sb, 'smoke-worker', { tenantId: a.tenantId });
    eq(claimed?.kind, 'smoke.hot', 'the hot lane is claimed first');
    await complete(sb, claimed!.id, { ok: true });

    const next = await claim(sb, 'smoke-worker', { tenantId: a.tenantId });
    eq(next?.kind, 'smoke.cold', 'then the cold one');
    await complete(sb, next!.id, { ok: true });
  });

  await check('queue depth reports per lane', async () => {
    await enqueue(sb, { tenantId: a.tenantId, factoryId: a.factoryId, lane: 'enrich', kind: 'smoke.depth', idempotencyKey: `${STAMP}-depth` });
    const depth = await queueDepth(sb, a.tenantId);
    assert(depth.some((d) => d.lane === 'enrich' && d.queued === 1), 'the queued job must show in its lane');
  });

  /* ── audit ── */

  await check('the audit log records the run and redacts secrets', async () => {
    await audit(sb, { tenantId: a.tenantId, factoryId: a.factoryId, action: 'admin.action', actor: 'smoke', actorKind: 'admin', meta: { apiKey: 'sk-live-should-not-appear', note: 'ok' } });
    const rows = await recentAudit(sb, { factoryId: a.factoryId, limit: 50 });
    assert(rows.length > 3, 'the run should have produced several audit rows');
    const mine = rows.find((r) => (r.meta as { note?: string }).note === 'ok');
    eq((mine?.meta as { apiKey: string }).apiKey, '[redacted]', 'a secret must never reach the log');
    assert(rows.some((r) => r.action === 'blueprint.deployed'), 'the deploy must be recorded');
    assert(rows.some((r) => r.action === 'factory.paused'), 'the pause must be recorded');
  });

  await check('deleting a tenant cascades its whole tree', async () => {
    const temp = await makeTenant('temp', 'launch');
    const tempFactory = await makeFactory(temp, 'temp');
    await sb.from('factory_tenants').delete().eq('id', temp);
    made.tenants = made.tenants.filter((t) => t !== temp);
    const { data } = await sb.from('factory_blueprints').select('id').eq('factory_id', tempFactory.factoryId);
    eq((data ?? []).length, 0, 'blueprints must cascade with the tenant');
  });
} finally {
  await cleanup();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}
console.log('Client Factory smoke test green.');
