/**
 * THE CLIENT FACTORY WORKER.
 *
 * Drains `factory_jobs` across every tenant, hottest lane first. This is the
 * half of the platform that cannot live on Vercel: building a demo site runs
 * the Claude Code CLI on Sarah's subscription, and placing a demonstration call
 * takes longer than a serverless request.
 *
 *   npx tsx scripts/factory-worker.mts            # poll forever
 *   npx tsx scripts/factory-worker.mts --once     # drain and exit
 *   npx tsx scripts/factory-worker.mts --tenant <id>
 *
 * IT REUSES, IT DOES NOT REBUILD. Demo sites go through the SAME
 * `outbound_demo_sites` queue and the same demo-site worker the internal Forge
 * uses (lead_id has been nullable since migration 060, which is what makes a
 * Factory-originated build legal). Demonstration calls go through the same
 * `forgeCall` / `ringDemoCall` path as the Voice Agent Forge. A second builder
 * would be a second thing to keep correct.
 *
 * IT REFUSES BEFORE IT SPENDS. Every handler re-checks mode, pause state,
 * consent and plan allowance at the moment of work, not at the moment of
 * queueing. A job queued while a Factory was live must not run after somebody
 * paused it.
 *
 * Related: lib/factory/queue.ts, lib/factory/value-actions.ts,
 * lib/factory/campaigns.ts, scripts/demo-site-worker.mjs.
 */
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// Type-only, so it is erased at compile time and never pulls the module in
// before the .env.local loop below has populated process.env.
import type { FactoryJob } from '@/lib/factory/queue';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { claim, complete, fail, requeueStale, enqueue } = await import('@/lib/factory/queue');
const { runValueAction } = await import('@/lib/factory/value-actions');
const { sendStep } = await import('@/lib/factory/campaigns');
const { deployedBlueprint, validateBlueprint } = await import('@/lib/factory/blueprint');
const { recordUsage } = await import('@/lib/factory/usage');
const { audit } = await import('@/lib/factory/audit-log');
const { forgeCall, ringDemoCall, toE164 } = await import('@/lib/sidekick');
const { refreshAllHealth } = await import('@/lib/factory/health');

type Blueprint = Awaited<ReturnType<typeof deployedBlueprint>> extends null ? never : Record<string, unknown>;

const argv = process.argv.slice(2);
const flag = (n: string) => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : (argv[i + 1] ?? ''); };
const ONCE = argv.includes('--once');
const TENANT = flag('tenant');
const POLL_MS = Number(flag('poll') || 5_000);
const WORKER = `${os.hostname()}:${process.pid}`;

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('No Supabase credentials. Set supabase_url and supabase_service_role_key in .env.local.');
  process.exit(1);
}
const supabase: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const log = (...args: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...args);

/* ─────────────────────────── shared loading ─────────────────────────── */

type Loaded = {
  factory: Record<string, unknown> & { id: string; mode: string; status: string; ai_paused: boolean; outreach_paused: boolean };
  blueprint: Record<string, unknown>;
};

async function loadFactory(factoryId: string): Promise<Loaded | null> {
  const { data } = await supabase.from('factories').select('*').eq('id', factoryId).maybeSingle();
  if (!data) return null;
  const row = await deployedBlueprint(supabase, factoryId);
  if (!row) return null;
  const parsed = validateBlueprint(row.doc);
  if (!parsed.ok) return null;
  return { factory: data as Loaded['factory'], blueprint: parsed.doc as unknown as Record<string, unknown> };
}

async function loadProspect(prospectId: string) {
  const { data } = await supabase.from('factory_prospects').select('*').eq('id', prospectId).maybeSingle();
  return data as (Record<string, unknown> & { id: string; company: string; email: string | null; phone: string | null; is_test: boolean }) | null;
}

/* ──────────────────────────── job handlers ──────────────────────────── */

type Handler = (job: FactoryJob) => Promise<unknown>;

/**
 * Build a prospect-specific demo site through the existing forge.
 *
 * The brief is composed from the blueprint and the prospect, then handed to
 * `outbound_demo_sites` with no lead_id. The demo-site worker picks it up,
 * builds it, and this job polls until it lands. That polling is the whole
 * reason this is a job and not a request handler.
 */
const buildDemoSite: Handler = async (job) => {
  const loaded = await loadFactory(job.factory_id as string);
  if (!loaded) throw new Error('No deployed blueprint for this Factory.');
  const prospect = await loadProspect(job.payload.prospect_id as string);
  if (!prospect) throw new Error('Prospect not found.');

  const bp = loaded.blueprint as {
    business: { name: string; services: string[] };
    offer: { headline: string };
    pain: { primary: string };
    agent: { name: string };
  };

  const brief = [
    `DESIGN TIER: 2`,
    ``,
    `Build a one-page demonstration site for ${prospect.company}${prospect.city ? ` in ${prospect.city}` : ''}.`,
    prospect.website ? `Their current site: ${prospect.website}` : '',
    prospect.industry ? `Industry: ${prospect.industry}` : '',
    ``,
    `This is a demonstration built BY ${bp.business.name} to show ${prospect.company} what is possible.`,
    `The problem it should speak to: ${bp.pain.primary}`,
    `What ${bp.business.name} sells: ${bp.offer.headline}`,
    ``,
    `Do not invent facts, statistics, testimonials or client names for ${prospect.company}.`,
    `Do not put a price on the page.`,
    `No em dashes.`,
  ].filter(Boolean).join('\n');

  const { data: site, error } = await supabase
    .from('outbound_demo_sites')
    .insert({ lead_id: null, business_name: prospect.company, brief, kind: 'demo' })
    .select('id')
    .single();
  if (error) throw new Error(`Could not queue the site build: ${error.message}`);

  const siteId = site.id as string;
  log('queued demo site', siteId, 'for', prospect.company);

  // The demo-site worker takes minutes. Poll with a hard ceiling; if it has not
  // landed the job requeues with backoff rather than holding this worker.
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10_000));
    const { data } = await supabase.from('outbound_demo_sites').select('status, error').eq('id', siteId).maybeSingle();
    const status = (data as { status: string; error: string | null } | null)?.status;
    if (status === 'ready') {
      const outputUrl = `/demo/site/${siteId}`;
      await supabase
        .from('factory_action_runs')
        .update({ status: 'ready', output_url: outputUrl, output: { site_id: siteId }, completed_at: new Date().toISOString() })
        .eq('factory_id', job.factory_id)
        .eq('idempotency_key', `demo_site:${prospect.id}`);
      if (!prospect.is_test) {
        await recordUsage(supabase, {
          tenantId: job.tenant_id,
          factoryId: job.factory_id,
          metric: 'forge_runs',
          moduleKey: 'value.demo_builder',
          idempotencyKey: `forge:${siteId}`,
        });
      }
      return { siteId, url: outputUrl };
    }
    if (status === 'failed') {
      const message = (data as { error: string | null }).error ?? 'The site build failed.';
      await supabase
        .from('factory_action_runs')
        .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
        .eq('factory_id', job.factory_id)
        .eq('idempotency_key', `demo_site:${prospect.id}`);
      throw Object.assign(new Error(message), { permanent: true });
    }
  }
  throw new Error('The site build has not finished yet.');
};

/**
 * Stand up a receptionist for the prospect's own business and call them with it.
 *
 * CONSENT IS RE-CHECKED HERE. The job carries a phone number, and a phone
 * number in a payload is not permission. There must be a `granted` consent row
 * for the ai_call channel on this prospect, or the job fails permanently and
 * says why. This is the one place where an unchecked retry could place an
 * unsolicited AI call, so it is checked at the moment of dialling.
 */
const receptionistRoleplay: Handler = async (job) => {
  const loaded = await loadFactory(job.factory_id as string);
  if (!loaded) throw new Error('No deployed blueprint for this Factory.');
  if (loaded.factory.ai_paused) throw Object.assign(new Error('The AI is paused on this Factory.'), { permanent: true });

  const prospect = await loadProspect(job.payload.prospect_id as string);
  if (!prospect) throw new Error('Prospect not found.');

  const { data: consent } = await supabase
    .from('factory_consent')
    .select('evidence, granted_at')
    .eq('tenant_id', job.tenant_id)
    .eq('prospect_id', prospect.id)
    .eq('channel', 'ai_call')
    .eq('state', 'granted')
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!consent) {
    throw Object.assign(new Error('No recorded consent for an AI call to this prospect. The demonstration call was not placed.'), { permanent: true });
  }

  const evidence = (consent as { evidence: Record<string, unknown> }).evidence ?? {};
  const number = toE164((evidence.phone as string) ?? prospect.phone ?? null);
  if (!number) throw Object.assign(new Error('Consent exists but carries no dialable US number.'), { permanent: true });

  const bp = loaded.blueprint as { business: { name: string; services: string[] }; agent: { name: string; voice_enabled: boolean } };
  const runId = `factory:${job.factory_id}:${prospect.id}`;
  const forged = await forgeCall(
    {
      business: prospect.company,
      verticalId: 'professional',
      city: (prospect.city as string) || 'your area',
      ownerName: (prospect.contact_name as string) || 'the owner',
      services: [
        (prospect.industry as string) ? `They are a ${prospect.industry} business.` : '',
        `This is a demonstration receptionist built by ${bp.business.name}.`,
        'Answer as their front desk: take the caller, get the details, offer to book.',
        'Never state a price and never promise anything on their behalf.',
      ].filter(Boolean).join(' '),
      flow: 'outbound',
    },
    runId,
    'phone',
  );
  if (!forged.ok) throw new Error(`Could not forge the demonstration: ${forged.error}`);

  if (loaded.factory.mode === 'test' || prospect.is_test) {
    await supabase
      .from('factory_action_runs')
      .update({ status: 'ready', output: { test: true, note: 'Forged and gated. No call was placed in test mode.' }, completed_at: new Date().toISOString() })
      .eq('factory_id', job.factory_id)
      .eq('idempotency_key', `receptionist_roleplay:${prospect.id}`);
    return { test: true };
  }

  const ring = await ringDemoCall(forged.call, number);
  if (!ring.ok) throw new Error(`The call did not place: ${ring.error}`);

  await Promise.all([
    supabase
      .from('factory_action_runs')
      .update({ status: 'ready', output: { call_id: ring.callId }, delivered_at: new Date().toISOString(), completed_at: new Date().toISOString() })
      .eq('factory_id', job.factory_id)
      .eq('idempotency_key', `receptionist_roleplay:${prospect.id}`),
    recordUsage(supabase, {
      tenantId: job.tenant_id,
      factoryId: job.factory_id,
      metric: 'voice_minutes',
      moduleKey: 'value.receptionist_roleplay',
      quantity: 3,
      idempotencyKey: `call:${ring.callId}`,
    }),
    audit(supabase, {
      tenantId: job.tenant_id,
      factoryId: job.factory_id,
      action: 'action.delivered',
      target: prospect.id,
      actorKind: 'system',
      meta: { action: 'receptionist_roleplay', consentAt: (consent as { granted_at: string }).granted_at },
    }),
  ]);
  return { callId: ring.callId };
};

/** Re-run an inline value action that could not finish inside a request. */
const retryValueAction: Handler = async (job) => {
  const loaded = await loadFactory(job.factory_id as string);
  if (!loaded) throw new Error('No deployed blueprint.');
  const prospect = await loadProspect(job.payload.prospect_id as string);
  if (!prospect) throw new Error('Prospect not found.');

  const res = await runValueAction(
    {
      supabase,
      tenantId: job.tenant_id,
      factory: loaded.factory as never,
      blueprint: loaded.blueprint as never,
      prospect: prospect as never,
      config: (job.payload.config as Record<string, unknown>) ?? {},
    },
    job.payload.action_key as string,
  );
  if ('error' in res) throw new Error(res.error);
  return res.run;
};

/**
 * Send the next due sequence step for one campaign.
 *
 * Every gate lives in `sendStep`, so this only decides WHO is due: prospects
 * that are contactable, above the score floor, and whose last touch is older
 * than the next step's day offset.
 */
const campaignTick: Handler = async (job) => {
  const loaded = await loadFactory(job.factory_id as string);
  if (!loaded) throw new Error('No deployed blueprint.');
  if (loaded.factory.outreach_paused || loaded.factory.status === 'paused') {
    return { skipped: 'Outreach is paused.' };
  }

  const campaignId = job.payload.campaign_id as string;
  const { data: campaignRow } = await supabase
    .from('factory_campaigns')
    .select('id, name, sequence, status, daily_send_cap')
    .eq('id', campaignId)
    .eq('tenant_id', job.tenant_id)
    .maybeSingle();
  const campaign = campaignRow as { id: string; name: string; sequence: { step: number; day_offset: number; subject: string; body: string; variant: string }[]; status: string } | null;
  if (!campaign || campaign.status !== 'running') return { skipped: 'Campaign is not running.' };

  const bp = loaded.blueprint as { sourcing: { min_score: number }; followup: { max_touches: number } };
  const { data: candidates } = await supabase
    .from('factory_prospects')
    .select('*')
    .eq('tenant_id', job.tenant_id)
    .eq('factory_id', job.factory_id)
    .eq('is_test', loaded.factory.mode === 'test')
    .in('state', ['ready', 'qualified', 'active'])
    .gte('score', bp.sourcing.min_score)
    .not('email', 'is', null)
    .is('suppressed_at', null)
    .order('score', { ascending: false })
    .limit(Number(job.payload.batch ?? 25));

  let sent = 0;
  const skipped: string[] = [];

  for (const raw of ((candidates as Record<string, unknown>[]) ?? [])) {
    const prospect = raw as never as Parameters<typeof sendStep>[2]['prospect'];
    const { count } = await supabase
      .from('factory_messages')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', (raw as { id: string }).id)
      .eq('campaign_id', campaignId)
      .eq('direction', 'outbound');
    const touches = count ?? 0;
    if (touches >= Math.min(campaign.sequence.length, bp.followup.max_touches)) continue;

    // Stop the moment they reply. Following up on a reply is the fastest way to
    // turn an interested prospect into a complaint.
    const { count: replies } = await supabase
      .from('factory_messages')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', (raw as { id: string }).id)
      .eq('direction', 'inbound');
    if ((replies ?? 0) > 0) continue;

    const step = campaign.sequence[touches];
    if (!step) continue;

    const lastAt = (raw as { last_contact_at: string | null }).last_contact_at;
    if (lastAt && touches > 0) {
      const prior = campaign.sequence[touches - 1];
      const dueAfter = new Date(lastAt).getTime() + Math.max(0, step.day_offset - prior.day_offset) * 86_400_000;
      if (Date.now() < dueAfter) continue;
    }

    const result = await sendStep(supabase, job.tenant_id, {
      factory: loaded.factory as never,
      blueprint: loaded.blueprint as never,
      campaignId,
      prospect,
      step,
      vars: {},
    });
    if (result.ok) sent++;
    else skipped.push(`${(raw as { company: string }).company}: ${result.reason}`);
  }

  if (sent) {
    await supabase
      .from('factories')
      .update({ first_contact_at: (loaded.factory.first_contact_at as string) ?? new Date().toISOString() })
      .eq('id', job.factory_id);
  }

  // Re-arm for tomorrow. A campaign that is running should not need a person to
  // remember to poke it.
  await enqueue(supabase, {
    tenantId: job.tenant_id,
    factoryId: job.factory_id as string,
    lane: 'campaign',
    kind: 'campaign.tick',
    payload: { campaign_id: campaignId },
    idempotencyKey: `tick:${campaignId}:${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}`,
    runAfter: new Date(Date.now() + 86_400_000),
  });

  return { sent, skipped: skipped.slice(0, 10) };
};

const refreshHealth: Handler = async (job) => {
  const rows = await refreshAllHealth(supabase, { tenantId: job.tenant_id });
  return { scored: rows.length };
};

const HANDLERS: Record<string, Handler> = {
  'value_action.demo_site': buildDemoSite,
  'value_action.receptionist_roleplay': receptionistRoleplay,
  'value_action.retry': retryValueAction,
  'campaign.tick': campaignTick,
  'analytics.health': refreshHealth,
};

/* ──────────────────────────────── loop ──────────────────────────────── */

async function tick(): Promise<boolean> {
  const job = await claim(supabase, WORKER, TENANT ? { tenantId: TENANT } : {});
  if (!job) return false;

  const handler = HANDLERS[job.kind];
  if (!handler) {
    log('no handler for', job.kind);
    await fail(supabase, job, `No handler for job kind "${job.kind}".`, { permanent: true });
    return true;
  }

  log('claimed', job.kind, job.id);
  try {
    const result = await handler(job);
    await complete(supabase, job.id, result);
    log('done', job.kind, JSON.stringify(result).slice(0, 200));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const permanent = !!(err as { permanent?: boolean }).permanent;
    await fail(supabase, job, message, { permanent });
    log(permanent ? 'failed permanently' : 'failed, will retry', job.kind, message);
  }
  return true;
}

const requeued = await requeueStale(supabase);
if (requeued) log('requeued', requeued, 'stale job(s)');

if (ONCE) {
  let worked = 0;
  while (await tick()) worked++;
  log(`drained ${worked} job(s).`);
  process.exit(0);
}

log(`Client Factory worker up as ${WORKER}. Polling every ${POLL_MS}ms.`);
for (;;) {
  const did = await tick();
  if (!did) await new Promise((r) => setTimeout(r, POLL_MS));
}
