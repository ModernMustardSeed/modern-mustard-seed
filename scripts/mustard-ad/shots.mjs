/**
 * THE CLIENT'S SIDE of the Mr. Mustard call ad.
 *
 * She is an UNNAMED small-business owner ordering a website and a voice agent.
 * She is NOT Sarah and she is not a testimonial: every claim in this spot lives
 * on Mr. Mustard's side of the call. See memory: hundredfold ("she plays a
 * CLIENT, not herself") and mms-proof-testimonials.
 *
 * FIVE THINGS THIS LEARNED THE HARD WAY. Each one cost a failed render:
 *
 *  1. ANIMATE A STAGED SCENE, NOT A HEADSHOT. infinitalk animates whatever
 *     still it is given and cannot compose a shot. The scene still (seated,
 *     phone to ear, laptop open, warm morning light) was built first with
 *     nano-banana/edit. Feeding it a bare portrait is what made v1 robotic.
 *  2. num_frames = floor(audio_seconds * 25) - 8, ALWAYS COMPUTED FROM THE
 *     FILE. edge-tts length varies run to run, and fal 422s the moment
 *     num_frames outruns the audio. The -8 is the margin that absorbs the
 *     variance.
 *  3. UPLOAD THE AUDIO. Data URIs are fine for images and are rejected for
 *     audio as "URL too long". Two-step: initiate, then PUT the bytes.
 *  4. /infinitalk, NOT /infinitalk/single-text. single-text forces its own
 *     voice and there is no way to hand it Ava.
 *  5. THE PROMPT IS THE PERFORMANCE. Sarah's note on v1 was "so robotic".
 *     num_frames and the still fix the mouth; only rich, specific direction
 *     (the sit-up, the eyebrow, the glance at the laptop, the small laugh)
 *     fixes the person. Write the direction like a director, not a tagger.
 *
 * Usage:  node scripts/mustard-ad/shots.mjs [shot2] [shot5]
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const WORK = path.join(ROOT, '.mustard-ad');

/** The staged scene still. Already built; regenerating it would change her face. */
const SCENE = 'https://v3b.fal.media/files/b/0aa57305/tkpj8XuNtJppZES_o9vtP_aA7DAztP.jpg';

function falKey() {
  const line = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('FAL_KEY='));
  if (!line) throw new Error('no FAL_KEY in .env.local');
  return line.split('=')[1].trim().replace(/^"|"$/g, '');
}

function run(cmd, args, { capture = false } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let out = '';
    let err = '';
    if (capture) {
      p.stdout.on('data', (d) => { out += d.toString(); });
      p.stderr.on('data', (d) => { err += d.toString(); });
    }
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res(out) : rej(new Error(`${cmd} exited ${c}: ${(err || out).slice(-500)}`))));
  });
}

/** Ava, the studio's established voice, at the caller's flat conversational rate. */
async function ava(text, out) {
  await run('python', ['-m', 'edge_tts', '--voice', 'en-US-AvaMultilingualNeural', '--rate=+3%', '--text', text, '--write-media', out]);
  if (!existsSync(out)) throw new Error(`edge-tts wrote nothing for "${text}"`);
}

/**
 * Hold a beat after the line. A two-word answer ("Whitaker Med Spa.") renders
 * about 1.5s, which is too short to cut against and too short for infinitalk to
 * settle into a natural motion. Trailing silence buys real screen time and
 * reads as her waiting for his reply, which is what is actually happening.
 */
async function padTo(src, seconds, out) {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', `apad=whole_dur=${seconds}`, out]);
}

async function seconds(file) {
  const s = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { capture: true });
  const n = Number(s.trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`could not measure ${file}`);
  return n;
}

/** Two-step upload. fal rejects an inlined audio data URI as "URL too long". */
async function uploadAudio(file, key) {
  const initiate = await run('curl', [
    '-s', '-X', 'POST',
    'https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3',
    '-H', `Authorization: Key ${key}`,
    '-H', 'Content-Type: application/json',
    '-d', JSON.stringify({ content_type: 'audio/mpeg', file_name: path.basename(file) }),
  ], { capture: true });

  let j;
  try { j = JSON.parse(initiate); } catch { throw new Error(`initiate returned non-JSON: ${initiate.slice(0, 300)}`); }
  if (!j.upload_url || !j.file_url) throw new Error(`initiate gave no upload url: ${initiate.slice(0, 300)}`);

  await run('curl', ['-s', '-X', 'PUT', j.upload_url, '-H', 'Content-Type: audio/mpeg', '--data-binary', `@${file}`], { capture: true });
  return j.file_url;
}

async function infinitalk({ audioUrl, prompt, numFrames, key, out }) {
  const body = JSON.stringify({
    image_url: SCENE,
    audio_url: audioUrl,
    prompt,
    num_frames: numFrames,
    resolution: '480p',
  });
  const raw = await run('curl', [
    '-s', '--max-time', '1800', '-X', 'POST',
    'https://fal.run/fal-ai/infinitalk',
    '-H', `Authorization: Key ${key}`,
    '-H', 'Content-Type: application/json',
    '-d', body,
  ], { capture: true });

  let j;
  try { j = JSON.parse(raw); } catch { throw new Error(`infinitalk returned non-JSON: ${raw.slice(0, 400)}`); }
  const url = j?.video?.url;
  if (!url) throw new Error(`infinitalk returned no video: ${JSON.stringify(j).slice(0, 500)}`);

  await run('curl', ['-s', '-L', '-o', out, url], { capture: true });
  return url;
}

/* -------------------------------------------------------------------------- */
/* The two shots                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Direction is written as a continuous performance note rather than a list of
 * tags. The model follows the sentence-level description of what the body is
 * doing far better than it follows adjectives, and the difference between these
 * two and v1 is entirely in this text.
 */
const SHOTS = {
  shot2: {
    text: 'Whitaker Med Spa.',
    /**
     * ⚠️ SPOKEN SPELLING, and it is not cosmetic: Ava cannot say "Whitaker".
     *
     * Measured, not guessed. Two independent transcribers heard the shipped
     * take as something else, and re-rendering at +0%, -6% and -12% produced
     * "We talk him a spa" every time, so it was never a pacing problem. The
     * business name is the one thing in this ad the viewer has to catch, and
     * the whole screen half of the spot is that business. Splitting the word
     * ("Whit Taker") makes Ava land both syllables; it transcribes back as
     * "Wittaker med spa" and reads correctly to a listener.
     *
     * Same pattern as spokenText() in scripts/suite-film/tts.mjs, which exists
     * because "live" was being read as /lɪv/. Captions and manifests keep the
     * real spelling; only the audio uses this.
     */
    spoken: 'Whit Taker Med Spa.',
    pad: 3.2,
    prompt:
      'A woman in her thirties sits at her kitchen table on a phone call, holding the phone to her right ear with her right hand, an open laptop in front of her, warm morning light from a window on her left. She answers a simple question about her business name. She lifts her chin slightly as she says it, a small proud half-smile at the corner of her mouth, then her eyes flick down and to the left toward the laptop screen for a moment before coming back up. Her free left hand rests on the table and turns over once, palm opening, a small unconscious gesture. After she finishes speaking she goes still and listens, eyebrows settling, waiting for the answer on the other end. Natural micro-movements throughout, subtle breathing, small head sway, relaxed shoulders. Photorealistic, cinematic shallow depth of field, soft natural window light, no camera movement.',
  },
  shot5: {
    text: "What's the catch?",
    pad: 3.4,
    prompt:
      'A woman in her thirties sits at her kitchen table on a phone call, holding the phone to her right ear with her right hand, an open laptop in front of her, warm morning light from a window on her left. She has just been told something sounds too good to be true and she is gently calling it out. She leans back a few inches from the table as she speaks, one eyebrow lifting, head tilting slightly to the side, a skeptical but amused half-smile, the smallest breath of a laugh escaping before the words. Her free left hand lifts an inch off the table, fingers loosely spread, the universal small shrug of come on, really. After the line she holds the look, still smiling, eyes narrowing a fraction, genuinely waiting for the answer. Natural micro-movements throughout, subtle breathing, relaxed shoulders. Photorealistic, cinematic shallow depth of field, soft natural window light, no camera movement.',
  },
};

const want = process.argv.slice(2).filter((a) => SHOTS[a]);
const todo = want.length ? want : Object.keys(SHOTS);
const key = falKey();
mkdirSync(path.join(WORK, 'audio'), { recursive: true });
mkdirSync(path.join(WORK, 'shots'), { recursive: true });

for (const id of todo) {
  const s = SHOTS[id];
  const rawMp3 = path.join(WORK, 'audio', `${id}.raw.mp3`);
  const mp3 = path.join(WORK, 'audio', `${id}.mp3`);
  const mp4 = path.join(WORK, 'shots', `${id}.mp4`);

  console.log(`\n[${id}] "${s.text}"${s.spoken ? `  (spoken as "${s.spoken}")` : ''}`);
  await ava(s.spoken || s.text, rawMp3);
  await padTo(rawMp3, s.pad, mp3);

  const secs = await seconds(mp3);
  // Rule 2. Computed from the file every run, never hardcoded.
  const numFrames = Math.floor(secs * 25) - 8;
  console.log(`[${id}] audio ${secs.toFixed(2)}s -> num_frames ${numFrames}`);
  if (numFrames < 20) throw new Error(`${id}: audio too short for a usable shot (${numFrames} frames)`);

  const audioUrl = await uploadAudio(mp3, key);
  console.log(`[${id}] audio uploaded`);

  console.log(`[${id}] rendering (this takes a few minutes)`);
  const url = await infinitalk({ audioUrl, prompt: s.prompt, numFrames, key, out: mp4 });

  const rendered = await seconds(mp4);
  console.log(`[${id}] DONE ${mp4} (${rendered.toFixed(2)}s)`);
  writeFileSync(path.join(WORK, 'shots', `${id}.json`), JSON.stringify({ id, text: s.text, secs, numFrames, url }, null, 2));
}

console.log('\nall requested shots rendered');
