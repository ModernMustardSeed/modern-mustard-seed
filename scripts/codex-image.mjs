#!/usr/bin/env node
/**
 * codex-image: generate photography on Sarah's Codex subscription instead of
 * the metered fal wallet.
 *
 * Sarah, 2026-08-01: "can we make a codex plugin that you can ask codex to make
 * the pics instead, so i dont have to keep paying fal key. i have codex sub."
 * And later the same day: "use codex for all image gen everywhere from now on.
 * fal can still do full on video."
 *
 * Codex CLI carries a built-in `image_gen__imagegen` tool, so `codex exec` can
 * render an image and drop it on disk. That makes picture generation part of a
 * flat subscription rather than a per-call charge, which matters because the
 * fal wallet has run dry mid-build repeatedly (see memory:
 * media-generation-pipeline) and taken heroes down with it.
 *
 * This wraps that in something a pipeline can actually depend on:
 *
 *   - It VERIFIES a real image landed. `codex exec` is an agent, not an API. It
 *     can narrate success, save under a different name, or write a zero-byte
 *     file, and a build that trusts the exit code ships a broken hero. Nothing
 *     here is believed without decoding the pixels.
 *   - It hits the EXACT dimensions asked for. The model returns its own nearest
 *     aspect (a 16:9 request came back 1672x941), so the result is cover-fitted
 *     to the requested size afterwards.
 *   - It SERIALIZES across processes. Codex quota is flat-rate but finite, and
 *     a parallel batch is the fastest way to burn it; the lock means "one at a
 *     time" is enforced rather than merely written down.
 *   - It RETRIES, and it fails loudly rather than quietly returning nothing.
 *
 * Two ways in, one implementation:
 *   CLI:  node codex-image.mjs --prompt "..." --out hero.jpg [--width 1600] ...
 *   Lib:  import { generateImage } from '.../codex-image.mjs'
 *
 * Exit 0 with the path on stdout (or a JSON blob with --json), non-zero on
 * failure. Designed to be called from a headless build session over Bash.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, rmSync, renameSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const DEFAULTS = {
  width: 1600,
  height: 900,
  format: 'jpeg',
  quality: 82,
  tries: 2,
  timeoutMs: 420_000,
  allowText: false,
  fallbackFal: false,
  refs: [],
  refMode: 'subject',
};

const MAX_REFS = 4;

/**
 * How the reference images are meant to be read. Verified 2026-08-01: given a
 * photo in its workspace, Codex downscales it into an `.imagegen-ref-small.jpg`
 * and feeds it to the image tool, and the result genuinely holds the subject,
 * the materials and the light while changing the angle. That is what makes the
 * CXC mockup pipeline and the Mr. Mustard mascot possible here at all.
 */
const REF_MODES = {
  /** Keep WHAT the thing is. Apparel, products, a mascot's design. */
  subject: 'Treat them as the SUBJECT: reproduce the item, character or garment shown, keeping its exact design, proportions, colors, materials and any markings on it. The brief below describes the new scene it should appear in. Do not redesign the subject.',
  /** Keep WHO it is. Faces, on-model shots. */
  character: 'Treat them as the CHARACTER: keep the same individual, the same face, hair, build and wardrobe, recognizably the same across shots. The brief below describes the new scene, pose or angle.',
  /** Keep how it FEELS. Moodboards, grade matching. */
  style: 'Treat them as STYLE reference only: match the palette, lighting, grade, texture and mood. Do NOT copy the subject or composition. The brief below is the actual subject.',
  /** Keep the frame. Re-renders and variations. */
  composition: 'Treat them as COMPOSITION reference: keep the framing, camera angle, and placement of elements. The brief below describes what changes.',
};

function aspectWord(w, h) {
  const r = w / h;
  if (Math.abs(r - 1) < 0.05) return 'a square 1:1 frame';
  if (Math.abs(r - 16 / 9) < 0.08) return 'a wide 16:9 landscape frame';
  if (Math.abs(r - 3 / 2) < 0.08) return 'a 3:2 landscape frame';
  if (Math.abs(r - 4 / 5) < 0.08) return 'a 4:5 portrait frame';
  if (Math.abs(r - 9 / 16) < 0.08) return 'a tall 9:16 portrait frame';
  return r > 1 ? `a landscape frame about ${w} by ${h}` : `a portrait frame about ${w} by ${h}`;
}

/**
 * A scratch directory per attempt, OUTSIDE the caller's output directory.
 *
 * Codex is pointed at this as its writable workspace, so it cannot wander into
 * a build directory and edit the site it is supposed to be illustrating. It
 * also means "what did the agent actually produce" is answerable by listing one
 * empty folder rather than diffing a populated one.
 */
function scratch(n) {
  const dir = path.join(os.tmpdir(), 'codex-image', `${process.pid}-${n}-${counter++}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}
let counter = 0;

/* ---------------------------------------------------------------------------
 * The quota lock.
 *
 * Codex is flat-rate but not infinite, and the failure mode of a parallel batch
 * is not a slow build, it is a burned daily quota that takes every LATER build
 * down with it. The rule was already in memory ("generate images ONE AT A TIME,
 * never a parallel batch") but nothing enforced it, so any script that mapped
 * over an array of prompts broke it by accident.
 *
 * A lock file created with 'wx' is atomic on Windows and POSIX alike. The
 * holder's pid and timestamp go inside so a crashed process can be detected
 * and cleared rather than wedging every future run.
 * ------------------------------------------------------------------------ */
const LOCK = path.join(os.tmpdir(), 'codex-image.lock');
const LOCK_STALE_MS = 15 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lockIsStale() {
  try {
    const held = JSON.parse(readFileSync(LOCK, 'utf8'));
    if (Date.now() - held.at > LOCK_STALE_MS) return true;
    // A pid that no longer exists means the holder died mid-render.
    try { process.kill(held.pid, 0); return false; } catch { return true; }
  } catch {
    return true; // unreadable or truncated lock is not a lock
  }
}

async function acquireLock(waitMs, log) {
  const deadline = Date.now() + waitMs;
  let announced = false;
  for (;;) {
    try {
      const fd = openSync(LOCK, 'wx');
      writeFileSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
      closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (lockIsStale()) { try { unlinkSync(LOCK); } catch { /* someone else cleared it */ } continue; }
      if (Date.now() > deadline) return false;
      if (!announced) { log('codex-image: another render is in flight, queueing...'); announced = true; }
      await sleep(2000);
    }
  }
}

function releaseLock() {
  try {
    const held = JSON.parse(readFileSync(LOCK, 'utf8'));
    if (held.pid === process.pid) unlinkSync(LOCK);
  } catch { /* already gone or not ours */ }
}

/**
 * Find codex's real entry point.
 *
 * `codex` on PATH is a .cmd shim, and spawning a .cmd without a shell throws
 * EINVAL on modern Node. Turning the shell on instead would be worse: node
 * joins argv UNQUOTED under shell:true, which is exactly how the demo-site
 * worker's prompts got truncated at the first space for months (memory:
 * mms-demo-website-build). The shim just calls a plain node script, so calling
 * that script directly with process.execPath sidesteps both problems.
 */
function codexEntry() {
  if (process.env.CODEX_JS && existsSync(process.env.CODEX_JS)) return process.env.CODEX_JS;
  const guesses = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
    path.join(os.homedir(), '.npm-global', 'lib', 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
    '/usr/local/lib/node_modules/@openai/codex/bin/codex.js',
  ];
  return guesses.find((p) => p && existsSync(p)) || null;
}

/**
 * Stage reference images INTO the scratch directory.
 *
 * Codex can only see its own workspace, so a reference has to be copied in
 * (or downloaded, since callers like the mascot pipeline hold a URL rather than
 * a file). They land as ref1/ref2/... so the instruction can name them exactly
 * instead of hoping the agent guesses which file is which.
 */
async function stageRefs(dir, refs) {
  const staged = [];
  for (const [i, ref] of refs.slice(0, MAX_REFS).entries()) {
    const src = String(ref);
    const ext = (src.match(/\.(png|jpe?g|webp)(?:\?|$)/i)?.[1] || 'png').toLowerCase();
    const name = `ref${i + 1}.${ext === 'jpg' ? 'jpg' : ext}`;
    const dest = path.join(dir, name);
    if (/^https?:\/\//i.test(src)) {
      const res = await fetch(src, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`reference ${src} returned ${res.status}`);
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    } else {
      if (!existsSync(src)) throw new Error(`reference not found: ${src}`);
      writeFileSync(dest, readFileSync(src));
    }
    if (statSync(dest).size < 128) throw new Error(`reference ${src} is empty`);
    staged.push(name);
  }
  return staged;
}

function runCodex(dir, opts, stagedRefs = []) {
  // One job, stated flatly. Codex is being used as a renderer here, so the
  // instruction removes every reason for it to plan, explore, or ask.
  const refBlock = stagedRefs.length
    ? [
        `There ${stagedRefs.length === 1 ? 'is 1 reference image' : `are ${stagedRefs.length} reference images`} already in this directory: ${stagedRefs.join(', ')}.`,
        'Pass them to your image generation tool as reference images.',
        REF_MODES[opts.refMode] || REF_MODES.subject,
        '',
      ]
    : [];

  const instruction = [
    'Use your built-in image generation tool to render exactly one image.',
    '',
    ...refBlock,
    `IMAGE BRIEF: ${opts.prompt}`,
    '',
    `Compose it as ${aspectWord(opts.width, opts.height)}.`,
    opts.allowText
      ? 'Any text in the brief must be spelled EXACTLY as written, with no extra words, no watermarks and no signatures.'
      : 'No text, letters, numbers, words, watermarks, logos or signatures anywhere in the image.',
    '',
    'Save it into this directory as exactly "out.png". Do not save anywhere else and do not save more than one file.',
    'Do not create subdirectories. Do not run a web search.',
    'When the file exists, reply with only the word DONE.',
  ].join('\n');

  const entry = codexEntry();
  // The prompt rides on STDIN (`-`), never as an argument. Same rule the build
  // worker learned: a long multi-line instruction passed through argv is one
  // quoting bug away from arriving as its first word.
  // --skip-git-repo-check is NOT optional, and leaving it off is why this tool
  // never rendered anything. It writes into a fresh temp directory, which is
  // not a git repo, so codex exec refuses on sight:
  //   "Not inside a trusted directory and --skip-git-repo-check was not specified"
  // It fails in 0s, every attempt, on every machine. The image-gen plugin's own
  // codex backend has always passed it; this copy never did, so the build fell
  // back to the tool WITHOUT --ref and every before/after slider shipped as two
  // unrelated buildings (2026-08-25, Sarah on South Florida Roofing: "the 2
  // houses are very different and need to be exact same always").
  const args = entry
    ? [entry, 'exec', '--sandbox', 'workspace-write', '--skip-git-repo-check', '--cd', dir, '-']
    : ['exec', '--sandbox', 'workspace-write', '--skip-git-repo-check', '--cd', dir, '-'];

  return new Promise((resolve) => {
    const child = entry
      ? spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
      : spawn('codex', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: process.platform === 'win32' });
    try {
      child.stdin.write(instruction);
      child.stdin.end();
    } catch { /* the close handler reports it */ }
    let out = '';
    const timer = setTimeout(() => {
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        else child.kill('SIGKILL');
      } catch { /* already gone */ }
      resolve({ code: -1, out, timedOut: true });
    }, opts.timeoutMs);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out: String(e.message), timedOut: false }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, timedOut: false }); });
  });
}

/**
 * Find what the agent actually produced.
 *
 * It is asked for out.png and usually complies, but "usually" is not a contract
 * a 2am build can rest on, so any decodable image in the scratch directory is
 * accepted, largest first.
 */
function harvest(dir, stagedRefs = []) {
  const files = [];
  const walk = (d, depth) => {
    if (depth > 2) return;
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, name.name);
      if (name.isDirectory()) { walk(p, depth + 1); continue; }
      if (!/\.(png|jpe?g|webp)$/i.test(name.name)) continue;
      // The staged references are real, decodable, and often LARGER than what
      // Codex renders. Sorting by size without excluding them would hand the
      // caller its own input back and call it a fresh image.
      if (stagedRefs.includes(name.name)) continue;
      // Codex leaves working files beside the output: `.imagegen-ref-small.jpg`
      // is its downscale of the reference, `.preview1.jpg` its own thumbnails.
      // All of them are dotfiles, none of them is the deliverable.
      if (name.name.startsWith('.')) continue;
      files.push({ p, size: statSync(p).size, name: name.name });
    }
  };
  try { walk(dir, 0); } catch { /* nothing produced */ }
  const usable = files.filter((f) => f.size > 2048);
  // It was ASKED for out.png. When it complied, that is the answer; the
  // largest-file heuristic is only the fallback for when it did not.
  const exact = usable.filter((f) => f.name.toLowerCase() === 'out.png');
  return exact.length ? exact : usable.sort((a, b) => b.size - a.size);
}

/**
 * This tool is called from every project, which means it cannot rely on a
 * node_modules of its own. sharp is borrowed from whichever repo already has
 * it, resolved through a file URL because a bare Windows path is not a valid
 * ESM specifier.
 */
async function loadSharp() {
  const candidates = [
    process.cwd(),
    path.join(os.homedir(), 'modern-mustard-seed'),
    path.join(os.homedir(), 'cross-covenant'),
    path.join(os.homedir(), 'cxc-studio'),
    os.homedir(),
  ];
  for (const base of candidates) {
    const entry = path.join(base, 'node_modules', 'sharp', 'lib', 'index.js');
    if (!existsSync(entry)) continue;
    try {
      return (await import(pathToFileURL(entry).href)).default;
    } catch { /* try the next one */ }
  }
  try {
    return (await import('sharp')).default;
  } catch {
    throw new Error(`sharp not found. Looked in: ${candidates.map((c) => path.join(c, 'node_modules')).join(', ')}`);
  }
}

/* ---------------------------------------------------------------------------
 * fal, demoted to fallback.
 *
 * It stays reachable because a funded fal wallet is faster than Codex and
 * because a dead Codex login should degrade rather than fail. It is OFF by
 * default: every caller now has to opt in, which is the whole point of the
 * change. Video still belongs to fal and is not handled here.
 * ------------------------------------------------------------------------ */
function falKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY.trim();
  const envFile = path.join(os.homedir(), '.claude', 'fal.env');
  if (!existsSync(envFile)) return null;
  const m = readFileSync(envFile, 'utf8').match(/^\s*FAL_KEY\s*=\s*(.+)\s*$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

async function falRender(opts, log) {
  const key = falKey();
  if (!key) return { ok: false, error: 'no FAL_KEY available for fallback' };
  log('codex-image: falling back to fal (this one costs money)...');
  const submit = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: opts.prompt,
      aspect_ratio: opts.width >= opts.height ? '16:9' : '9:16',
      num_images: 1,
      output_format: 'jpeg',
    }),
  });
  if (!submit.ok) return { ok: false, error: `fal submit ${submit.status}: ${(await submit.text()).slice(0, 200)}` };
  const { status_url, response_url } = await submit.json();
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const st = await fetch(status_url, { headers: { Authorization: `Key ${key}` } });
    const js = await st.json().catch(() => ({}));
    if (js.status === 'COMPLETED') break;
    if (js.status === 'FAILED' || js.status === 'ERROR') return { ok: false, error: `fal job failed: ${JSON.stringify(js).slice(0, 200)}` };
    if (i === 89) return { ok: false, error: 'fal job never completed' };
  }
  const done = await fetch(response_url, { headers: { Authorization: `Key ${key}` } });
  const payload = await done.json().catch(() => ({}));
  const url = payload?.images?.[0]?.url;
  if (!url) return { ok: false, error: `fal returned no image: ${JSON.stringify(payload).slice(0, 200)}` };
  const bin = Buffer.from(await (await fetch(url)).arrayBuffer());
  const dir = scratch('fal');
  const raw = path.join(dir, 'fal.jpg');
  writeFileSync(raw, bin);
  return { ok: true, file: raw, dir, note: 'fal flux-pro/v1.1-ultra' };
}

/* ---------------------------------------------------------------------------
 * The one entry point everything else uses.
 * ------------------------------------------------------------------------ */
export async function generateImage(options = {}) {
  const opts = { ...DEFAULTS, ...options };
  if (!opts.prompt || !opts.out) return { ok: false, error: 'generateImage needs both a prompt and an out path' };
  opts.width = Number(opts.width);
  opts.height = Number(opts.height);
  opts.format = String(opts.format || path.extname(opts.out).slice(1) || 'jpeg').replace(/^jpg$/i, 'jpeg').toLowerCase();
  opts.refs = Array.isArray(opts.refs) ? opts.refs.filter(Boolean) : [];
  // An unrecognised mode silently becoming "no reference guidance at all" is
  // how a typo turns into a redesigned logo, so it falls back to the strict one.
  if (!REF_MODES[opts.refMode]) opts.refMode = 'subject';
  const log = opts.log || (() => {});

  const sharp = await loadSharp();
  mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });

  /** Cover-fit whatever came back to the exact size asked for, then land it. */
  const finish = async (srcFile, source, seconds) => {
    const meta = await sharp(srcFile).metadata();
    if (!meta.width || !meta.height) throw new Error('no dimensions');
    const pipeline = sharp(srcFile).resize(opts.width, opts.height, { fit: 'cover', position: 'attention' });
    const tmpOut = path.join(path.dirname(srcFile), `final.${opts.format === 'png' ? 'png' : 'jpg'}`);
    if (opts.format === 'png') await pipeline.png({ compressionLevel: 9 }).toFile(tmpOut);
    else await pipeline.jpeg({ quality: Number(opts.quality), mozjpeg: true }).toFile(tmpOut);
    const dest = path.resolve(opts.out);
    rmSync(dest, { force: true });
    try { renameSync(tmpOut, dest); } catch { await sharp(tmpOut).toFile(dest); }
    return {
      ok: true,
      path: dest,
      width: opts.width,
      height: opts.height,
      bytes: statSync(dest).size,
      seconds,
      source: `${source} (${meta.width}x${meta.height} ${meta.format})`,
    };
  };

  // Serialize against every other codex-image on this machine. Waiting behind
  // someone else's render is the correct outcome; failing to get the lock at
  // all is not, so a long wait still ends in an attempt rather than an error.
  const got = await acquireLock(20 * 60 * 1000, log);
  if (!got) log('codex-image: lock wait timed out, proceeding anyway');

  try {
    let lastWhy = 'no attempt ran';
    for (let attempt = 1; attempt <= Number(opts.tries); attempt++) {
      const dir = scratch(attempt);
      const t0 = Date.now();

      let stagedRefs = [];
      if (opts.refs?.length) {
        try {
          stagedRefs = await stageRefs(dir, opts.refs);
        } catch (e) {
          // A missing or unreachable reference is the caller's bug, and
          // rendering without it would silently produce the wrong subject.
          rmSync(dir, { recursive: true, force: true });
          return { ok: false, error: `reference image failed: ${e.message}` };
        }
      }

      log(`codex-image: rendering (attempt ${attempt}/${opts.tries})${stagedRefs.length ? ` with ${stagedRefs.length} ref(s), mode=${opts.refMode}` : ''}...`);
      const res = await runCodex(dir, opts, stagedRefs);
      const secs = Number(((Date.now() - t0) / 1000).toFixed(0));

      if (res.timedOut) {
        lastWhy = `codex timed out after ${opts.timeoutMs / 1000}s`;
        log(`  ${lastWhy}`);
        rmSync(dir, { recursive: true, force: true });
        continue;
      }

      const candidates = harvest(dir, stagedRefs);
      if (!candidates.length) {
        // The agent's own words are the only clue to WHY (quota, refusal, no tool).
        lastWhy = `codex produced no image in ${secs}s: ${res.out.replace(/\s+/g, ' ').trim().slice(-260) || 'no output'}`;
        log(`  ${lastWhy}`);
        rmSync(dir, { recursive: true, force: true });
        continue;
      }

      try {
        // Decode before believing. A file that exists is not an image, and this
        // is the check that separates "the hero is there" from "the hero is a
        // 3-byte placeholder the build cheerfully inlined".
        const out = await finish(candidates[0].p, 'codex', secs);
        rmSync(dir, { recursive: true, force: true });
        log(`  ok in ${secs}s, ${(out.bytes / 1024).toFixed(0)}KB`);
        return out;
      } catch (e) {
        lastWhy = `codex returned a file that would not decode: ${e.message}`;
        log(`  ${lastWhy}`);
        rmSync(dir, { recursive: true, force: true });
      }
    }

    if (opts.fallbackFal) {
      try {
        const fb = await falRender(opts, log);
        if (fb.ok) {
          const out = await finish(fb.file, fb.note, 0);
          rmSync(fb.dir, { recursive: true, force: true });
          log(`  ok via fal, ${(out.bytes / 1024).toFixed(0)}KB`);
          return out;
        }
        lastWhy = `${lastWhy}; fal fallback also failed: ${fb.error}`;
      } catch (e) {
        lastWhy = `${lastWhy}; fal fallback threw: ${e.message}`;
      }
    }

    return { ok: false, error: lastWhy };
  } finally {
    releaseLock();
  }
}

/* ---------------------------------------------------------------------------
 * CLI.
 *
 * Runs when this file is the program, INCLUDING when it was reached through the
 * thin ~/.claude/tools/codex-image.mjs forwarder, which is why the check is on
 * the entry file's name rather than on an exact path match.
 * ------------------------------------------------------------------------ */
function isCliEntry() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.basename(entry).toLowerCase() === 'codex-image.mjs';
}

async function cli() {
  const argv = process.argv.slice(2);
  const flag = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
  };
  const has = (name) => argv.includes(`--${name}`);
  /** --ref is repeatable: --ref a.jpg --ref b.jpg, or a URL. */
  const all = (name) => argv.reduce((acc, a, i) => (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith('--') ? [...acc, argv[i + 1]] : acc), []);

  const prompt = flag('prompt');
  const out = flag('out');
  const jsonOut = has('json');

  if (!prompt || !out) {
    console.error('Usage: codex-image.mjs --prompt "..." --out <file> [--width N] [--height N] [--format jpeg|png]');
    console.error('                       [--quality N] [--tries N] [--allow-text] [--fallback-fal] [--json]');
    console.error(`                       [--ref <file|url> ...] [--ref-mode ${Object.keys(REF_MODES).join('|')}]`);
    process.exit(2);
  }

  const result = await generateImage({
    prompt,
    out,
    width: flag('width', DEFAULTS.width),
    height: flag('height', DEFAULTS.height),
    format: flag('format', null),
    quality: flag('quality', DEFAULTS.quality),
    tries: flag('tries', DEFAULTS.tries),
    timeoutMs: Number(flag('timeout', DEFAULTS.timeoutMs)),
    allowText: has('allow-text'),
    fallbackFal: has('fallback-fal'),
    refs: all('ref'),
    refMode: flag('ref-mode', DEFAULTS.refMode),
    log: jsonOut ? () => {} : (...a) => console.error(...a),
  });

  if (result.ok) {
    if (jsonOut) console.log(JSON.stringify(result));
    else console.log(result.path);
    process.exit(0);
  }
  if (jsonOut) console.log(JSON.stringify(result));
  else console.error(`codex-image FAILED: ${result.error}`);
  process.exit(1);
}

if (isCliEntry()) {
  cli().catch((e) => {
    const msg = String(e?.message || e);
    if (process.argv.includes('--json')) console.log(JSON.stringify({ ok: false, error: msg }));
    else console.error(`codex-image FAILED: ${msg}`);
    process.exit(1);
  });
}
