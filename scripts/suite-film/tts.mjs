/**
 * Narration and staged-caller voices, via fal.
 *
 * Two voices, deliberately different so the call reads as two people: the
 * narrator (the same warm female read Sarah approved on the Wills Electric
 * cut) and the caller (a second voice, so the staged call does not sound like
 * the film talking to itself).
 *
 * fal returns `duration_ms` with every clip, which is the whole reason the
 * film can be cut without frame-by-frame guessing: the recorder holds each
 * beat for exactly as long as its line takes to say, and the composer lays the
 * same clip back down at the same offset.
 *
 * Everything here fails LOUD. A film with missing narration is not a film, and
 * shipping one to a prospect is worse than shipping none, so the caller aborts
 * rather than degrading. (The forge's own imagery rules are the opposite,
 * because a hero can fall back to art. A narrator cannot fall back to silence.)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FAL_MODEL = 'fal-ai/minimax/speech-02-hd';

export const NARRATOR = { voice_id: 'Wise_Woman', speed: 0.94, vol: 1, pitch: 0 };
export const CALLER = { voice_id: 'Friendly_Person', speed: 1.0, vol: 1, pitch: 0 };

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
 * Speak one line. Returns { file, durationMs }.
 *
 * Polls the status_url the submit handed back (building it from the model path
 * returns garbage that JSON-parses as an error and looks exactly like a locked
 * wallet, which has cost a debugging cycle before). A wallet that accepts the
 * submit and then never leaves IN_QUEUE is locked, so the poll has a ceiling.
 */
export async function speak(text, voice, outFile, { timeoutMs = 120_000 } = {}) {
  const key = falKey();
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

  const submit = await falJson(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, voice_setting: voice, output_format: 'url' }),
  });
  if (!submit.status_url) throw new Error(`fal submit gave no status_url: ${JSON.stringify(submit).slice(0, 200)}`);

  const deadline = Date.now() + timeoutMs;
  let queuedForever = true;
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(
        queuedForever
          ? 'fal TTS never left IN_QUEUE: treat the wallet as locked (top up ~/.claude/fal.env account)'
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
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, Buffer.from(await audio.arrayBuffer()));

  const durationMs = Number(done.duration_ms) || 0;
  if (!durationMs) throw new Error('fal TTS returned no duration_ms; the cut cannot be timed without it');
  return { file: outFile, durationMs };
}
