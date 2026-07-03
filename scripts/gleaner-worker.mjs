/**
 * GLEANER worker - the autonomous revenue-recovery orchestrator.
 *
 * One lever pull in /admin/gleaner inserts a gleaner_runs row. This worker
 * drains that queue and drives each run through the five gears:
 *
 *   scout  - headless Claude Code researches the vertical (leak math, chains,
 *            pricing) and writes it into gleaner_verticals.intelligence
 *   field  - shells out to the harvest CLI (~/harvest): discover -> audit ->
 *            enrich, then reads back the scored prospects
 *   forge  - enqueues build_requests (deliverable_type 'demo') with a
 *            voice-concierge brief and builds them right here with headless
 *            Claude Code on the Max plan (no metered API)
 *   court  - drafts outreach via harvest Module 6 (drafts only, never sends)
 *   gate   - inserts an approvals row; the run parks at 'gated' until Sarah
 *            reviews. Nothing is ever sent autonomously.
 *
 * Every step logs to gleaner_events, which /admin/gleaner streams live.
 *
 * Run:   node scripts/gleaner-worker.mjs           (loop, poll every 15s)
 *        node scripts/gleaner-worker.mjs --once    (one run, then exit)
 *
 * Env (all optional beyond the Supabase pair):
 *   SUPABASE_URL / supabase_url, SUPABASE_SERVICE_ROLE_KEY / supabase_service_role_key
 *   HARVEST_DIR (default ~/harvest)   BUILDS_DIR (default ~/mms-builds)
 *   CLAUDE_BIN (claude)               CLAUDE_PERMISSION (acceptEdits; bypassPermissions for full autonomy)
 *   GLEANER_POLL_MS (15000)           GLEANER_EMAIL (sarah@modernmustardseed.com)
 *   SCOUT_MAX_MS (15m)  FIELD_MAX_MS (30m per command)  FORGE_MAX_MS (55m per demo)
 */
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assembleDemoSpec } from './gleaner-spec.mjs';

const ONCE = process.argv.includes('--once');

// Load .env.local (accept lowercase keys too; this repo's Vercel pull writes
// supabase_url / supabase_service_role_key in lowercase).
const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const POLL_MS = Number(env.GLEANER_POLL_MS || 15000);
const HARVEST_DIR = env.HARVEST_DIR || path.join(os.homedir(), 'harvest');
const BUILDS_DIR = env.BUILDS_DIR || path.join(os.homedir(), 'mms-builds');
const CLAUDE_BIN = env.CLAUDE_BIN || 'claude';
const PERMISSION = env.CLAUDE_PERMISSION || 'acceptEdits';
const GLEANER_EMAIL = env.GLEANER_EMAIL || 'sarah@modernmustardseed.com';
const SCOUT_MAX_MS = Number(env.SCOUT_MAX_MS || 15 * 60 * 1000);
const FIELD_MAX_MS = Number(env.FIELD_MAX_MS || 30 * 60 * 1000);
const FORGE_MAX_MS = Number(env.FORGE_MAX_MS || 55 * 60 * 1000);
const WORKER = os.hostname();

const log = (...a) => console.log(new Date().toISOString(), '[gleaner]', ...a);
const nowIso = () => new Date().toISOString();

class Canceled extends Error { constructor() { super('run canceled'); this.canceled = true; } }

// ---------- run + event helpers ----------

async function event(runId, level, source, message, data = {}) {
  log(`${source}:${level}`, message);
  try {
    await supabase.from('gleaner_events').insert({ run_id: runId, level, source, message: String(message).slice(0, 500), data });
  } catch { /* feed is best-effort */ }
}

async function setRun(id, patch) {
  await supabase.from('gleaner_runs').update({ ...patch, updated_at: nowIso() }).eq('id', id);
}

async function assertActive(runId) {
  const { data } = await supabase.from('gleaner_runs').select('status').eq('id', runId).maybeSingle();
  if (data?.status === 'canceled') throw new Canceled();
}

async function claimRun() {
  const { data } = await supabase
    .from('gleaner_runs').select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1).maybeSingle();
  if (!data) return null;
  const { data: claimed } = await supabase
    .from('gleaner_runs')
    .update({ status: 'scouting', started_at: nowIso(), worker: WORKER, updated_at: nowIso() })
    .eq('id', data.id).eq('status', 'queued')
    .select('*').maybeSingle();
  return claimed || null;
}

// ---------- process runners ----------

/** Run a shell command string, streaming lines into the event feed (batched). */
function runStreaming(cmdString, { cwd, maxMs, runId, source }) {
  return new Promise((resolve) => {
    log('exec:', cmdString, 'in', cwd);
    const child = spawn(cmdString, { cwd, env, shell: true });
    let out = '';
    let lineCount = 0;
    let buffer = [];
    const flush = async () => {
      if (!buffer.length) return;
      const batch = buffer; buffer = [];
      for (const msg of batch) await event(runId, 'info', source, msg);
    };
    const flusher = setInterval(flush, 2500);
    const onData = (d) => {
      const text = d.toString();
      out += text;
      for (const raw of text.split('\n')) {
        const lineText = raw.trim();
        if (!lineText) continue;
        lineCount += 1;
        // Keep the live feed readable: first 120 lines, then every 10th.
        if (lineCount <= 120 || lineCount % 10 === 0) buffer.push(lineText.slice(0, 300));
      }
    };
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } }, maxMs);
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', async (code) => {
      clearTimeout(timer); clearInterval(flusher); await flush();
      resolve({ code, out });
    });
    child.on('error', async (e) => {
      clearTimeout(timer); clearInterval(flusher); buffer.push(`spawn error: ${e.message}`); await flush();
      resolve({ code: 1, out: out + '\n' + e.message });
    });
  });
}

/** Run headless Claude Code in a directory with a short quoted prompt. */
function runClaude(dir, prompt, maxMs) {
  const cmd = `${CLAUDE_BIN} -p "${prompt}" --permission-mode ${PERMISSION}${env.BUILD_MODEL ? ` --model ${env.BUILD_MODEL}` : ''}`;
  return new Promise((resolve) => {
    log('claude in', dir);
    const child = spawn(cmd, { cwd: dir, env, shell: true });
    let out = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } resolve({ code: 124, out: out + '\n[timeout]' }); }, maxMs);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: 1, out: out + '\n' + e.message }); });
  });
}

const q = (s) => `"${String(s).replace(/"/g, '')}"`;

// ---------- gear 1: SCOUT ----------

const SCOUT_CONTRACT = `# SCOUT BRIEF - Gleaner vertical intelligence

You are the scout for Gleaner, Modern Mustard Seed's revenue-recovery engine.
MMS sells 24/7 AI voice concierges + dashboards to service businesses that leak
revenue through missed calls, no online booking, and weak AI-era presence.
Multi-location chains are the prize: one system, N locations, N subscriptions.

Research the vertical named in VERTICAL.txt in this directory (if it says AUTO,
pick the highest-leak vertical NOT already covered: restaurants, home services,
painting, and medspas are covered). Use web search. Find REAL data and REAL
companies, not invented ones.

Write SCOUT.json in this directory with EXACTLY these keys:
{
  "slug": "kebab-case vertical slug",
  "name": "human name",
  "search_terms": "comma-separated local-business search terms for OpenStreetMap/Google Places discovery",
  "leak_summary": "one sharp sentence on why this vertical leaks call revenue",
  "leak_math": { "avg_missed_call_rate": 0.0, "avg_ticket_usd": 0, "est_monthly_leak_usd": 0, "basis": "one line citing the source" },
  "chains": [ { "name": "", "locations": 0, "hq": "", "website": "", "why": "one line on fit" } ],
  "pricing": { "setup_usd": 0, "per_location_mo_usd": 0, "rationale": "one line" },
  "demo_template": "restaurant | home-services | painting | medspa | custom",
  "score": 0,
  "sources": ["url", "url"]
}

Rules: 5-10 chains, each with 5+ locations, US-based. score is 0-100 for how
attractive this vertical is (leak size x chain density x reachability). Do not
ask questions. Write valid JSON. That file is your only deliverable.`;

async function scout(run) {
  await setRun(run.id, { status: 'scouting', stage_detail: 'researching the vertical' });
  await event(run.id, 'info', 'scout', `Scouting ${run.vertical_slug === 'auto' ? 'for the best new vertical' : `vertical "${run.vertical_slug}"`}`);

  // Skip when we already hold fresh intelligence for a known vertical.
  if (run.vertical_slug !== 'auto') {
    const { data: v } = await supabase.from('gleaner_verticals').select('*').eq('slug', run.vertical_slug).maybeSingle();
    if (v && (run.config?.skipScout || v.intelligence?.scouted_at)) {
      await event(run.id, 'ok', 'scout', `Using existing intelligence for ${v.name} (score ${v.score ?? '?'})`);
      return v;
    }
  }

  const dir = path.join(BUILDS_DIR, `gleaner-scout-${run.id}`);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SCOUT_BRIEF.md'), SCOUT_CONTRACT);
  writeFileSync(path.join(dir, 'VERTICAL.txt'), run.vertical_slug === 'auto' ? 'AUTO' : run.vertical_slug);

  const { code } = await runClaude(dir,
    'Read SCOUT_BRIEF.md in this directory and follow it exactly. Use web search for real data. Write SCOUT.json per the contract. Do not ask questions.',
    SCOUT_MAX_MS);

  let intel = null;
  try { intel = JSON.parse(readFileSync(path.join(dir, 'SCOUT.json'), 'utf8')); } catch { /* handled below */ }
  if (!intel?.slug) {
    if (run.vertical_slug === 'auto') throw new Error(`scout produced no SCOUT.json (claude exit ${code})`);
    await event(run.id, 'warn', 'scout', 'Scout wrote no intelligence; continuing with defaults for this vertical.');
    const { data: v } = await supabase.from('gleaner_verticals').select('*').eq('slug', run.vertical_slug).maybeSingle();
    return v || { slug: run.vertical_slug, name: run.vertical_slug, search_terms: run.vertical_slug, demo_template: 'custom' };
  }

  const slug = run.vertical_slug === 'auto' ? intel.slug : run.vertical_slug;
  const record = {
    slug,
    name: intel.name || slug,
    demo_template: intel.demo_template || 'custom',
    search_terms: intel.search_terms || slug,
    leak_summary: intel.leak_summary || null,
    intelligence: { ...intel, scouted_at: nowIso() },
    score: Number(intel.score) || null,
    status: 'scouted',
  };
  const { data: existing } = await supabase.from('gleaner_verticals').select('id,status,clone_source').eq('slug', slug).maybeSingle();
  if (existing) {
    await supabase.from('gleaner_verticals').update({ ...record, status: existing.status === 'active' ? 'active' : 'scouted' }).eq('id', existing.id);
  } else {
    await supabase.from('gleaner_verticals').insert(record);
  }
  if (run.vertical_slug === 'auto') await setRun(run.id, { vertical_slug: slug });
  await event(run.id, 'ok', 'scout',
    `Scouted ${record.name}: est leak $${Number(intel.leak_math?.est_monthly_leak_usd || 0).toLocaleString()}/mo per location, ${intel.chains?.length || 0} target chains, score ${record.score ?? '?'}`,
    { chains: (intel.chains || []).slice(0, 10) });
  const { data: fresh } = await supabase.from('gleaner_verticals').select('*').eq('slug', slug).maybeSingle();
  return fresh;
}

// ---------- gear 2: FIELD ----------

async function field(run, vertical) {
  await assertActive(run.id);
  await setRun(run.id, { status: 'fielding', stage_detail: 'harvest is walking the field' });
  const terms = vertical?.search_terms || run.vertical_slug;
  const maxProspects = Math.min(Number(run.config?.maxProspects) || 25, 50);
  const stageStart = nowIso();

  await event(run.id, 'info', 'field', `Discovering "${terms}" in ${run.geo || 'the configured geography'}`);
  const disc = await runStreaming(`npm run discover -- ${q(terms)} ${q(run.geo)}`, { cwd: HARVEST_DIR, maxMs: FIELD_MAX_MS, runId: run.id, source: 'field' });
  if (disc.code !== 0) await event(run.id, 'warn', 'field', `discover exited ${disc.code}; continuing with whatever landed`);

  await assertActive(run.id);
  await event(run.id, 'info', 'field', `Auditing up to ${maxProspects} sites (performance, booking, AI discoverability)`);
  const aud = await runStreaming(`npm run audit -- --limit ${maxProspects}`, { cwd: HARVEST_DIR, maxMs: FIELD_MAX_MS, runId: run.id, source: 'field' });
  if (aud.code !== 0) await event(run.id, 'warn', 'field', `audit exited ${aud.code}`);

  await assertActive(run.id);
  await event(run.id, 'info', 'field', 'Enriching contacts (Hunter email finder + re-score)');
  const enr = await runStreaming(`npm run enrich -- --limit ${maxProspects}`, { cwd: HARVEST_DIR, maxMs: FIELD_MAX_MS, runId: run.id, source: 'field' });
  if (enr.code !== 0) await event(run.id, 'warn', 'field', `enrich exited ${enr.code}`);

  await assertActive(run.id);
  const { data: prospects } = await supabase
    .from('harvest_prospects').select('*')
    .gte('updated_at', stageStart)
    .in('status', ['scored', 'qualified'])
    .order('composite', { ascending: false })
    .limit(100);

  const qualified = (prospects || []).filter((p) => (p.status === 'qualified' || (p.composite ?? 0) >= 60));
  const leakMonthly = (prospects || []).reduce((s, p) => s + (p.revenue_leak_estimate || 0), 0);
  const stats = { ...(run.stats || {}), scored: prospects?.length || 0, qualified: qualified.length, leakMonthly };
  await setRun(run.id, { stats });
  await event(run.id, 'ok', 'field',
    `Field swept: ${prospects?.length || 0} scored, ${qualified.length} qualified, $${leakMonthly.toLocaleString()}/mo leaking on the ground`);
  return { prospects: prospects || [], qualified, stats };
}

// ---------- gear 3: FORGE ----------

const BUILD_PROMPT = 'You are building a deliverable for Modern Mustard Seed. The full brief is in BUILD_BRIEF.md in this directory. Read it first and follow it exactly. Build production-grade and distinctive, never generic-AI. Make reasonable decisions and proceed. Do not ask questions. When finished write RESULT.json exactly per the brief contract.';

async function forgeOne(run, vertical, prospect) {
  const { data: demo } = await supabase.from('gleaner_demos').insert({
    run_id: run.id,
    prospect_id: prospect.id,
    vertical_slug: run.vertical_slug,
    brand_name: prospect.name,
    status: 'queued',
  }).select('*').single();

  const spec = assembleDemoSpec(prospect, vertical, demo);
  const { data: req } = await supabase.from('build_requests').insert({
    client_email: GLEANER_EMAIL,
    deliverable_type: 'demo',
    title: `${prospect.name} voice concierge demo`,
    spec,
    status: 'requested',
  }).select('*').single();
  await supabase.from('gleaner_demos').update({ build_request_id: req.id }).eq('id', demo.id);
  await event(run.id, 'info', 'forge', `Forging ${prospect.name} (leak est $${(prospect.revenue_leak_estimate || 0).toLocaleString()}/mo)`);

  // Claim our own build row (optimistic; if the standalone build-worker daemon
  // grabbed it first we just wait for that worker to finish it).
  const { data: claimed } = await supabase.from('build_requests')
    .update({ status: 'building', claimed_at: nowIso(), worker: `gleaner:${WORKER}`, updated_at: nowIso() })
    .eq('id', req.id).eq('status', 'requested')
    .select('*').maybeSingle();

  let result = null;
  if (claimed) {
    await supabase.from('gleaner_demos').update({ status: 'forging' }).eq('id', demo.id);
    const dir = path.join(BUILDS_DIR, req.id);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'BUILD_BRIEF.md'), spec);
    const { code } = await runClaude(dir, BUILD_PROMPT, FORGE_MAX_MS);
    try { result = JSON.parse(readFileSync(path.join(dir, 'RESULT.json'), 'utf8')); } catch { result = null; }
    if (!result && code !== 0) {
      await supabase.from('build_requests').update({ status: 'failed', error: `claude exited ${code}`, updated_at: nowIso() }).eq('id', req.id);
    } else {
      await supabase.from('build_requests').update({ status: result?.live_url ? 'ready' : 'failed', result: result || {}, error: result?.live_url ? null : 'no live_url in RESULT.json', updated_at: nowIso() }).eq('id', req.id);
    }
  } else {
    // Another worker owns it; poll until it lands.
    const deadline = Date.now() + FORGE_MAX_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 20000));
      const { data: row } = await supabase.from('build_requests').select('status,result').eq('id', req.id).maybeSingle();
      if (row?.status === 'ready' || row?.status === 'failed') { result = row.result; break; }
      await assertActive(run.id);
    }
  }

  if (result?.live_url) {
    await supabase.from('gleaner_demos').update({
      status: 'ready',
      demo_url: result.live_url,
      phone: result.phone || null,
      dashboard_url: result.dashboard_url || null,
      repo_url: result.repo_url || null,
      vapi_assistant_id: result.vapi_assistant_id || null,
      notes: result.summary || null,
    }).eq('id', demo.id);
    await supabase.from('harvest_prospects').update({ microsite_url: result.live_url, updated_at: nowIso() }).eq('id', prospect.id);
    await event(run.id, 'ok', 'forge',
      `${prospect.name} demo LIVE: ${result.live_url}${result.phone ? ` | ${result.phone}` : ''}`,
      { demoId: demo.id, url: result.live_url, phone: result.phone || null });
    try {
      await supabase.from('approvals').insert({
        type: 'build_delivery',
        title: `Gleaner demo ready: ${prospect.name}`,
        to_email: GLEANER_EMAIL,
        subject: `Demo ready: ${prospect.name}`,
        body: `The ${prospect.name} voice concierge demo is forged.\n\nSite: ${result.live_url}${result.phone ? `\nPhone: ${result.phone}` : ''}\n\nReview it before any outreach goes out.`,
        context: { buildId: req.id, gleanerRunId: run.id, gleanerDemoId: demo.id, liveUrl: result.live_url, phone: result.phone || null, deliverableType: 'demo' },
        source: 'gleaner',
        dedupe_key: `build:${req.id}`,
      });
    } catch (e) { log('approval insert failed', e.message); }
    return true;
  }

  await supabase.from('gleaner_demos').update({ status: 'failed', notes: result?.summary || 'forge failed' }).eq('id', demo.id);
  await event(run.id, 'error', 'forge', `${prospect.name} demo failed to forge`, { demoId: demo.id });
  return false;
}

async function forge(run, vertical, qualified) {
  await assertActive(run.id);
  const maxDemos = Math.min(Math.max(Number(run.config?.maxDemos) || 1, 0), 3);
  if (!maxDemos || !qualified.length) {
    await event(run.id, 'warn', 'forge', maxDemos ? 'No qualified prospects to forge for.' : 'Demo forging disabled for this run.');
    return 0;
  }
  await setRun(run.id, { status: 'forging', stage_detail: `forging ${Math.min(maxDemos, qualified.length)} demo(s)` });
  const targets = qualified.slice(0, maxDemos);
  let built = 0;
  for (const prospect of targets) {
    await assertActive(run.id);
    if (await forgeOne(run, vertical, prospect)) built += 1;
  }
  const { data: runRow } = await supabase.from('gleaner_runs').select('stats').eq('id', run.id).maybeSingle();
  await setRun(run.id, { stats: { ...(runRow?.stats || {}), demos: built } });
  return built;
}

// ---------- gear 4: COURT + the gate ----------

async function court(run, qualified) {
  await assertActive(run.id);
  await setRun(run.id, { status: 'courting', stage_detail: 'drafting outreach (drafts only)' });
  const stageStart = nowIso();
  const limit = Math.min(qualified.length || 10, 10);
  await event(run.id, 'info', 'court', `Drafting compliant outreach for up to ${limit} prospects (nothing sends without you)`);
  const res = await runStreaming(`npm run outreach -- --limit ${limit}`, { cwd: HARVEST_DIR, maxMs: FIELD_MAX_MS, runId: run.id, source: 'court' });
  if (res.code !== 0) await event(run.id, 'warn', 'court', `outreach drafting exited ${res.code}`);

  const { count: drafts } = await supabase
    .from('outreach_messages').select('id', { count: 'exact', head: true })
    .eq('kind', 'harvest').eq('status', 'draft').gte('created_at', stageStart);

  const { data: demos } = await supabase.from('gleaner_demos').select('*').eq('run_id', run.id);
  const live = (demos || []).filter((d) => d.demo_url);
  const summaryLines = [
    `Gleaner run complete: ${run.vertical_slug} / ${run.geo || 'configured geo'}.`,
    '',
    `Qualified prospects: ${qualified.length}`,
    `Demos forged: ${live.length}${live.map((d) => `\n  - ${d.brand_name}: ${d.demo_url}${d.phone ? ` | ${d.phone}` : ''}`).join('')}`,
    `Outreach drafts waiting: ${drafts ?? 0} (review in /admin/outreach, send via harvest approve + send)`,
    '',
    'Nothing has been sent. The machine is parked at your gate.',
  ].join('\n');

  try {
    await supabase.from('approvals').insert({
      type: 'outreach',
      title: `Gleaner run ready: ${run.vertical_slug}${run.geo ? ` / ${run.geo}` : ''}`,
      to_email: GLEANER_EMAIL,
      subject: `Gleaner: ${qualified.length} prospects, ${live.length} live demo(s), ${drafts ?? 0} drafts`,
      body: summaryLines,
      context: { gleanerRunId: run.id, demoIds: (demos || []).map((d) => d.id), prospectIds: qualified.map((p) => p.id) },
      source: 'gleaner',
      dedupe_key: `gleaner:${run.id}`,
    });
  } catch (e) { log('gate approval insert failed', e.message); }

  const { data: runRow } = await supabase.from('gleaner_runs').select('stats').eq('id', run.id).maybeSingle();
  await setRun(run.id, { stats: { ...(runRow?.stats || {}), drafts: drafts ?? 0 } });
  await event(run.id, 'gate', 'court', `Run parked at your gate: ${qualified.length} qualified, ${live.length} demo(s) live, ${drafts ?? 0} drafts. Review in /admin/approvals.`);
  return drafts ?? 0;
}

// ---------- the run ----------

async function processRun(run) {
  log('claimed run', run.id, run.vertical_slug, run.geo);
  try {
    const vertical = await scout(run);
    const freshRun = { ...run, vertical_slug: run.vertical_slug === 'auto' ? vertical.slug : run.vertical_slug };
    const { qualified } = await field(freshRun, vertical);
    await forge(freshRun, vertical, qualified);
    await court(freshRun, qualified);
    await setRun(run.id, { status: 'gated', stage_detail: 'awaiting your review', finished_at: nowIso() });
    log('run gated', run.id);
  } catch (e) {
    if (e?.canceled) {
      await setRun(run.id, { status: 'canceled', stage_detail: 'canceled by Sarah', finished_at: nowIso() });
      await event(run.id, 'warn', 'system', 'Run canceled.');
      return;
    }
    await setRun(run.id, { status: 'failed', error: String(e?.message || e), finished_at: nowIso() });
    await event(run.id, 'error', 'system', `Run failed: ${String(e?.message || e)}`);
    log('RUN FAILED', run.id, e?.message);
  }
}

async function tick() {
  const run = await claimRun();
  if (!run) return false;
  await processRun(run);
  return true;
}

log('gleaner worker up.', 'harvest:', HARVEST_DIR, '| builds:', BUILDS_DIR, '| permission:', PERMISSION, ONCE ? '| --once' : `| poll ${POLL_MS}ms`);
if (ONCE) {
  const did = await tick();
  if (!did) log('no queued runs.');
  process.exit(0);
} else {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { while (await tick()) { /* drain */ } } catch (e) { log('loop error', e?.message); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
