#!/usr/bin/env node
/**
 * produce.mjs — faceless video pipeline for @modernmustardseed
 *
 * Pipeline: script (.md) -> ElevenLabs narration (your cloned voice)
 *           -> Higgsfield CLI shots -> ffmpeg assembly -> out/<slug>/<slug>.mp4
 *
 * Usage:
 *   node produce.mjs ../scripts/01-manifesto.md
 *   node produce.mjs ../scripts/04-is-it-a-sin-to-use-ai.md --audio-only
 *   node produce.mjs ../scripts/04-is-it-a-sin-to-use-ai.md --visuals-only
 *   node produce.mjs ../scripts/04-is-it-a-sin-to-use-ai.md --no-assemble
 *
 * Requires: .env (copy .env.example), `higgsfield` CLI on PATH, ffmpeg on PATH.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync, createWriteStream } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline as streamPipeline } from 'node:stream/promises';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- env ----------
try { process.loadEnvFile(join(__dirname, '.env')); } catch { /* keys may be in real env */ }
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID;
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

// ---------- args ----------
const args = process.argv.slice(2);
const scriptPath = args.find((a) => !a.startsWith('--'));
const flag = (f) => args.includes(`--${f}`);
const opt = (f, d) => { const i = args.indexOf(`--${f}`); return i >= 0 ? args[i + 1] : d; };

if (!scriptPath) {
  console.error('Usage: node produce.mjs <script.md> [--audio-only|--visuals-only|--no-assemble] [--model kling3_0]');
  process.exit(1);
}

const AUDIO_ONLY = flag('audio-only');
const VISUALS_ONLY = flag('visuals-only');
const NO_ASSEMBLE = flag('no-assemble');
const MODEL_OVERRIDE = opt('model', null);

// ---------- helpers ----------
const log = (m) => console.log(`\x1b[33m●\x1b[0m ${m}`);
const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[31m!\x1b[0m ${m}`);

function run(cmd, cmdArgs, { capture = false } = {}) {
  return new Promise((res, rej) => {
    const child = spawn(cmd, cmdArgs, { stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', shell: process.platform === 'win32' });
    let out = '', err = '';
    if (capture) {
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
    }
    child.on('error', rej);
    child.on('close', (code) => (code === 0 ? res({ out, err }) : rej(new Error(`${cmd} exited ${code}: ${err || out}`))));
  });
}

async function have(cmd) {
  try { await run(process.platform === 'win32' ? 'where' : 'which', [cmd], { capture: true }); return true; }
  catch { return false; }
}

// ---------- parse script ----------
const raw = readFileSync(resolve(scriptPath), 'utf8');
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!fmMatch) { warn('Script needs YAML frontmatter between --- fences.'); process.exit(1); }
const meta = YAML.parse(fmMatch[1]);
const body = fmMatch[2];
const slug = meta.slug || basename(scriptPath).replace(/\.md$/, '');

// narration = body prose, minus headings, blockquotes, stage cues, and [END...] markers
const narration = body
  .split('\n')
  .filter((l) => l.trim() && !/^\s*(#|>|\[|---)/.test(l))
  .map((l) => l.replace(/\((?:over|under)[^)]*\)/gi, '').trim())   // drop "(over s1)" cues
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();

const outDir = join(__dirname, 'out', slug);
const audioDir = join(outDir, 'audio');
const clipsDir = join(outDir, 'clips');
[outDir, audioDir, clipsDir].forEach((d) => mkdirSync(d, { recursive: true }));

log(`Script: ${meta.title}`);
log(`Slug: ${slug} | pillar: ${meta.pillar} | voice: ${meta.voice} | shots: ${(meta.shots || []).length}`);

// ---------- step 1: narration (ElevenLabs) ----------
async function renderNarration() {
  if (meta.voice === 'self') {
    warn('voice: self — record this narration yourself and drop it at: ' + join(audioDir, `${slug}.mp3`));
    return;
  }
  if (!ELEVEN_KEY || !ELEVEN_VOICE) { warn('Missing ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID in .env. Skipping narration.'); return; }
  log('Rendering narration with your cloned voice...');
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVEN_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: narration,
      model_id: ELEVEN_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  const dest = join(audioDir, `${slug}.mp3`);
  await streamPipeline(Readable.fromWeb(r.body), createWriteStream(dest));
  ok(`Narration -> ${dest}`);
}

// ---------- step 2: visuals (Higgsfield CLI) ----------
async function downloadTo(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  await streamPipeline(Readable.fromWeb(r.body), createWriteStream(dest));
}

function resultUrlFromJson(stdout) {
  // higgsfield --json prints a job object; find the first http(s) media URL
  try {
    const j = JSON.parse(stdout);
    const flat = JSON.stringify(j);
    const m = flat.match(/https?:\/\/[^"]+\.(?:mp4|png|jpg|jpeg|webp)/i);
    return m ? m[0] : null;
  } catch {
    const m = stdout.match(/https?:\/\/\S+\.(?:mp4|png|jpg|jpeg|webp)/i);
    return m ? m[0] : null;
  }
}

async function renderVisuals() {
  if (!(await have('higgsfield'))) { warn('higgsfield CLI not found. Run: npm i -g @higgsfield/cli && higgsfield auth login'); return; }
  const shots = meta.shots || [];
  for (const shot of shots) {
    const isVideo = (shot.type || 'video') === 'video';
    const model = MODEL_OVERRIDE || shot.model || (isVideo ? 'kling3_0' : 'nano_banana_2');
    const ext = isVideo ? 'mp4' : 'png';
    const dest = join(clipsDir, `${shot.id}.${ext}`);
    if (existsSync(dest)) { ok(`${shot.id} cached`); continue; }

    const cmdArgs = ['generate', 'create', model, '--prompt', shot.prompt, '--wait', '--json'];
    if (isVideo) cmdArgs.push('--duration', String(shot.duration || 5), '--mode', shot.mode || 'pro', '--sound', 'off');
    else cmdArgs.push('--aspect_ratio', meta.aspect || '16:9', '--resolution', shot.resolution || '2k');

    log(`Generating ${shot.id} (${model})...`);
    try {
      const { out } = await run('higgsfield', cmdArgs, { capture: true });
      const url = resultUrlFromJson(out);
      if (!url) { warn(`${shot.id}: no media URL in CLI output, skipping`); continue; }
      await downloadTo(url, dest);
      ok(`${shot.id} -> ${dest}`);
    } catch (e) { warn(`${shot.id} failed: ${e.message}`); }
  }
}

// ---------- step 3: assemble (ffmpeg) ----------
async function assemble() {
  if (!(await have('ffmpeg'))) { warn('ffmpeg not found. Install: winget install Gyan.FFmpeg'); return; }
  const audio = join(audioDir, `${slug}.mp3`);
  if (!existsSync(audio)) { warn('No narration audio yet. Provide it or run without --visuals-only.'); return; }

  const shots = meta.shots || [];
  const segs = [];
  const segDir = join(outDir, 'segs');
  mkdirSync(segDir, { recursive: true });

  // normalize every shot to a 1080p video segment (images get a slow ken-burns zoom)
  for (const shot of shots) {
    const isVideo = (shot.type || 'video') === 'video';
    const src = join(clipsDir, `${shot.id}.${isVideo ? 'mp4' : 'png'}`);
    if (!existsSync(src)) continue;
    const seg = join(segDir, `${shot.id}.mp4`);
    if (isVideo) {
      await run('ffmpeg', ['-y', '-i', src, '-vf', 'scale=1920:1080:force_original_aspect_ratio=cover,crop=1920:1080,fps=30', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', seg]);
    } else {
      const dur = shot.hold || 5;
      await run('ffmpeg', ['-y', '-loop', '1', '-i', src, '-t', String(dur),
        '-vf', `scale=2304:1296:force_original_aspect_ratio=cover,crop=2304:1296,zoompan=z='min(zoom+0.0009,1.15)':d=${dur * 30}:s=1920x1080,fps=30`,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', seg]);
    }
    segs.push(seg);
  }
  if (!segs.length) { warn('No visual segments to assemble.'); return; }

  const listFile = join(outDir, 'segments.txt');
  writeFileSync(listFile, segs.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n'));
  const silentReel = join(outDir, `${slug}-reel.mp4`);
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silentReel]);

  // mux narration; loop the reel to cover audio length; cut to audio (-shortest)
  const final = join(outDir, `${slug}.mp4`);
  await run('ffmpeg', ['-y', '-stream_loop', '-1', '-i', silentReel, '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', final]);
  ok(`Assembled -> ${final}`);
  log('Next: import to Descript/CapCut for burned captions, B-roll timing, and Shorts cuts.');
}

// ---------- manifest ----------
function writeManifest() {
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({
    slug, title: meta.title, pillar: meta.pillar, voice: meta.voice,
    shots: (meta.shots || []).map((s) => s.id), narrationChars: narration.length, generatedWith: 'produce.mjs',
  }, null, 2));
}

// ---------- run ----------
try {
  if (!VISUALS_ONLY) await renderNarration();
  if (!AUDIO_ONLY) await renderVisuals();
  if (!AUDIO_ONLY && !VISUALS_ONLY && !NO_ASSEMBLE) await assemble();
  writeManifest();
  ok('Done.');
} catch (e) { warn(e.stack || e.message); process.exit(1); }
