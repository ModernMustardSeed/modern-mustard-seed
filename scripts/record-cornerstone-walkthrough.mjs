/**
 * Records the Cornerstone walkthrough: what it is, and how little there is to
 * learn.
 *
 * Sarah, 2026-08-28: "lets make video now that shows and tells him exactly what
 * it is and how easy it is to use."
 *
 * Drives the REAL live console, not a mock. Every number on screen is his
 * tenant's actual data, and the Foreman's answer is a real model call against
 * the real register, which is the entire reason this is worth recording: a man
 * who builds things for a living can tell the difference between software and a
 * slide deck, and one is worth watching.
 *
 * Beats, in the order a builder cares about them:
 *   1. the 5am report        what he wakes up to
 *   2. ask the Foreman       the only interface he has to learn
 *   3. send a file in        the truck-seat case
 *   4. money in and out      the number he actually checks
 *   5. an invoice            the thing he hands somebody
 *   6. the file room         how the crew becomes his
 *   7. add a job             proof it is his to drive
 *
 * Usage:  node scripts/record-cornerstone-walkthrough.mjs
 * Env:    CORNERSTONE_URL (default the live deployment)
 *         BEATS=1,2,3      re-record only some beats while iterating
 * Then:   ffmpeg the webm to mp4. The command is printed at the end.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = (process.env.CORNERSTONE_URL || 'https://cornerstone-psi.vercel.app').replace(/\/$/, '');
const OUT_DIR = new URL('../.video-work/cornerstone/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const W = 1920;
const H = 1080;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
});

const page = await context.newPage();

/* The fake cursor, the smooth scroll, and the caption bar.
 *
 * The caption is not decoration. This gets watched on a phone with the sound
 * off at least as often as with it on, and a walkthrough nobody can follow
 * silently is a walkthrough that gets closed. */
await page.addInitScript(() => {
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar { display: none; }
    html { scrollbar-width: none; }
    #cs-cursor {
      position: fixed; z-index: 999999; width: 26px; height: 26px; border-radius: 999px;
      background: rgba(245, 183, 0, 0.9); border: 2.5px solid #14181C;
      box-shadow: 3px 3px 0 0 #14181C; pointer-events: none;
      transform: translate(-50%, -50%); left: 960px; top: 800px;
    }
    #cs-cursor.click { animation: cs-click 320ms ease; }
    @keyframes cs-click {
      0% { transform: translate(-50%,-50%) scale(1); }
      40% { transform: translate(-50%,-50%) scale(0.68); }
      100% { transform: translate(-50%,-50%) scale(1); }
    }
    #cs-cap {
      position: fixed; z-index: 999998; left: 0; right: 0; bottom: 0;
      background: #14181C; color: #F5F3EE; padding: 22px 56px;
      font: 700 30px/1.3 "Segoe UI", -apple-system, sans-serif;
      border-top: 5px solid #F5B700; pointer-events: none;
      transform: translateY(120%); transition: transform .34s cubic-bezier(.2,.8,.2,1);
    }
    #cs-cap.up { transform: translateY(0); }
    /* The Foreman dock lives in the bottom right corner, which is where the
     * caption bar is. For those beats the caption moves to the top rather than
     * covering the one thing the beat exists to show. */
    #cs-cap.top { top: 0; bottom: auto; border-top: 0; border-bottom: 5px solid #F5B700;
      transform: translateY(-120%); }
    #cs-cap.top.up { transform: translateY(0); }
    #cs-cap b { color: #F5B700; }
  `;
  const mount = () => {
    document.head.appendChild(style);
    const c = document.createElement('div');
    c.id = 'cs-cursor';
    document.body.appendChild(c);
    const cap = document.createElement('div');
    cap.id = 'cs-cap';
    document.body.appendChild(cap);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  window.__to = (x, y, ms = 700) => new Promise((done) => {
    const c = document.getElementById('cs-cursor');
    if (!c) return done();
    const sx = parseFloat(c.style.left || '960');
    const sy = parseFloat(c.style.top || '800');
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = ease(t);
      c.style.left = `${sx + (x - sx) * e}px`;
      c.style.top = `${sy + (y - sy) * e}px`;
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });

  window.__click = () => {
    const c = document.getElementById('cs-cursor');
    if (!c) return;
    c.classList.remove('click');
    void c.offsetWidth;
    c.classList.add('click');
  };

  window.__scroll = (toY, ms = 1400) => new Promise((done) => {
    const sy = window.scrollY;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, sy + (toY - sy) * ease(t));
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });

  window.__cap = (html, top) => {
    const cap = document.getElementById('cs-cap');
    if (!cap) return;
    if (!html) { cap.classList.remove('up'); return; }
    cap.innerHTML = html;
    cap.classList.toggle('top', Boolean(top));
    cap.classList.add('up');
  };
});

const hold = (ms) => page.waitForTimeout(ms);
const cap = (html) => page.evaluate((h) => window.__cap?.(h, false), html);
/** Caption along the TOP, for the beats that use the bottom-right dock. */
const capTop = (html) => page.evaluate((h) => window.__cap?.(h, true), html);
const capOff = () => page.evaluate(() => window.__cap?.(''));

/** Move the cursor onto an element, click it for real, and flash the ring. */
async function tap(selector, { settle = 900 } = {}) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 20000 });
  const box = await el.boundingBox();
  if (box) {
    await page.evaluate(
      ([x, y]) => window.__to?.(x, y, 620),
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    await hold(680);
    await page.evaluate(() => window.__click?.());
    await hold(200);
  }
  await el.click({ force: true });
  await hold(settle);
}

/** Type into a field the way a person does, one character at a time. */
async function say(selector, text, delay = 42) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 20000 });
  const box = await el.boundingBox();
  if (box) {
    await page.evaluate(
      ([x, y]) => window.__to?.(x, y, 520),
      [box.x + box.width / 2, box.y + Math.min(30, box.height / 2)],
    );
    await hold(420);
  }
  await el.click({ force: true });
  await el.type(text, { delay });
}

const T0 = Date.now();
const cues = [];
/** Mark where a beat actually began, in seconds from the first frame. */
const mark = (beat, line) => {
  const at = (Date.now() - T0) / 1000;
  cues.push({ beat, at: Number(at.toFixed(2)), line });
  console.log(`  ${at.toFixed(1).padStart(6)}s  beat ${beat}`);
};

const only = (process.env.BEATS || '').split(',').map((s) => s.trim()).filter(Boolean);
const want = (n) => !only.length || only.includes(String(n));

console.log(`Recording against ${BASE}`);

// ---------------------------------------------------------------- 1. the report
if (want(1)) {
  mark(1, 'the 5am report');
  await page.goto(`${BASE}/console`, { waitUntil: 'networkidle' });
  await hold(1400);
  await cap('This is <b>Cornerstone</b>. It works your jobs overnight.');
  await hold(3000);
  await cap('At five in the morning it hands you <b>one paragraph</b>. Worst thing first.');
  await hold(4200);
  await page.evaluate(() => window.__scroll?.(520, 1500));
  await hold(1800);
  await cap('It tells you what it did, and the short list that needs you.');
  await hold(3600);
  await capOff();
  await hold(700);
}

// ------------------------------------------------------------- 2. ask the Foreman
if (want(2)) {
  mark(2, 'ask the Foreman');
  await page.evaluate(() => window.__scroll?.(0, 900));
  await hold(1100);
  await capTop('There is <b>one thing to learn</b>. This box, on every screen.');
  await hold(3200);
  await tap('button[aria-label="Ask the Foreman"]', { settle: 1100 });
  await capTop('Ask it anything, in your own words.');
  await hold(1600);
  await say('div.fixed.z-50 textarea', 'what needs me today and what is it going to cost me');
  await hold(900);
  await page.keyboard.press('Enter');
  await capTop('It goes and <b>looks it up</b>. It does not guess.');
  // A real model call against the real register. It takes as long as it takes.
  await hold(22000);
  await capTop('And it tells you what it read to get there.');
  await hold(5000);
  await capOff();
  await hold(600);
}

// --------------------------------------------------------------- 3. send it in
if (want(3)) {
  mark(3, 'send it in');
  await capTop('Got a drawing set, an invoice, a signed ticket on the truck seat?');
  await hold(3600);
  await capTop('<b>Send it in.</b> It files it and reads it overnight.');
  await hold(3600);
  await capOff();
  await hold(500);
}

// -------------------------------------------------------------------- 4. money
if (want(4)) {
  mark(4, 'money in and out');
  await page.goto(`${BASE}/console/money`, { waitUntil: 'networkidle' });
  await hold(1600);
  await cap('What came in. What went out. <b>Per job.</b>');
  await hold(3800);
  await tap('summary:has-text("Something went out")', { settle: 1000 });
  await cap('A receipt takes ten seconds. That is the whole trick.');
  await hold(4000);
  await capOff();
  await hold(600);
}

// ----------------------------------------------------------------- 5. invoices
if (want(5)) {
  mark(5, 'invoices');
  await page.goto(`${BASE}/console/invoices`, { waitUntil: 'networkidle' });
  await hold(1600);
  await cap('Write an invoice. <b>Print it, email it, hand it over.</b>');
  await hold(4000);
  await cap('Mark it paid and it becomes money. You never type it twice.');
  await hold(4000);
  await capOff();
  await hold(600);
}

// ---------------------------------------------------------------- 6. file room
if (want(6)) {
  mark(6, 'the file room');
  await page.goto(`${BASE}/console/knowledge`, { waitUntil: 'networkidle' });
  await hold(1600);
  await cap('Give it <b>your</b> contract, your prices, your warranty.');
  await hold(3800);
  await page.evaluate(() => window.__scroll?.(420, 1300));
  await hold(1400);
  await cap('Then it stops being generic software and starts being <b>your crew</b>.');
  await hold(4200);
  await capOff();
  await hold(600);
}

// ------------------------------------------------------------------- 7. a job
if (want(7)) {
  mark(7, 'a job, and the close');
  await page.goto(`${BASE}/console/jobs?add=1`, { waitUntil: 'networkidle' });
  await hold(1500);
  await cap('Adding a job is a name and an address. Nothing else is required.');
  await hold(4000);
  await capOff();
  await hold(500);
  await page.goto(`${BASE}/console`, { waitUntil: 'networkidle' });
  await hold(1200);
  await cap('And <b>nothing ever sends itself.</b> It writes. You say yes.');
  await hold(4600);
  await cap('<b>Cornerstone</b> &nbsp;&middot;&nbsp; Modern Mustard Seed');
  await hold(3600);
  await capOff();
  await hold(1200);
}

await page.close();
await context.close();
await browser.close();

writeFileSync(
  `${OUT_DIR}cues.json`,
  JSON.stringify({ totalSeconds: Number(((Date.now() - T0) / 1000).toFixed(2)), cues }, null, 2),
);

writeFileSync(
  `${OUT_DIR}README.txt`,
  [
    'Cornerstone walkthrough, raw capture.',
    '',
    'To mux to mp4 (and this is the exact command):',
    '',
    `  ffmpeg -y -i "${OUT_DIR}<the>.webm" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart cornerstone-walkthrough.mp4`,
    '',
    'With a voiceover track:',
    '',
    `  ffmpeg -y -i video.webm -i voice.mp3 -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -c:a aac -b:a 160k -shortest -movflags +faststart out.mp4`,
    '',
  ].join('\n'),
);

console.log(`\nRaw capture in ${OUT_DIR}`);
