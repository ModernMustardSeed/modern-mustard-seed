#!/usr/bin/env node
/**
 * codex-image: generate photography on Sarah's Codex subscription instead of
 * the metered fal wallet.
 *
 * Sarah, 2026-08-01: "can we make a codex plugin that you can ask codex to make
 * the pics instead, so i dont have to keep paying fal key. i have codex sub."
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
 *   - It RETRIES, and it fails loudly rather than quietly returning nothing.
 *
 * Usage:
 *   node codex-image.mjs --prompt "..." --out hero.jpg [--width 1600] [--height 900]
 *                        [--format jpeg|png] [--quality 82] [--tries 2] [--json]
 *
 * Exit 0 with the path on stdout (or a JSON blob with --json), non-zero on
 * failure. Designed to be called from a headless build session over Bash.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, rmSync, renameSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const PROMPT = flag('prompt');
const OUT = flag('out');
const WIDTH = Number(flag('width', 1600));
const HEIGHT = Number(flag('height', 900));
const FORMAT = (flag('format', null) || (OUT && path.extname(OUT).slice(1)) || 'jpeg').replace(/^jpg$/, 'jpeg');
const QUALITY = Number(flag('quality', 82));
const TRIES = Number(flag('tries', 2));
const JSON_OUT = has('json');
const TIMEOUT_MS = Number(flag('timeout', 420_000));

if (!PROMPT || !OUT) {
  console.error('Usage: codex-image.mjs --prompt "..." --out <file> [--width N] [--height N] [--format jpeg|png] [--quality N] [--tries N] [--json]');
  process.exit(2);
}

const say = (...a) => { if (!JSON_OUT) console.error(...a); };

/**
 * A scratch directory per attempt, OUTSIDE the caller's output directory.
 *
 * Codex is pointed at this as its writable workspace, so it cannot wander into
 * a build directory and edit the site it is supposed to be illustrating. It
 * also means "what did the agent actually produce" is answerable by listing one
 * empty folder rather than diffing a populated one.
 */
function scratch(n) {
  const dir = path.join(os.tmpdir(), 'codex-image', `${process.pid}-${n}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

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
 * Find codex's real entry point.
 *
 * `codex` on PATH is a .cmd shim, and spawning a .cmd without a shell throws
 * EINVAL on modern Node. Turning the shell on instead would be worse: node
 * joins argv UNQUOTED under shell:true, which is exactly how the demo-site
 * worker's prompts got truncated at the first space for months (memory:
 * mms-demo-website-forge). The shim just calls a plain node script, so calling
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

function runCodex(dir) {
  // One job, stated flatly. Codex is being used as a renderer here, so the
  // instruction removes every reason for it to plan, explore, or ask.
  const instruction = [
    'Use your built-in image generation tool to render exactly one image.',
    '',
    `IMAGE BRIEF: ${PROMPT}`,
    '',
    `Compose it as ${aspectWord(WIDTH, HEIGHT)}.`,
    'No text, letters, numbers, words, watermarks, logos or signatures anywhere in the image.',
    '',
    `Save it into this directory as exactly "out.png". Do not save anywhere else and do not save more than one file.`,
    'Do not write any other file. Do not create subdirectories. Do not run a web search.',
    'When the file exists, reply with only the word DONE.',
  ].join('\n');

  const entry = codexEntry();
  // The prompt rides on STDIN (`-`), never as an argument. Same rule the forge
  // worker learned: a long multi-line instruction passed through argv is one
  // quoting bug away from arriving as its first word.
  const args = entry
    ? [entry, 'exec', '--sandbox', 'workspace-write', '--cd', dir, '-']
    : ['exec', '--sandbox', 'workspace-write', '--cd', dir, '-'];

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
    }, TIMEOUT_MS);
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
function harvest(dir) {
  const files = [];
  const walk = (d, depth) => {
    if (depth > 2) return;
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, name.name);
      if (name.isDirectory()) walk(p, depth + 1);
      else if (/\.(png|jpe?g|webp)$/i.test(name.name)) files.push({ p, size: statSync(p).size });
    }
  };
  try { walk(dir, 0); } catch { /* nothing produced */ }
  return files.filter((f) => f.size > 2048).sort((a, b) => b.size - a.size);
}

/**
 * This tool lives in ~/.claude/tools so every project can call it, which means
 * it has no node_modules of its own. sharp is borrowed from whichever repo
 * already has it, resolved through a file URL because a bare Windows path is
 * not a valid ESM specifier.
 */
async function loadSharp() {
  const candidates = [
    process.cwd(),
    path.join(os.homedir(), 'modern-mustard-seed'),
    path.join(os.homedir(), 'cross-covenant'),
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

async function main() {
  const sharp = await loadSharp();

  mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });

  let lastWhy = 'no attempt ran';
  for (let attempt = 1; attempt <= TRIES; attempt++) {
    const dir = scratch(attempt);
    const t0 = Date.now();
    say(`codex-image: rendering (attempt ${attempt}/${TRIES})...`);
    const res = await runCodex(dir);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);

    if (res.timedOut) { lastWhy = `codex timed out after ${TIMEOUT_MS / 1000}s`; say(`  ${lastWhy}`); rmSync(dir, { recursive: true, force: true }); continue; }

    const candidates = harvest(dir);
    if (!candidates.length) {
      // The agent's own words are the only clue to WHY (quota, refusal, no tool).
      lastWhy = `codex produced no image in ${secs}s: ${res.out.replace(/\s+/g, ' ').trim().slice(-260) || 'no output'}`;
      say(`  ${lastWhy}`);
      rmSync(dir, { recursive: true, force: true });
      continue;
    }

    try {
      // Decode before believing. A file that exists is not an image, and this
      // is the check that separates "the hero is there" from "the hero is a
      // 3-byte placeholder the build cheerfully inlined".
      const meta = await sharp(candidates[0].p).metadata();
      if (!meta.width || !meta.height) throw new Error('no dimensions');

      const pipeline = sharp(candidates[0].p).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' });
      const tmpOut = path.join(dir, `final.${FORMAT === 'png' ? 'png' : 'jpg'}`);
      if (FORMAT === 'png') await pipeline.png({ compressionLevel: 9 }).toFile(tmpOut);
      else await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toFile(tmpOut);

      const dest = path.resolve(OUT);
      rmSync(dest, { force: true });
      try { renameSync(tmpOut, dest); } catch { await sharp(tmpOut).toFile(dest); }
      const bytes = statSync(dest).size;
      rmSync(dir, { recursive: true, force: true });

      const result = { ok: true, path: dest, width: WIDTH, height: HEIGHT, bytes, seconds: Number(secs), source: `codex (${meta.width}x${meta.height} ${meta.format})` };
      if (JSON_OUT) console.log(JSON.stringify(result));
      else { say(`  ok in ${secs}s, ${(bytes / 1024).toFixed(0)}KB`); console.log(dest); }
      process.exit(0);
    } catch (e) {
      lastWhy = `codex returned a file that would not decode: ${e.message}`;
      say(`  ${lastWhy}`);
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const result = { ok: false, error: lastWhy };
  if (JSON_OUT) console.log(JSON.stringify(result));
  else console.error(`codex-image FAILED: ${lastWhy}`);
  process.exit(1);
}

main().catch((e) => {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  else console.error(`codex-image FAILED: ${e.message || e}`);
  process.exit(1);
});
