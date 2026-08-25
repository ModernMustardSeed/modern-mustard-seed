/**
 * Modern Mustard Seed demo-site worker.
 *
 * Watches the outbound_demo_sites queue (cockpit "Forge website" button) and
 * runs Claude Code HEADLESS on Sarah's Max plan to design and build a complete
 * single-file demo website for each lead. Flat subscription cost by
 * construction: ANTHROPIC_API_KEY is STRIPPED from the child environment, so
 * the CLI can only ever use the logged-in subscription, never metered credits.
 *
 * The finished HTML is stored back on the row and served by the site at
 * /demo/site/<id>, where the lead's forged voice agent (Voice Agent voice
 * demo) is overlaid as a live call widget. One link, both demos.
 *
 * Prereqs on the machine that runs this:
 *   - Claude Code installed and logged in (claude login) on the Max plan
 *   - .env.local present with supabase url + service role key (either case)
 *
 * Run:   node scripts/demo-site-worker.mjs          (loops, polls every 15s)
 *        node scripts/demo-site-worker.mjs --once    (process one job then exit)
 *
 * Env knobs: DEMO_SITES_DIR (default ~/mms-demo-sites), DEMO_SITE_MODEL,
 * DEMO_SITE_PERMISSION (default bypassPermissions; the build needs WebFetch
 * for the lead's existing site and Bash for the fal.ai hero image),
 * DEMO_SITE_MAX_MS (default 25 min), DEMO_SITE_POLL_MS (default 15s).
 */
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cliDirective, cliRealDirective, cliEditDirective, codexDemoDirective, tier2DemoDirective, tier3DemoDirective, editMultipageAddendum } from '../lib/site-directive.mjs';
import { weighSite, weightLine, weightRefusal } from '../lib/site-weight.mjs';
import { judgeDemo } from '../lib/demo-quality.mjs';
import { inlineSiteAssets, remainingLocalRefs } from './inline-site-assets.mjs';
import { blankImageError } from '../lib/site-asset-refs.mjs';

const ONCE = process.argv.includes('--once');
const POLL_MS = Number(process.env.DEMO_SITE_POLL_MS || 15000);
const SITES_DIR = process.env.DEMO_SITES_DIR || path.join(os.homedir(), 'mms-demo-sites');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const PERMISSION = process.env.DEMO_SITE_PERMISSION || 'bypassPermissions';
// Do not CLAIM a new build when the machine is already low on memory. A headless
// claude child needs a few hundred MB; starting one under pressure is how the
// worker got OOM-killed mid-build on 2026-07-23 (0.9GB free), losing the build in
// flight. Skipping the claim degrades gracefully: the lead waits a poll cycle
// instead of the whole floor dying. A build already running is never interrupted.
// 1200, not 1536. The OOM this guard exists to prevent happened at 0.9GB free, so
// 1536 was an over-correction: on 2026-07-28 the machine sat at 300-500MB free all
// day (Edge, Chrome, 17 claude sessions) and the worker declined twelve leads for
// six hours in conditions where a build needing "a few hundred MB" would have been
// fine. 1200 keeps ~300MB of headroom over the known-bad point while actually being
// reachable on a working machine. A guard that never lets anything through is not a
// safety feature, it is an outage.
// 1000, not 1200. Measured 2026-07-30 while Sarah had four leads queued and the
// worker running: this machine hovers at 1180-1260MB free, so a 1200 floor sits
// exactly ON the operating point and flaps, refusing most polls. That is the
// second outage this guard has caused. 1000 keeps real headroom over the 0.9GB
// point where the OOM actually happened, clears the machine's normal state, and
// the starvation override below means even this floor can never wedge the queue.
const MIN_FREE_MEM_MB = Number(process.env.DEMO_SITE_MIN_FREE_MB || 1000);
// WALL CLOCK IS THE WRONG AXE, and raising it was never the fix. 35 minutes cut
// builds off mid-furnish (2026-07-23: six of the last eight finished at EXACTLY
// 35m, two of them 117KB and 135KB with zero photographs). Raising it to 45 just
// moved the same cliff, and made every genuinely DEAD build hold a serial worker
// hostage for three quarters of an hour.
//
// So the axe is now STALL, not elapsed. The CLI streams tool calls and text the
// whole way through a healthy build, so silence is the real signal: a run that has
// said nothing for STALL_MS is hung and dies immediately, while a run still
// talking at minute 60 is working and is left alone. This cuts the worst case on a
// hung build from 45 minutes to 10, and stops killing slow-but-alive builds at all.
// MAX_RUNTIME_MS survives only as a backstop against a process that chatters
// forever without converging.
const STALL_MS = Number(process.env.DEMO_SITE_STALL_MS || 10 * 60 * 1000);
const MAX_RUNTIME_MS = Number(process.env.DEMO_SITE_MAX_MS || 90 * 60 * 1000);
// Must stay LONGER than MAX_RUNTIME_MS. A stale window shorter than the build
// timeout means a job that is still legitimately building gets reclaimed and
// handed to a second worker, and two workers race to write the same row.
const STALE_MS = Number(process.env.DEMO_SITE_STALE_MS || 100 * 60 * 1000);
// The walkthrough film runs inline after a fresh build (see cutSuiteFilm). It
// is normally 3-6 minutes: narration, a real ~30s call, then the encode. The
// ceiling exists so a wedged browser or a locked fal wallet cannot hold the
// whole forge queue hostage; blowing it fails the film, never the build.
const SUITE_FILM_MAX_MS = Number(process.env.SUITE_FILM_MAX_MS || 14 * 60 * 1000);
// The tour is a handful of short TTS clips and an upload, no browser and no
// call, so it lives in a different order of magnitude from the film.
const SITE_TOUR_MAX_MS = Number(process.env.SITE_TOUR_MAX_MS || 4 * 60 * 1000);
const WORKER = os.hostname();
const SITE_URL = 'https://modernmustardseed.com';

// Load .env.local. This repo's file has LOWERCASE supabase keys, so accept both
// cases (the build-worker's uppercase-only regex misses them).
const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

// DESIGN TIERS (Sarah 2026-07-30: "give me a button to pick tier 1 design or tier 2
// design... and play roulette a bit"). Tier 1 = the codex/award engine. Tier 2 = the
// Wildmere AWARD SITE law (~/wildmere/TEMPLATE.md) on the claude engine. Priority:
// DEMO_SITE_TIER force (process env OR .env.local, so it survives supervisor
// relaunches) > the row's chosen tier (design_tier column once migration 073 is
// applied, else the "DESIGN TIER: n" line the cockpit writes at the top of the
// brief) > tier 2, the house style, for anything that did not choose.
// Client EDITS and paid REBUILDS stay on the claude engine regardless of tier.
// ⚡ 2026-08-07: TIER 3 (the JOURNEY site, born from the Flathead homepage) joins the
// roster and Sarah's picker offers 2 or 3. Tier 1 stays UNWIRED until she reworks it
// ("eventually 1 when i wire it again"): a stale tier-1 choice builds tier 2
// instead. The 7/30 DEMO_SITE_TIER=2 force is retired from .env.local so the
// picker can actually produce a 3; the env stays honored as an emergency lever.
// ⚡ 2026-08-11: tier 2 becomes the house style and the default for anything that
// did not explicitly choose (see tierOf).
const FORCED_TIER = ['1', '2', '3'].includes(env.DEMO_SITE_TIER || '') ? Number(env.DEMO_SITE_TIER) : null;

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing supabase url or service role key in env/.env.local.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), ...a);

/**
 * The build directive. BRIEF.md carries the lead facts; this carries the
 * standard. It is the design skill distilled for a headless, single-file
 * build: the demo has to look like a $5,000 custom site on the first scroll,
 * because the first scroll is the close.
 *
 * The design law itself lives in lib/site-directive.mjs, shared with the
 * serverless failsafe (app/api/cron/forge-fallback) so that a lead who forges
 * at 2am while this machine is asleep gets the same caliber of site.
 */
const FAL_ENV = path.join(os.homedir(), '.claude', 'fal.env').replace(/\\/g, '/');
// Derived from the running user's home rather than one machine's name, so the
// same worker finds its own notes wherever the forge happens to be running.
const MEDIA_NOTES = (
  env.MMS_MEDIA_NOTES ||
  path.join(os.homedir(), '.claude', 'projects', `C--Users-${path.basename(os.homedir())}`, 'memory', 'image-generation-setup.md')
).replace(/\\/g, '/');

/**
 * THE LAW IS RE-READ FOR EVERY BUILD, not once at startup.
 *
 * This used to be three module-level constants, which meant an edit to
 * lib/site-directive.mjs did NOTHING until somebody restarted the worker. And the
 * worker can only be restarted safely when the floor is empty, because killing it
 * mid-build orphans the headless claude child. With a busy queue that is hours, so
 * in practice every law improvement shipped late, to fewer leads than intended.
 * That footgun cost a full v4 rollout on 2026-07-22.
 *
 * A cache-busting query on the file URL gives a fresh module per job. If the law
 * ever fails to parse, we fall back to the copy loaded at startup rather than taking
 * the worker down: a stale law still builds a site, a crashed worker builds nothing.
 *
 * A REBUILD is the same forge pointed at the truth (paid client, real assets, no
 * demo pitch). An EDIT takes a finished site plus one instruction and changes only
 * that. Both laws ride along here for the same reason.
 */
const LAW_URL = new URL('../lib/site-directive.mjs', import.meta.url).href;
const STARTUP_LAW = { cliDirective, cliRealDirective, cliEditDirective, codexDemoDirective, tier2DemoDirective, tier3DemoDirective, editMultipageAddendum };

/**
 * VARIANT ROTATION MEMORY. Tier 2's selection doctrine forbids repeating the
 * previous build's variant in a run. The builder records its variant in
 * RESULT.json; we stash it beside the build dirs and feed it to the next
 * directive. Best effort everywhere: losing this file costs variety, never a build.
 */
function lastVariant() {
  try { return readFileSync(path.join(SITES_DIR, '.last-variant'), 'utf8').trim() || null; } catch { return null; }
}
function rememberVariant(dir) {
  try {
    const r = JSON.parse(readFileSync(path.join(dir, 'RESULT.json'), 'utf8'));
    if (r && typeof r.variant === 'string' && r.variant.trim()) {
      writeFileSync(path.join(SITES_DIR, '.last-variant'), r.variant.trim());
    }
  } catch { /* self-report missing or unparseable; variety degrades, nothing breaks */ }
}

/** Which design tier builds this demo row, and why. Tier 1 is unwired for now:
 * a chosen 1 (stale brief, old row) builds tier 2 rather than the retired path.
 *
 * ⚡ TIER 2 IS THE HOUSE STYLE (Sarah, 2026-08-11: "we will harden the tools to
 * do this tier 2 with narration as the go to for the sites"). The roulette that
 * used to decide unattended builds is retired: it made every demo a coin flip
 * between two different products, and the one she picked is tier 2. Tier 3 is
 * still built on request, it is just no longer something a build wanders into. */
function tierOf(job) {
  const sane = (t) => (t === 3 ? 3 : 2);
  if (FORCED_TIER) return { tier: sane(FORCED_TIER), how: 'env override' };
  if ([1, 2, 3].includes(job.design_tier)) return { tier: sane(job.design_tier), how: 'chosen' };
  const m = /^DESIGN TIER:\s*([123])\b/m.exec(job.brief || '');
  if (m) return { tier: sane(Number(m[1])), how: 'chosen' };
  return { tier: 2, how: 'house style' };
}

async function currentLaw() {
  let m = STARTUP_LAW;
  try {
    m = await import(`${LAW_URL}?v=${Date.now()}`);
  } catch (e) {
    log('WARNING: could not reload the design law, using the copy from startup:', e.message);
    m = STARTUP_LAW;
  }
  return {
    DIRECTIVE: m.cliDirective({ falEnv: FAL_ENV, mediaNotes: MEDIA_NOTES }),
    CODEX_DIRECTIVE: (m.codexDemoDirective || STARTUP_LAW.codexDemoDirective)({ falEnv: FAL_ENV, mediaNotes: MEDIA_NOTES }),
    TIER2_DIRECTIVE: (m.tier2DemoDirective || STARTUP_LAW.tier2DemoDirective)({ falEnv: FAL_ENV, mediaNotes: MEDIA_NOTES, previousVariant: lastVariant() }),
    TIER3_DIRECTIVE: (m.tier3DemoDirective || STARTUP_LAW.tier3DemoDirective)({ falEnv: FAL_ENV, mediaNotes: MEDIA_NOTES }),
    REAL_DIRECTIVE: m.cliRealDirective({ falEnv: FAL_ENV, mediaNotes: MEDIA_NOTES }),
    EDIT_DIRECTIVE: m.cliEditDirective(),
    editMultipageAddendum: m.editMultipageAddendum || STARTUP_LAW.editMultipageAddendum || (() => ''),
  };
}
const isRebuild = (job) => job.kind === 'rebuild';
const isEdit = (job) => job.kind === 'edit';
/** A client's edit belongs to a paid project and lands in a draft for approval. */
const isProjectEdit = (job) => isEdit(job) && Boolean(job.project_id);

/**
 * Worker health, written where the cockpit can see it.
 *
 * The forge is a LOCAL poller, so when it declines to claim there is nothing in
 * the database to distinguish "holding off, machine is busy" from "dead". This
 * writes a heartbeat plus the reason into app_state (no migration needed) so the
 * cockpit can say WHY the queue is not moving instead of showing silence.
 * Best effort by design: a health write must never break or slow a build.
 */
// What is on the bench right now, so the health row can say "building Tiger
// Concrete, 12m in" instead of going quiet for the length of a build.
let current = null;
export function setCurrent(job) {
  current = job ? { id: job.id, name: job.business_name || null, since: new Date().toISOString() } : null;
}

let lastHealthAt = 0;
async function reportHealth({ state, reason, freeMb }) {
  const now = Date.now();
  // Throttle: the loop polls every 15s and this is only ever advisory.
  if (state === 'polling' && now - lastHealthAt < 60000) return;
  lastHealthAt = now;
  try {
    let queued = null;
    try {
      const { count } = await supabase
        .from('outbound_demo_sites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'queued');
      queued = count ?? null;
    } catch {}
    await supabase.from('app_state').upsert(
      {
        key: 'forge_worker_health',
        value: {
          state,
          reason,
          freeMb,
          minFreeMb: MIN_FREE_MEM_MB,
          queued,
          worker: WORKER,
          current,
          stallMs: STALL_MS,
          at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
  } catch (e) {
    // Never let telemetry take the floor down.
    log('health write failed (ignored):', e?.message || e);
  }
}

async function reclaimStranded() {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await supabase
    .from('outbound_demo_sites')
    .update({ status: 'queued', worker: null, claimed_at: null, updated_at: new Date().toISOString() })
    .eq('status', 'building')
    // NULL is not less-than anything in SQL, so `.lt('claimed_at', cutoff)` alone
    // could never see a row that reached 'building' without a claim stamp. One did:
    // Bigfoot Flooring sat 'building' for TWELVE DAYS, invisible to this reclaim
    // and to the failsafe (which only selects 'queued'), holding a lead hostage
    // with nothing anywhere reporting it.
    .or(`claimed_at.is.null,claimed_at.lt.${cutoff}`)
    .select('id');
  if (data?.length) log('reclaimed stranded builds:', data.map((d) => d.id).join(', '));
}

/**
 * ANYTHING THIS MACHINE WAS BUILDING WHEN IT DIED IS DEAD.
 *
 * One worker runs per machine, and the row carries the hostname that claimed it.
 * So at STARTUP, a row still marked 'building' by THIS hostname cannot be a live
 * build: the only process that could have been running it is the one just now
 * starting. Waiting out STALE_MS for it is a hundred minutes of the queue holding
 * still for a process that no longer exists.
 *
 * Written after 2026-08-24, where exactly that happened and then got worse: the
 * worker could not start at all for hours, so even the stale sweep never ran, and
 * Angel's Care sat 'building' with nothing building it while two fresher leads
 * queued up behind it.
 *
 * Safe by construction. It matches on worker = this hostname only, so a second
 * machine's in-flight build is never touched, and it runs once before the loop
 * starts rather than on every tick.
 */
async function reclaimOwnOrphans() {
  const { data, error } = await supabase
    .from('outbound_demo_sites')
    .update({ status: 'queued', claimed_at: null, updated_at: new Date().toISOString() })
    .eq('status', 'building')
    .eq('worker', WORKER)
    .select('id,business_name');
  if (error) { log('startup orphan sweep failed (ignored):', error.message); return; }
  if (data?.length) {
    log(`requeued ${data.length} build(s) this machine was holding when it died:`, data.map((d) => d.business_name || d.id).join(', '));
  }
}

async function claimNext() {
  const { data } = await supabase
    .from('outbound_demo_sites')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const { data: claimed } = await supabase
    .from('outbound_demo_sites')
    // `error: null` matters more than it looks. The previous attempt's failure text
    // used to survive the re-claim, so a row that was actively BUILDING still read
    // "[requeued after stall] ..." in forge-health and in the cockpit. On 2026-08-24
    // that stale line cost real minutes of diagnosis: it made a healthy retry look
    // like the fault. A row's error describes its CURRENT state or it says nothing.
    .update({ status: 'building', claimed_at: new Date().toISOString(), worker: WORKER, error: null, updated_at: new Date().toISOString() })
    .eq('id', data.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  return claimed || null;
}

/**
 * KILL THE WHOLE TREE, NOT THE SHELL STANDING IN FRONT OF IT.
 *
 * spawn() here runs with shell:true on Windows, so child.pid is a `cmd.exe /c`
 * wrapper and the real claude.exe is its GRANDCHILD. child.kill() reaps the
 * wrapper and leaves claude.exe running forever, still holding a session against
 * the Max plan. Those escapees pile up, starve the next build of throughput so it
 * also times out, and orphan another one: the queue degrades faster the longer it
 * runs. On 2026-07-23 three escaped builds were alive at once (268m, 130m and 39m
 * old, each with its own subtree) and the floor had not moved in 877 minutes,
 * while jobs that should cap at 35m recorded 350m, 139m and 91m.
 *
 * taskkill /T walks the tree from the wrapper down. The signal path stays as the
 * fallback for non-Windows and for a pid that has already gone.
 */
function killTree(child) {
  if (process.platform === 'win32' && child.pid) {
    try {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
        .on('error', () => { try { child.kill('SIGKILL'); } catch {} });
      return;
    } catch { /* fall through to the signal */ }
  }
  try { child.kill('SIGKILL'); } catch {}
}

function runClaude(dir, directive) {
  return new Promise((resolve) => {
    // Subscription only, by construction: a present ANTHROPIC_API_KEY would
    // silently switch the CLI to metered API billing. Strip every key-shaped
    // credential so the logged-in Max plan is the only possible auth.
    const claudeEnv = { ...env };
    delete claudeEnv.ANTHROPIC_API_KEY;
    delete claudeEnv.ANTHROPIC_AUTH_TOKEN;

    // The directive rides as a file (it is far past the Windows 8K
    // command-line limit), and the short prompt goes in via STDIN: with
    // shell:true node joins argv UNQUOTED, so a prompt passed as an argument
    // reaches claude as only its first word (run 1 got "You", run 2 got
    // "Read"), and any newline in it truncates the rest of the command line
    // including --permission-mode. Stdin is immune to all of it.
    writeFileSync(path.join(dir, 'DIRECTIVE.md'), directive);
    const prompt = 'Read DIRECTIVE.md in this directory and follow it exactly. It tells you to read BRIEF.md and build index.html here.';
    // stream-json + verbose so the log shows live progress instead of 25
    // silent minutes; strict-mcp-config skips the global MCP servers (slow
    // cold starts, an extra hang source) since the build only needs core
    // tools (Read/Write/Bash/WebFetch).
    const args = ['-p', '--permission-mode', PERMISSION, '--output-format', 'stream-json', '--verbose', '--strict-mcp-config'];
    if (env.DEMO_SITE_MODEL) args.push('--model', env.DEMO_SITE_MODEL);
    log('running:', CLAUDE_BIN, '-p <directive>', '--permission-mode', PERMISSION, 'in', dir);
    const child = spawn(CLAUDE_BIN, args, { cwd: dir, env: claudeEnv, shell: process.platform === 'win32' });
    child.stdin.write(prompt);
    child.stdin.end();
    let out = '';
    const started = Date.now();
    let lastByte = Date.now();
    let done = false;
    // One exit path for every outcome, so the signal handlers and the stall watch
    // are always torn down exactly once no matter which one fires first.
    const finish = (r) => { if (done) return; done = true; clearInterval(watch); cleanup(); resolve(r); };
    const keep = (s) => { out = (out + s).slice(-200000); lastByte = Date.now(); };
    // Watch for SILENCE, and separately for a run that never converges.
    const watch = setInterval(() => {
      const quietMs = Date.now() - lastByte;
      const runMs = Date.now() - started;
      if (quietMs >= STALL_MS) {
        killTree(child);
        finish({ code: 124, out: `${out}\n[stalled: silent for ${Math.round(quietMs / 60000)}m after ${Math.round(runMs / 60000)}m]` });
      } else if (runMs >= MAX_RUNTIME_MS) {
        killTree(child);
        finish({ code: 124, out: `${out}\n[ceiling: still talking at ${Math.round(runMs / 60000)}m]` });
      }
    }, 30 * 1000);
    // A worker shutdown must not orphan the build either: same escape hatch, same
    // fix. Without this, every Ctrl-C on a busy floor leaks a live claude.exe.
    const onExit = () => { killTree(child); };
    process.once('SIGINT', onExit);
    process.once('SIGTERM', onExit);
    const cleanup = () => { process.off('SIGINT', onExit); process.off('SIGTERM', onExit); };
    child.stdout.on('data', (d) => { keep(d.toString()); process.stdout.write(d); });
    child.stderr.on('data', (d) => { keep(d.toString()); process.stderr.write(d); });
    child.on('close', (code) => finish({ code, out }));
    child.on('error', (e) => finish({ code: 1, out: out + '\n' + e.message }));
  });
}

/**
 * The Codex engine. Same contract as runClaude: DIRECTIVE.md on disk, a short
 * prompt over stdin (immune to Windows argv quoting), stream-JSON events kept
 * flowing so the stall watch has a pulse, index.html on disk as the only proof.
 * Uses the locally signed-in codex CLI (no API key). The sandbox is
 * workspace-write scoped to the build dir, with network on so the build can
 * fetch the lead's real site and call fal for the hero.
 */
function runCodex(dir, directive) {
  return new Promise((resolve) => {
    writeFileSync(path.join(dir, 'DIRECTIVE.md'), directive);
    const prompt = 'Read DIRECTIVE.md in this directory and follow it exactly. It tells you to read BRIEF.md and build index.html here.';
    const args = [
      '--search',
      '-a', 'never',
      '-c', 'sandbox_workspace_write.network_access=true',
      'exec',
      '-C', dir,
      '--sandbox', 'workspace-write',
      '--skip-git-repo-check',
      '--json',
    ];
    log('running:', CODEX_BIN, 'exec <directive> in', dir);
    const child = spawn(CODEX_BIN, args, { cwd: dir, env, shell: process.platform === 'win32' });
    child.stdin.write(prompt);
    child.stdin.end();
    let out = '';
    const started = Date.now();
    let lastByte = Date.now();
    let done = false;
    const finish = (r) => { if (done) return; done = true; clearInterval(watch); cleanup(); resolve(r); };
    const keep = (s) => { out = (out + s).slice(-200000); lastByte = Date.now(); };
    const watch = setInterval(() => {
      const quietMs = Date.now() - lastByte;
      const runMs = Date.now() - started;
      if (quietMs >= STALL_MS) {
        killTree(child);
        finish({ code: 124, out: `${out}\n[stalled: silent for ${Math.round(quietMs / 60000)}m after ${Math.round(runMs / 60000)}m]` });
      } else if (runMs >= MAX_RUNTIME_MS) {
        killTree(child);
        finish({ code: 124, out: `${out}\n[ceiling: still talking at ${Math.round(runMs / 60000)}m]` });
      }
    }, 30 * 1000);
    const onExit = () => { killTree(child); };
    process.once('SIGINT', onExit);
    process.once('SIGTERM', onExit);
    const cleanup = () => { process.off('SIGINT', onExit); process.off('SIGTERM', onExit); };
    child.stdout.on('data', (d) => { keep(d.toString()); process.stdout.write(d); });
    child.stderr.on('data', (d) => { keep(d.toString()); process.stderr.write(d); });
    child.on('close', (code) => finish({ code, out }));
    child.on('error', (e) => finish({ code: 1, out: out + '\n' + e.message }));
  });
}

async function fail(job, message) {
  const error = String(message).slice(0, 2000);
  await supabase
    .from('outbound_demo_sites')
    .update({ status: 'failed', error, updated_at: new Date().toISOString() })
    .eq('id', job.id);
  if (isProjectEdit(job)) {
    // A paying client asked for this edit. Surface it on the delivery board, and do
    // NOT touch their live site or their draft.
    //
    // HAND THE EDIT BACK HERE, not when they click. Edits are unlimited, but the
    // fair-use window behind them is real, and this run never produced anything.
    // The refund used to live only inside the discard action, so a client who read
    // the failure message and simply retyped their request spent the window twice
    // for one change, and a client who closed the tab never got it back at all.
    // Verified live 2026-08-03: an edit died on an upstream API error and the
    // count stayed spent. A failure is ours, so the give-back cannot depend on the
    // customer doing anything.
    await supabase
      .from('projects')
      .update({ edit_status: 'failed', edit_error: error })
      .eq('id', job.project_id);
    const { error: refundErr } = await supabase.rpc('refund_revision', { p_project_id: job.project_id });
    if (refundErr) log('refund_revision failed for', job.project_id, refundErr.message);
    else log('handed the edit back for', job.project_id, '(build failed)');
  } else if (isRebuild(job)) {
    // A paying client is on the other end of this one, so the failure has to be
    // visible on the delivery board rather than only in a worker log.
    await supabase
      .from('projects')
      .update({ site_build_status: 'failed', site_build_error: error })
      .eq('id', job.project_id);
  } else if (job.lead_id) {
    await supabase.from('outbound_leads').update({ site_demo_status: 'failed' }).eq('id', job.lead_id);
  }
  log('FAILED', job.id, error.slice(0, 200));
}

/**
 * A REBUILD KEEPS THE PHOTOGRAPHS.
 *
 * Sarah's shots are the best thing on these pages and the fal wallet is not always
 * funded, so a "rebuild on the current law" must never gamble on regenerating them.
 * Pull every inlined image out of the previous html onto disk; the design law's
 * REUSE THEIR PHOTOGRAPHY rule keys off PHOTOS.md being there.
 */
function harvestPhotos(dir, html) {
  const out = path.join(dir, 'photos');
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  const seen = new Set();
  const files = [];
  const re = /data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]{2000,})/g;
  let m;
  while ((m = re.exec(html))) {
    const b64 = m[2];
    const key = b64.length + ':' + b64.slice(0, 64);
    if (seen.has(key)) continue;
    seen.add(key);
    const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 8000) continue; // icons and textures, not photography
    if (!files.length) mkdirSync(out, { recursive: true });
    const name = String(files.length + 1).padStart(2, '0') + '.' + (ext === 'jpeg' ? 'jpg' : ext);
    writeFileSync(path.join(out, name), buf);
    files.push({ name, kb: Math.round(buf.length / 1024) });
  }
  if (!files.length) return 0;
  writeFileSync(
    path.join(dir, 'PHOTOS.md'),
    [
      '# The photography for this site (APPROVED, reuse it)',
      '',
      'These came off the previous build of this exact site. They are the photographs this',
      'business is getting. Inline them again as compressed JPEG data URIs and design around',
      'them. Do NOT generate replacements and do NOT fall back to SVG scene art while these',
      'are sitting here. Crop and grade them freely: three different crops of one strong',
      'frame is exactly how a triptych gets built. The largest file is almost always the hero.',
      '',
      ...files.map((f) => `- photos/${f.name} (${f.kb}KB)`),
      '',
    ].join('\n')
  );
  return files.length;
}

async function process_(job) {
  const rebuild = isRebuild(job);
  const edit = isEdit(job);
  const kindLabel = edit ? 'site EDIT' : rebuild ? 'REAL SITE rebuild' : job.reuse_photos ? 'site REBUILD (photos kept)' : 'site build';
  log('claimed', kindLabel, job.id, 'for', job.business_name);
  if (isProjectEdit(job)) {
    await supabase.from('projects').update({ edit_status: 'building' }).eq('id', job.project_id);
  } else if (rebuild) {
    await supabase.from('projects').update({ site_build_status: 'building' }).eq('id', job.project_id);
  } else if (job.lead_id) {
    await supabase.from('outbound_leads').update({ site_demo_status: 'building' }).eq('id', job.lead_id);
  }

  const dir = path.join(SITES_DIR, job.id);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    // A lead-demo edit re-uses this row's dir, which still holds the previous
    // build's index.html. Clear it first, or a headless run that failed to write a
    // new one would leave the stale file and we would store the OLD site as "edited".
    const htmlPath = path.join(dir, 'index.html');
    if (existsSync(htmlPath)) rmSync(htmlPath, { force: true });
    writeFileSync(path.join(dir, 'BRIEF.md'), job.brief || '');
    // An edit needs the site it is editing on disk beside the change request.
    if (edit) writeFileSync(path.join(dir, 'CURRENT.html'), job.base_html || '');
    // A paid site can be five files now, and an edit that only ever saw the home page
    // would answer "change the services page" by editing the wrong document. Lay the
    // whole current site down beside the change request. Lead demo edits have no
    // project, so they take this branch not at all and behave exactly as before.
    let editPages = [];
    if (isProjectEdit(job)) {
      const { data: proj } = await supabase
        .from('projects')
        .select('site_pages, site_pages_draft, site_html_draft')
        .eq('id', job.project_id)
        .maybeSingle();
      // "Adjust" refines the DRAFT rather than the live site, and queues the draft's
      // html as base_html. Pair it with the DRAFT's inner pages or the run mixes an
      // edited home page with the four pages the previous edit already replaced.
      const refiningDraft = Boolean(proj?.site_html_draft) && job.base_html === proj.site_html_draft;
      const source = refiningDraft && proj?.site_pages_draft ? proj.site_pages_draft : proj?.site_pages;
      if (refiningDraft) log('edit refines the existing draft, using its pages');
      const map = source && typeof source === 'object' ? source : {};
      const names = Object.keys(map).filter((n) => /^[a-z0-9][a-z0-9-]*\.html$/i.test(n) && typeof map[n] === 'string' && map[n].trim());
      if (names.length) {
        const cur = path.join(dir, 'current');
        if (existsSync(cur)) rmSync(cur, { recursive: true, force: true });
        mkdirSync(cur, { recursive: true });
        writeFileSync(path.join(cur, 'index.html'), job.base_html || '');
        for (const n of names) writeFileSync(path.join(cur, n), map[n]);
        // Clear last run's output so an unwritten page cannot masquerade as this run's.
        for (const n of names) { const stale = path.join(dir, n); if (existsSync(stale)) rmSync(stale, { force: true }); }
        editPages = names.map((n) => `current/${n}`);
        log(`edit covers ${names.length + 1} pages:`, ['index.html', ...names].join(', '));
      }
    }
    // A simple rebuild keeps the photography it already has.
    if (job.reuse_photos && job.html) {
      const n = harvestPhotos(dir, job.html);
      log('rebuild: kept', n, 'photograph(s) from the previous build');
    }

    const law = await currentLaw();
    let directive;
    let engineName = 'claude';
    if (edit) directive = law.EDIT_DIRECTIVE + law.editMultipageAddendum(editPages);
    else if (rebuild) directive = law.REAL_DIRECTIVE;
    else {
      const { tier, how } = tierOf(job);
      log(`design tier ${tier} (${how}) for`, job.business_name);
      if (tier === 1) { directive = law.CODEX_DIRECTIVE; engineName = 'codex'; }
      else if (tier === 3) directive = law.TIER3_DIRECTIVE;
      else directive = law.TIER2_DIRECTIVE;
    }
    const { code, out } = engineName === 'codex' ? await runCodex(dir, directive) : await runClaude(dir, directive);

    const stalled = code === 124 && /\[stalled:/.test(out);
    const nothing = !existsSync(htmlPath);
    const html = nothing ? '' : readFileSync(htmlPath, 'utf8');
    const unusable = nothing || html.length < 1500 || !/<\/html>/i.test(html);

    // A stall that wrote NOTHING is a hung CLI far more often than a bad job, and
    // burning the lead for it costs Sarah a demo she asked for. Give it exactly one
    // more turn. The attempt is recorded in `error` rather than a new column, which
    // keeps this durable across worker restarts without a migration, and the marker
    // is what stops it looping: a second attempt falls through to a real failure.
    //
    // A TRANSIENT UPSTREAM ERROR EARNS THE SAME TURN. On 2026-08-03 a paying
    // client's first edit died on "API Error: Server error mid-response" after 55
    // seconds. Nothing was wrong with the job; the other end hiccuped. It was
    // marked failed, which is TERMINAL (the GitHub failsafe only rescues queued
    // rows), so a single upstream blip became a dead edit in a customer's portal.
    // One retry makes that class of failure invisible, which is what it should be.
    const transient =
      /API Error|Server error|overloaded|rate.?limit|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|Internal server error|\b(?:500|502|503|504|529)\b/i.test(out);
    // A SHUT USAGE WINDOW IS NOT TRANSIENT. Retrying immediately just burns another
    // run against a door that is still locked; that one needs resetsAt and the
    // parked-worker playbook, not a retry.
    const windowShut = /usage limit|resetsAt|limit reached.*reset/i.test(out);
    const retryable = stalled || (transient && !windowShut);

    if (unusable && retryable && !/\[requeued after/.test(job.error || '')) {
      const why = stalled ? 'stall' : 'a transient upstream error';
      log(`${stalled ? 'stalled' : 'hit an upstream error'} with nothing usable, requeueing once:`, job.id);
      await supabase
        .from('outbound_demo_sites')
        .update({
          status: 'queued',
          worker: null,
          claimed_at: null,
          error: `[requeued after ${stalled ? 'stall' : 'upstream error'}] ${out.slice(-400)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      // A client watching their portal should see "still working", never a failure
      // that is about to un-fail itself. The row is queued again, so the existing
      // queued/building UI is already correct; just make sure nothing left a
      // failed state behind from a previous pass.
      if (isProjectEdit(job)) {
        await supabase.from('projects').update({ edit_status: 'building', edit_error: null }).eq('id', job.project_id);
      } else if (isRebuild(job)) {
        await supabase.from('projects').update({ site_build_status: 'building', site_build_error: null }).eq('id', job.project_id);
      }
      log(`requeued for ${why}`);
      return;
    }

    if (nothing) {
      await fail(job, `no index.html produced (${engineName} exited ${code}): ${out.slice(-500)}`);
      return;
    }
    if (unusable) {
      await fail(job, `index.html looks incomplete (${html.length} bytes, ${engineName} exited ${code})`);
      return;
    }

    rememberVariant(dir);
    await storeFinished(job, html);
  } catch (e) {
    await fail(job, e?.message || e);
  }
}

/**
 * Repair a build that pointed at sibling files instead of inlining them, and refuse
 * to bank one that cannot be repaired.
 *
 * Returns the sealed html, or null when the job has already been failed. A missing
 * file is a REAL failure: the build died before generating its imagery (Miller's
 * four offer-card renders never ran), and shipping the page anyway is how a lead
 * gets a demo full of alt text. Better a retry than a burned prospect.
 */
async function sealAssets(job, html) {
  const dir = path.join(SITES_DIR, job.id);
  let result;
  try {
    result = await inlineSiteAssets(html, dir);
  } catch (e) {
    await fail(job, `could not inline the site assets: ${e?.message || e}`);
    return null;
  }

  if (result.missing.length) {
    await fail(job, `build references ${result.missing.length} asset(s) that do not exist on disk: ${result.missing.slice(0, 8).join(', ')}`);
    return null;
  }

  if (result.inlined.length) {
    log(
      'sealed',
      result.inlined.length,
      'loose asset(s) into data URIs for',
      job.id,
      `(${Math.round(result.bytes / 1024)}KB, q${result.quality ?? '-'} x${result.scale ?? 1})`
    );
  }

  const left = remainingLocalRefs(result.html);
  if (left.length) {
    await fail(job, `site still points at local files after inlining: ${left.slice(0, 8).join(', ')}`);
    return null;
  }

  // AND THE IMAGES MUST ACTUALLY BE IMAGES.
  //
  // Inlining proves nothing points at a file we will not send. It cannot tell a
  // photograph from a solid rectangle, and Polly Thompson Pest Elimination
  // (f9b0be79, 2026-08-03) banked with five blank swatches because the build
  // inlined a draft while its last five renders were still running, then never ran
  // the final pass. The renders were sitting on disk, finished and perfect. A
  // failed row is recoverable; a lead opening a page of empty blocks is not.
  const blank = blankImageError(result.html);
  if (blank) {
    await fail(job, blank);
    return null;
  }
  return result.html;
}

/**
 * Everything that happens once a build has produced valid HTML. Split out of
 * process_ so a build that finished on disk can still be banked after the worker
 * that started it is gone (see rescueFinished).
 */
async function storeFinished(job, html) {
  // NOTHING BUT THE HTML LEAVES THIS MACHINE.
  //
  // The row IS the deliverable; the build directory is not published anywhere. A
  // build that wrote `<img src="hero.jpg">` beside its index.html therefore reaches
  // the prospect as a wall of 404s with the browser painting the long descriptive
  // alt text where the photographs should be (Miller Construction, 0cda2857,
  // 2026-08-02: fifteen broken images, alt strings colliding with the hero copy).
  // The design law forbids this, but law is not enforcement. Seal it here, on the
  // one path every build and rescue funnels through.
  const sealed = await sealAssets(job, html);
  if (!sealed) return; // failed and recorded
  html = sealed;

  // THE WEIGHT GATE. The law has asked for under 900KB for months and the night of
  // 2026-08-21 still shipped a 12.5MB demo, because a sentence in a prompt is not
  // enforcement. Measured here, on the same path sealAssets already guards.
  //
  // One requeue, never a silent pass and never a straight failure: the numbers go
  // back to the builder so the retry knows it inlined the same photo seven times,
  // rather than being told to "make it smaller" again.
  const weight = weighSite(html);
  log('weight:', weightLine(weight));
  if (weight.overCeiling) {
    const refusal = weightRefusal(weight);
    if (!/\[requeued after weight/.test(job.error || '')) {
      log('OVER THE WEIGHT CEILING, requeueing once:', job.id, refusal);
      await supabase
        .from('outbound_demo_sites')
        .update({
          status: 'queued',
          worker: null,
          claimed_at: null,
          error: `[requeued after weight] ${refusal}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return;
    }
    await fail(job, `still over the weight ceiling after a retry: ${refusal}`);
    return;
  }

  // THE NO-SLOP GATE (Sarah, 2026-08-22: "MAKE IT A RULE TO NEVER PRODUCE SLOP
  // EVER AGAIN - EVER").
  //
  // It is a gate rather than a sentence on purpose. The law had said "every
  // visual slot carries photography" for months, and the fleet still filled with
  // pages that satisfied it by pasting the hero into all nine slots. A rule the
  // build cannot fail is not a rule.
  //
  // judgeDemo is calibrated against Sarah's own verdicts on eight sites she named
  // either way, and agrees on seven. It refuses only SLOP, never merely weak:
  // Huck Yeah reads weak and she likes it, so blocking weak would block work she
  // approved. Slop is the narrow, defensible case: one photograph AND something
  // else wrong on top of it.
  if (!isEdit(job) && !isRebuild(job)) {
    const q = judgeDemo(html, WORKER);
    log(`quality: ${q.verdict} (${q.label})${q.reasons.length ? ' :: ' + q.reasons.join('; ') : ''}`);
    if (q.verdict === 'slop') {
      const why =
        `this build is slop and will not be sent: ${q.reasons.join('; ')}. ` +
        `Every visual slot needs its OWN photograph. One image repeated is the single fastest way to lose the owner. ` +
        `Pick a house style from STYLES.md, give every slot a distinct frame, and put their real rating in the proof section.`;
      if (!/\[requeued after quality/.test(job.error || '')) {
        log('SLOP, requeueing once:', job.id, why);
        await supabase
          .from('outbound_demo_sites')
          .update({
            status: 'queued',
            worker: null,
            claimed_at: null,
            error: `[requeued after quality] ${why}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        return;
      }
      await fail(job, `still slop after a retry: ${q.reasons.join('; ')}`);
      return;
    }
  }

  // A client's edit lands in a draft for approval; it must NOT be written onto the
  // job's html and served, and it must NOT touch the live site. Route it first.
  if (isProjectEdit(job)) {
    await finishClientEdit(job, html);
    return;
  }

  const { error: upErr } = await supabase
    .from('outbound_demo_sites')
    .update({ status: 'ready', html, error: null, built_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', job.id);
  if (upErr) {
    await fail(job, `could not store the html: ${upErr.message}`);
    return;
  }

  if (isRebuild(job)) {
    await finishRebuild(job, html);
    return;
  }

  await supabase.from('outbound_leads').update({ site_demo_status: 'ready' }).eq('id', job.lead_id);

  const siteUrl = `${SITE_URL}/demo/site/${job.id}`;
  await supabase.from('messages').insert({
    outbound_lead_id: job.lead_id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'cockpit',
    to_addr: job.business_name,
    subject: isEdit(job) ? 'Website demo updated' : 'Website demo live',
    snippet: isEdit(job)
      ? `Their demo website was reforged from your prompt. Live at ${siteUrl}`
      : `Their demo website is live at ${siteUrl} (voice agent riding along on it, sell it as a separate add-on).`,
    read: true,
    occurred_at: new Date().toISOString(),
  });
  log(isEdit(job) ? 'EDITED' : 'READY', job.id, siteUrl, `(${Math.round(html.length / 1024)}KB)`);

  // Fresh demo banked = the whole suite exists. Cut their walkthrough film
  // FIRST (it is the last thing made and the first thing they watch), then
  // tell the site it may announce the package.
  if (!isEdit(job)) {
    await buildSiteTour(job);
    await cutSuiteFilm(job);
    await notifySuiteReady(job);
  }
}

/**
 * THE HOSTESS, now a standard part of every site we build.
 *
 * Sarah 2026-08-07, after hearing it on Glimmer: *"use that voice for all the
 * sites we do this with... and make that part of how we do websites for
 * future."* So the tour is no longer a thing done by hand per site; a finished
 * build gets one the way it gets a film.
 *
 * ⚠️ NON-FATAL, unlike the film. The film IS the publish gate, so its failure
 * correctly holds the whole announcement. A missing tour costs the visitor a
 * welcome and nothing else, and `SiteTour` already renders nothing when there
 * is no manifest. Holding a finished suite hostage over a nice-to-have would
 * be the wrong trade. Runs BEFORE the film so the recorder never catches a
 * half-written manifest.
 */
/**
 * ⏸️ PAUSED, 2026-08-11. Sarah: *"the narration is not quite right. take it off
 * for now until we perfect her cadence."* The script the tour builds from is
 * correct now (it reads the page's own chapters), and the voice renders free on
 * the Node Edge path, so what is left is a TASTE problem: how she paces a
 * sentence, where she breathes, how long a beat runs. A hostess with the wrong
 * cadence on a prospect's demo is worse than no hostess, so the pipeline stops
 * making them until the read is right.
 *
 * Turning it back on is one flag and no code change: SITE_TOUR=on (in the
 * environment or .env.local). Nothing else about the tour was removed, and
 * `node scripts/site-tour/build.mjs --site <id>` still builds one by hand,
 * which is exactly how the cadence gets tuned.
 */
const SITE_TOUR_ON = /^(1|on|true|yes)$/i.test(env.SITE_TOUR || '');

async function buildSiteTour(job) {
  if (!SITE_TOUR_ON) return log('site tour: PAUSED (cadence rework). Set SITE_TOUR=on to resume.');
  const script = path.join(process.cwd(), 'scripts', 'site-tour', 'build.mjs');
  if (!existsSync(script)) return log('site tour: script missing, skipped');
  log('site tour: writing the welcome for', job.business_name);

  const ok = await new Promise((resolve) => {
    const child = spawn(process.execPath, [script, '--site', job.id], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      log('site tour: over time, killing');
      try { killTree(child); } catch { /* already gone */ }
      resolve(false);
    }, SITE_TOUR_MAX_MS);
    const relay = (buf) => String(buf).split(/\r?\n/).filter(Boolean).forEach((l) => log('  tour|', l.slice(0, 200)));
    child.stdout.on('data', relay);
    child.stderr.on('data', relay);
    child.on('error', (e) => { clearTimeout(timer); log('site tour: could not start:', e?.message); resolve(false); });
    child.on('close', (code) => { clearTimeout(timer); resolve(code === 0); });
  });

  // Exit 2 is the builder refusing to ship a stub tour, which is a correct
  // outcome on a thin page, not a breakage.
  log(ok ? 'site tour: ready' : 'site tour: not built (the suite ships without a guide)');
}

/**
 * THE WALKTHROUGH FILM, the final step of the forge.
 *
 * Sarah 2026-08-01: the video at the top of a suite has to be a fresh
 * recording of THAT lead's site, agent and command center. It had been serving
 * one house film (shot on the Wills Electric build) to everybody.
 *
 * Serial on purpose. The film is minutes against a build that is tens of
 * minutes, and running it inline keeps ONE definition of "this suite is
 * finished" instead of a second queue to keep alive at 2am. A failure here is
 * loud on the row (suite_film_status='failed') and simply holds the
 * announcement: suite-ready refuses to send without a ready film, so the worst
 * case is a suite that waits for a human, never one that goes out half-made.
 */
async function cutSuiteFilm(job) {
  if (!job.lead_id) return;
  const script = path.join(process.cwd(), 'scripts', 'suite-film', 'build.mjs');
  if (!existsSync(script)) return log('suite film: script missing, skipped');

  await supabase.from('outbound_leads').update({ suite_film_status: 'queued' }).eq('id', job.lead_id);
  log('suite film: rolling for', job.business_name);

  const ok = await new Promise((resolve) => {
    const child = spawn(process.execPath, [script, '--lead', job.lead_id], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      log('suite film: over time, killing');
      try { killTree(child); } catch { /* already gone */ }
      resolve(false);
    }, SUITE_FILM_MAX_MS);
    const relay = (buf) => String(buf).split(/\r?\n/).filter(Boolean).forEach((l) => log('  film|', l.slice(0, 200)));
    child.stdout.on('data', relay);
    child.stderr.on('data', relay);
    child.on('error', (e) => { clearTimeout(timer); log('suite film: could not start:', e?.message); resolve(false); });
    child.on('close', (code) => { clearTimeout(timer); resolve(code === 0); });
  });

  log(ok ? 'suite film: cut' : 'suite film: FAILED (the suite will wait for a human, not go out without it)');
}

/**
 * Sarah 2026-07-30: "as soon as the website is also done... it emails them with
 * the total package and the video about their stuff." The send itself lives in
 * app/api/hooks/suite-ready (prod Resend + suppression guards + dedupe + the
 * app_state kill switch); this just knocks. Fire-and-forget by design: an email
 * hiccup must never mark a finished build failed.
 */
async function notifySuiteReady(job) {
  const secret = env.FORGE_NOTIFY_SECRET;
  // Loud, not silent: an unset secret used to be an invisible no-op that
  // stranded every announcement with a clean log (loop audit, break #6). The
  // daily suite-sweep cron is the second knock either way.
  if (!secret) return log('suite-ready NOT knocked: FORGE_NOTIFY_SECRET is missing from this env. Announcements cannot send until it is set.');
  if (!job.lead_id) return;
  try {
    const res = await fetch(`${SITE_URL}/api/hooks/suite-ready`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ siteId: job.id }),
    });
    const j = await res.json().catch(() => ({}));
    log('suite-ready email:', res.status, JSON.stringify(j).slice(0, 160));
  } catch (e) {
    log('suite-ready email failed (ignored):', e?.message || e);
  }
}

/**
 * BANK THE WORK OF A WORKER THAT DIED.
 *
 * The headless child outlives its parent (that is the whole reason killTree exists),
 * so when this process is killed mid-build the build keeps going and finishes on
 * disk, with nobody left to store it. On 2026-07-23 the worker was OOM-killed at
 * 08:32 with the machine at 0.9GB free; its build finished at 08:56, wrote 394KB and
 * a clean RESULT.json, and would have been thrown away and rerun from scratch.
 *
 * So before claiming anything new, look for rows this host still owns that already
 * have finished HTML sitting in their build directory, and bank them. Runs before
 * reclaimStranded so a finished build is never handed to a second worker to redo.
 */
async function rescueFinished() {
  const { data } = await supabase
    .from('outbound_demo_sites')
    .select('*')
    .eq('status', 'building')
    .eq('worker', WORKER);
  for (const job of data || []) {
    const htmlPath = path.join(SITES_DIR, job.id, 'index.html');
    if (!existsSync(htmlPath)) continue;
    let html = '';
    try { html = readFileSync(htmlPath, 'utf8'); } catch { continue; }
    if (html.length < 1500 || !/<\/html>/i.test(html)) continue;
    log('rescued a build that finished after the worker died:', job.id, job.business_name);
    try { await storeFinished(job, html); } catch (e) { log('could not bank', job.id, e?.message); }
  }
}

/**
 * A finished CLIENT edit becomes the DRAFT, never the live site. It lands in
 * projects.site_html_draft with edit_status 'ready', and a human approves it on
 * /admin/delivery before anything reaches the client's domain. The whole guardrail
 * is that an agent's edit can never publish itself.
 */
async function finishClientEdit(job, html) {
  // A multi-page site's edit has to land as a WHOLE site, or approving the draft
  // publishes the edited home page beside four pages that no longer exist. The edit
  // directive is told to write every page back, changed or not; this collects them.
  const pages = await collectExtraPages(job);
  const pageCount = Object.keys(pages).length;
  const { data: proj } = await supabase.from('projects').select('site_pages').eq('id', job.project_id).maybeSingle();
  const had = Object.keys((proj?.site_pages && typeof proj.site_pages === 'object' ? proj.site_pages : {})).length;
  if (had && pageCount < had) {
    // Refuse rather than hand a human a draft that silently drops pages.
    await fail(job, `the edit returned ${pageCount} of ${had} inner pages, so the draft would have lost ${had - pageCount}. Nothing was changed.`);
    return;
  }

  const { error } = await supabase
    .from('projects')
    .update({
      site_html_draft: html,
      site_pages_draft: pageCount ? pages : null,
      edit_status: 'ready',
      edit_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.project_id);
  if (error) {
    await fail(job, `could not store the edited draft: ${error.message}`);
    return;
  }
  await supabase
    .from('outbound_demo_sites')
    .update({ status: 'ready', html, error: null, built_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', job.id);
  log('CLIENT EDIT READY', job.id, `project ${job.project_id}`, `(${Math.round(html.length / 1024)}KB)`);
  log(`review it: ${SITE_URL}/admin/delivery`);
}

/**
 * A finished rebuild becomes the REAL site: projects.site_html, which is what the
 * editor edits and what publishing ships.
 *
 * It does NOT go to the client. Nobody sees it until a human has looked at it and
 * approved it, and it reveals on the date we chose. That gap is the whole product:
 * the machine does the work, a person signs it.
 *
 * The client's own edits win. If Sarah (or a revision) already wrote site_html and
 * the site is out the door, an in-flight rebuild landing late must not silently
 * overwrite it, so we refuse and say so.
 */
/**
 * THE OTHER FOUR PAGES.
 *
 * A paid site is five REAL pages now, not five hash routes in one document (Sarah,
 * 2026-08-14: "make all sites have 5 sep pages so it helps seo and geo"). Google
 * discards everything after a '#', so the old shape indexed as one page however many
 * rooms it had. Demos still ship as one page on purpose; only the paid path is
 * multi-file.
 *
 * The build writes them beside index.html. Every one gets the SAME sealing the home
 * page gets, because only the HTML is deployed: a page still pointing at a sibling
 * jpg reaches the customer as a wall of broken images, and that failure has shipped
 * before on the home page alone.
 */
async function collectExtraPages(job) {
  const dir = path.join(SITES_DIR, job.id);
  let names = [];
  try {
    names = readdirSync(dir).filter((n) => /\.html$/i.test(n) && n.toLowerCase() !== 'index.html' && n.toLowerCase() !== 'current.html');
  } catch { return {}; }
  const pages = {};
  for (const name of names) {
    let raw;
    try { raw = readFileSync(path.join(dir, name), 'utf8'); } catch { continue; }
    if (raw.length < 800 || !/<\/html>/i.test(raw)) {
      log(`page ${name} looks incomplete (${raw.length} bytes), skipped`);
      continue;
    }
    let result;
    try { result = await inlineSiteAssets(raw, dir); } catch (e) {
      log(`page ${name} could not be sealed: ${e?.message || e}`);
      continue;
    }
    if (result.missing.length) { log(`page ${name} references missing assets, skipped: ${result.missing.slice(0, 4).join(', ')}`); continue; }
    const left = remainingLocalRefs(result.html);
    if (left.length) { log(`page ${name} still points at local files, skipped: ${left.slice(0, 4).join(', ')}`); continue; }
    const blank = blankImageError(result.html);
    if (blank) { log(`page ${name}: ${blank}, skipped`); continue; }
    pages[name] = result.html;
  }
  if (names.length) log(`banked ${Object.keys(pages).length}/${names.length} extra page(s): ${Object.keys(pages).join(', ') || 'none'}`);
  return pages;
}

async function finishRebuild(job, html) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, site_published_at')
    .eq('id', job.project_id)
    .maybeSingle();

  if (project?.site_published_at) {
    await fail(job, 'their site is already live, so this rebuild was not applied over it (publish a fresh build deliberately instead)');
    return;
  }

  const pages = await collectExtraPages(job);
  const pageCount = Object.keys(pages).length;

  const { error } = await supabase
    .from('projects')
    .update({
      site_html: html,
      // Null rather than {} when there are none, so "single page site" stays
      // distinguishable from "multi-page build that produced nothing".
      site_pages: pageCount ? pages : null,
      site_build_status: 'ready',
      site_build_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.project_id);
  if (error) {
    await fail(job, `could not store the real site: ${error.message}`);
    return;
  }

  const totalKb = Math.round((html.length + Object.values(pages).reduce((a, p) => a + p.length, 0)) / 1024);
  log('REBUILD READY', job.id, `project ${job.project_id}`, `(${pageCount + 1} page(s), ${totalKb}KB)`);
  log(`review it: ${SITE_URL}/admin/delivery/${job.project_id}/edit`);
}

/**
 * HEARTBEAT. The serverless failsafe (app/api/cron/forge-fallback) needs to know
 * whether this machine is alive, and it cannot tell "laptop is asleep" from
 * "laptop is mid-build on the job ahead of yours" by looking at timestamps
 * alone. So we say so out loud on every poll. A fresh heartbeat means hands off,
 * the Max plan has it. A stale one means the API may spend money to rescue the
 * lead who is watching a countdown.
 */
async function beat() {
  try {
    await supabase.from('app_state').upsert({
      key: 'forge:worker',
      value: { at: new Date().toISOString(), host: WORKER },
    });
  } catch { /* a missed beat just makes the failsafe more eager, never less safe */ }
  // Refresh the health row mid-build too. Without this it freezes at the moment
  // the build started, and a 40-minute-old timestamp reads as a dead worker.
  if (current) {
    lastHealthAt = 0;
    await reportHealth({ state: 'building', reason: current.name, freeMb: Math.round(os.freemem() / (1024 * 1024)) });
  }
}

// Track so we log the pressure once, not on every 15s poll.
let warnedLowMem = false;
/** When the memory guard first started refusing. Null whenever it is not refusing. */
let blockedSince = null;

/**
 * THE STARVATION OVERRIDE.
 *
 * On 2026-07-30 Sarah forged four sites, ran the worker herself, and nothing
 * moved: 16GB of RAM with ~600MB actually available, so the guard refused every
 * claim forever. The comment above MIN_FREE_MEM_MB already says it. "A guard that
 * never lets anything through is not a safety feature, it is an outage." That was
 * written and then not enforced, because the guard had no way to ever give up.
 *
 * So it now gives up. After STARVE_MS of continuous refusal with work waiting, it
 * takes ONE build anyway, provided there is at least a hard floor of memory to
 * work in. Waiting for a quiet machine is the preference, not the rule: a build
 * that runs slowly beats a queue that never moves, and the serial worker means
 * this can only ever admit one at a time.
 */
const STARVE_MS = Number(process.env.DEMO_SITE_STARVE_MS || 15 * 60 * 1000);
/** Below this a build cannot realistically run, so the override does not apply. */
const HARD_FLOOR_MB = Number(process.env.DEMO_SITE_HARD_FLOOR_MB || 500);

async function tick() {
  // Bank finished work and free stranded rows first; both are cheap and neither
  // starts a new build, so they are safe under memory pressure.
  await rescueFinished();
  await reclaimStranded();

  const freeMb = Math.round(os.freemem() / (1024 * 1024));
  const short = freeMb < MIN_FREE_MEM_MB;
  if (short && blockedSince === null) blockedSince = Date.now();
  if (!short) blockedSince = null;

  // Starved for long enough, with work waiting and enough room to actually build?
  // Take one. Loudly, so the cockpit and the log both say this was a deliberate
  // override rather than the guard silently drifting.
  const starvedMs = blockedSince ? Date.now() - blockedSince : 0;
  const override = short && starvedMs >= STARVE_MS && freeMb >= HARD_FLOOR_MB;

  if (short && !override) {
    if (!warnedLowMem) {
      log(`low memory (${freeMb}MB free, need ${MIN_FREE_MEM_MB}MB) - holding off claiming a build until it recovers`);
      warnedLowMem = true;
    }
    // 2026-07-28: this guard once held the whole floor for six hours with twelve
    // leads queued, and the only trace was one line on a console nobody was
    // watching. From the cockpit it looked like the forge had simply stopped.
    // A stall that nobody can see is indistinguishable from a broken product, so
    // the reason now goes where Sarah actually looks.
    const waited = Math.round(starvedMs / 60000);
    await reportHealth({
      state: 'blocked',
      reason:
        `low memory: ${freeMb}MB free, needs ${MIN_FREE_MEM_MB}MB` +
        (waited >= 1 ? `. Waiting ${waited}m; it takes a build anyway at ${Math.round(STARVE_MS / 60000)}m if ${HARD_FLOOR_MB}MB is free.` : ''),
      freeMb,
    });
    return false;
  }
  if (override) {
    log(`STARVED ${Math.round(starvedMs / 60000)}m at ${freeMb}MB free - taking a build anyway rather than holding the queue`);
  }
  if (warnedLowMem) { log(`memory recovered (${freeMb}MB free) - resuming`); warnedLowMem = false; }
  await reportHealth({ state: 'polling', reason: null, freeMb });

  const job = await claimNext();
  if (!job) return false;
  setCurrent(job);
  await reportHealth({ state: 'building', reason: job.business_name || job.id, freeMb });
  try {
    await process_(job);
  } finally {
    // Always clear, or a crashed build leaves the cockpit claiming work is in
    // flight forever, which is the exact blindness this row exists to remove.
    setCurrent(null);
  }
  return true;
}

/**
 * HAND THE BUILD BACK BEFORE DYING.
 *
 * A row is marked 'building' the moment it is claimed and only reclaimed by
 * reclaimStranded() once STALE_MS (100 minutes) has passed. That window exists so
 * two workers never race the same row, and it is right. What was missing is the
 * other half: a worker that KNOWS it is going away should not make the queue wait
 * out the full window for it.
 *
 * On 2026-08-24 the supervisor was restarted while Angel's Care was in flight. The
 * build died with the process, the row stayed 'building' with nobody building it,
 * and because the worker then could not start at all, nothing was ever going to
 * run reclaimStranded() either. The lead's site simply stopped existing as work.
 *
 * So: on any orderly shutdown, put the claim back. Best effort and time-boxed,
 * because a shutdown that hangs on a database write is its own outage.
 */
let releasing = false;
async function releaseCurrentClaim(why) {
  if (releasing || !current) return;
  releasing = true;
  const id = current.id;
  log(`shutting down (${why}) with ${current.name || id} in flight - handing it back to the queue`);
  try {
    await Promise.race([
      supabase
        .from('outbound_demo_sites')
        .update({ status: 'queued', worker: null, claimed_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'building'),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  } catch (e) {
    log('could not hand the build back (it will be reclaimed as stranded):', e?.message || e);
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(sig, () => {
    void releaseCurrentClaim(sig).finally(() => process.exit(0));
  });
}

await reclaimOwnOrphans();
log('demo-site worker up. sites dir:', SITES_DIR, '| design tiers:', FORCED_TIER ? `forced ${FORCED_TIER}` : 'row choice, else tier 2', '| permission:', PERMISSION, ONCE ? '| --once' : `| poll ${POLL_MS}ms`);

// Beat on a timer, not inside the work loop: a 30-minute build must not look
// like a dead machine. unref() so --once can still exit.
await beat();
setInterval(() => { beat(); }, 60_000).unref();

if (ONCE) {
  const did = await tick();
  if (!did) log('no queued site builds.');
  process.exit(0);
} else {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { while (await tick()) { /* drain queue */ } } catch (e) { log('loop error', e?.message); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
