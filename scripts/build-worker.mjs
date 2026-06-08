/**
 * Modern Mustard Seed build worker.
 *
 * Watches the build_requests queue and runs Claude Code (your Max plan, flat
 * cost, no metered API) to build each request in an isolated sandbox directory,
 * then writes the result back and posts the live link to the client's portal.
 *
 * Prereqs on the machine that runs this:
 *   - Claude Code installed and logged in (claude login) on your Max plan
 *   - .env.local present with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - (optional) vercel CLI logged in, if you want auto-deploy
 *
 * Run:   node scripts/build-worker.mjs          (loops, polls every 15s)
 *        node scripts/build-worker.mjs --once    (process one job then exit)
 *
 * Safety: builds run in $BUILDS_DIR/<id>. For full autonomy set
 * CLAUDE_PERMISSION=bypassPermissions, but only on a machine/VM you are willing
 * to let Claude Code act on freely. Default is acceptEdits (file edits only).
 */
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ONCE = process.argv.includes('--once');
const POLL_MS = Number(process.env.BUILD_POLL_MS || 15000);
const BUILDS_DIR = process.env.BUILDS_DIR || path.join(os.homedir(), 'mms-builds');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const PERMISSION = process.env.CLAUDE_PERMISSION || 'acceptEdits';
const MAX_RUNTIME_MS = Number(process.env.BUILD_MAX_MS || 45 * 60 * 1000);
const WORKER = os.hostname();

// Load .env.local (a plain node script does not get Next's env).
const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function claimNext() {
  const { data } = await supabase
    .from('build_requests')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  // Optimistic claim: only succeeds if still 'requested'.
  const { data: claimed } = await supabase
    .from('build_requests')
    .update({ status: 'building', claimed_at: new Date().toISOString(), worker: WORKER, updated_at: new Date().toISOString() })
    .eq('id', data.id)
    .eq('status', 'requested')
    .select('*')
    .maybeSingle();
  return claimed || null;
}

function runClaude(dir) {
  return new Promise((resolve) => {
    const prompt = [
      'You are building a deliverable for a Modern Mustard Seed client.',
      'The full brief is in BUILD_BRIEF.md in this directory. Read it first.',
      'Build the deliverable here, production-grade and distinctive (never generic-AI). Match the client brand in the brief.',
      'Make reasonable decisions and proceed. Do not ask questions.',
      'If there is a deployable surface, deploy it to Vercel and capture the URL.',
      'When finished, write a file named RESULT.json with keys: live_url (string or null), repo_url (string or null), summary (string, one or two sentences).',
    ].join(' ');
    const args = ['-p', prompt, '--permission-mode', PERMISSION];
    if (env.BUILD_MODEL) args.push('--model', env.BUILD_MODEL);
    log('running:', CLAUDE_BIN, '-p <prompt>', '--permission-mode', PERMISSION, 'in', dir);
    const child = spawn(CLAUDE_BIN, args, { cwd: dir, env, shell: process.platform === 'win32' });
    let out = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} resolve({ code: 124, out: out + '\n[timeout]' }); }, MAX_RUNTIME_MS);
    child.stdout.on('data', (d) => { out += d.toString(); process.stdout.write(d); });
    child.stderr.on('data', (d) => { out += d.toString(); process.stderr.write(d); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: 1, out: out + '\n' + e.message }); });
  });
}

async function process_(job) {
  log('claimed build', job.id, job.title, 'for', job.client_email);
  const dir = path.join(BUILDS_DIR, job.id);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'BUILD_BRIEF.md'), job.spec || '');

    const { code, out } = await runClaude(dir);

    let result = { live_url: null, repo_url: null, summary: '' };
    try {
      const rp = path.join(dir, 'RESULT.json');
      if (existsSync(rp)) result = { ...result, ...JSON.parse(readFileSync(rp, 'utf8')) };
    } catch { /* no/invalid RESULT.json */ }

    if (code !== 0 && !result.summary && !result.live_url) {
      await supabase.from('build_requests').update({ status: 'failed', error: `claude exited ${code}`, updated_at: new Date().toISOString() }).eq('id', job.id);
      log('FAILED', job.id, 'exit', code);
      return;
    }

    await supabase.from('build_requests').update({
      status: 'delivered',
      result,
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id);

    // Close the loop: post the live link to the client's portal.
    if (result.live_url) {
      const url = /^https?:\/\//i.test(result.live_url) ? result.live_url : `https://${result.live_url}`;
      try {
        await supabase.from('client_files').insert({
          client_email: job.client_email,
          label: job.title || 'Delivered build',
          url,
          kind: job.deliverable_type === 'brand_bible' ? 'doc' : 'site',
        });
      } catch (e) { log('client_files insert failed', e.message); }
    }
    log('DELIVERED', job.id, result.live_url || '(no url)');
  } catch (e) {
    await supabase.from('build_requests').update({ status: 'failed', error: String(e?.message || e), updated_at: new Date().toISOString() }).eq('id', job.id);
    log('ERROR', job.id, e?.message);
  }
}

async function tick() {
  const job = await claimNext();
  if (!job) return false;
  await process_(job);
  return true;
}

log('build worker up. builds dir:', BUILDS_DIR, '| permission:', PERMISSION, ONCE ? '| --once' : `| poll ${POLL_MS}ms`);
if (ONCE) {
  const did = await tick();
  if (!did) log('no requested builds.');
  process.exit(0);
} else {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { while (await tick()) { /* drain queue */ } } catch (e) { log('loop error', e?.message); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
