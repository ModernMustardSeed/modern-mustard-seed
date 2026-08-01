/**
 * THE CAMERA.
 *
 * Drives the lead's REAL forged surfaces in Chromium and records one
 * continuous take: their website, a live call to their own voice agent, and
 * their command center, book-ended by the pop-art cards. Nothing here is
 * mocked or re-created; what lands in the file is the suite behaving exactly
 * as the prospect will experience it.
 *
 * Three things this learned from the scripts that came before it. Do not undo
 * them:
 *
 *  1. THE TRIM IS ANCHORED TO THE END OF THE RAW FILE, not to context
 *     creation. Chromium's screencast starts several hundred ms after the
 *     context does, so a start-anchored trim drifts and every narration line
 *     lands late. The score finishes immediately before close, so the tail is
 *     the reliable landmark (learned on scripts/record-wildmere-scroll.mjs).
 *
 *  2. EACH BEAT IS HELD FOR EXACTLY AS LONG AS ITS NARRATION TAKES TO SAY.
 *     fal hands back duration_ms per line, so the picture is cut to the voice
 *     rather than the voice being squeezed into the picture. That is the only
 *     reason this needs no editing pass.
 *
 *  3. A CALL THAT CONNECTS IS NOT A CALL THAT WORKS. Krisp deafness and the
 *     Daily teardown race both produce calls that look live and transcribe
 *     zero caller turns (see memory: debugging_vapi_web_voice). So the call
 *     id is captured off POST /call/web and the transcript is asserted to
 *     contain User turns before this film is allowed to exist. A film of an
 *     agent ignoring a customer is worse than no film.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';

const W = 1600;
const H = 900;

/** Drawn over the top document so the viewer can follow what is being clicked. */
const CURSOR_AND_TAPS = `
(() => {
  if (window.top !== window) return;
  try { localStorage.setItem('mms_demo_intro', 'seen'); } catch {}
  try { document.cookie = 'mms_consent=denied; path=/; max-age=31536000; samesite=lax'; } catch {}
  const make = () => {
    if (document.getElementById('__mmscur')) return;
    const d = document.createElement('div');
    d.id = '__mmscur';
    d.style.cssText = 'position:fixed;left:-50px;top:-50px;width:26px;height:26px;border-radius:50%;' +
      'background:rgba(245,183,0,.95);border:3px solid #161616;box-shadow:0 3px 14px rgba(22,22,22,.45);' +
      'pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);transition:width .12s,height .12s';
    document.documentElement.appendChild(d);
    addEventListener('mousemove', (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { d.style.width = '36px'; d.style.height = '36px'; }, true);
    addEventListener('mouseup', () => { d.style.width = '26px'; d.style.height = '26px'; }, true);
  };
  if (document.readyState !== 'loading') make(); else addEventListener('DOMContentLoaded', make);
})();
`;

/**
 * Capture BOTH sides of the web call as one audio stream.
 *
 * The remote (agent) side arrives as a WebRTC track, so RTCPeerConnection is
 * wrapped to collect it. The caller side is the fake-mic file Chromium is
 * playing, grabbed by wrapping getUserMedia. Recording them together means the
 * film carries exactly what a person on that call would have heard, with both
 * halves already in sync, instead of two files to line up afterwards.
 *
 * ⚠️ THE MIX GOES THROUGH WEB AUDIO, NOT A BARE MediaStream. Putting a remote
 * WebRTC track into `new MediaStream([track])` and handing that to
 * MediaRecorder records DIGITAL SILENCE in Chrome, while the local mic track in
 * the same stream records fine. The first working cut shipped that way: 27.8
 * seconds of nothing where the agent's greeting should have been, then the
 * caller audible, then nothing again where the agent answered. A film of a
 * voice agent that never speaks is worse than no film, and it looks like a
 * content problem rather than a plumbing one, so it is easy to miss.
 *
 * An AudioContext MediaStreamSource genuinely pulls samples off a remote track,
 * so every stream is routed through one into a MediaStreamDestination and THAT
 * is what gets recorded. The muted <audio> element is belt and braces: it keeps
 * the track from being treated as unconsumed.
 */
const CALL_AUDIO_TAP = `
(() => {
  if (window.top !== window) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ac = new AC();
  const dest = ac.createMediaStreamDestination();
  window.__mmsCall = { sources: 0, started: false };
  const seen = new WeakSet();

  const attach = (stream) => {
    if (!stream || seen.has(stream) || !stream.getAudioTracks().length) return;
    seen.add(stream);
    try {
      ac.createMediaStreamSource(stream).connect(dest);
      window.__mmsCall.sources++;
    } catch {}
    try {
      const a = new Audio();
      a.srcObject = stream;
      a.muted = true;
      a.play().catch(() => {});
    } catch {}
  };

  const NativePC = window.RTCPeerConnection;
  if (NativePC) {
    const Wrapped = function (...args) {
      const pc = new NativePC(...args);
      pc.addEventListener('track', (e) => {
        attach(e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]));
      });
      return pc;
    };
    Wrapped.prototype = NativePC.prototype;
    window.RTCPeerConnection = Wrapped;
  }

  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const native = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => {
      const s = await native(c);
      attach(s);
      return s;
    };
  }

  const chunks = [];
  let rec = null;
  // Started by the driver once a remote source has actually landed: recording
  // from the click would capture the connect sequence as dead air.
  window.__mmsCallRecStart = () => {
    if (rec || window.__mmsCall.sources < 2) return false;
    try { ac.resume(); } catch {}
    rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' });
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.start(250);
    window.__mmsCall.started = true;
    return true;
  };
  window.__mmsCallRecStop = () => new Promise((res) => {
    if (!rec || rec.state === 'inactive') return res(null);
    rec.onstop = async () => {
      const buf = await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer();
      const u = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      res(btoa(s));
    };
    rec.stop();
  });
})();
`;

/**
 * Ease a scroll inside a document. Passed to frame.evaluate as a real function
 * rather than a string: a forged site may carry a CSP, and an eval'd helper
 * would die inside exactly the pages this exists to film.
 */
const smoothScroll = ([by, dur]) =>
  new Promise((res) => {
    const el = document.scrollingElement || document.documentElement;
    const start = el.scrollTop;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      el.scrollTop = start + by * e;
      if (p < 1) requestAnimationFrame(step);
      else res();
    };
    requestAnimationFrame(step);
  });

/**
 * Roll the whole film.
 *
 * @returns {Promise<{raw:string, scoreMs:number, callAudioB64:string|null,
 *                    callAudioOffsetMs:number|null, callId:string|null,
 *                    posterAtMs:number, beats:Array}>}
 */
export async function record({ workDir, siteUrl, osUrl, cards, beats, callerWav, callerMs, log = () => {} }) {
  const rawDir = path.join(workDir, 'raw');
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const openFile = path.join(workDir, 'card-open.html');
  const closeFile = path.join(workDir, 'card-close.html');
  writeFileSync(openFile, cards.open);
  writeFileSync(closeFile, cards.close);

  const args = [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--hide-scrollbars',
  ];
  // %noloop matters: without it the caller's lines repeat under the agent for
  // the rest of the call and the film sounds like a stuck record.
  if (callerWav) args.push(`--use-file-for-fake-audio-capture=${callerWav}%noloop`);

  const browser = await chromium.launch({ headless: true, args });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: rawDir, size: { width: W, height: H } },
    permissions: ['microphone'],
    reducedMotion: 'no-preference',
    colorScheme: 'light',
  });
  await ctx.addInitScript(CURSOR_AND_TAPS);
  await ctx.addInitScript(CALL_AUDIO_TAP);

  // Pre-dismiss the command center's welcome tour. It is a modal that opens on
  // first visit, drives its OWN tab changes, and sits over the board: the first
  // cut spent the entire command-center section filming a dialog box with a
  // NEXT button while every tab click landed behind it. The component reads
  // this key once on mount (components/demo/OsDemoApp.tsx), so writing it in an
  // init script is enough. A real prospect still gets the tour; only the camera
  // skips it, because the narrator is already doing that job.
  const osId = (osUrl || '').match(/\/demo\/os\/([0-9a-f-]{36})/i)?.[1];
  if (osId) await ctx.addInitScript(`try { localStorage.setItem('demoos:toured:${osId}', '1'); } catch {}`);

  const page = await ctx.newPage();
  page.setDefaultTimeout(90_000);

  // The Vapi call id, so the transcript can be checked afterwards. Without it
  // there is no way to prove the agent actually heard the caller.
  let callId = null;
  page.on('response', (res) => {
    if (/api\.vapi\.ai\/call\/web/.test(res.url()) && res.request().method() === 'POST') {
      res.json().then((j) => { if (j?.id) callId = j.id; }).catch(() => {});
    }
  });

  let callAudioB64 = null;
  let callAudioOffsetMs = null;
  let posterAtMs = 0;
  let t0 = 0;
  const at = () => Date.now() - t0;
  const timeline = [];

  const glide = async (x, y, ms = 620) => page.mouse.move(x, y, { steps: Math.max(14, Math.round(ms / 16)) });
  const hold = async (ms) => { if (ms > 0) await page.waitForTimeout(ms); };

  /** Hold this beat until its narration would have finished. */
  const holdBeat = async (beat, startedAt) => {
    const want = beat.voMs || 2600;
    const spent = Date.now() - startedAt;
    await hold(Math.max(250, want - spent));
  };

  try {
    /* ------------------------------- open card ------------------------------ */
    await page.goto(`file:///${openFile.replace(/\\/g, '/')}`, { waitUntil: 'load' });
    // Give the webfonts a beat: a card that swaps typeface mid-fade looks broken.
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(400);

    t0 = Date.now();
    await page.evaluate(() => document.body.classList.add('go'));

    let where = 'card';
    for (const beat of beats) {
      const startedAt = Date.now();
      const beatAt = at();

      if (beat.kind === 'card') {
        if (beat.card === 'close') {
          await page.goto(`file:///${closeFile.replace(/\\/g, '/')}`, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts?.ready).catch(() => {});
          await page.evaluate(() => document.body.classList.add('go'));
          where = 'card';
        }
        await holdBeat(beat, startedAt);
      } else if (beat.kind === 'site' || beat.kind === 'call') {
        if (where !== 'site') {
          await page.goto(siteUrl, { waitUntil: 'domcontentloaded' });
          // The forged page paints its hero and runs its entrance; walking in
          // on a half-drawn site is the one thing that makes a real build look
          // like a broken one.
          await page.waitForTimeout(2600);
          where = 'site';
          posterAtMs = posterAtMs || at() + 900;
        }

        if (beat.kind === 'call') {
          const r = await stageTheCall({ page, glide, callerMs, at, log });
          callAudioB64 = r.audioB64;
          callAudioOffsetMs = r.offsetMs;
          beat.voMs = r.durationMs; // the call IS the audio for this beat
        } else if (beat.scroll) {
          const frame = page.frames().find((f) => /\/demo\/site\/.+\/raw/.test(f.url())) || page.mainFrame();
          const dur = Math.max(1400, (beat.voMs || 3000) - 900);
          await frame.evaluate(smoothScroll, [beat.scroll, dur]).catch(() => {});
          await holdBeat(beat, startedAt);
        } else {
          await holdBeat(beat, startedAt);
        }
      } else if (beat.kind === 'os') {
        if (where !== 'os') {
          await page.goto(osUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2200);
          where = 'os';
        }
        // Two ways in, on purpose. The data hook is exact, but the film is shot
        // against PRODUCTION, which may not have shipped it yet: the first cut
        // silently found nothing and filmed the Today tab for the whole
        // command-center section. The label fallback keeps the tour working on
        // any deployed build, and a miss is now loud instead of invisible.
        let tab = page.locator(`[data-os-tab="${beat.tab}"]`).first();
        if (!(await tab.count())) {
          tab = page.locator('nav button').filter({ hasText: new RegExp(`^\\s*${beat.label}\\s*$`, 'i') }).first();
        }
        if (await tab.count()) {
          const box = await tab.boundingBox().catch(() => null);
          if (box) await glide(box.x + box.width / 2, box.y + box.height / 2, 460);
          await tab.click({ timeout: 6000 }).catch(() => {});
          // Let the board settle, then drift the pointer into the content so
          // the frame is not a cursor parked on a menu for four seconds.
          await page.waitForTimeout(500);
          await glide(W * 0.62, H * 0.5, 900);
        } else {
          log(`  ! no "${beat.label}" tab found; that beat is narrating over the previous board`);
        }
        await holdBeat(beat, startedAt);
      }

      timeline.push({ id: beat.id, atMs: beatAt, voMs: beat.voMs || 0 });
      log(`  [${(beatAt / 1000).toFixed(1)}s] ${beat.id}`);
    }

    const scoreMs = at();
    // Close immediately: the trim is tail-anchored, so any dawdling here shows
    // up as dead air at the end of every film.
    await ctx.close();
    await browser.close();

    const file = readdirSync(rawDir).find((f) => f.endsWith('.webm'));
    if (!file) throw new Error('Chromium produced no video file');
    const raw = path.join(rawDir, 'take.webm');
    renameSync(path.join(rawDir, file), raw);

    return { raw, scoreMs, callAudioB64, callAudioOffsetMs, callId, posterAtMs, beats: timeline };
  } catch (err) {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
    throw err;
  }
}

/**
 * Make the call, on camera.
 *
 * The pill is clicked like a person would click it, the caller's questions
 * arrive from the fake microphone, and the agent's answers are captured off
 * the WebRTC track. Held for as long as the caller file runs plus a tail, so
 * the agent gets to finish its last sentence before the hang-up.
 */
async function stageTheCall({ page, glide, callerMs, at, log }) {
  const pill = page.getByRole('button', { name: /talk to this website|call again/i }).first();
  await pill.waitFor({ state: 'visible', timeout: 20_000 });
  const box = await pill.boundingBox();
  if (box) await glide(box.x + box.width / 2, box.y + box.height / 2, 700);
  const started = Date.now();
  await pill.click();

  // "Live" appears on call-start. If it never does, the film has nothing to
  // show and should fail rather than cut to a dead corner.
  await page.getByText(/^Live ·/).first().waitFor({ state: 'visible', timeout: 45_000 });
  log(`  [${(at() / 1000).toFixed(1)}s] call live`);

  // Wait for BOTH sides (mic + remote) before rolling: recording early captures
  // the caller talking to nobody, and recording with only the mic attached is
  // how the agent went missing from the first cut.
  const offsetMs = await (async () => {
    const deadline = Date.now() + 15_000;
    for (;;) {
      const ok = await page.evaluate(() => window.__mmsCallRecStart?.() ?? false);
      if (ok) return at();
      if (Date.now() > deadline) {
        const n = await page.evaluate(() => window.__mmsCall?.sources ?? -1);
        throw new Error(`only ${n} audio source(s) attached; the agent never got a voice path into the recording`);
      }
      await page.waitForTimeout(250);
    }
  })();

  // Run the call for the whole caller file plus a tail long enough for the
  // agent to finish its last answer and take the booking.
  //
  // Anchored to the CLICK, not to the connect, because Chromium starts playing
  // the fake microphone file when the page opens the mic, which happens at the
  // top of Vapi's connect sequence. The file's own clock and this window are
  // therefore the same clock; anchoring to "live" instead would cut the tail
  // by however long the connect took.
  const runMs = (callerMs || 45_000) + 12_000;
  await page.waitForTimeout(Math.max(0, runMs - (Date.now() - started)));

  const audioB64 = await page.evaluate(() => window.__mmsCallRecStop?.());

  const hangup = page.getByRole('button', { name: /hang up/i }).first();
  if (await hangup.count()) {
    const hb = await hangup.boundingBox().catch(() => null);
    if (hb) await glide(hb.x + hb.width / 2, hb.y + hb.height / 2, 420);
    await hangup.click().catch(() => {});
  }
  await page.waitForTimeout(900);

  return { audioB64, offsetMs, durationMs: Date.now() - started };
}
