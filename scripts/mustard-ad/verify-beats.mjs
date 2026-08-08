/**
 * Prove each extracted fragment actually contains the line it claims.
 *
 * The cuts were made against energy boundaries, which is the right way to cut
 * but says nothing about WHICH words landed inside. A fragment that starts a
 * syllable late or swallows a trailing word still passes every duration and
 * loudness check, and the mistake is only audible once the ad is assembled and
 * being watched by somebody who matters.
 *
 * So every clip is transcribed on its own and matched word-for-word against the
 * transcript of the live call. A mismatch fails LOUD rather than being rounded
 * off as close enough.
 *
 * Usage:  node scripts/mustard-ad/verify-beats.mjs
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const manifest = JSON.parse(readFileSync(path.join(ROOT, '.mustard-ad', 'mustard', 'manifest.json'), 'utf8'));

function falKey() {
  const raw = readFileSync(path.join(os.homedir(), '.claude', 'fal.env'), 'utf8').trim();
  const k = raw.split(/\r?\n/).find((l) => l.includes(':'));
  if (k) return k.trim();
  throw new Error('no fal key');
}
const key = falKey();

/**
 * Compare on SOUNDS, not spelling.
 *
 * The claimed text is Vapi's transcription of the live call and the heard text
 * is Whisper's transcription of the extracted clip. Two transcribers listening
 * to identical audio still disagree about orthography: "Alright" vs "All
 * right", "forty" vs "40", "Wanna" vs "Want to". Failing a clip over that
 * would train me to ignore this check, which defeats the point of having it. A
 * MISSING or DIFFERENT word still fails, which is the thing worth catching.
 */
const SPELLINGS = [
  [/\ball right\b/g, 'alright'],
  [/\bwant to\b/g, 'wanna'],
  [/\bgoing to\b/g, 'gonna'],
  [/\bgot to\b/g, 'gotta'],
];
const NUMBERS = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty' };

const norm = (s) => {
  let t = String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b\d+\b/g, (d) => NUMBERS[Number(d)] ?? d);
  for (const [re, to] of SPELLINGS) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
};

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}: ${err.slice(-300)}`))));
  });
}

/**
 * ⚠️ MP3, NOT WAV. A wav data URI is accepted by the queue and comes back with
 * an EMPTY transcript rather than an error, which reads exactly like six silent
 * clips and sent me to check the audio instead of the request. The clips were
 * fine. Encode to mp3 and send audio/mpeg.
 */
async function whisper(file) {
  const mp3 = file.replace(/\.wav$/, '.check.mp3');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-b:a', '64k', mp3]);
  const uri = `data:audio/mpeg;base64,${readFileSync(mp3).toString('base64')}`;

  const submit = await fetch('https://queue.fal.run/fal-ai/whisper', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: uri, task: 'transcribe', language: 'en' }),
  });
  if (!submit.ok) throw new Error(`submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  const { status_url, response_url } = await submit.json();

  // A poll that falls out of its loop without COMPLETED must fail, never fetch
  // the response anyway and report whatever blank it finds as a result.
  let done = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const s = await (await fetch(status_url, { headers: { Authorization: `Key ${key}` } })).json();
    if (s.status === 'COMPLETED') { done = true; break; }
    if (s.status === 'FAILED' || s.status === 'ERROR') throw new Error(`whisper failed on ${path.basename(file)}: ${JSON.stringify(s).slice(0, 200)}`);
  }
  if (!done) throw new Error(`whisper never completed for ${path.basename(file)}`);

  const r = await (await fetch(response_url, { headers: { Authorization: `Key ${key}` } })).json();
  const text = (r.text || '').trim();
  if (!text) throw new Error(`whisper returned an EMPTY transcript for ${path.basename(file)}; the clip has audio, so this is the request, not the tape`);
  return text;
}

let bad = 0;
for (const b of manifest.beats) {
  const heard = await whisper(b.file);
  const want = norm(b.text);
  const got = norm(heard);
  // The claimed line must be present whole. Whisper occasionally adds a stray
  // leading word from a neighbouring breath, which is harmless; a MISSING word
  // is not.
  // The claimed line must be present WHOLE and in order. A stray extra word
  // from a neighbouring breath is harmless; a dropped one is not.
  const ok = got.includes(want);
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${b.id.padEnd(4)} ${b.seconds}s`);
  console.log(`      claimed: ${b.text}`);
  console.log(`      heard:   ${heard}`);
}

console.log(bad === 0 ? '\nALL BEATS VERIFIED' : `\n${bad} BEAT(S) DO NOT MATCH THE TAPE`);
process.exitCode = bad === 0 ? 0 : 1;
