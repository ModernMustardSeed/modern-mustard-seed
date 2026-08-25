/**
 * THE CUT.
 *
 * Takes the raw silent screencast plus the narration clips and the captured
 * call, and lays them back down at the offsets the camera recorded. There is
 * no creative decision left here: the picture was already cut to the voice
 * while it was being shot, so this is arithmetic.
 *
 * The one subtlety worth keeping: the trim is TAIL-ANCHORED. Chromium's
 * screencast begins some hundreds of ms after the browser context does, and
 * that lead-in varies run to run, so `scoreMs` counted from the first narrated
 * frame will not match the head of the file. The score ends immediately before
 * the context closes, so the end of the raw file is the landmark that can be
 * trusted, and the head is trimmed to whatever is left over.
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2400)}`))));
  });
}

async function probeDurationSec(file) {
  const out = await new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { windowsHide: true });
    let s = '';
    p.stdout.on('data', (d) => { s += d.toString(); });
    p.on('error', reject);
    p.on('close', () => resolve(s.trim()));
  });
  const n = Number(out);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`could not read duration of ${file}`);
  return n;
}

/**
 * Turn the raw take plus the audio pieces into the finished film.
 *
 * @param tracks each { file, atMs, gain, fadeOutAtMs?, fadeOutMs? } laid at its
 *   own offset. fadeOutAtMs/fadeOutMs duck the clip to silence starting that
 *   far into ITS OWN runtime (not the master timeline), for a track that would
 *   otherwise still be talking when the next one starts.
 */
export async function compose({ workDir, raw, scoreMs, tracks, bed, outMp4, outPoster, posterAtMs, log = () => {} }) {
  const rawSec = await probeDurationSec(raw);
  const scoreSec = scoreMs / 1000;
  // Tail-anchored: everything before this is Chromium warming up.
  const trimSec = Math.max(0, rawSec - scoreSec);
  log(`  raw ${rawSec.toFixed(2)}s, score ${scoreSec.toFixed(2)}s, trimming ${trimSec.toFixed(2)}s off the head`);

  const silentMp4 = path.join(workDir, 'picture.mp4');
  await run('ffmpeg', [
    '-y', '-ss', trimSec.toFixed(3), '-i', raw,
    '-an', '-t', scoreSec.toFixed(3),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-r', '25',
    '-vf', 'scale=1600:900:flags=lanczos',
    '-movflags', '+faststart',
    silentMp4,
  ]);

  const usable = tracks.filter((t) => t.file && existsSync(t.file) && statSync(t.file).size > 0);
  if (!usable.length) throw new Error('no audio to lay under the picture');

  const inputs = [];
  const filters = [];
  const labels = [];
  usable.forEach((t, i) => {
    inputs.push('-i', t.file);
    const ms = Math.max(0, Math.round(t.atMs));
    const gain = t.gain ?? 1;
    // Duck this clip to silence before it ends, so a narration line that runs
    // long never fights the audio laid down right after it (the call-setup
    // line vs. the agent's own greeting: both are "on time" by the beat's
    // visual pacing, but pacing has no opinion about two voices at once).
    // afade runs on the clip's OWN clock, so it goes before adelay shifts
    // that clock onto the master timeline.
    const fade = t.fadeOutAtMs != null
      ? `,afade=t=out:st=${(t.fadeOutAtMs / 1000).toFixed(3)}:d=${((t.fadeOutMs ?? 450) / 1000).toFixed(3)}`
      : '';
    // adelay wants one value per channel; the pair covers mono and stereo, and
    // aresample keeps everything on one clock before the mix.
    filters.push(`[${i}:a]aresample=48000${fade},adelay=${ms}|${ms},volume=${gain}[a${i}]`);
    labels.push(`[a${i}]`);
  });

  let bedIdx = -1;
  if (bed && existsSync(bed)) {
    bedIdx = usable.length;
    inputs.push('-stream_loop', '-1', '-i', bed);
    filters.push(`[${bedIdx}:a]aresample=48000,atrim=0:${scoreSec.toFixed(3)},volume=0.075,afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, scoreSec - 2).toFixed(3)}:d=2[bed]`);
    labels.push('[bed]');
  }

  const n = labels.length;
  filters.push(`${labels.join('')}amix=inputs=${n}:duration=longest:normalize=0,alimiter=limit=0.95,atrim=0:${scoreSec.toFixed(3)}[mix]`);

  const audioM4a = path.join(workDir, 'audio.m4a');
  await run('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[mix]', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    audioM4a,
  ]);

  await run('ffmpeg', [
    '-y', '-i', silentMp4, '-i', audioM4a,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'copy', '-shortest',
    '-movflags', '+faststart',
    outMp4,
  ]);

  const posterSec = Math.min(Math.max(0.5, (posterAtMs || 1500) / 1000), scoreSec - 0.5);
  await run('ffmpeg', ['-y', '-ss', posterSec.toFixed(2), '-i', outMp4, '-frames:v', '1', '-q:v', '3', outPoster]);

  return { mp4: outMp4, poster: outPoster, seconds: scoreSec };
}

/**
 * Concatenate the staged caller's lines into the single 16 kHz mono WAV
 * Chromium plays back as a microphone, with silence in the gaps.
 *
 * THE LEAD SILENCE IS LOAD-BEARING AND IT IS TIED TO THE GREETING'S LENGTH.
 * Chromium starts playing this file the moment the page opens the microphone,
 * which Vapi does at the START of its connect sequence, not when the agent
 * begins speaking. Measured on the first real run: ~9s of connect, then the
 * greeting, so a 5s lead meant both caller turns were spent before the agent
 * could hear anything and the call transcribed zero User turns. That reads
 * identically to Krisp deafness and sent a real bug hunt down the wrong hole.
 *
 * The lead was 30s while the greeting ran ~20 seconds ("I'm not a person, I'm
 * a voice agent, a free demo Sarah built for you..."). That greeting was cut to
 * about nine seconds on 2026-08-04 (lib/demo-agent.ts, demoAgentFirstMessage:
 * Sarah wanted the waiting gone and the word "free" out of the film), so the
 * lead came down with it: ~9s connect + ~9s greeting + margin. IF THE GREETING
 * IS EVER LENGTHENED AGAIN, LENGTHEN THIS TO MATCH or the caller talks over it
 * and the film fails the transcript check for no obvious reason.
 *
 * THE GAP BETWEEN TURNS IS THE SAME PROBLEM ONE LAYER DOWN. At 12s the caller's
 * second line landed while the agent was still diagnosing the first ("A
 * breaker" cuts off mid-sentence in the transcript), so the film's best moment
 * sounded like two people talking over each other. The agent's turns are capped
 * at 1 to 2 sentences by its prompt, so 18s still clears an answer plus its own
 * follow-up question. Do not go below that on the word of one lucky take.
 */
export async function buildCallerWav({ turnFiles, leadSilenceMs = 20_000, gapMs = 18_000, out }) {
  const inputs = [];
  const filters = [];
  const labels = [];
  turnFiles.forEach((f, i) => {
    inputs.push('-i', f);
    const delay = leadSilenceMs + i * gapMs;
    filters.push(`[${i}:a]aresample=16000,aformat=channel_layouts=mono,adelay=${delay}[t${i}]`);
    labels.push(`[t${i}]`);
  });
  filters.push(`${labels.join('')}amix=inputs=${turnFiles.length}:duration=longest:normalize=0,volume=2.2[out]`);
  await run('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[out]', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
    out,
  ]);
  return { file: out, durationMs: Math.round((await probeDurationSec(out)) * 1000) };
}

/**
 * How much of a clip actually has sound in it, 0 to 1.
 *
 * Exists because of a failure that was invisible everywhere else: the captured
 * call played back as the caller's two questions with 28 seconds of nothing
 * where the agent's greeting should have been (see the Web Audio note in
 * record.mjs CALL_AUDIO_TAP). Every other signal was green. The Vapi transcript
 * proved the conversation happened, the file existed, the file had a duration,
 * and the film encoded cleanly. Only listening to it, or measuring it, showed
 * that half the conversation was missing.
 */
export async function audibleFraction(file) {
  // ONE decode pass gives both numbers, and it has to be a decode: MediaRecorder
  // writes webm as a live stream with no duration in the header, so ffprobe
  // reports N/A and probeDurationSec throws on exactly the file this guard
  // exists to check. ffmpeg's progress line is the honest length.
  const log = await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-i', file, '-af', 'silencedetect=n=-45dB:d=1', '-f', 'null', '-'], { windowsHide: true });
    let s = '';
    p.stderr.on('data', (d) => { s += d.toString(); });
    p.on('error', reject);
    p.on('close', () => resolve(s));
  });
  const stamps = [...log.matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
  const last = stamps.at(-1);
  const total = last ? Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]) : 0;
  const silent = [...log.matchAll(/silence_duration:\s*([\d.]+)/g)].reduce((n, m) => n + Number(m[1]), 0);
  return total > 0 ? Math.max(0, Math.min(1, (total - silent) / total)) : 0;
}

export { probeDurationSec };
