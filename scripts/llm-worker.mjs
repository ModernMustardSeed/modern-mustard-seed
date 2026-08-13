/**
 * THE DRAINER.
 *
 * Claims jobs from `llm_jobs` and answers them with the Claude Code CLI on a
 * subscription. This one file is what makes "no API key anywhere" a true
 * statement about production rather than an aspiration about local dev.
 *
 * IT RUNS IN TWO PLACES, AND THAT IS THE DESIGN.
 *
 *   node scripts/llm-worker.mjs
 *       On Sarah's workstation. Polls every two seconds, heartbeats, and never
 *       exits. Sub-second pickup, which is what makes the public tools feel
 *       instant while she is at her desk.
 *
 *   node scripts/llm-worker.mjs --drain
 *       In GitHub Actions, every five minutes, with CLAUDE_CODE_OAUTH_TOKEN in
 *       the environment. Works the queue until it is empty or the budget is
 *       spent, then exits. This is the half that keeps working when the laptop
 *       is shut, and it is the reason nothing here is laptop-dependent.
 *
 * WHY THE LOOP IS SERIAL. `lib/claude-code-json.ts` caps itself at two
 * concurrent children because each one wants a few hundred megabytes and the
 * forge OOM-killed a build at 0.9GB free. Draining is not a race; a queue that
 * finishes ten seconds later is fine and a workstation that swaps is not.
 *
 * Related: `supabase/migrations/092_llm_jobs.sql`, `lib/llm.ts`.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DRAIN = process.argv.includes('--drain');
const WORKER = process.env.LLM_WORKER_NAME || (DRAIN ? `actions-${process.env.GITHUB_RUN_ID ?? 'local'}` : `ws-${os.hostname()}`);

/** How long a --drain pass may run before it gives the runner back. */
const DRAIN_BUDGET_MS = Number(process.env.LLM_DRAIN_BUDGET_MS || 12 * 60 * 1000);
/** Idle poll interval for the resident worker. */
const POLL_MS = Number(process.env.LLM_POLL_MS || 2000);
/** The key this worker heartbeats into app_state, so routes can see it is up. */
const HEALTH_KEY = 'llm_worker_health';

// Local runs read .env.local; CI passes everything through the environment.
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
  console.error('llm-worker: missing supabase url or service role key.');
  process.exit(1);
}

/**
 * STRIP THE KEY, ALWAYS.
 *
 * A present ANTHROPIC_API_KEY silently flips the CLI back to metered billing.
 * There should not be one anywhere near this process, but "should not" is not a
 * guarantee and the failure is invisible: same answers, same logs, a bill.
 * `lib/claude-code-json.ts` strips it per-spawn as well. Both, on purpose.
 */
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;
delete process.env.ANTHROPIC_BASE_URL;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Imported lazily and by path so this file can start, report a clear error, and
// exit rather than dying on an import when the CLI is missing.
const { runClaudeCodeJson, runClaudeCodeText, claudeCodeAvailable } = await import('../lib/claude-code-json.ts');

if (!claudeCodeAvailable()) {
  console.error(
    'llm-worker: no `claude` binary on PATH. Install Claude Code and authenticate it ' +
      '(locally: `claude`; in CI: set CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`).',
  );
  process.exit(1);
}

/**
 * RESIDENT MODE ONLY, AND THAT IS LOAD-BEARING.
 *
 * `lib/llm.ts` reads this heartbeat to decide whether a visitor's chat can be
 * answered live. The five-minute Actions drainer is not live in that sense: it
 * is awake for a couple of minutes out of every five, and a chat routed to it
 * would sit there. If --drain beat here, Mr. Mustard would advertise himself as
 * available for most of the hour he is not, which is worse than being honestly
 * offline. So the runner does the work and says nothing about it.
 */
async function beat() {
  if (DRAIN) return;
  try {
    await sb.from('app_state').upsert(
      { key: HEALTH_KEY, value: { worker: WORKER, at: new Date().toISOString() }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  } catch { /* a missed heartbeat must never stop the work */ }
}

async function finish(id, patch) {
  const { error } = await sb
    .from('llm_jobs')
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) log('WARN could not write result for', id, error.message);
}

/** Claim and run exactly one job. Returns false when the queue is empty. */
async function runOne() {
  const { data, error } = await sb.rpc('claim_llm_job', { p_worker: WORKER });
  if (error) { log('claim failed:', error.message); return false; }

  const job = Array.isArray(data) ? data[0] : data;
  if (!job) return false;

  const t0 = Date.now();
  log(`claimed ${job.label} (${job.id}) model=${job.model ?? 'sonnet'} attempt=${job.attempts}`);

  try {
    if (job.schema) {
      const result = await runClaudeCodeJson({
        system: job.system_prompt,
        user: job.user_prompt,
        schema: job.schema,
        model: job.model ?? 'sonnet',
        label: job.label,
      });
      await finish(job.id, { status: 'done', result_json: result, error: null });
    } else {
      const text = await runClaudeCodeText({
        system: job.system_prompt,
        user: job.user_prompt,
        model: job.model ?? 'sonnet',
        label: job.label,
      });
      await finish(job.id, { status: 'done', result_text: text, error: null });
    }
    log(`done ${job.label} in ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (err) {
    const msg = String(err?.message ?? err).slice(0, 2000);

    // Three strikes. A prompt that is genuinely malformed will fail the same
    // way forever, and a job that is retried forever blocks the queue behind it
    // for every other caller.
    if ((job.attempts ?? 1) >= 3) {
      await finish(job.id, { status: 'failed', error: msg });
      log(`FAILED ${job.label} after ${job.attempts} attempts: ${msg.slice(0, 200)}`);
    } else {
      await sb.from('llm_jobs').update({ status: 'queued', worker: null, claimed_at: null }).eq('id', job.id);
      log(`retrying ${job.label}: ${msg.slice(0, 200)}`);
    }
  }

  return true;
}

async function main() {
  if (DRAIN) {
    const deadline = Date.now() + DRAIN_BUDGET_MS;
    let n = 0;
    await beat();
    while (Date.now() < deadline) {
      if (!(await runOne())) break;
      n += 1;
    }
    log(`drain complete, ${n} job(s) handled`);
    return;
  }

  log(`resident worker ${WORKER} up, polling every ${POLL_MS}ms`);
  let stopping = false;
  const stop = () => { stopping = true; log('shutting down after the current job'); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  while (!stopping) {
    await beat();
    // Keep pulling while there is work; only sleep once the queue is dry.
    if (!(await runOne())) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

await main();
