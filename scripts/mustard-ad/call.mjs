/**
 * MR. MUSTARD'S SIDE, recorded off a REAL call to the live assistant.
 *
 * Nothing here writes his dialogue into a TTS. The client's turns are rendered
 * with Ava ahead of time and played into Chromium as a fake microphone; what he
 * says back is what the live agent actually says, in his real 11labs voice, on
 * his real speaking pipeline. That is the whole reason this ad can exist: the
 * voice in the spot is the voice that picks up the phone.
 *
 * WHY THE CALL IS BRIEFED (and the after-hours ad's was not). That spot was a
 * cold prospect call, so an unbriefed line was both honest and better than
 * anything scripted. This one has to hit specific beats in a fixed order and,
 * more importantly, has to stay TRUE about timing: the voice agent forges in
 * well under a minute and the WEBSITE takes about an hour and arrives by email.
 * An unbriefed agent quotes the standing $397 setup line from his own prompt,
 * which is the price of putting him on a REAL line and not the price of the
 * free demo suite this ad is about. So he is scoped, using this repo's
 * established pattern.
 *
 * ⚠️ VAPI 400s ON A PARTIAL MODEL OVERRIDE. The live assistant's WHOLE `model`
 * object is fetched and the brief is merged into it. A bare
 * `{ messages: [...] }` looks right and is rejected. Same trap the forge and
 * the hundredfold interview both hit (memory: hundredfold, trap 1).
 *
 * ⚠️ THE VOICE IS DELIBERATELY NOT OVERRIDDEN. Leaving `voice` off the
 * overrides means the call uses the base assistant's own 11labs voice, which is
 * the point. Passing sidekickVoice() here would swap him to a Vapi-native voice
 * and the ad would feature a man who does not answer the phone.
 *
 * ⚠️ 11LABS QUOTA IS TIGHT (memory: mms-after-hours-ad). Every take spends real
 * characters against the same allowance that keeps the production line alive.
 * Take one, listen, and only re-run if it is genuinely unusable.
 *
 * Usage:  node scripts/mustard-ad/call.mjs [--take=1]
 */
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const WORK = path.join(ROOT, '.mustard-ad');

const { chromium } = await import('playwright');
const { CALL_AUDIO_TAP } = await import(new URL('../suite-film/record.mjs', import.meta.url).href);
const { audibleFraction } = await import(new URL('../suite-film/compose.mjs', import.meta.url).href);
const { speak } = await import(new URL('../suite-film/tts.mjs', import.meta.url).href);

const AVA = { edge: 'en-US-AvaMultilingualNeural', rate: '+3%', fal: { voice_id: 'Wise_Woman', speed: 1, vol: 1, pitch: 0 } };

function env(name) {
  const line = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`no ${name} in .env.local`);
  return line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const VAPI_KEY = env('VAPI_API_KEY');
const PUBLIC_KEY = env('NEXT_PUBLIC_VAPI_PUBLIC_KEY');
const ASSISTANT_ID = env('VAPI_MUSTARD_ASSISTANT_ID');

/**
 * The brief. Every factual claim in it was checked against the live product
 * before it was written here, because whatever he says on this tape becomes
 * advertising:
 *   - three demos, free, no card and no sales call  -> app/demos/page.tsx
 *   - the suite arrives within the hour             -> app/demos/page.tsx
 *   - the voice agent forges in well under a minute -> measured, see forge.mjs
 * He is told the beats and the order, not the words. His own phrasing is
 * better than mine and the after-hours cut proved it.
 */
const BRIEF = `You are Mr. Mustard, the AI at Modern Mustard Seed, taking an inbound call from a small business owner who was given your number by a friend. She runs a med spa in Kalispell. She is going to tell you her website is embarrassing and that her phone rings all night with nobody to answer it.

This is a real call and it is being recorded for an advertisement, so every word you say must be true. Be warm, fast, and certain. Short sentences. No filler, no "absolutely", no restating her problem back to her.

Hit these beats IN THIS ORDER, in your own words, and keep each one to one or two short sentences:

1. When she describes both problems: tell her you can fix both, and ask what the business is called. Nothing else.
2. When she gives you the business name: tell her to give you about forty seconds on the phone part. Nothing else. Do not explain what you are doing.
3. THE MOMENT SHE MAKES ANY SOUND AFTER THAT, the forge has finished. Your very next sentence is that it is done and her agent is live, and then you ask if she wants to hear him take a booking. Nothing else may come between beat 2 and this line. Do not ask her for anything first. Take 2 of this recording was lost because you asked for an email here instead.
4. When she asks what this costs: the answer is NOTHING. It is free, no credit card and no sales call. Then tell her the website takes a bit longer and will be in her inbox inside the hour.
5. When she asks what the catch is: your entire answer is that she will like them. Say it warmly and stop talking.

HARD RULES:
- NEVER say the website is ready during this call. The voice agent is live in under a minute. The website takes about an hour and arrives by email. That distinction is the most important thing on this tape.
- Do NOT quote any price. Do not mention three hundred ninety seven, one forty seven, setup fees or monthly fees. This call is about the free demos only. If she pushes on price, say the demos are free and she can decide later.
- 🚫 NEVER ASK HER FOR HER EMAIL, HER PHONE NUMBER, HER NAME, OR ANY OTHER DETAIL, at any point, for any reason. You already have everything you need. This is the single most common way you break this recording. Do not offer to book a call with Sarah.
- Do not mention that you are an AI unless she asks.
- Keep the whole call under about ninety seconds of your own speech.`;

/**
 * `after` is the silence FOLLOWING each line, sized from MEASURED behaviour on
 * take 1 rather than guessed: his endpointing wait plus first token runs about
 * 7.5s after her audio stops, and his briefed answers run 1 to 3.5s. So a gap
 * of ~13s clears his reply with a few seconds of margin.
 *
 * ⚠️ THE FORTY-SECOND GAP DOES NOT EXIST ON THE CALL, ON PURPOSE. In the script
 * the forge runs between "give me forty seconds" and "done, your agent's live",
 * and on screen that window is filled by the real capture of the forge running.
 * Holding a real 40s silence here would only trip Vapi's silence timeout and
 * end the call before the last two beats. Turn 3 is a short listening noise
 * that cues his "done" line; the picture supplies the wait.
 */
const TURNS = [
  { after: 14_000, text: 'Hi, is this Mr. Mustard? A friend gave me this number. I run a med spa here in Kalispell and honestly my website is embarrassing, and the phone rings all night with nobody to answer it.' },
  { after: 13_000, text: 'Whitaker Med Spa.' },
  { after: 15_000, text: 'Okay.' },
  { after: 16_000, text: 'Wait. That was forty seconds. So what does something like this cost me?' },
  { after: 12_000, text: "What's the catch?" },
];

/**
 * ⚠️ THE TRANSCRIBER OVERRIDE IS NOT OPTIONAL, and take 1 is why.
 *
 * The live assistant carries no transcriber of its own, so the call fell back
 * to the default and "Whitaker Med Spa." (1.5s, two proper nouns, no
 * surrounding sentence) was transcribed as NOTHING AT ALL. He heard silence,
 * asked for the name twice, and beats 2 and 3 never fired. The audio was fine;
 * the words simply never reached him.
 *
 * nova-3 keyterm boosting is this repo's existing answer to exactly that
 * failure (demoTranscriber in lib/sidekick.ts): the words a call is guaranteed
 * to contain are the ones a general model mangles without help.
 */
const TRANSCRIBER = {
  provider: 'deepgram',
  model: 'nova-3',
  language: 'en',
  numerals: true,
  keyterm: ['Whitaker Med Spa', 'Whitaker', 'Kalispell', 'med spa', 'Mr. Mustard'],
};

/** See after-hours call.mjs: Vapi opens the mic at connect, not when he speaks. */
const LEAD_MS = 17_000;

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}: ${err.slice(-400)}`))));
  });
}

async function buildCallerTrack(files, out) {
  const inputs = [];
  const filters = [];
  const labels = [];
  let at = LEAD_MS;
  files.forEach((f, i) => {
    inputs.push('-i', f.file);
    filters.push(`[${i}:a]aresample=16000,aformat=channel_layouts=mono,adelay=${at}[t${i}]`);
    labels.push(`[t${i}]`);
    at += f.durationMs + TURNS[i].after;
  });
  filters.push(`${labels.join('')}amix=inputs=${files.length}:duration=longest:normalize=0,volume=2.2[out]`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', out]);
  return at;
}

/* -------------------------------------------------------------------------- */

const take = Number((process.argv.find((a) => a.startsWith('--take=')) || '--take=1').split('=')[1]);
const workDir = path.join(WORK, 'call', `take-${take}`);
mkdirSync(path.join(workDir, 'turns'), { recursive: true });
const log = (m) => console.log(`[call ${take}] ${m}`);

// ---- 1. the live assistant's whole model object ----------------------------
log('fetching the live assistant');
const aRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, { headers: { Authorization: `Bearer ${VAPI_KEY}` } });
const assistant = await aRes.json();
if (!assistant?.model) throw new Error(`could not read the live assistant: ${JSON.stringify(assistant).slice(0, 300)}`);

// Merge the brief into the WHOLE model object and strip the named tools, so he
// cannot wander off and book a discovery call in the middle of the ad.
const model = { ...assistant.model, messages: [{ role: 'system', content: BRIEF }] };
delete model.tools;
delete model.toolIds;
log(`model ${model.provider}/${model.model}, voice stays ${assistant.voice?.provider}`);

// ---- 2. Ava's turns --------------------------------------------------------
log('rendering the client turns');
const turnFiles = [];
for (const [i, t] of TURNS.entries()) {
  const f = path.join(workDir, 'turns', `${String(i + 1).padStart(2, '0')}.mp3`);
  turnFiles.push(await speak(t.text, AVA, f, { allowPaid: false }));
}
const callerWav = path.join(workDir, 'caller.wav');
const plannedMs = await buildCallerTrack(turnFiles, callerWav);
log(`caller track ${(plannedMs / 1000).toFixed(1)}s`);

// ---- 3. a page that can place the call -------------------------------------
// Served over http://127.0.0.1, which Chrome treats as a secure context, so
// getUserMedia and WebRTC both work and no site CSP is in the way.
const OVERRIDES = {
  firstMessage: 'Modern Mustard Seed, this is Mr. Mustard.',
  model,
  transcriber: TRANSCRIBER,
  // Take 1 ended on `silence-timed-out` during the last gap. The gaps here are
  // structural, so the timeout is raised above the longest one rather than the
  // gaps being shortened to please it.
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 240,
  metadata: { kind: 'mustard-call-ad', take },
};

const HTML = `<!doctype html><meta charset="utf-8"><title>rig</title><body style="background:#161616">
<script type="module">
import Vapi from 'https://esm.sh/@vapi-ai/web@2.5.2';
const vapi = new Vapi(${JSON.stringify(PUBLIC_KEY)});
window.__ended = false;
vapi.on('call-end', () => { window.__ended = true; });
vapi.on('error', (e) => { window.__err = String(e?.message || e); });
// Krisp swallows the fake mic on a meaningful share of machines and the call
// then transcribes zero caller turns. See lib/vapi-web.ts.
const off = () => { try { vapi.call?.updateInputSettings({ audio: { processor: { type: 'none' } } }); } catch {} };
[0, 400, 1200, 2500].forEach((d) => setTimeout(off, d));
window.__start = () => vapi.start(${JSON.stringify(ASSISTANT_ID)}, ${JSON.stringify(OVERRIDES)});
window.__ready = true;
</script></body>`;

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}/`;

// ---- 4. the call -----------------------------------------------------------
const browser = await chromium.launch({
  headless: true,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    // %noloop matters: without it her lines repeat under him all call.
    `--use-file-for-fake-audio-capture=${callerWav}%noloop`,
  ],
});
const ctx = await browser.newContext({ permissions: ['microphone'] });
await ctx.addInitScript(CALL_AUDIO_TAP);
const page = await ctx.newPage();
page.setDefaultTimeout(90_000);

let callId = null;
page.on('response', (res) => {
  if (/api\.vapi\.ai\/call\/web/.test(res.url()) && res.request().method() === 'POST') {
    res.json().then((j) => { if (j?.id) callId = j.id; }).catch(() => {});
  }
});
page.on('console', (m) => { if (m.type() === 'error') console.log(`  [page] ${m.text().slice(0, 200)}`); });

await page.goto(origin, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ready === true);
log('starting the call');
await page.evaluate(() => window.__start());

await page.waitForFunction(() => window.__mmsCall && window.__mmsCall.sources >= 2, null, { timeout: 60_000 });
await page.evaluate(() => window.__mmsCallRecStart());
const recStart = Date.now();
log('recording');

await page.waitForTimeout(plannedMs + 15_000);

const b64 = await page.evaluate(() => window.__mmsCallRecStop());
log(`recorded ${((Date.now() - recStart) / 1000).toFixed(1)}s`);
const webm = path.join(workDir, 'call.webm');
writeFileSync(webm, Buffer.from(b64, 'base64'));
const wav = path.join(workDir, 'call.wav');
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-ac', '2', '-ar', '48000', wav]);

const err = await page.evaluate(() => window.__err || null);
await browser.close();
server.close();

// ---- 5. prove it -----------------------------------------------------------
const sound = await audibleFraction(webm);
log(`audible ${(sound * 100).toFixed(0)}%`);

let transcript = null;
if (callId) {
  await new Promise((r) => setTimeout(r, 20_000));
  const res = await fetch(`https://api.vapi.ai/call/${callId}`, { headers: { Authorization: `Bearer ${VAPI_KEY}` } });
  const j = await res.json();
  transcript = j.transcript || (j.artifact || {}).transcript || null;
  if (transcript) writeFileSync(path.join(workDir, 'transcript.txt'), transcript);
}

const userTurns = transcript ? (transcript.match(/^User:/gm) || []).length : 0;
writeFileSync(path.join(workDir, 'result.json'), JSON.stringify({ take, callId, sound, userTurns, plannedMs, err }, null, 2));

log(`callId ${callId || 'none'} | user turns ${userTurns}${err ? ` | page error: ${err}` : ''}`);
if (!transcript) log('WARNING no transcript, cannot prove he heard her');
else if (userTurns < 4) log('WARNING too few user turns, he probably talked over her');
if (sound < 0.35) log('WARNING recording is mostly silence, check the audio tap');
log(`wav: ${wav}`);
if (transcript) console.log(`\n--- transcript ---\n${transcript}\n`);
