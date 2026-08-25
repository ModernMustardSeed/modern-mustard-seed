/**
 * THE SCREEN, filmed off the real thing.
 *
 * Two segments, captured in ONE continuous session because they are one
 * continuous event in the product: the forge actually builds Whitaker Med Spa's
 * voice agent, and then that same forged agent takes a real booking on a real
 * web call. Nothing here is mocked, re-created, or sped up to flatter the
 * product; the only speed change is applied in the edit and is disclosed in the
 * cut sheet.
 *
 * RULES INHERITED FROM scripts/suite-film/record.mjs. All were paid for once
 * already, do not undo them:
 *
 *  1. RECORD AT THE EXACT VIEWPORT SIZE. Playwright's recordVideo NEVER
 *     upscales. Ask for a frame bigger than the viewport and you get the page
 *     in the top-left corner with grey padding around it. Record 1280x720 and
 *     upscale in ffmpeg with lanczos.
 *  2. KILL `scroll-behavior: smooth` BEFORE ANY SCROLL. MMS sets it globally
 *     in globals.css and it silently eats a per-frame scrollTo loop.
 *  3. PRE-SET THE CONSENT COOKIE. Never dismiss the banner on camera.
 *  4. THE TRIM IS TAIL-ANCHORED. Chromium's screencast starts a few hundred ms
 *     after the context does and the lead-in varies per run, so the END of the
 *     raw file is the only reliable landmark. Every mark this writes is
 *     therefore recorded as an offset from the END of the take.
 *  5. A CALL THAT CONNECTS IS NOT A CALL THAT WORKS. Krisp deafness produces
 *     calls that look live and transcribe zero caller turns. The call id is
 *     captured off POST /call/web and the transcript is asserted to contain
 *     user turns before this capture is allowed to count.
 *
 * ⚠️ THIS RUN HAS REAL SIDE EFFECTS ON PRODUCTION, by necessity, because a
 * staged forge would not be a real forge:
 *   - it burns the ONE-FORGE-PER-EMAIL claim on the address used, forever
 *   - it inserts a lead row into the real leads table
 *   - it emails Sarah a forge notification
 *   - it spends 11labs characters against the live line's allowance
 * The address is the established fictional demo subject (memory: hundredfold,
 * "the demo subject"), whose reserved .demo TLD is already blocked from ever
 * being mailed by mailable(). Report the lead row so it can be pruned.
 *
 * Usage:  node scripts/mustard-ad/capture.mjs [--take=1]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, renameSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const WORK = path.join(ROOT, '.mustard-ad');

const { chromium } = await import('playwright');
const { CALL_AUDIO_TAP } = await import(new URL('../suite-film/record.mjs', import.meta.url).href);
const { speak } = await import(new URL('../suite-film/tts.mjs', import.meta.url).href);

export const W = 1280;
export const H = 720;

const SITE = 'https://modernmustardseed.com';

/**
 * The demo subject, unchanged from the hundredfold film so the whole body of
 * material describes ONE fictional business rather than several. Invented
 * business, real machinery, and the film says so.
 */
const SUBJECT = {
  business: 'Whitaker Med Spa',
  vertical: 'beauty',
  ownerName: 'Dana',
  city: 'Kalispell, MT',
  services:
    'Facials, injectables, laser hair removal, and chemical peels. Consultations are free. Most treatments run forty five minutes to an hour. People always ask about downtime and whether we take walk ins (we do not, we book ahead).',
  hours: 'Tue-Sat 9-6',
  // ⚠️ ONE FORGE PER EMAIL, FOREVER (atomic pk claim in lib/demo-run-store).
  // A retake therefore CANNOT reuse the previous address, so the take number
  // rides in a plus-tag. Every take permanently burns one address and leaves
  // one lead row behind; both are listed in the run report so they can be
  // pruned.
  email: (t) => `dana+forge${t}@whitakermedspa.demo`,
};

/**
 * ⚠️ THE AGENT MUST BE FEMALE, and this is not a style preference.
 *
 * On the recorded call Mr. Mustard said "HER agent is live right now, wanna
 * hear HER take a booking?" He chose that pronoun himself. If the booking on
 * screen is then answered by a male voice, the ad contradicts its own
 * soundtrack four seconds after the line lands.
 */
const AGENT_GENDER = 'female';

/** The staged caller booking an appointment. Emma, so she is not Ava. */
const CALLER = { edge: 'en-US-EmmaMultilingualNeural', rate: '+0%', fal: { voice_id: 'Friendly_Person', speed: 1, vol: 1, pitch: 0 } };

const BOOKING_TURNS = [
  { after: 14_000, text: "Hi, I'd like to book a facial for next week if you have anything." },
  { after: 14_000, text: 'Thursday afternoon would be perfect.' },
  { after: 14_000, text: "It's Rachel Adler." },
  { after: 16_000, text: 'Four oh six, five five five, one four two.' },
  { after: 12_000, text: "That's right. Thank you." },
];

/**
 * ⚠️ THE LEAD-IN MUST CLEAR HIS ENTIRE OPENER, and take 1 is why.
 *
 * MEASURED: the fake-audio file starts playing when the CALL opens the
 * microphone, so file time and call time are the same clock. The forged
 * agent's opener is not a short greeting: it introduces itself to the owner,
 * breaks character, and invites her to test it, which runs ~14s from ~2s in.
 * At LEAD_MS 15s the customer's first line landed inside that speech, was
 * talked over, and never transcribed. Every later turn then answered the wrong
 * question and the booking read as nonsense.
 *
 * 22s clears his opener with margin and lands the first line exactly on his
 * "pretend you're a customer" invitation, which is the real product flow.
 */
const LEAD_MS = 22_000;

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}: ${err.slice(-400)}`))));
  });
}

function env(name) {
  const line = readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`no ${name} in .env.local`);
  return line.split('=')[1].trim().replace(/^"|"$/g, '');
}
const VAPI_KEY = env('VAPI_API_KEY');

async function buildCallerTrack(files, out) {
  const inputs = [];
  const filters = [];
  const labels = [];
  let at = LEAD_MS;
  files.forEach((f, i) => {
    inputs.push('-i', f.file);
    filters.push(`[${i}:a]aresample=16000,aformat=channel_layouts=mono,adelay=${at}[t${i}]`);
    labels.push(`[t${i}]`);
    at += f.durationMs + BOOKING_TURNS[i].after;
  });
  filters.push(`${labels.join('')}amix=inputs=${files.length}:duration=longest:normalize=0,volume=2.2[out]`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', out]);
  return at;
}

/** Rule 2 + 3, plus the cursor so a viewer can follow what is being clicked. */
const PREP = `
(() => {
  if (window.top !== window) return;
  try { document.cookie = 'mms_consent=denied; path=/; max-age=31536000; samesite=lax'; } catch {}
  try { localStorage.removeItem('mms_demo_agent_forge'); } catch {}
  const css = document.createElement('style');
  css.textContent = 'html,body,*{scroll-behavior:auto !important}';
  const add = () => document.documentElement.appendChild(css);
  if (document.readyState !== 'loading') add(); else addEventListener('DOMContentLoaded', add);
})();
`;

/* -------------------------------------------------------------------------- */

const take = Number((process.argv.find((a) => a.startsWith('--take=')) || '--take=1').split('=')[1]);
const workDir = path.join(WORK, 'capture', `take-${take}`);
rmSync(workDir, { recursive: true, force: true });
mkdirSync(path.join(workDir, 'turns'), { recursive: true });
const log = (m) => console.log(`[capture ${take}] ${m}`);

// ---- the staged customer's side of the booking -----------------------------
log('rendering the booking caller');
const turnFiles = [];
for (const [i, t] of BOOKING_TURNS.entries()) {
  const f = path.join(workDir, 'turns', `${String(i + 1).padStart(2, '0')}.mp3`);
  turnFiles.push(await speak(t.text, CALLER, f, { allowPaid: false }));
}
const callerWav = path.join(workDir, 'caller.wav');
const bookingMs = await buildCallerTrack(turnFiles, callerWav);
log(`booking caller track ${(bookingMs / 1000).toFixed(1)}s`);

// ---- the session -----------------------------------------------------------
const browser = await chromium.launch({
  headless: true,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${callerWav}%noloop`,
  ],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },          // rule 1: identical to recordVideo
  recordVideo: { dir: workDir, size: { width: W, height: H } },
  permissions: ['microphone'],
  deviceScaleFactor: 1,
});
await ctx.addInitScript(PREP);
await ctx.addInitScript(CALL_AUDIO_TAP);
const page = await ctx.newPage();
page.setDefaultTimeout(120_000);

let callId = null;
page.on('response', (res) => {
  if (/api\.vapi\.ai\/call\/web/.test(res.url()) && res.request().method() === 'POST') {
    res.json().then((j) => { if (j?.id) callId = j.id; }).catch(() => {});
  }
});

const t0 = Date.now();
/** Rule 4: every mark is stored as an offset measured back from the take's end. */
const marks = [];
const mark = (name) => { marks.push({ name, fromStart: (Date.now() - t0) / 1000 }); log(`mark ${name}`); };

log('opening the forge');
await page.goto(`${SITE}/voice-agents/forge`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// ---- SEGMENT A: the forge --------------------------------------------------
await page.locator('#sk-business').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
mark('form_start');

// Typed at a human pace so the capture reads as somebody filling in a form.
const type = async (sel, text) => {
  await page.locator(sel).click();
  await page.locator(sel).type(text, { delay: 28 });
  await page.waitForTimeout(220);
};
await type('#sk-business', SUBJECT.business);
await page.selectOption('#sk-vertical', SUBJECT.vertical);
await page.waitForTimeout(250);
await type('#sk-owner', SUBJECT.ownerName);
await type('#sk-city', SUBJECT.city);
await type('#sk-services', SUBJECT.services);
await type('#sk-hours', SUBJECT.hours);
await type('#sk-email', SUBJECT.email(take));
await page.waitForTimeout(600);

mark('forge_submit');
const forgeStarted = Date.now();
await page.getByRole('button', { name: /forge my voice agent/i }).click();

// The montage is theatre over a real server-side build. "Ready" is the stamped
// badge, which is the honest end of the forge: it is when the agent can talk.
await page.waitForSelector('.sk-stamp', { timeout: 180_000 });
const forgeSeconds = (Date.now() - forgeStarted) / 1000;
mark('forge_ready');
log(`⏱ REAL FORGE TIME: ${forgeSeconds.toFixed(1)}s`);

await page.waitForTimeout(1800);

// ---- SEGMENT B: the booking ------------------------------------------------
// Rule: he said "her agent". Pick the female voice before the call starts.
const femaleBtn = page.getByRole('radio', { name: /female voice/i }).first();
if (await femaleBtn.count()) {
  await femaleBtn.scrollIntoViewIfNeeded();
  await femaleBtn.click();
  log('agent voice set to female');
} else {
  log('WARNING could not find the female voice control; the agent may answer male');
}
await page.waitForTimeout(900);

const orb = page.getByRole('button', { name: /say hello|talk|call|speak|start/i }).first();
await orb.scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
mark('call_click');
await orb.click();

await page.waitForFunction(() => window.__mmsCall && window.__mmsCall.sources >= 2, null, { timeout: 90_000 });
await page.evaluate(() => window.__mmsCallRecStart());
mark('call_recording');
log('call live, recording both sides');

await page.waitForTimeout(bookingMs + 12_000);

const audioB64 = await page.evaluate(() => window.__mmsCallRecStop());
mark('call_end');
await page.waitForTimeout(1200);

// ---- close and land the files ----------------------------------------------
const video = page.video();
await ctx.close();
await browser.close();

const raw = await video.path();
const takeVideo = path.join(workDir, 'screen.webm');
if (existsSync(takeVideo)) rmSync(takeVideo);
renameSync(raw, takeVideo);

writeFileSync(path.join(workDir, 'call.webm'), Buffer.from(audioB64, 'base64'));
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(workDir, 'call.webm'), '-ac', '2', '-ar', '48000', path.join(workDir, 'call.wav')]);

// Rule 4: convert every mark to an offset from the END of the finished file.
const totalRaw = await new Promise((res, rej) => {
  const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', takeVideo], { windowsHide: true });
  let s = '';
  p.stdout.on('data', (d) => { s += d.toString(); });
  p.on('error', rej);
  p.on('close', () => res(Number(s.trim())));
});
const wall = (Date.now() - t0) / 1000;
const marksFromEnd = marks.map((m) => ({ ...m, fromEnd: Number((wall - m.fromStart).toFixed(2)) }));

// ---- prove the call worked --------------------------------------------------
/**
 * ⚠️ COUNT TURNS OFF artifact.messages, NOT off the flat transcript string.
 *
 * On take 1 the flat `transcript` field was still empty 20s after the call and
 * this reported "0 user turns, this booking is not usable" for a call that had
 * transcribed three of them perfectly. A verification that cries wolf is worse
 * than none: it nearly sent a good take to the bin. `artifact.messages` is
 * populated first and carries per-turn timings the edit needs anyway.
 */
/**
 * ⚠️ POLL FOR THE ARTIFACT, DO NOT SLEEP ONCE AND JUDGE.
 *
 * Take 2 was a flawless booking that this reported as unusable, because a
 * single 20s wait fetched the call before Vapi had finished writing
 * artifact.messages. Take 1 failed the same way for the same reason. A fixed
 * sleep turns a verification into a coin flip on someone else's queue, so it
 * polls until the messages land and only calls the take bad once they have.
 */
let transcript = null;
let messages = [];
if (callId) {
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const res = await fetch(`https://api.vapi.ai/call/${callId}`, { headers: { Authorization: `Bearer ${VAPI_KEY}` } });
    const j = await res.json();
    messages = ((j.artifact || {}).messages || []).filter((m) => m.role !== 'system');
    transcript = j.transcript || (j.artifact || {}).transcript || null;
    if (messages.length) break;
    log(`waiting for the call artifact (${(i + 1) * 10}s)`);
  }
  if (transcript) writeFileSync(path.join(workDir, 'transcript.txt'), transcript);
  writeFileSync(path.join(workDir, 'messages.json'), JSON.stringify(messages, null, 2));
}
const userTurns = messages.filter((m) => m.role === 'user').length;

writeFileSync(
  path.join(workDir, 'result.json'),
  JSON.stringify({ take, callId, userTurns, forgeSeconds, rawSeconds: totalRaw, wall, marks: marksFromEnd }, null, 2),
);

log(`raw take ${totalRaw.toFixed(1)}s | forge ${forgeSeconds.toFixed(1)}s | user turns ${userTurns}`);
if (userTurns < 3) log('WARNING the agent did not hear the customer; this booking is not usable');
for (const m of messages) {
  console.log(`[${(m.secondsFromStart ?? 0).toFixed(2)} +${((m.duration || 0) / 1000).toFixed(2)}] ${String(m.role).toUpperCase()}: ${m.message}`);
}
