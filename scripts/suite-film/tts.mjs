/**
 * Narration and staged-caller voices.
 *
 * Two voices, deliberately different so the call reads as two people: the
 * narrator (a warm female read) and the caller (a second voice, so the staged
 * call does not sound like the film talking to itself).
 *
 * TWO ENGINES, FREE ONE FIRST. Sarah, 2026-08-01: "so i dont have to keep
 * paying fal key." Microsoft's Edge neural voices are free, need no account and
 * no key, and are a match for what the metered path was producing, so they are
 * the default. fal's minimax stays as the fallback for when edge-tts is missing
 * or the network refuses it, and it only spends money when the free path has
 * already failed. The fal wallet has run dry mid-job repeatedly (memory:
 * media-generation-pipeline), and a narrator is not something a film can
 * degrade gracefully without.
 *
 * Duration is measured with ffprobe rather than trusted from an API, so both
 * engines report the same way. The whole cut is timed off these numbers: the
 * recorder holds each beat for exactly as long as its line takes to say.
 *
 * Prereq for the free path (one time):  python -m pip install edge-tts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const FAL_MODEL = 'fal-ai/minimax/speech-02-hd';
const PYTHON = process.env.SUITE_FILM_PYTHON || 'python';

/**
 * Each voice carries both engines' settings so a fallback never changes who is
 * speaking mid-film. Override the narrator with SUITE_FILM_NARRATOR_VOICE
 * (any `edge-tts --list-voices` name).
 */
/**
 * ⚡ THE NARRATOR IS SELLING, NOT READING. Sarah, 2026-08-04: "the voice doing
 * that demo video needs to sell it better and do a 10x job." She was hearing
 * -4%, which is a bedtime-story pace: it made confident lines sound tentative
 * and stretched a two-minute film into something that felt like four. Ava at
 * +7% lands where a good salesperson actually talks, and the writing in
 * lines.mjs was cut to short declaratives to match. Any further push starts to
 * clip her consonants, so this is the ceiling, not a dial to keep turning.
 */
export const NARRATOR = {
  edge: process.env.SUITE_FILM_NARRATOR_VOICE || 'en-US-AvaMultilingualNeural',
  rate: '+7%',
  fal: { voice_id: 'Wise_Woman', speed: 1.06, vol: 1, pitch: 0 },
};

/**
 * The staged caller is the OTHER female voice, per Sarah 2026-08-01 ("use the
 * other girl voice too"). Emma against Ava keeps the two halves of the call
 * clearly separate while both stay in a natural customer register; Aria is the
 * spare if they ever read too close (SUITE_FILM_CALLER_VOICE=en-US-AriaNeural).
 */
export const CALLER = {
  edge: process.env.SUITE_FILM_CALLER_VOICE || 'en-US-EmmaMultilingualNeural',
  rate: '+0%',
  fal: { voice_id: 'Friendly_Person', speed: 1.0, vol: 1, pitch: 0 },
};

function durationMs(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { windowsHide: true });
    let s = '';
    p.stdout.on('data', (d) => { s += d.toString(); });
    p.on('error', reject);
    p.on('close', () => {
      const n = Number(s.trim());
      if (!Number.isFinite(n) || n <= 0) reject(new Error(`could not measure ${path.basename(file)}`));
      else resolve(Math.round(n * 1000));
    });
  });
}

/** The free path: Microsoft's neural voices, no key, no account, no meter. */
function edgeSpeak(text, voice, outFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      PYTHON,
      ['-m', 'edge_tts', '--voice', voice.edge, `--rate=${voice.rate}`, '--text', text, '--write-media', outFile],
      { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
    );
    let err = '';
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => reject(new Error(`edge-tts could not start (${e.message}). Install it: python -m pip install edge-tts`)));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`edge-tts exited ${code}: ${err.trim().slice(-200)}`));
      // A zero exit with an empty file is the failure mode worth guarding: the
      // module writes the file before it has audio to put in it.
      if (!existsSync(outFile) || statSync(outFile).size < 1200) return reject(new Error('edge-tts wrote no audio'));
      resolve();
    });
  });
}

/* ------------------------------ the paid path ----------------------------- */

function falKey() {
  const p = path.join(os.homedir(), '.claude', 'fal.env');
  if (!existsSync(p)) throw new Error(`no fal key at ${p}`);
  const raw = readFileSync(p, 'utf8').trim();
  // The file is the raw `id:secret` key on one line, NOT a VAR= dotenv file.
  const key = raw.split(/\r?\n/).find((l) => l.includes(':'))?.trim();
  if (!key) throw new Error('fal.env present but holds no id:secret key');
  return key;
}

async function falJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`fal returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (json?.detail && typeof json.detail === 'string') throw new Error(`fal: ${json.detail}`);
  return json;
}

/**
 * Polls the status_url the submit handed back (building it from the model path
 * returns garbage that JSON-parses as an error and looks exactly like a locked
 * wallet, which has cost a debugging cycle before). A wallet that accepts the
 * submit and then never leaves IN_QUEUE is locked, so the poll has a ceiling.
 */
async function falSpeak(text, voice, outFile, timeoutMs) {
  const key = falKey();
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

  const submit = await falJson(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, voice_setting: voice.fal, output_format: 'url' }),
  });
  if (!submit.status_url) throw new Error(`fal submit gave no status_url: ${JSON.stringify(submit).slice(0, 200)}`);

  const deadline = Date.now() + timeoutMs;
  let queuedForever = true;
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(
        queuedForever
          ? 'fal TTS never left IN_QUEUE: treat the wallet as locked'
          : 'fal TTS timed out while IN_PROGRESS',
      );
    }
    const st = await falJson(submit.status_url, { headers });
    if (st.status === 'IN_PROGRESS') queuedForever = false;
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error(`fal TTS failed: ${JSON.stringify(st).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const done = await falJson(submit.response_url, { headers });
  const url = done?.audio?.url;
  if (!url) throw new Error(`fal TTS returned no audio url: ${JSON.stringify(done).slice(0, 200)}`);

  const audio = await fetch(url);
  if (!audio.ok) throw new Error(`could not download narration (${audio.status})`);
  writeFileSync(outFile, Buffer.from(await audio.arrayBuffer()));
}

/* -------------------------------------------------------------------------- */

/**
 * Speak one line. Returns { file, durationMs, engine }.
 *
 * Fails LOUD when both engines fail. A film with a missing narration line is
 * not a film, and shipping one to a prospect is worse than shipping none, so
 * the caller aborts rather than degrading. (The forge's imagery rules are the
 * opposite, because a hero can fall back to another photograph. A narrator
 * cannot fall back to silence.)
 */
/**
 * PRONUNCIATION FIXES, applied to the SPOKEN text only (captions and manifests
 * keep the real spelling because callers store their own copy of `text`).
 *
 * Sarah 2026-08-07: "it says word LIVE wrong - it needs to be a hard i because
 * its LIVE (L-EYE-VE)". In our copy "live" is virtually always /laɪv/ (goes
 * live, live demo, live in about a week), and the TTS reads the verb form
 * /lɪv/ whenever the grammar allows it. "lyve" forces the long i on every
 * engine. Applies pipeline-wide: every film, tour, and hostess speaks through
 * this function.
 */
function spokenText(text) {
  return String(text).replace(/\blive\b/gi, 'lyve');
}

export async function speak(text, voice, outFile, { timeoutMs = 120_000, allowPaid = true } = {}) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  text = spokenText(text);

  let freeErr = null;
  try {
    await edgeSpeak(text, voice, outFile);
    return { file: outFile, durationMs: await durationMs(outFile), engine: 'edge' };
  } catch (e) {
    freeErr = e;
  }

  if (!allowPaid) throw new Error(`edge-tts failed and the paid path is off: ${freeErr.message}`);
  try {
    await falSpeak(text, voice, outFile, timeoutMs);
    return { file: outFile, durationMs: await durationMs(outFile), engine: 'fal' };
  } catch (paidErr) {
    throw new Error(`no voice available. edge-tts: ${freeErr.message} | fal: ${paidErr.message}`);
  }
}
