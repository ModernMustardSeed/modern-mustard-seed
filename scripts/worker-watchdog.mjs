#!/usr/bin/env node
/**
 * Generic supervisor for the MMS background workers.
 *
 * The 2026-08-02 Seedside outage taught the lesson twice in one day: a
 * supervisor that restarts a dying child and tells nobody is not a safety net,
 * it is a way to be broken quietly for fifteen hours. The office watchdog now
 * escalates a crash loop; this gives the MMS workers the same thing.
 *
 * What it does:
 *   - spawns the worker and restarts it when it exits (5s, backing off to 60s
 *     once it is clearly looping)
 *   - beats cove_heartbeats id "worker-<name>" every 30s WHILE THE CHILD IS UP
 *   - writes the crash straight onto the build health row the cockpit reads
 *   - writes a cove_activity alert when the child crash-loops, and keeps saying
 *     so every ten minutes for as long as it stays down
 *
 * The text to Sarah comes from the office: the Seedside daemon watches these
 * same heartbeat rows and escalates a stale one through the one SMS path that
 * is already proven (MMS itself does not text, see mms-a2p-blocks-cold-texting).
 * cove_ tables live in this very Supabase project, so no cross-repo creds.
 *
 * ⚡ 2026-08-24, THE TWO HOLES THIS FILE HAD, both found by the same outage.
 * The build died at 18:49 on a link-time SyntaxError and rebuilt nothing for
 * hours while the queue grew, and neither road out of here was open:
 *
 *   1. THE HEARTBEAT LIED. `if (child && !child.killed)` stayed TRUE after the
 *      child exited on its own: `child` is still the (dead) handle, and `killed`
 *      only means a signal was delivered, which is not what happened. So the
 *      watchdog beat a fresh, healthy-looking heartbeat every 30 seconds through
 *      91 consecutive crashes. The office's stale-heartbeat escalation, the one
 *      thing that texts Sarah, could never fire. A liveness signal that is
 *      written while the thing is dead is worse than no signal at all.
 *   2. IT ESCALATED ONCE AND WENT QUIET. Five crashes inside 120s trips the
 *      alert, then the backoff spaces restarts 60s apart, so the window never
 *      holds five again and the alert never repeats. One line, in a feed, at the
 *      start of a multi-hour outage.
 *
 * Both are fixed below, and the crash text itself is now captured and published
 * rather than scrolling past on an inherited stderr nobody is attached to.
 *
 * Run:  node scripts/worker-watchdog.mjs --name build --script scripts/demo-site-worker.mjs
 * Drill: WATCHDOG_DRYRUN=1 node scripts/worker-watchdog.mjs --name drill --script <crashing stub>
 */
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, createWriteStream, statSync, renameSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
if (existsSync(path.join(root, '.env.local'))) {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const NAME = arg('--name', 'forge');
const SCRIPT = arg('--script', 'scripts/demo-site-worker.mjs');
const DRYRUN = !!process.env.WATCHDOG_DRYRUN;
const HEARTBEAT_ID = `worker-${NAME}`;
/**
 * The app_state row the cockpit's build board reads. Only the build has a board;
 * another worker passing --name simply does not publish one, and says so once.
 */
// The launcher says --name build since the rename; the row it writes is still
// forge_worker_health, because that is a stored key and renaming it would just
// stop matching the row both build boards read. Matching only 'forge' here meant
// the supervisor silently stopped reporting crashes the moment the launcher was
// renamed, which is exactly the blindness this key was added on 2026-08-24 to end.
const HEALTH_KEY = NAME === 'build' || NAME === 'forge' ? 'forge_worker_health' : null;
const BEAT_MS = 30_000;
const FAST_RETRY_MS = 5000;
const SLOW_RETRY_MS = 60_000;
const CRASH_WINDOW_MS = 120_000;
const CRASH_LIMIT = 5;
/** While it stays down, say so again on this cadence. An outage is not one event. */
const RENOTIFY_MS = 10 * 60_000;
/** How much of the child's dying words to keep. Enough for a stack, not a log file. */
const CRASH_TAIL_CHARS = 1500;

/**
 * THE WORKER'S OWN LOG, SEPARATE AND CAPPED.
 *
 * The build child speaks stream-json: every tool call, every result, every base64
 * chunk of every generated photograph. All of it used to be INHERITED straight
 * into the supervisor's log file, which the outer .cmd opens `>>` and never
 * rotates. By 2026-08-24 that file was 488 MEGABYTES, and when the build went
 * down the one line that explained why was buried in it. Diagnosing a two-day
 * outage started with working out how to read the log at all.
 *
 * So the firehose gets its own file with a ceiling, and the supervisor's log goes
 * back to being useful for what it is: a short list of ups, downs and reasons.
 * One rollover is kept, which is plenty for "what was it doing when it died".
 */
const WORK_LOG = path.join(os.tmpdir(), `mms-worker-${NAME}.out.log`);
const MAX_LOG_BYTES = Number(process.env.WATCHDOG_LOG_MAX_BYTES || 64 * 1024 * 1024);
let workLog = null;
let workLogBytes = 0;

function openWorkLog() {
  try {
    mkdirSync(path.dirname(WORK_LOG), { recursive: true });
    workLogBytes = existsSync(WORK_LOG) ? statSync(WORK_LOG).size : 0;
    workLog = createWriteStream(WORK_LOG, { flags: 'a' });
    workLog.on('error', () => { workLog = null; });
  } catch {
    workLog = null; // a worker must never fail to start because a log file would not open
  }
}

function writeWorkLog(buf) {
  if (!workLog) return;
  try {
    workLog.write(buf);
    workLogBytes += buf.length;
    if (workLogBytes >= MAX_LOG_BYTES) {
      const stream = workLog;
      workLog = null; // stop writing while the file is being moved
      stream.end(() => {
        try { renameSync(WORK_LOG, `${WORK_LOG}.1`); } catch { /* keep appending if the move fails */ }
        openWorkLog();
      });
    }
  } catch { /* never let logging take the supervisor down */ }
}

openWorkLog();

const url = process.env.supabase_url || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('worker-watchdog: no supabase url / service role key, refusing to start');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

let child = null;
/** TRUE only between a successful spawn and that child's exit. The one honest liveness bit. */
let up = false;
let restarts = 0;
let crashes = [];
let lastExit = null;
let lastCrashText = null;
let downSince = null;
let lastEscalatedAt = 0;
/** Ring buffer of the current child's stderr, so a crash can be reported, not just counted. */
let errTail = '';

const log = (...a) => console.log(`[${new Date().toISOString()}] worker-watchdog(${NAME})`, ...a);

/**
 * The heartbeat is written ONLY while the child is actually running. When it is
 * down this row deliberately goes stale, because staleness is the signal the
 * office escalates on and the whole point is for the silence to be loud.
 */
async function beat(extra = {}) {
  try {
    await db.from('cove_heartbeats').upsert({
      id: HEARTBEAT_ID,
      beat_at: new Date().toISOString(),
      meta: {
        worker: NAME,
        script: SCRIPT,
        pid: child?.pid ?? null,
        up,
        restarts,
        last_exit: lastExit,
        ...extra,
      },
    });
  } catch (e) {
    log('heartbeat write failed:', e.message);
  }
}

/**
 * Publish the crash where Sarah already looks. The build board renders this row,
 * so a dead worker now names its own cause ("does not provide an export named
 * ...") instead of showing a stalled build and leaving the reason in a 488MB log
 * file in Temp. Best effort in both directions: telemetry never blocks a restart.
 */
async function publishDown(reason) {
  if (!HEALTH_KEY) return;
  try {
    await db.from('app_state').upsert(
      {
        key: HEALTH_KEY,
        value: {
          state: 'down',
          reason,
          crash: lastCrashText,
          freeMb: null,
          minFreeMb: null,
          queued: null,
          worker: NAME,
          current: null,
          restarts,
          lastExit,
          downSince,
          at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
  } catch (e) {
    log('health write failed:', e.message);
  }
}

async function escalate(reason) {
  lastEscalatedAt = Date.now();
  log(`ESCALATING: ${reason}`);
  if (DRYRUN) {
    log('DRYRUN, would post a feed alert for the office to pick up');
    return;
  }
  try {
    await db.from('cove_activity').insert({
      agent_id: null,
      kind: 'alert',
      body:
        `MMS worker "${NAME}" is crash-looping (${reason}). Nothing in its queue is being built. ` +
        `Script: ${SCRIPT}, last exit code ${lastExit}.` +
        (lastCrashText ? ` It died saying: ${lastCrashText.slice(-400)}` : ''),
      meta: { worker: NAME, reason, crash: lastCrashText },
    });
  } catch (e) {
    log('alert insert failed:', e.message);
  }
}

/**
 * One line out of a crash dump, for the cockpit headline. Prefer the actual error
 * over the Node banner and the stack frames around it.
 */
function crashHeadline(text) {
  if (!text) return 'the worker exited without saying why';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const err = lines.find((l) => /^[A-Za-z]*(Error|Exception):/.test(l));
  return (err || lines[lines.length - 1] || 'unknown').slice(0, 300);
}

function launch() {
  errTail = '';
  // BOTH streams are piped. stdout is the child's stream-json firehose and goes
  // only to the capped work log. stderr goes there too, AND is echoed to the
  // supervisor's log and kept as a tail, because stderr is where a death gets
  // explained and that explanation has to live somewhere short enough to read.
  child = spawn(process.execPath, [SCRIPT], { stdio: ['ignore', 'pipe', 'pipe'], cwd: root });
  up = true;
  downSince = null;
  log(`worker up pid ${child.pid} (restart #${restarts}) | its output: ${WORK_LOG}`);
  void beat();

  child.stdout.on('data', (buf) => {
    writeWorkLog(buf);
  });

  child.stderr.on('data', (buf) => {
    writeWorkLog(buf);
    process.stderr.write(buf);
    errTail = (errTail + buf.toString()).slice(-CRASH_TAIL_CHARS);
  });

  // A spawn that fails outright (bad interpreter, missing script) emits 'error'
  // and, with no listener, throws out of the EventEmitter and kills the SUPERVISOR.
  // Handle it as an exit so the outer loop is never the thing that dies.
  child.on('error', (e) => {
    errTail = `${errTail}\nspawn failed: ${e.message}`;
    if (up) child.emit('exit', -1);
  });

  child.once('exit', (code) => {
    if (!up) return; // an 'error' already routed this exit; do not count it twice
    up = false;
    lastExit = code;
    lastCrashText = errTail.trim() || null;
    downSince = downSince || new Date().toISOString();
    restarts += 1;
    const now = Date.now();
    crashes = crashes.filter((t) => now - t < CRASH_WINDOW_MS).concat(now);
    const looping = crashes.length >= CRASH_LIMIT;
    const delay = looping ? SLOW_RETRY_MS : FAST_RETRY_MS;
    const headline = crashHeadline(lastCrashText);
    log(`worker exited ${code}, restarting in ${delay / 1000}s :: ${headline}`);
    // One final beat marking it down, then the heartbeat goes silent until the
    // child is genuinely running again.
    void beat({ down: true, crash: headline });
    void publishDown(headline);
    // Escalate on the first loop AND on a cadence for as long as it stays broken.
    // The backoff makes the crash window stop qualifying after the first alert,
    // which is precisely how the 08-24 outage went unannounced for hours.
    if (looping && now - lastEscalatedAt > RENOTIFY_MS) {
      void escalate(`${crashes.length} crashes in ${CRASH_WINDOW_MS / 1000}s: ${headline}`);
    } else if (restarts > 1 && now - lastEscalatedAt > RENOTIFY_MS && restarts % 10 === 0) {
      void escalate(`${restarts} restarts, still failing: ${headline}`);
    }
    setTimeout(launch, delay);
  });
}

launch();
setInterval(() => {
  if (up) {
    void beat();
    return;
  }
  // Down: refresh the cockpit's reason (so the board says why, not just "no signal")
  // and keep the alert cadence alive. The HEARTBEAT is deliberately not touched.
  void publishDown(crashHeadline(lastCrashText));
  if (Date.now() - lastEscalatedAt > RENOTIFY_MS) {
    void escalate(`still down after ${restarts} restarts: ${crashHeadline(lastCrashText)}`);
  }
}, BEAT_MS);
