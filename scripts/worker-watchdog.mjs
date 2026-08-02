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
 *   - beats cove_heartbeats id "worker-<name>" every 30s while the child is up
 *   - writes a cove_activity alert when the child crash-loops
 *
 * The text to Sarah comes from the office: the Seedside daemon watches these
 * same heartbeat rows and escalates a stale one through the one SMS path that
 * is already proven (MMS itself does not text, see mms-a2p-blocks-cold-texting).
 * cove_ tables live in this very Supabase project, so no cross-repo creds.
 *
 * Run:  node scripts/worker-watchdog.mjs --name forge --script scripts/demo-site-worker.mjs
 * Drill: WATCHDOG_DRYRUN=1 node scripts/worker-watchdog.mjs --name drill --script <crashing stub>
 */
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
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
const BEAT_MS = 30_000;
const FAST_RETRY_MS = 5000;
const SLOW_RETRY_MS = 60_000;
const CRASH_WINDOW_MS = 120_000;
const CRASH_LIMIT = 5;

const url = process.env.supabase_url || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('worker-watchdog: no supabase url / service role key, refusing to start');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

let child = null;
let restarts = 0;
let crashes = [];
let lastExit = null;

const log = (...a) => console.log(`[${new Date().toISOString()}] worker-watchdog(${NAME})`, ...a);

async function beat(extra = {}) {
  try {
    await db.from('cove_heartbeats').upsert({
      id: HEARTBEAT_ID,
      beat_at: new Date().toISOString(),
      meta: { worker: NAME, script: SCRIPT, pid: child?.pid ?? null, restarts, last_exit: lastExit, ...extra },
    });
  } catch (e) {
    log('heartbeat write failed:', e.message);
  }
}

async function escalate(reason) {
  log(`ESCALATING: ${reason}`);
  if (DRYRUN) {
    log('DRYRUN, would post a feed alert for the office to pick up');
    return;
  }
  try {
    await db.from('cove_activity').insert({
      agent_id: null,
      kind: 'alert',
      body: `MMS worker "${NAME}" is crash-looping (${reason}). Nothing in its queue is being built. Script: ${SCRIPT}, last exit code ${lastExit}.`,
      meta: { worker: NAME, reason },
    });
  } catch (e) {
    log('alert insert failed:', e.message);
  }
}

function launch() {
  child = spawn(process.execPath, [SCRIPT], { stdio: 'inherit', cwd: root });
  log(`worker up pid ${child.pid} (restart #${restarts})`);
  void beat();
  child.on('exit', (code) => {
    lastExit = code;
    restarts += 1;
    const now = Date.now();
    crashes = crashes.filter((t) => now - t < CRASH_WINDOW_MS).concat(now);
    const looping = crashes.length >= CRASH_LIMIT;
    const delay = looping ? SLOW_RETRY_MS : FAST_RETRY_MS;
    log(`worker exited ${code}, restarting in ${delay / 1000}s`);
    if (looping) void escalate(`${crashes.length} crashes in ${CRASH_WINDOW_MS / 1000}s`);
    void beat({ down: true });
    setTimeout(launch, delay);
  });
}

launch();
setInterval(() => { if (child && !child.killed) void beat(); }, BEAT_MS);
