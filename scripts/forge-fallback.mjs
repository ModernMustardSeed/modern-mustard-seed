/**
 * THE FORGE FAILSAFE.
 *
 * Demo websites are normally built by headless Claude Code on Sarah's
 * workstation (scripts/demo-site-worker.mjs): flat Max-plan cost, a filesystem,
 * Playwright, and the better artifact. But it only runs while that machine is
 * awake, and /demos is now an ad funnel. Before this existed, a lead who signed
 * up at 2am watched their page promise a website in twenty minutes, forever,
 * while the row sat `queued`. No retry, no alert, no fallback.
 *
 * So: every few minutes, look for a queued build the workstation is not going to
 * get to, and build it on the metered API instead.
 *
 * WHY THIS RUNS IN GITHUB ACTIONS AND NOT A VERCEL CRON.
 * Two hard walls, both real, both already scarred into this repo:
 *   1. The MMS Vercel project is on HOBBY. Sub-daily crons are rejected AT BUILD
 *      TIME, and on 2026-07-07 exactly that broke every deploy and then killed
 *      the git integration outright (see sms-drain.yml, voice-health.yml, which
 *      exist for the same reason).
 *   2. Hobby functions cap at 300s. A real single-file site takes ~4 minutes of
 *      generation. It does not fit, and a half-written site is worse than none.
 * A runner has neither limit, and the repo is public, so the minutes are free.
 *
 * MONEY. This spends real API credits, so it is capped exactly the way every
 * other spend in this codebase is: claim_forge_slot() (migration 047) does the
 * check and the increment in ONE statement, and it FAILS CLOSED. No slot, no
 * build. The cap is deliberately small. The workstation is still the main road.
 *
 * Run: node scripts/forge-fallback.mjs        (one job, then exit)
 *      node scripts/forge-fallback.mjs --dry  (report what it WOULD do, spend nothing)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const SITE_URL = 'https://modernmustardseed.com';
const WORKER_TAG = 'api-fallback';

/** How long a job may sit queued before we are willing to spend on it. */
const GRACE_WORKER_DOWN_MS = Number(process.env.FORGE_FALLBACK_GRACE_MS || 5 * 60 * 1000);
/** We promised the lead ~20 minutes. Past that, help even if the workstation is up. */
const PROMISED_MS = Number(process.env.FORGE_FALLBACK_BACKLOG_MS || 22 * 60 * 1000);
const HEARTBEAT_FRESH_MS = 4 * 60 * 1000;
const DAILY_CAP = Number(process.env.FORGE_FALLBACK_DAILY_CAP || 6);

// Local runs read .env.local (lowercase supabase keys, as this repo stores them).
// CI passes everything through the environment.
const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* CI has no .env.local, and should not */ }

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing supabase url or service role key.');
  process.exit(1);
}
// site-forge-api reads these off process.env, so make sure the .env.local path
// populates them too.
process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY || '';
process.env.FAL_KEY = env.FAL_KEY || '';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), ...a);

const isRebuild = (job) => job.kind === 'rebuild';
const isEdit = (job) => job.kind === 'edit';
const isProjectEdit = (job) => isEdit(job) && Boolean(job.project_id);

async function fail(job, message) {
  const msg = String(message).slice(0, 2000);
  await sb
    .from('outbound_demo_sites')
    .update({ status: 'failed', error: msg, updated_at: new Date().toISOString() })
    .eq('id', job.id);

  if (isProjectEdit(job)) {
    await sb
      .from('projects')
      .update({ edit_status: 'failed', edit_error: msg })
      .eq('id', job.project_id);
  } else if (isRebuild(job)) {
    // A rebuild belongs to someone who already paid, so the failure has to land
    // on the delivery board, not only in a runner log.
    await sb
      .from('projects')
      .update({ site_build_status: 'failed', site_build_error: msg })
      .eq('id', job.project_id);
  } else if (job.lead_id) {
    await sb.from('outbound_leads').update({ site_demo_status: 'failed' }).eq('id', job.lead_id);
  }

  // Surface it where Sarah actually looks. Mail to her own address is suppressed
  // in Resend, so the lead thread is the honest channel.
  if (job.lead_id) {
    await sb.from('messages').insert({
      outbound_lead_id: job.lead_id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'forge-fallback',
      to_addr: job.business_name,
      subject: isRebuild(job) ? 'REAL SITE rebuild FAILED (api fallback)' : 'Website demo FAILED (api fallback)',
      snippet: `The API fallback could not build their site: ${msg.slice(0, 200)}`,
      read: false,
      occurred_at: new Date().toISOString(),
    });
  }
  log('FAILED', job.id, msg.slice(0, 200));
}

async function main() {
  const now = Date.now();

  // Is the workstation alive? Ask IT, do not infer from timestamps: a timestamp
  // cannot tell "the laptop is asleep" apart from "the laptop is 20 minutes into
  // building the job ahead of yours", and those want opposite answers.
  const { data: hb } = await sb.from('app_state').select('value').eq('key', 'forge:worker').maybeSingle();
  const beatAt = Date.parse(hb?.value?.at ?? '');
  const workerAlive = Number.isFinite(beatAt) && now - beatAt < HEARTBEAT_FRESH_MS;

  const graceMs = workerAlive ? PROMISED_MS : GRACE_WORKER_DOWN_MS;
  const cutoff = new Date(now - graceMs).toISOString();
  log(`workstation ${workerAlive ? 'ALIVE' : 'not beating'} | rescuing jobs queued before ${cutoff}`);

  // Oldest first: whoever has been staring at the countdown longest goes first.
  const { data: job, error } = await sb
    .from('outbound_demo_sites')
    .select('*')
    .eq('status', 'queued')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) { console.error(error.message); process.exit(1); }
  if (!job) { log('nothing waiting past the grace window. done.'); return; }

  log('candidate:', job.id, job.business_name, `(queued ${Math.round((now - Date.parse(job.created_at)) / 60000)}m ago)`);
  if (DRY) { log('--dry: stopping before spending anything.'); return; }

  // Claim the SPEND slot before the job row. Both can fail; only one costs money,
  // and it is the one we check first.
  const { data: slot, error: capErr } = await sb.rpc('claim_forge_slot', {
    p_key: `forgefallback:day:${new Date().toISOString().slice(0, 10)}`,
    p_cap: DAILY_CAP,
  });
  if (capErr || slot !== true) {
    log(`daily api forge cap (${DAILY_CAP}) reached or claim failed${capErr ? ': ' + capErr.message : ''}. standing down.`);
    return;
  }

  // Optimistic CAS, same as the worker's: whoever flips it out of `queued` owns
  // it. If the workstation woke and grabbed it a half second ago, we lose the
  // race and spend nothing further.
  const { data: claimed } = await sb
    .from('outbound_demo_sites')
    .update({ status: 'building', claimed_at: new Date().toISOString(), worker: WORKER_TAG, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  if (!claimed) { log('the workstation claimed it first. standing down.'); return; }

  const rebuild = isRebuild(claimed);
  const edit = isEdit(claimed);
  const projectEdit = isProjectEdit(claimed);
  if (projectEdit) {
    await sb.from('projects').update({ edit_status: 'building' }).eq('id', claimed.project_id);
  } else if (rebuild) {
    await sb.from('projects').update({ site_build_status: 'building' }).eq('id', claimed.project_id);
  } else if (claimed.lead_id) {
    await sb.from('outbound_leads').update({ site_demo_status: 'building' }).eq('id', claimed.lead_id);
  }
  log(`claimed. ${edit ? 'editing their site' : rebuild ? 'forging their REAL site' : 'forging the demo'} via the API...`);

  const t0 = Date.now();
  let result;
  try {
    if (edit) {
      const { editSiteWithApi } = await import('../lib/site-forge-api.ts');
      result = await editSiteWithApi(
        String(claimed.base_html ?? ''),
        String(claimed.brief ?? ''),
        String(claimed.business_name ?? 'the business'),
      );
    } else {
      const { forgeSiteWithApi } = await import('../lib/site-forge-api.ts');
      result = await forgeSiteWithApi(
        String(claimed.brief ?? ''),
        String(claimed.business_name ?? 'the business'),
        { real: rebuild },
      );
    }
  } catch (e) {
    await fail(claimed, e?.message || e);
    process.exit(1);
  }
  const secs = Math.round((Date.now() - t0) / 1000);

  if (!result.ok) {
    await fail(claimed, result.error);
    process.exit(1);
  }

  const { error: upErr } = await sb
    .from('outbound_demo_sites')
    .update({
      status: 'ready',
      html: result.html,
      error: null,
      built_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimed.id);
  if (upErr) {
    await fail(claimed, `could not store the html: ${upErr.message}`);
    process.exit(1);
  }

  // A CLIENT edit lands in a draft for approval, and never touches the live site.
  if (projectEdit) {
    const { error: pErr } = await sb
      .from('projects')
      .update({ site_html_draft: result.html, edit_status: 'ready', edit_error: null, updated_at: new Date().toISOString() })
      .eq('id', claimed.project_id);
    if (pErr) {
      await fail(claimed, `could not store the edited draft: ${pErr.message}`);
      process.exit(1);
    }
    log(`CLIENT EDIT READY in ${secs}s: ${SITE_URL}/admin/delivery | ${Math.round(result.bytes / 1024)}KB`);
    return;
  }

  if (rebuild) {
    // The real site never auto-ships. It lands on the delivery board, a human
    // approves it, and it reveals on the date we chose.
    const { data: project } = await sb
      .from('projects')
      .select('site_published_at')
      .eq('id', claimed.project_id)
      .maybeSingle();
    if (project?.site_published_at) {
      await fail(claimed, 'their site is already live, so this rebuild was not applied over it');
      process.exit(1);
    }
    const { error: pErr } = await sb
      .from('projects')
      .update({
        site_html: result.html,
        site_build_status: 'ready',
        site_build_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimed.project_id);
    if (pErr) {
      await fail(claimed, `could not store the real site: ${pErr.message}`);
      process.exit(1);
    }
    log(`REBUILD READY in ${secs}s: ${SITE_URL}/admin/delivery/${claimed.project_id}/edit | ${result.direction} | hero ${result.hero} | ${Math.round(result.bytes / 1024)}KB`);
    return;
  }

  await sb.from('outbound_leads').update({ site_demo_status: 'ready' }).eq('id', claimed.lead_id);

  const siteUrl = `${SITE_URL}/demo/site/${claimed.id}`;
  await sb.from('messages').insert({
    outbound_lead_id: claimed.lead_id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'forge-fallback',
    to_addr: claimed.business_name,
    subject: edit ? 'Website demo updated (api fallback)' : 'Website demo live (api fallback)',
    snippet: edit
      ? `Reforged from your prompt on the API because the workstation was ${workerAlive ? 'backed up' : 'offline'}. Live at ${siteUrl}.`
      : `Built on the API because the workstation was ${workerAlive ? 'backed up' : 'offline'}. Live at ${siteUrl}.`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  log(`${edit ? 'EDITED' : 'READY'} in ${secs}s: ${siteUrl} | ${result.direction} | hero ${result.hero} | ${Math.round(result.bytes / 1024)}KB`);
}

await main();
