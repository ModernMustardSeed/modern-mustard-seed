/**
 * THE LOCAL AUDIT WORKER.
 *
 * Polls `audit_jobs`, grades each site through the Claude Code CLI on Sarah's
 * subscription, and files the report back onto the lead. This is the half of
 * the audit system that cannot live on Vercel, because serverless has no
 * `claude` binary.
 *
 *   npx tsx scripts/audit-worker.mts            # poll forever
 *   npx tsx scripts/audit-worker.mts --once     # drain the queue and exit
 *   npx tsx scripts/audit-worker.mts --engine api   # emergency, back on the meter
 *
 * Runs alongside the demo-site build worker. They compete for the same RAM and
 * the same subscription, which is why both hold a memory floor and why this one
 * audits strictly one site at a time.
 *
 * Related: lib/audit-queue.ts (the Vercel side), lib/claude-code-json.ts (the
 * engine), supabase/migrations/080_audit_queue.sql (the table).
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
process.env.AUDIT_ENGINE = flag('engine') || process.env.AUDIT_ENGINE || 'claude-code';

const POLL_MS = Number(flag('poll') || 10_000);
/**
 * After this many attempts a job stops being retried. Set above 1 because most
 * failures here are transient (a memory spike, a slow site), but bounded so one
 * poisonous URL cannot occupy the worker forever.
 */
const MAX_ATTEMPTS = Number(process.env.AUDIT_MAX_ATTEMPTS || 3);
const WORKER = `${os.hostname()}:${process.pid}`;
const HEALTH_KEY = 'audit_worker_health';

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or the lowercase pair) in .env.local.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const { runWebsiteAudit } = await import('../lib/website-audit.ts');

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

/**
 * The heartbeat is what lets a Vercel route decide whether to wait for this
 * worker or fall straight back to the metered API. Without it the cockpit's
 * audit button would hang for ninety seconds every time the machine is asleep,
 * which is exactly the silent-stall failure the build shipped with and had to
 * fix later. Written on EVERY poll, including idle ones.
 */
async function heartbeat(state: string, extra: Record<string, unknown> = {}) {
  try {
    await sb.from('app_state').upsert({
      key: HEALTH_KEY,
      value: { state, worker: WORKER, engine: process.env.AUDIT_ENGINE, freeMb: Math.round(os.freemem() / 1048576), at: new Date().toISOString(), ...extra },
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // Telemetry must never take the floor down.
    log('heartbeat failed (continuing):', (e as Error).message);
  }
}

/** File the finished report onto whatever row asked for it. */
async function fileReport(job: { source_table: string | null; source_id: string | null }, r: { url: string; report: { overall_score: number } }) {
  if (!job.source_table || !job.source_id) return;
  if (job.source_table !== 'outbound_leads' && job.source_table !== 'rep_prospects') {
    log(`refusing to write to unexpected table ${job.source_table}`);
    return;
  }
  const { error } = await sb
    .from(job.source_table)
    .update({
      audit_url: r.url,
      audit_score: Math.round(r.report.overall_score),
      audit_json: r.report,
      audit_at: new Date().toISOString(),
    })
    .eq('id', job.source_id);
  if (error) log(`could not file report onto ${job.source_table}/${job.source_id}: ${error.message}`);
}

async function claimOne() {
  const { data, error } = await sb.rpc('claim_audit_job', { p_worker: WORKER });
  if (error) { log('claim failed:', error.message); return null; }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

async function runOne(job: Record<string, unknown>) {
  const id = job.id as string;
  const target = job.target_url as string;
  const attempts = Number(job.attempts ?? 1);

  log(`auditing ${target} (attempt ${attempts})`);
  const started = Date.now();
  const result = await runWebsiteAudit(target);
  const secs = Math.round((Date.now() - started) / 1000);

  if (result.ok) {
    const score = Math.round(result.report.overall_score);
    await sb.from('audit_jobs').update({
      status: 'done',
      report: result.report,
      score,
      engine: result.usage?.model ?? process.env.AUDIT_ENGINE,
      finished_at: new Date().toISOString(),
      error: null,
    }).eq('id', id);
    await fileReport(job as { source_table: string | null; source_id: string | null }, result);
    log(`  done ${score}/100 in ${secs}s`);
    return;
  }

  /**
   * A 503 is OUR side: the engine held off for memory, or the API wallet is
   * dry. That is not a verdict on their website, so it goes back in the queue
   * rather than onto the lead. The same distinction the batch script makes,
   * for the same reason: a busy laptop must never write off a live prospect.
   */
  const ours = result.status === 503;
  if (ours && attempts < MAX_ATTEMPTS) {
    await sb.from('audit_jobs').update({ status: 'queued', worker: null, claimed_at: null, error: result.error }).eq('id', id);
    log(`  engine unavailable (${result.error}), requeued`);
    return;
  }

  await sb.from('audit_jobs').update({
    status: 'failed',
    error: result.error,
    finished_at: new Date().toISOString(),
  }).eq('id', id);

  // Only stamp the lead when the SITE is the problem. Stamping sets audit_at,
  // which is how the cron knows never to try this lead again.
  if (!ours && job.source_table && job.source_id) {
    await sb.from(job.source_table as string).update({ audit_at: new Date().toISOString() }).eq('id', job.source_id as string);
  }
  log(`  failed after ${secs}s: ${result.error}`);
}

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    // Let the current audit finish. Killing mid-run orphans a claude child and
    // leaves the job pinned in 'running' until the stale reclaim picks it up.
    log('shutting down after the current job');
    stopping = true;
  });
}

log(`audit worker up. engine ${process.env.AUDIT_ENGINE} | worker ${WORKER}${ONCE ? ' | --once' : ` | poll ${POLL_MS}ms`}`);

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
      await sb.from('audit_jobs').update({ status: 'failed', error: (e as Error).message, finished_at: new Date().toISOString() }).eq('id', job.id as string);
    }
    continue; // Straight to the next job, no idle wait while the queue has work.
  }

  await heartbeat('idle');
  if (ONCE) { log('queue empty, exiting (--once)'); break; }
  await new Promise((r) => setTimeout(r, POLL_MS));
}
