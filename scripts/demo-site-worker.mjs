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
 * /demo/site/<id>, where the lead's forged AI receptionist (Sidekick voice
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
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cliDirective, cliRealDirective, cliEditDirective } from '../lib/site-directive.mjs';

const ONCE = process.argv.includes('--once');
const POLL_MS = Number(process.env.DEMO_SITE_POLL_MS || 15000);
const SITES_DIR = process.env.DEMO_SITES_DIR || path.join(os.homedir(), 'mms-demo-sites');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const PERMISSION = process.env.DEMO_SITE_PERMISSION || 'bypassPermissions';
// 45, not 35. Under LAW v4 (THE HOUSE: front door + 3 rooms) the builds got
// bigger, and on 2026-07-23 six of the last eight finished at EXACTLY 35m, which
// means the cap was ending them rather than the model being done. Two of those
// landed at 117KB and 135KB with zero photographs: a house cut off mid-furnish and
// stored anyway, because index.html happened to exist when the axe fell.
const MAX_RUNTIME_MS = Number(process.env.DEMO_SITE_MAX_MS || 45 * 60 * 1000);
// Must stay LONGER than MAX_RUNTIME_MS. A stale window shorter than the build
// timeout means a job that is still legitimately building gets reclaimed and
// handed to a second worker, and two workers race to write the same row.
const STALE_MS = Number(process.env.DEMO_SITE_STALE_MS || 60 * 60 * 1000);
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
const MEDIA_NOTES = path.join(os.homedir(), '.claude', 'projects', 'C--Users-moder', 'memory', 'media-generation-pipeline.md').replace(/\\/g, '/');

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
const STARTUP_LAW = { cliDirective, cliRealDirective, cliEditDirective };

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
    REAL_DIRECTIVE: m.cliRealDirective({ falEnv: FAL_ENV, mediaNotes: MEDIA_NOTES }),
    EDIT_DIRECTIVE: m.cliEditDirective(),
  };
}
const isRebuild = (job) => job.kind === 'rebuild';
const isEdit = (job) => job.kind === 'edit';
/** A client's edit belongs to a paid project and lands in a draft for approval. */
const isProjectEdit = (job) => isEdit(job) && Boolean(job.project_id);

async function reclaimStranded() {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await supabase
    .from('outbound_demo_sites')
    .update({ status: 'queued', worker: null, claimed_at: null, updated_at: new Date().toISOString() })
    .eq('status', 'building')
    .lt('claimed_at', cutoff)
    .select('id');
  if (data?.length) log('reclaimed stranded builds:', data.map((d) => d.id).join(', '));
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
    .update({ status: 'building', claimed_at: new Date().toISOString(), worker: WORKER, updated_at: new Date().toISOString() })
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
    const keep = (s) => { out = (out + s).slice(-200000); };
    const timer = setTimeout(() => { killTree(child); resolve({ code: 124, out: out + '\n[timeout]' }); }, MAX_RUNTIME_MS);
    // A worker shutdown must not orphan the build either: same escape hatch, same
    // fix. Without this, every Ctrl-C on a busy floor leaks a live claude.exe.
    const onExit = () => { killTree(child); };
    process.once('SIGINT', onExit);
    process.once('SIGTERM', onExit);
    const cleanup = () => { process.off('SIGINT', onExit); process.off('SIGTERM', onExit); };
    child.stdout.on('data', (d) => { keep(d.toString()); process.stdout.write(d); });
    child.stderr.on('data', (d) => { keep(d.toString()); process.stderr.write(d); });
    child.on('close', (code) => { clearTimeout(timer); cleanup(); resolve({ code, out }); });
    child.on('error', (e) => { clearTimeout(timer); cleanup(); resolve({ code: 1, out: out + '\n' + e.message }); });
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
    await supabase
      .from('projects')
      .update({ edit_status: 'failed', edit_error: error })
      .eq('id', job.project_id);
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
    // A simple rebuild keeps the photography it already has.
    if (job.reuse_photos && job.html) {
      const n = harvestPhotos(dir, job.html);
      log('rebuild: kept', n, 'photograph(s) from the previous build');
    }

    const law = await currentLaw();
    const directive = edit ? law.EDIT_DIRECTIVE : rebuild ? law.REAL_DIRECTIVE : law.DIRECTIVE;
    const { code, out } = await runClaude(dir, directive);

    if (!existsSync(htmlPath)) {
      await fail(job, `no index.html produced (claude exited ${code}): ${out.slice(-500)}`);
      return;
    }
    const html = readFileSync(htmlPath, 'utf8');
    if (html.length < 1500 || !/<\/html>/i.test(html)) {
      await fail(job, `index.html looks incomplete (${html.length} bytes, claude exited ${code})`);
      return;
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

    if (rebuild) {
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
      subject: edit ? 'Website demo updated' : 'Website demo live',
      snippet: edit
        ? `Their demo website was reforged from your prompt. Live at ${siteUrl}`
        : `Their demo website is live at ${siteUrl} (AI receptionist on board).`,
      read: true,
      occurred_at: new Date().toISOString(),
    });
    log(edit ? 'EDITED' : 'READY', job.id, siteUrl, `(${Math.round(html.length / 1024)}KB)`);
  } catch (e) {
    await fail(job, e?.message || e);
  }
}

/**
 * A finished CLIENT edit becomes the DRAFT, never the live site. It lands in
 * projects.site_html_draft with edit_status 'ready', and a human approves it on
 * /admin/delivery before anything reaches the client's domain. The whole guardrail
 * is that an agent's edit can never publish itself.
 */
async function finishClientEdit(job, html) {
  const { error } = await supabase
    .from('projects')
    .update({ site_html_draft: html, edit_status: 'ready', edit_error: null, updated_at: new Date().toISOString() })
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

  const { error } = await supabase
    .from('projects')
    .update({
      site_html: html,
      site_build_status: 'ready',
      site_build_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.project_id);
  if (error) {
    await fail(job, `could not store the real site: ${error.message}`);
    return;
  }

  log('REBUILD READY', job.id, `project ${job.project_id}`, `(${Math.round(html.length / 1024)}KB)`);
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
}

async function tick() {
  await reclaimStranded();
  const job = await claimNext();
  if (!job) return false;
  await process_(job);
  return true;
}

log('demo-site worker up. sites dir:', SITES_DIR, '| permission:', PERMISSION, ONCE ? '| --once' : `| poll ${POLL_MS}ms`);

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
