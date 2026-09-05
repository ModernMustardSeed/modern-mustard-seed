#!/usr/bin/env node
/**
 * vapi-bench.mjs: measure what a caller actually hears on a Vapi assistant.
 *
 * Places a REAL call over Vapi's websocket transport, plays synthesized caller
 * audio into it at real time, and measures the gap between the caller going
 * quiet and the first bot audio coming back. Then it reads Vapi's own
 * per-turn breakdown (model / voice / transcriber / endpointing) off the call
 * record so the two views can be compared.
 *
 *   node scripts/vapi-bench.mjs                         # Mr. Mustard, live
 *   node scripts/vapi-bench.mjs --assistant <id> --label kai-v2
 *   node scripts/vapi-bench.mjs --save-audio            # keep what he said as a .wav
 *
 * Why this exists (2026-09-04): ElevenLabs stopped returning audio and the
 * only symptom was "he says hello and then nothing". A 200 on the assistant
 * config proved nothing, POST /chat timings proved nothing, and every earlier
 * latency decision on this line was argued from single anecdotes. This puts a
 * number on a real call in two minutes, for cents, without ringing anyone.
 *
 * Two things learned building it, so nobody rediscovers them:
 *   1. `assistantOverrides` on a websocket call are stored and echoed back but
 *      NOT applied by the pipeline. To bench a candidate config, PATCH it onto
 *      a throwaway clone assistant and bench the clone (setup-vapi-mustard.mjs
 *      --emit renders the body for exactly that).
 *   2. Vapi streams continuous audio frames, silence included, so "bot done"
 *      has to be judged by RMS, not by frames stopping.
 *
 * Caller audio is generated once with Windows' built-in System.Speech voice
 * and cached under .vapi-bench/ (gitignored). Needs the PRIVATE VAPI_API_KEY,
 * resolved the same way vapi-sync.mjs does it.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}
const fileEnv = {
  ...loadEnvFile(resolve(__dirname, '../../modern-mustard-seed-voice-agent/.env')),
  ...loadEnvFile(resolve(__dirname, '../.env.local')),
};
const env = (k) => {
  const v = process.env[k] ?? fileEnv[k];
  return v === '[SENSITIVE]' ? undefined : v;
};
const KEY = env('VAPI_API_KEY');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
}

/* ── Caller script ────────────────────────────────────────────────────
 * Three turns that exercise the three things a phone line has to do: hear a
 * new caller, answer a follow-up, and read contact details back. The number is
 * Sarah's cell, so a readback that reaches a tool lands with her. */
const LINES = {
  u1: 'Hi, this is Dalton with D and D Landscaping in Tallahassee. I keep missing calls when I am out on jobs. What would a voice agent cost me?',
  u2: 'Okay. And how fast could you have that answering my phone?',
  u3: 'Great. My email is dalton at gmail dot com, and my number is four zero six, two five zero, six zero seven six. Can you read that back to me?',
};

function callerAudio(dir) {
  mkdirSync(dir, { recursive: true });
  const missing = Object.keys(LINES).filter((k) => !existsSync(join(dir, `${k}.wav`)));
  if (missing.length) {
    if (process.platform !== 'win32') {
      throw new Error(`Caller audio missing (${missing.join(', ')}) and only Windows System.Speech is wired up. Drop 16kHz mono s16le WAVs named u1.wav, u2.wav, u3.wav into ${dir}.`);
    }
    const ps = [
      'Add-Type -AssemblyName System.Speech',
      '$syn = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      '$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)',
      ...missing.map((k) => `$syn.SetOutputToWaveFile('${join(dir, `${k}.wav`).replace(/'/g, "''")}', $fmt); $syn.Speak('${LINES[k].replace(/'/g, "''")}'); $syn.SetOutputToNull()`),
    ].join('; ');
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'inherit' });
  }
  return ['u1', 'u2', 'u3'].map((k) => readFileSync(join(dir, `${k}.wav`)).subarray(44));
}

function wavHeader(pcmLength) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcmLength, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(16000, 24);
  h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcmLength, 40);
  return h;
}

async function main() {
  const assistantId = arg('--assistant', env('VAPI_MUSTARD_ASSISTANT_ID') || 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee');
  const label = arg('--label', 'bench');
  const saveAudio = process.argv.includes('--save-audio');
  const outDir = resolve(__dirname, '../.vapi-bench');
  const utts = callerAudio(outDir);
  const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

  const created = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      assistantId,
      name: `bench:${label}`,
      transport: { provider: 'vapi.websocket', audioFormat: { format: 'pcm_s16le', container: 'raw', sampleRate: 16000 } },
    }),
  });
  const call = await created.json();
  if (!created.ok) {
    console.error('Vapi refused the call:', created.status, JSON.stringify(call).slice(0, 600));
    process.exitCode = 1;
    return;
  }
  console.log(`[${label}] call ${call.id} on assistant ${assistantId}`);

  const ws = new WebSocket(call.transport.websocketCallUrl);
  ws.binaryType = 'arraybuffer';
  const t0 = Date.now();
  const now = () => Date.now() - t0;
  const FRAME = 640; // 20ms of 16kHz s16le
  const silence = Buffer.alloc(FRAME);
  const botChunks = [];
  let botFirstAt = null;
  let botLastAt = null;
  let queue = null;
  let qpos = 0;
  let waitingFirst = false;
  let curTurn = null;
  const turns = [];

  ws.onmessage = (ev) => {
    if (typeof ev.data === 'string') return; // control messages are not timed here
    const b = Buffer.from(ev.data);
    if (!b.length) return;
    botChunks.push(b);
    let acc = 0;
    for (let i = 0; i + 1 < b.length; i += 2) { const v = b.readInt16LE(i); acc += v * v; }
    if (Math.sqrt(acc / (b.length / 2)) < 60) return; // silent frame
    const t = now();
    if (botFirstAt === null || t - botLastAt > 1500) {
      botFirstAt = t;
      if (waitingFirst && curTurn) {
        curTurn.latency = t - curTurn.sentEnd;
        waitingFirst = false;
        console.log(`[${label}] ${curTurn.utt}: caller-heard latency ${curTurn.latency} ms`);
      }
    }
    botLastAt = t;
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket failed to open')); });

  let idx = 0;
  let phase = 'greeting';
  let next = Date.now();
  await new Promise((res) => {
    const tick = () => {
      if (ws.readyState !== 1) return res();
      let frame = silence;
      if (queue) {
        frame = queue.subarray(qpos, qpos + FRAME);
        if (frame.length < FRAME) frame = Buffer.concat([frame, Buffer.alloc(FRAME - frame.length)]);
        qpos += FRAME;
        if (qpos >= queue.length) { queue = null; curTurn.sentEnd = now(); waitingFirst = true; phase = 'listening'; }
      }
      ws.send(frame);
      const t = now();
      if (!queue && !waitingFirst) {
        const botDone = botLastAt !== null && t - botLastAt > 900;
        if ((phase === 'greeting' || phase === 'listening') && botDone) phase = 'speak';
        else if (phase === 'greeting' && t > 15000 && botFirstAt === null) { console.log(`[${label}] no greeting audio in 15s`); phase = 'speak'; }
        if (phase === 'speak') {
          if (idx < utts.length) {
            queue = utts[idx]; qpos = 0; idx += 1;
            curTurn = { utt: `u${idx}` }; turns.push(curTurn); phase = 'speaking';
          } else {
            phase = 'end';
            try { ws.send(JSON.stringify({ type: 'end-call' })); } catch {}
            setTimeout(() => { try { ws.close(); } catch {} res(); }, 1500);
            return;
          }
        }
      }
      if (waitingFirst && t - curTurn.sentEnd > 30000) { console.log(`[${label}] ${curTurn.utt}: no reply in 30s`); waitingFirst = false; phase = 'speak'; }
      if (t > 150000) { try { ws.send(JSON.stringify({ type: 'end-call' })); ws.close(); } catch {} return res(); }
      next += 20;
      setTimeout(tick, Math.max(0, next - Date.now()));
    };
    tick();
  });

  if (saveAudio) {
    const pcm = Buffer.concat(botChunks);
    const path = join(outDir, `bot-${label}-${call.id.slice(0, 8)}.wav`);
    writeFileSync(path, Buffer.concat([wavHeader(pcm.length), pcm]));
    console.log(`[${label}] bot audio saved to ${path}`);
  }

  let rec = null;
  for (let i = 0; i < 20; i += 1) {
    await new Promise((r) => setTimeout(r, 4000));
    rec = await (await fetch(`https://api.vapi.ai/call/${call.id}`, { headers: { Authorization: `Bearer ${KEY}` } })).json();
    if (rec.artifact?.performanceMetrics || (rec.status === 'ended' && i > 3)) break;
  }
  console.log(`[${label}] endedReason=${rec.endedReason}`);
  for (const m of rec.artifact?.messages || []) {
    if (m.role === 'system') continue;
    console.log(`   ${m.secondsFromStart}s ${m.role}${m.name ? ':' + m.name : ''} ${JSON.stringify(String(m.message || m.result || '').slice(0, 120))}`);
  }
  const pm = rec.artifact?.performanceMetrics;
  if (pm) {
    console.log(`[${label}] Vapi turn avg ${Math.round(pm.turnLatencyAverage)} ms | model ${Math.round(pm.modelLatencyAverage)} voice ${Math.round(pm.voiceLatencyAverage)} endpointing ${Math.round(pm.endpointingLatencyAverage)} transcriber ${Math.round(pm.transcriberLatencyAverage)}`);
  } else {
    console.log(`[${label}] Vapi reported no per-turn metrics (no completed turn, or the voice never produced audio).`);
  }
  console.log(`[${label}] caller-heard per turn: ${turns.map((t) => (t.latency ?? 'none')).join(', ')} ms`);
  if (/pipeline-error/.test(rec.endedReason || '') || turns.some((t) => t.latency == null)) process.exitCode = 1;
}

if (!KEY) {
  console.error('No usable VAPI_API_KEY (env or .env.local). The public key cannot place API calls.');
  process.exitCode = 1;
} else {
  await main();
}
