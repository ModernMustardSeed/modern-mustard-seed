/**
 * THE LOCAL ROADMAP WORKER.
 *
 * Polls `roadmap_jobs`, writes each HUNDREDFOLD ROADMAP through the Claude Code
 * CLI on Sarah's Max subscription, saves it, and emails it to the person who
 * asked. This is the half of the roadmap system that cannot live on Vercel,
 * because serverless has no `claude` binary.
 *
 *   npx tsx scripts/roadmap-worker.mts            # poll forever
 *   npx tsx scripts/roadmap-worker.mts --once     # drain the queue and exit
 *   npx tsx scripts/roadmap-worker.mts --engine api   # emergency, back on the meter
 *
 * THE WORKER OWNS COMPLETION, NOT THE ROUTE. It saves the roadmap and sends the
 * email itself, then writes the slug back onto the job. A visitor who is still
 * on the page gets the report from the job row; a visitor who closed the tab
 * gets the same document in their inbox. The route deliberately does not save
 * or deliver anything it received from a worker, because both doing it is a
 * duplicate row and a duplicate email.
 *
 * Runs alongside the audit worker and the demo-site forge worker. All three
 * compete for the same RAM and the same subscription, which is why
 * lib/claude-code-json.ts serialises them behind one semaphore and holds a
 * memory floor.
 *
 * Related: lib/roadmap-queue.ts (the Vercel side), lib/scaling-roadmap.ts (the
 * engine), supabase/migrations/091_roadmap_queue.sql (the table).
 */
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const flag = (n: string) => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : (argv[i + 1] ?? ''); };
const ONCE = argv.includes('--once');

// Free by default. The whole point of this worker is to be off the meter.
process.env.ROADMAP_ENGINE = flag('engine') || process.env.ROADMAP_ENGINE || 'claude-code';

const POLL_MS = Number(flag('poll') || 10_000);
/**
 * Two retries, not the audit's three. Every attempt here is minutes of
 * subscription time rather than seconds, and the failures worth retrying
 * (a memory spike, a malformed JSON reroll) clear inside two.
 */
const MAX_ATTEMPTS = Number(process.env.ROADMAP_MAX_ATTEMPTS || 2);
const WORKER = `${os.hostname()}:${process.pid}`;
const HEALTH_KEY = 'roadmap_worker_health';

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or the lowercase pair) in .env.local.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const { runScalingRoadmap } = await import('../lib/scaling-roadmap.ts');
const { saveRoadmap } = await import('../lib/roadmap-store.ts');
const { deliverRoadmap } = await import('../lib/roadmap-delivery.ts');

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

/**
 * The heartbeat is what lets the Vercel route decide whether to hand this
 * machine a job or go straight to the metered API. Written on EVERY poll,
 * including idle ones, because a worker that only beats while busy is
 * indistinguishable from a dead one exactly when it matters.
 */
async function heartbeat(state: string, extra: Record<string, unknown> = {}) {
  try {
    await sb.from('app_state').upsert({
      key: HEALTH_KEY,
      value: {
        state,
        worker: WORKER,
        engine: process.env.ROADMAP_ENGINE,
        freeMb: Math.round(os.freemem() / 1048576),
        at: new Date().toISOString(),
        ...extra,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // Telemetry must never take the floor down.
    log('heartbeat failed (continuing):', (e as Error).message);
  }
}

async function claimOne() {
  const { data, error } = await sb.rpc('claim_roadmap_job', { p_worker: WORKER });
  if (error) { log('claim failed:', error.message); return null; }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

async function runOne(job: Record<string, unknown>) {
  const id = job.id as string;
  const target = job.target_url as string;
  const attempts = Number(job.attempts ?? 1);
  const email = ((job.email as string | null) ?? '').trim();
  const name = ((job.name as string | null) ?? '').trim();
  const phone = ((job.phone as string | null) ?? '').trim();
  const context = (job.context ?? {}) as Record<string, string | undefined>;

  log(`roadmap for ${target} (attempt ${attempts})`);
  const started = Date.now();

  /**
   * High effort, and no deadline worth the name.
   *
   * The public route had to ask for medium and cap itself at 280s because it
   * was answering an HTTP request. Nothing is waiting on this process, so the
   * visitor gets the better document: the same one HUNDREDFOLD members get from
   * their interview. Two hours is not a timeout anyone should ever hit, it is a
   * backstop against a wedged CLI child that the engine's own 5-minute kill
   * should have caught first.
   */
  const result = await runScalingRoadmap(target, context, { effort: 'high', deadlineMs: 2 * 60 * 60_000 });
  const secs = Math.round((Date.now() - started) / 1000);

  if (result.ok) {
    // Save FIRST. The slug is what the delivery email links to and what a
    // still-waiting request returns, so a job marked done without one would
    // hand the visitor a report they cannot come back to.
    const saved = await saveRoadmap({
      url: result.url,
      host: result.host,
      report: result.report,
      context,
      source: ((job.source as string) === 'admin' ? 'admin' : 'public'),
      ipHash: (job.ip_hash as string | null) ?? null,
    });

    await sb.from('roadmap_jobs').update({
      status: 'done',
      report: result.report,
      slug: saved?.slug ?? null,
      scale_score: typeof result.report.scale_score === 'number' ? Math.round(result.report.scale_score) : null,
      engine: result.usage?.model ?? process.env.ROADMAP_ENGINE,
      finished_at: new Date().toISOString(),
      error: null,
    }).eq('id', id);

    // Best effort, and last on purpose. A mail outage must not cost the visitor
    // a roadmap that is already saved and already readable at its permalink.
    if (saved?.slug && email) {
      try {
        await deliverRoadmap({ slug: saved.slug, email, name, phone });
        log(`  emailed ${email}`);
      } catch (e) {
        log(`  delivery failed (roadmap is saved at /scaling-roadmap/r/${saved.slug}):`, (e as Error).message);
      }
    }

    log(`  done in ${secs}s -> ${saved?.slug ? `/scaling-roadmap/r/${saved.slug}` : 'unsaved'}`);
    return;
  }

  /**
   * A 503 is OUR side: the engine held off for memory, the CLI died, or the API
   * wallet is dry. That is not a verdict on their website, so it goes back in
   * the queue rather than being reported to the visitor as a failure. Same
   * distinction the audit worker makes, for the same reason.
   */
  const ours = result.status === 503;
  if (ours && attempts < MAX_ATTEMPTS) {
    await sb.from('roadmap_jobs').update({ status: 'queued', worker: null, claimed_at: null, error: result.error }).eq('id', id);
    log(`  engine unavailable (${result.error}), requeued`);
    return;
  }

  await sb.from('roadmap_jobs').update({
    status: 'failed',
    error: result.error,
    finished_at: new Date().toISOString(),
  }).eq('id', id);
  log(`  failed after ${secs}s: ${result.error}`);
}

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    // Let the current roadmap finish. Killing mid-run orphans a claude child and
    // leaves the job pinned in 'running' until the stale reclaim picks it up,
    // which here is twenty-five minutes of a visitor waiting on an email.
    log('shutting down after the current job');
    stopping = true;
  });
}

log(`roadmap worker up. engine ${process.env.ROADMAP_ENGINE} | worker ${WORKER}${ONCE ? ' | --once' : ` | poll ${POLL_MS}ms`}`);

for (;;) {
  if (stopping) break;

  let job: Record<string, unknown> | null = null;
  try {
    job = await claimOne();
  } catch (e) {
    log('claim threw:', (e as Error).message);
  }

  if (job) {
    await heartbeat('working', { job: job.id, target: job.target_url });
    try {
      await runOne(job);
    } catch (e) {
      log('job threw:', (e as Error).message);
      await sb.from('roadmap_jobs').update({
        status: 'failed',
        error: (e as Error).message,
        finished_at: new Date().toISOString(),
      }).eq('id', job.id as string);
    }
    continue; // Straight to the next job, no idle wait while the queue has work.
  }

  await heartbeat('idle');
  if (ONCE) { log('queue empty, exiting (--once)'); break; }
  await new Promise((r) => setTimeout(r, POLL_MS));
}
