/**
 * Records the Wildmere Honey Co. scroll film used in the /websites hero.
 *
 * Drives the REAL production site (wildmere.vercel.app) in Chromium and
 * scrolls it by dispatching wheel events, so Lenis + GSAP ScrollTrigger run
 * their actual easing, scrubs, and reveals. Nothing here fakes the motion:
 * what lands in the file is the site behaving exactly as a visitor sees it.
 *
 * Then encodes to public/video/wildmere-scroll.mp4 with a seamless loop
 * crossfade (tail dissolved back into the head) and pulls a poster frame.
 *
 * Two things this script learned the hard way, do not undo them:
 *  1. The whole scroll score runs inside ONE page.evaluate. The dipper's
 *     WebGL plus GSAP plus the screencast saturate the main thread, so every
 *     evaluate roundtrip stalls ~1.5s and injects a dead hold into the film.
 *     Per-step roundtrips stretched an 18s take to 27s and pushed the closing
 *     scene off the end of the trim.
 *  2. The trim is anchored to the END of the raw file, not to context
 *     creation. The screencast starts ~0.8s after the context does, so a
 *     start-anchored trim drifts. The score finishes just before close, so
 *     the tail is the reliable landmark.
 *
 * Usage:  node scripts/record-wildmere-scroll.mjs
 * Env:    WILDMERE_URL (default https://wildmere.vercel.app)
 *         KEEP_RAW=1 to leave the intermediate webm in .video-work/
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const URL_TARGET = process.env.WILDMERE_URL || 'https://wildmere.vercel.app';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WORK = path.join(ROOT, '.video-work');
const OUT_MP4 = path.join(ROOT, 'public', 'video', 'wildmere-scroll.mp4');
const OUT_POSTER = path.join(ROOT, 'public', 'video', 'wildmere-scroll-poster.jpg');

// 16:10 to match the browser-chrome frame the film sits inside on /websites.
const W = 1600;
const H = 1000;
const FPS = 25; // what the screencast actually delivers; resampling adds judder
const FADE = 0.8; // loop crossfade, seconds
const TAIL_PAD = 0.3; // beat held after the score before the page closes

/**
 * The score. Every beat is a section of the film, in the order the site
 * tells its own story: the type, the pour, the numbers, the shelf, the
 * keeper, and the booking form that proves the thing actually works.
 */
const SCORE = [
  { sel: null, scroll: 0, hold: 2200, note: 'WILDMERE in outline type, the dipper drizzling' },
  { sel: '.story', scroll: 2200, hold: 700, note: 'the honey spine pours down the page' },
  { sel: '.stats', scroll: 1900, hold: 1500, note: 'the numbers count themselves up' },
  { sel: '.shelf', scroll: 2000, hold: 1700, note: 'four jars under the drip edge' },
  { sel: '.keeper', scroll: 1900, hold: 1100, note: 'June in the meadow, the letter' },
  { sel: '.visit', scroll: 1900, hold: 1500, note: 'book a hive tour, the working end' },
];
const SCORE_MS = SCORE.reduce((n, s) => n + s.scroll + s.hold, 0);

mkdirSync(WORK, { recursive: true });

const run = (cmd, args) =>
  new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}\n${err.slice(-2500)}`))));
  });

const probeDuration = (file) =>
  new Promise((res, rej) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (c) => (c === 0 ? res(Number(out.trim())) : rej(new Error('ffprobe failed'))));
  });

/** Where the black gate lifts, i.e. the exact first frame of the take. */
const probeGateEnd = (file) =>
  new Promise((res) => {
    const p = spawn('ffmpeg', ['-i', file, '-vf', 'blackdetect=d=0.2:pic_th=0.98:pix_th=0.10', '-an', '-f', 'null', '-']);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', () => {
      // Only the opening gate counts; the film itself never goes black.
      const m = /black_start:(\d+(?:\.\d+)?)\s+black_end:(\d+(?:\.\d+)?)/.exec(err);
      res(m && Number(m[1]) < 1 ? Number(m[2]) : null);
    });
  });

const browser = await chromium.launch({
  args: [
    // The hero dipper is WebGL. Let Chrome use the real GPU: forcing
    // SwiftShader put the rasteriser on the CPU, starved requestAnimationFrame,
    // and stretched an 18s score to 26s with the holds landing wherever.
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--disable-frame-rate-limit',
    '--disable-gpu-vsync',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference', // never let the CI default flatten the choreography
  recordVideo: { dir: WORK, size: { width: W, height: H } },
});

const page = await context.newPage();

await page.addInitScript(() => {
  // The site can narrate itself; the film is silent, so keep the tour mute.
  try {
    window.speechSynthesis.speak = () => {};
    window.speechSynthesis.cancel = () => {};
  } catch {}

  const style = document.createElement('style');
  style.textContent = `::-webkit-scrollbar { display: none; } html { scrollbar-width: none; }`;
  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    // The clapperboard. Everything before the take (page load, font swap,
    // the driver probe) happens behind an opaque black gate, and the score
    // lifts it on its first line. ffmpeg's blackdetect then reports exactly
    // where the take begins, so the trim never depends on guessing how far
    // the screencast clock has drifted from the wall clock.
    const gate = document.createElement('div');
    gate.id = '__filmgate';
    gate.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:2147483647;pointer-events:none';
    document.body.appendChild(gate);
  });

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Scroll by feeding Lenis real wheel deltas. Lenis owns the smoothing, so
  // the film inherits the site's own lerp instead of a synthetic ramp.
  window.__wheelBy = (distance, ms) =>
    new Promise((done) => {
      if (!distance || !ms) return done();
      const t0 = performance.now();
      let sent = 0;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        const want = ease(t) * distance;
        const delta = want - sent;
        sent = want;
        if (delta) {
          window.dispatchEvent(
            new WheelEvent('wheel', { deltaY: delta, deltaX: 0, deltaMode: 0, bubbles: true, cancelable: true })
          );
        }
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });

  // Fallback for when Lenis is not intercepting (reduced motion, script error).
  window.__rafScrollBy = (distance, ms) =>
    new Promise((done) => {
      if (!distance || !ms) return done();
      const sy = window.scrollY;
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        window.scrollTo(0, sy + distance * ease(t));
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });

  // The whole take, start to finish, without surfacing to the driver once.
  window.__runScore = async (score, driver) => {
    const log = [];
    document.getElementById('__filmgate')?.remove();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t0 = performance.now();
    for (const beat of score) {
      if (beat.sel) {
        const el = document.querySelector(beat.sel);
        if (el) {
          const r = el.getBoundingClientRect();
          const delta = Math.round(r.top - Math.max(0, (window.innerHeight - r.height) / 2));
          await window[driver](delta, beat.scroll);
        } else {
          log.push({ sel: beat.sel, missing: true });
          await wait(beat.scroll);
        }
      }
      await wait(beat.hold);
      log.push({ sel: beat.sel || 'hero', y: Math.round(window.scrollY), at: Math.round(performance.now() - t0) });
    }
    return { log, ms: Math.round(performance.now() - t0) };
  };
});

console.log(`Recording ${URL_TARGET} at ${W}x${H}...`);
await page.goto(URL_TARGET, { waitUntil: 'networkidle', timeout: 60000 });
await page.locator('.hero-giant').first().waitFor({ timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
// Let the hero stamp-in finish and the dipper's first drizzle land before
// the camera is "rolling", so the film opens on a settled frame.
await page.waitForTimeout(2600);

// One probe decides which scroll driver the whole take uses: a short nudge,
// then check the page actually moved. Done BEFORE the score so it costs the
// film nothing.
let driver = '__wheelBy';
await page.evaluate(() => window.__wheelBy(140, 260));
await page.waitForTimeout(700);
if ((await page.evaluate(() => window.scrollY)) < 40) {
  driver = '__rafScrollBy';
  console.log('Lenis did not take the wheel; using the RAF driver.');
}
await page.evaluate((d) => window[d](-window.scrollY - 100, 400), driver);
await page.waitForTimeout(900);

// ── The take ──
const { log, ms: actualMs } = await page.evaluate(
  ([s, d]) => window.__runScore(s, d),
  [SCORE, driver]
);
for (const l of log) {
  console.log(l.missing ? `  ! ${l.sel} not on the page` : `  ${(l.at / 1000).toFixed(1)}s  ${String(l.sel).padEnd(8)} scrollY ${l.y}`);
}
await page.waitForTimeout(TAIL_PAD * 1000);

await page.close();
const raw = await page.video().path();
await context.close();
await browser.close();

// Drift between the planned score and the wall clock means the main thread
// stalled; the trim uses the real number either way, but a big gap is a
// signal the pacing on screen is not the pacing in SCORE.
const drift = actualMs - SCORE_MS;
if (Math.abs(drift) > 1200) console.log(`  ! score ran ${(drift / 1000).toFixed(1)}s off plan`);

const rawDur = await probeDuration(raw);
const gateEnd = await probeGateEnd(raw);
const durSec = actualMs / 1000;
// Fall back to the end anchor only if the gate somehow did not register.
const startSec = gateEnd ?? Math.max(0, rawDur - durSec - TAIL_PAD);
if (gateEnd === null) console.log('  ! no black gate found; falling back to the end anchor');
console.log(
  `Raw ${rawDur.toFixed(2)}s, gate lifts ${gateEnd?.toFixed(2) ?? 'n/a'}s -> take ${startSec.toFixed(2)}s .. ${(startSec + durSec).toFixed(2)}s`
);
if (startSec + durSec > rawDur + 0.05) {
  console.log(`  ! take runs ${(startSec + durSec - rawDur).toFixed(2)}s past the end of the recording`);
}

// ── Encode: trim to the take, downscale, seamless-loop crossfade ──
// body = [0, D-FADE) ; transition = last FADE dissolved into the first FADE.
const D = durSec;
const filter = [
  `[0:v]trim=start=${startSec.toFixed(3)}:duration=${D.toFixed(3)},setpts=PTS-STARTPTS,scale=1280:800:flags=lanczos,fps=${FPS}[v]`,
  `[v]split=3[body][head][tail]`,
  `[body]trim=start=0:duration=${(D - FADE).toFixed(3)},setpts=PTS-STARTPTS[b]`,
  `[head]trim=start=0:duration=${FADE},setpts=PTS-STARTPTS[h]`,
  `[tail]trim=start=${(D - FADE).toFixed(3)},setpts=PTS-STARTPTS[t]`,
  `[t][h]xfade=transition=fade:duration=${FADE}:offset=0[x]`,
  `[b][x]concat=n=2:v=1:a=0[out]`,
].join(';');

console.log('Encoding...');
await run('ffmpeg', [
  '-y', '-i', raw,
  '-filter_complex', filter, '-map', '[out]',
  '-an',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  // CRF 34: the film is flat brand colour and clean type, which x264 eats
  // for free. 30 -> 34 cut a third off the file with no visible loss on
  // either static type or the fast mid-scroll frames.
  '-crf', '34', '-preset', 'slow', '-g', String(FPS * 2),
  '-movflags', '+faststart',
  OUT_MP4,
]);

// The poster is the first frame, so the still the visitor sees before
// playback is exactly the frame the film opens on.
await run('ffmpeg', ['-y', '-i', OUT_MP4, '-frames:v', '1', '-q:v', '4', OUT_POSTER]);

if (!process.env.KEEP_RAW) rmSync(raw, { force: true });

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);
console.log(`\n  ${path.relative(ROOT, OUT_MP4)}  ${mb(OUT_MP4)} MB  ${D.toFixed(1)}s`);
console.log(`  ${path.relative(ROOT, OUT_POSTER)}  ${mb(OUT_POSTER)} MB`);
if (Number(mb(OUT_MP4)) > 3.5) console.log('  ! Over 3.5MB for an above-the-fold hero. Raise -crf and re-run.');
