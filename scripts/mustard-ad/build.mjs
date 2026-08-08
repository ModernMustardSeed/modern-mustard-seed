/**
 * THE CUT.
 *
 * Assembles the finished spot from four sources, none of which are performed
 * or re-created:
 *   her side   .mustard-ad/shots/*.mp4      infinitalk over a staged still, Ava
 *   his side   .mustard-ad/mustard/*.wav    cut from a REAL call to the live line
 *   the forge  .mustard-ad/capture/         a REAL forge, filmed as it ran
 *   the booking same capture                a REAL call, both sides, real audio
 *
 * ⚠️ THE PICTURE IS 16:9 AND HER FOOTAGE IS SQUARE. infinitalk returns 640x640,
 * so there is no crop of her that fills 1920x1080 without throwing away either
 * her face or the laptop that establishes what she is doing. Rather than
 * damage the shot, the frame is DESIGNED around it: her square take sits in a
 * bordered card on the left and Mr. Mustard occupies the right as a voice, a
 * mascot, and a waveform driven by his own audio. That layout also solves the
 * harder problem, which is that the ad's second character has no face and
 * cannot be shown any other way.
 *
 * ⚠️ HIS LINES RUN OVER THE SCREEN, NOT OVER A HELD FRAME. "Firing up the forge
 * right now" plays across the real forge starting, and "It's done, her agent is
 * live" plays across the badge actually stamping. That is not a trick of the
 * edit: it is when those things happened, and cutting it any other way would
 * have left six seconds of dead air in a sixty second ad.
 *
 * ⏱ THE TIMING CLAIM IS TRUE AND CONSERVATIVE. Measured on the filmed run, the
 * forge took 13.5s and 13.7s. He says "about forty seconds". The website is
 * never shown arriving during the call; he says it lands by email inside the
 * hour, which matches what /demos promises.
 *
 * Usage:  node scripts/mustard-ad/build.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const WORK = path.join(ROOT, '.mustard-ad');
const SEG = path.join(WORK, 'seg');
const OUT_MP4 = path.join(ROOT, 'public', 'video', 'hundredfold-ad.mp4');
const OUT_JPG = path.join(ROOT, 'public', 'video', 'hundredfold-ad.jpg');

const W = 1920;
const H = 1080;
const FPS = 25;

const CREAM = '#FBF6EA';
const INK = '#161616';
const GOLD = '#F5B700';
const RED = '#E0301E';

/** Her card, top-left. Everything else in the frame is positioned off these. */
const VID = { x: 132, y: 96, size: 840 };
/** The waveform slot inside Mr. Mustard's panel. */
const WAVE = { x: 1105, y: 596, w: 660, h: 132 };

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} failed: ${err.slice(-700)}`))));
  });
}

function secondsOf(file) {
  return new Promise((res, rej) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { windowsHide: true });
    let s = '';
    p.stdout.on('data', (d) => { s += d.toString(); });
    p.on('error', rej);
    p.on('close', () => {
      const n = Number(s.trim());
      if (!Number.isFinite(n) || n <= 0) rej(new Error(`could not measure ${file}`));
      else res(n);
    });
  });
}

/* -------------------------------------------------------------------------- */
/* The frame, rendered as HTML so it wears the same pop-art system as the site */
/* -------------------------------------------------------------------------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * ⚠️ `bg:false` IS LOAD-BEARING FOR THE SCREEN SEGMENTS.
 *
 * The chip that sits over the forge and the booking is composited ON TOP of the
 * capture. Rendered with the standard cream body it is a fully opaque
 * 1920x1080 image, so the first cut came out with both screen segments as blank
 * cream rectangles: the real forge and the real booking, the two things the ad
 * exists to show, were painted over by their own caption. The page must be
 * transparent AND the screenshot must be taken with omitBackground.
 */
const SHELL = (body, { bg = true } = {}) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{color:${INK};font-family:"DM Sans",system-ui,sans-serif;
       ${bg
         ? `background:${CREAM};background-image:radial-gradient(${INK}0F 1.1px, transparent 1.2px);background-size:14px 14px`
         : 'background:transparent'}}
  .mono{font-family:"JetBrains Mono",monospace;font-weight:700;text-transform:uppercase;letter-spacing:.3em}
</style></head><body>${body}</body></html>`;

/**
 * The call frame. The left card is drawn EMPTY: her video is overlaid into that
 * exact rectangle by ffmpeg, so the border and its hard shadow stay crisp
 * instead of being scaled with the footage.
 */
function callFrame({ caption, speaker }) {
  const heIsTalking = speaker === 'mustard';
  return SHELL(`
  <!-- her card: the hole the video drops into -->
  <div style="position:absolute;left:${VID.x}px;top:${VID.y}px;width:${VID.size}px;height:${VID.size}px;
              border:5px solid ${INK};background:${INK};box-shadow:14px 14px 0 0 ${GOLD}"></div>
  <div style="position:absolute;left:${VID.x}px;top:${VID.y + VID.size + 30}px;width:${VID.size}px;text-align:center">
    <span class="mono" style="font-size:16px;color:${INK};opacity:${heIsTalking ? 0.35 : 0.75}">The Caller</span>
  </div>

  <!-- Mr. Mustard: a voice on a phone, so he is drawn as one -->
  <div style="position:absolute;left:1080px;top:150px;width:712px;text-align:center">
    <p class="mono" style="font-size:15px;color:${RED};margin-bottom:26px">On the line</p>
    <div style="width:132px;height:132px;margin:0 auto 22px;border-radius:50%;border:5px solid ${INK};
                background:${GOLD};box-shadow:8px 8px 0 0 ${INK};display:flex;align-items:center;justify-content:center;
                font-family:'Playfair Display',serif;font-weight:900;font-size:62px;opacity:${heIsTalking ? 1 : 0.45}">M</div>
    <h2 style="font-family:'Playfair Display',serif;font-weight:900;font-size:52px;line-height:1;
               opacity:${heIsTalking ? 1 : 0.4}">Mr. Mustard</h2>
    <p class="mono" style="font-size:13px;opacity:${heIsTalking ? 0.6 : 0.3};margin-top:12px">Modern Mustard Seed</p>
    <div style="width:78px;height:6px;background:${GOLD};border:3px solid ${INK};border-radius:99px;margin:26px auto 0"></div>
  </div>

  <!-- The waveform slot. When SHE is speaking nothing is drawn into it by
       ffmpeg, so a resting line lives here; without it the whole right column
       reads as an empty page for half the ad. -->
  <div style="position:absolute;left:${WAVE.x}px;top:${WAVE.y + WAVE.h / 2 - 2}px;width:${WAVE.w}px;height:4px;
              background:${INK};opacity:${heIsTalking ? 0 : 0.16};border-radius:99px"></div>

  <!-- caption, always the words being spoken right now -->
  <div style="position:absolute;left:1040px;top:${WAVE.y + WAVE.h + 26}px;width:800px">
    <p style="font-family:'Playfair Display',serif;font-weight:700;font-size:${caption.length > 110 ? 33 : 39}px;
              line-height:1.32;color:${INK};text-align:center">${esc(caption)}</p>
  </div>`);
}

/** A chip that keeps the call present while the picture is on the product. */
function screenChip(caption) {
  return SHELL(`
  <div style="position:absolute;left:64px;bottom:60px;display:flex;align-items:center;gap:18px;
              background:${CREAM};border:5px solid ${INK};box-shadow:10px 10px 0 0 ${GOLD};padding:18px 30px;max-width:1500px">
    <div style="width:52px;height:52px;border-radius:50%;border:4px solid ${INK};background:${GOLD};flex:0 0 auto;
                display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-weight:900;font-size:26px">M</div>
    <p style="font-family:'Playfair Display',serif;font-weight:700;font-size:34px;line-height:1.25">${esc(caption)}</p>
  </div>`, { bg: false });
}

function endCard() {
  return SHELL(`
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <p class="mono" style="font-size:17px;color:${RED};margin-bottom:34px">A real call to a real agent</p>
    <h1 style="font-family:'Playfair Display',serif;font-weight:900;font-size:104px;line-height:1.02">Modern Mustard Seed</h1>
    <div style="width:96px;height:7px;background:${GOLD};border:3px solid ${INK};border-radius:99px;margin:38px auto"></div>
    <p style="font-size:44px;font-weight:500">modernmustardseed.com</p>
    <p class="mono" style="font-size:15px;opacity:.65;margin-top:30px">Free voice agent and website demo &middot; No card</p>
  </div>`);
}

async function renderPngs(pages) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.setContent(p.html, { waitUntil: 'load' });
    // Webfonts must be resolved before the shot or Playfair falls back to a
    // serif that is visibly not the brand.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(320);
    await page.screenshot({ path: p.file, type: 'png', omitBackground: p.transparent === true });
  }
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* The timeline                                                                */
/* -------------------------------------------------------------------------- */

const shots = path.join(WORK, 'shots');
const mus = path.join(WORK, 'mustard');
const cap = path.join(WORK, 'capture', 'take-2');
const capResult = JSON.parse(readFileSync(path.join(cap, 'result.json'), 'utf8'));

/**
 * Rule 4 from the camera: marks were taken on wall-clock, but the screencast
 * starts a little after the context does. The offset is the difference between
 * the finished file and the wall time, applied once here.
 */
const SCREEN_OFFSET = capResult.rawSeconds - capResult.wall;
const markAt = (name) => {
  const m = capResult.marks.find((x) => x.name === name);
  if (!m) throw new Error(`no mark ${name}`);
  return m.fromStart + SCREEN_OFFSET;
};

/**
 * The booking audio was tapped from the browser starting at `call_recording`,
 * so its clock and the screen's clock are offset by exactly that mark. Spans
 * below are in BOOKING-AUDIO time, measured off the recording's own energy
 * (see the align pass), and converted to screen time here.
 */
const BOOK_T0 = markAt('call_recording');
const BOOKING = { from: 38.9, to: 48.9 };   // "Thursday afternoon" -> "...confirm the appointment?"

mkdirSync(SEG, { recursive: true });
mkdirSync(path.join(WORK, 'png'), { recursive: true });
mkdirSync(path.dirname(OUT_MP4), { recursive: true });

const M = (id) => path.join(mus, `${id}.wav`);

/**
 * Each entry becomes one segment file. `kind` picks how it is rendered:
 *   her     her square take in the call frame, her own audio
 *   him     a held listening frame in the call frame, HIS audio, live waveform
 *   screen  the real capture, full bleed, with a caption chip
 *   card    the end card
 */
const TIMELINE = [
  { kind: 'her', id: 's1', video: path.join(shots, 'shot1.mp4'),
    caption: 'Hi, is this Mr. Mustard? A friend gave me this number.' },

  { kind: 'him', id: 'm1', audio: M('m1'), still: path.join(shots, 'shot1.mp4'),
    caption: "We can fix both of those. What's the business called?" },

  { kind: 'her', id: 's2', video: path.join(shots, 'shot2.mp4'),
    caption: 'Whitaker Med Spa.' },

  // His two forge lines run OVER the real forge starting. This is when it happened.
  { kind: 'screen', id: 'forge', audio: [M('m2a'), M('m2b')],
    from: markAt('forge_submit') + 0.4, pad: 0.9, speed: 2.1,
    caption: 'Alright. Firing up the forge right now.' },

  /**
   * ...and "it's done, HER agent is live" runs over the graduated agent.
   *
   * ⚠️ THIS WINDOW STARTS AFTER THE VOICE IS PICKED, and that is not an
   * aesthetic choice. The page carries a FEMALE VOICE / MALE VOICE toggle that
   * sits on male until it is switched. Cutting this beat at forge_ready put
   * "MALE VOICE" on screen, highlighted, underneath a line where he calls the
   * agent "her". The booking that follows genuinely used Clara, so the only
   * wrong thing in the frame was the frame.
   */
  { kind: 'screen', id: 'ready', audio: [M('m3')],
    from: markAt('call_click') - 2.6, pad: 0.8, speed: 1.0,
    caption: "It's done. Her agent is live right now." },

  { kind: 'screen', id: 'booking', audioFile: path.join(cap, 'call.wav'),
    audioFrom: BOOKING.from, audioTo: BOOKING.to,
    from: BOOK_T0 + BOOKING.from, speed: 1.0,
    caption: 'Her new agent, taking a real booking.' },

  { kind: 'her', id: 's4', video: path.join(shots, 'shot4.mp4'),
    caption: 'Wait. That was forty seconds. So what does something like this cost me?' },

  { kind: 'him', id: 'm4', audio: M('m4'), still: path.join(shots, 'shot4.mp4'),
    caption: 'Nothing. Free. No credit card, no sales call. The website takes a bit longer. It will be in your inbox inside the hour.' },

  { kind: 'her', id: 's5', video: path.join(shots, 'shot5.mp4'),
    caption: "What's the catch?" },

  { kind: 'him', id: 'm5', audio: M('m5'), still: path.join(shots, 'shot5.mp4'),
    caption: "You're gonna like them." },

  { kind: 'card', id: 'end', seconds: 3.8 },
];

/* ---- 1. every still the cut needs ----------------------------------------- */
console.log('rendering frames');
const pages = [];
for (const t of TIMELINE) {
  const file = path.join(WORK, 'png', `${t.id}.png`);
  t.png = file;
  if (t.kind === 'card') pages.push({ file, html: endCard() });
  else if (t.kind === 'screen') pages.push({ file, html: screenChip(t.caption), transparent: true });
  else pages.push({ file, html: callFrame({ caption: t.caption, speaker: t.kind === 'him' ? 'mustard' : 'caller' }) });
}
await renderPngs(pages);

/* ---- 2. the listening frames ---------------------------------------------- */
// While he talks she is listening, so the frame under his line is the last
// frame of the take where she just finished speaking. A very slow push keeps
// it alive; the waveform beside her is doing the real moving.
for (const t of TIMELINE.filter((x) => x.kind === 'him')) {
  t.stillPng = path.join(WORK, 'png', `${t.id}-still.png`);
  const d = await secondsOf(t.still);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, d - 0.12)), '-i', t.still, '-frames:v', '1', t.stillPng]);
}

/* ---- 3. build each segment ------------------------------------------------ */
console.log('building segments');
const segFiles = [];

for (const t of TIMELINE) {
  const out = path.join(SEG, `${t.id}.mp4`);

  if (t.kind === 'her') {
    const dur = await secondsOf(t.video);
    await run('ffmpeg', ['-y', '-loglevel', 'error',
      '-loop', '1', '-framerate', String(FPS), '-i', t.png,
      '-i', t.video,
      '-filter_complex',
      `[1:v]scale=${VID.size}:${VID.size}:flags=lanczos,fps=${FPS}[v];` +
      `[0:v][v]overlay=${VID.x}:${VID.y}:shortest=1,format=yuv420p[out];` +
      `[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
      '-map', '[out]', '-map', '[a]', '-t', String(dur),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out]);
    segFiles.push(out);
    console.log(`  ${t.id.padEnd(8)} her     ${dur.toFixed(2)}s`);
    continue;
  }

  if (t.kind === 'him') {
    const dur = (await secondsOf(t.audio)) + 0.22;
    // A 1.5% push over the beat: perceptible as life, never as a zoom.
    await run('ffmpeg', ['-y', '-loglevel', 'error',
      '-loop', '1', '-framerate', String(FPS), '-i', t.png,
      '-loop', '1', '-framerate', String(FPS), '-i', t.stillPng,
      '-i', t.audio,
      '-filter_complex',
      `[1:v]scale=${Math.round(VID.size * 1.06)}:${Math.round(VID.size * 1.06)}:flags=lanczos,` +
      `zoompan=z='min(zoom+0.00035,1.06)':d=${Math.round(dur * FPS)}:s=${VID.size}x${VID.size}:fps=${FPS}[v];` +
      `[0:v][v]overlay=${VID.x}:${VID.y}[base];` +
      /**
       * The waveform is SPLIT off the audio and amplified for the picture only.
       * A phone-band voice at broadcast loudness still draws a hairline through
       * showwaves: sqrt scaling alone was not enough to read at a glance, and
       * p2p fills between peaks instead of tracing a single line. The gain rides
       * on the visual branch, so the sound that ships is untouched.
       */
      `[2:a]asplit=2[aw][ao];` +
      `[aw]volume=3.2,showwaves=s=${WAVE.w}x${WAVE.h}:mode=p2p:scale=sqrt:colors=0x161616:rate=${FPS},` +
      `format=rgba,colorchannelmixer=aa=0.9[w];` +
      `[base][w]overlay=${WAVE.x}:${WAVE.y}:shortest=1,format=yuv420p[out];` +
      `[ao]aresample=48000,apad=pad_dur=0.22[a]`,
      '-map', '[out]', '-map', '[a]', '-t', String(dur),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out]);
    segFiles.push(out);
    console.log(`  ${t.id.padEnd(8)} mustard ${dur.toFixed(2)}s`);
    continue;
  }

  if (t.kind === 'screen') {
    const screen = path.join(cap, 'screen.webm');
    let audioIn;
    let dur;

    if (t.audioFile) {
      audioIn = path.join(SEG, `${t.id}-a.wav`);
      dur = t.audioTo - t.audioFrom;
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t.audioFrom), '-t', String(dur),
        '-i', t.audioFile, '-af', 'highpass=f=90,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', audioIn]);
    } else {
      // Two of his lines back to back with a natural beat between them.
      audioIn = path.join(SEG, `${t.id}-a.wav`);
      const list = t.audio;
      const inputs = list.flatMap((f) => ['-i', f]);
      const filt = list.map((_, i) => `[${i}:a]aresample=48000[x${i}]`).join(';') +
        `;${list.map((_, i) => `[x${i}]`).join('')}concat=n=${list.length}:v=0:a=1[c];[c]apad=pad_dur=${t.pad}[a]`;
      await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filt, '-map', '[a]', '-ar', '48000', '-ac', '1', audioIn]);
      dur = await secondsOf(audioIn);
    }

    const speed = t.speed || 1;
    const srcDur = dur * speed;
    await run('ffmpeg', ['-y', '-loglevel', 'error',
      '-ss', String(t.from), '-t', String(srcDur), '-i', screen,
      '-loop', '1', '-framerate', String(FPS), '-i', t.png,
      '-i', audioIn,
      '-filter_complex',
      `[0:v]setpts=PTS/${speed},fps=${FPS},scale=${W}:${H}:flags=lanczos[s];` +
      `[s][1:v]overlay=0:0:shortest=1,format=yuv420p[out]`,
      '-map', '[out]', '-map', '2:a', '-t', String(dur),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out]);
    segFiles.push(out);
    console.log(`  ${t.id.padEnd(8)} screen  ${dur.toFixed(2)}s (x${speed} from ${t.from.toFixed(1)}s)`);
    continue;
  }

  // the end card
  await run('ffmpeg', ['-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', String(FPS), '-i', t.png,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-t', String(t.seconds), '-vf', 'format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out]);
  segFiles.push(out);
  console.log(`  ${t.id.padEnd(8)} card    ${t.seconds}s`);
}

/* ---- 4. concat ------------------------------------------------------------ */
console.log('concatenating');
const listFile = path.join(SEG, 'list.txt');
writeFileSync(listFile, segFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-r', String(FPS), '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT_MP4]);

/* ---- 5. poster ------------------------------------------------------------ */
// From her opening shot, which is the frame that says what the ad is. The
// exact second matters: a poster is a still of a person mid-sentence unless it
// is chosen, and 3.2s caught her mid-word with her eyes closed. 7.2s is the
// beat where she is composed and smiling.
await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '7.2', '-i', OUT_MP4, '-frames:v', '1', '-q:v', '3', OUT_JPG]);

const final = await secondsOf(OUT_MP4);
console.log(`\nhundredfold-ad.mp4  ${final.toFixed(2)}s`);
console.log(`poster              ${OUT_JPG}`);
