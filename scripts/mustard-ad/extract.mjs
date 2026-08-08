/**
 * Cut Mr. Mustard's lines out of the recorded call.
 *
 * The call recording is a single stream carrying BOTH sides, which is what
 * makes it provably real. Isolating him works because the turns never overlap:
 * a span that contains only his speech IS his audio alone, with no separation
 * needed.
 *
 * ⚠️ THE SPANS COME FROM THE RECORDING'S OWN ENERGY, NOT FROM VAPI'S CLOCK.
 * Recording starts when the remote track lands, several hundred ms to a second
 * after the call does, so every timestamp Vapi reports is offset by an unknown
 * amount. Vapi's timestamps are used only to LABEL the runs and to prove the
 * mapping is 1:1; the cuts themselves are made against silencedetect, which is
 * measured on the same file being cut and therefore cannot drift.
 *
 * Usage:  node scripts/mustard-ad/extract.mjs [--take=3]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const take = Number((process.argv.find((a) => a.startsWith('--take=')) || '--take=3').split('=')[1]);
const SRC = path.join(ROOT, '.mustard-ad', 'call', `take-${take}`, 'call.wav');
const OUT = path.join(ROOT, '.mustard-ad', 'mustard');
mkdirSync(OUT, { recursive: true });

/**
 * His beats, keyed to the speech runs measured on take 3. `text` is what he
 * ACTUALLY said, transcribed off the live call, kept here so the edit and the
 * captions can never drift from the tape.
 *
 * A short pad on each side keeps consonants intact: silencedetect trims at an
 * energy threshold, so a hard cut on its boundary clips the leading "N" of
 * "Nothing" and the tail of a trailing "s".
 */
const PAD = 0.18;
const BEATS = [
  { id: 'm1', from: 33.48, to: 36.09, text: "We can fix both of those. What's the business called?" },
  { id: 'm2a', from: 47.71, to: 49.38, text: 'Alright. Firing up the forge right now.' },
  { id: 'm2b', from: 51.12, to: 53.00, text: 'Give me about forty seconds on the phone part.' },
  { id: 'm3', from: 62.03, to: 65.44, text: "It's done. Her agent is live right now. Wanna hear her take a booking?" },
  { id: 'm4', from: 82.02, to: 87.92, text: "Nothing. Free. No credit card. No sales call. The website takes a bit longer. It'll be in your inbox inside the hour." },
  { id: 'm5', from: 101.72, to: 102.75, text: "You're gonna like them." },
];

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}: ${err.slice(-300)}`))));
  });
}

const manifest = [];
for (const b of BEATS) {
  const from = Math.max(0, b.from - PAD);
  const dur = b.to - b.from + PAD * 2;
  const out = path.join(OUT, `${b.id}.wav`);
  // The call rides a phone-band pipeline, so a gentle high-pass plus loudness
  // normalisation makes him sit evenly against Ava without ever sounding like
  // he was recorded anywhere other than a phone line.
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-ss', String(from), '-t', String(dur), '-i', SRC,
    '-af', 'highpass=f=90,loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '48000', '-ac', '1', out,
  ]);
  manifest.push({ ...b, file: out, seconds: Number(dur.toFixed(2)) });
  console.log(`${b.id.padEnd(4)} ${dur.toFixed(2)}s  "${b.text.slice(0, 60)}"`);
}

writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ take, source: SRC, beats: manifest }, null, 2));
console.log(`\n${manifest.length} beats -> ${OUT}`);
