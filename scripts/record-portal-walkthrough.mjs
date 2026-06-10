/**
 * Records the 60-second client-portal walkthrough used on /work-with-us.
 *
 * Drives the REAL portal in headless Chromium with a minted session cookie
 * (same HMAC scheme as lib/client-auth.ts), a fake animated cursor, and
 * smooth scroll choreography, and saves a webm to .video-work/.
 *
 * Usage:  node scripts/record-portal-walkthrough.mjs
 * Env:    BASE_URL (default http://localhost:3961)
 *         CLIENT_EMAIL (default the Herbal Butters demo client)
 * Then:   ffmpeg the webm to public/video/portal-walkthrough.mp4 (see
 *         the command in the repo README section of the script output).
 */
import { chromium } from 'playwright';
import { createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import nextEnv from '@next/env';

const BASE = process.env.BASE_URL || 'http://localhost:3961';
const EMAIL = (process.env.CLIENT_EMAIL || 'theclawconcierge.sarah@gmail.com').toLowerCase().trim();
const OUT_DIR = new URL('../.video-work/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Load .env.local exactly the way Next.js does (quote + escape handling must
// match the running server or the HMAC secret will not line up).
nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
const loadEnv = (key) => process.env[key] || null;

// Same token format as lib/client-auth.ts (sess:email:expires, base64url, HMAC-SHA256)
function b64url(s) {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function mintSessionToken(email, secret) {
  const payload = `sess:${email}:${Date.now() + 24 * 60 * 60 * 1000}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url(payload)}.${sig}`;
}

const secret = loadEnv('CLIENT_SESSION_SECRET') || loadEnv('ADMIN_SESSION_SECRET');
if (!secret) throw new Error('No session secret in .env.local');
const sessionToken = mintSessionToken(EMAIL, secret);

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
});

// Session + consent cookies so no banner and no login wall.
await context.addCookies([
  { name: 'mms_client', value: sessionToken, url: BASE, httpOnly: true, sameSite: 'Lax' },
  { name: 'mms_consent', value: 'granted', url: BASE },
]);

const page = await context.newPage();

// Pre-dismiss the portal tour nudge, hide marketing chat bubble + scrollbars,
// and install the fake cursor + smooth-scroll helpers on every navigation.
await page.addInitScript(() => {
  try { localStorage.setItem('mms_portal_tour_v1', '1'); } catch {}
  const style = document.createElement('style');
  style.textContent = `
    /* Kill the floating marketing chat: nudge (z-79), FAB (z-80), panel (z-81). */
    [class*="z-[79]"], [class*="z-[80]"], [class*="z-[81]"],
    [aria-label*="Mr. Mustard"], [aria-label*="Mustard chat"] { display: none !important; }
    ::-webkit-scrollbar { display: none; }
    html { scrollbar-width: none; }
    #demo-cursor {
      position: fixed; z-index: 999999; width: 26px; height: 26px; border-radius: 999px;
      background: rgba(245, 183, 0, 0.85); border: 2.5px solid #161616;
      box-shadow: 2px 2px 0 0 #161616; pointer-events: none;
      transform: translate(-50%, -50%); left: 960px; top: 760px;
    }
    #demo-cursor.click { animation: demo-click 320ms ease; }
    @keyframes demo-click {
      0% { transform: translate(-50%, -50%) scale(1); }
      40% { transform: translate(-50%, -50%) scale(0.7); }
      100% { transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    document.body.appendChild(c);
  });

  // The portal chat auto-scrolls via endRef.scrollIntoView, which also drags
  // the WINDOW down and slides the sticky guide out of frame mid-answer.
  // Redirect it to scroll only the chat's own overflow container.
  const origScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args) {
    let el = this.parentElement;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') { el.scrollTop = el.scrollHeight; return; }
      el = el.parentElement;
    }
    return origScrollIntoView.apply(this, args);
  };

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  window.__cursorTo = (x, y, ms = 700) => new Promise((done) => {
    const c = document.getElementById('demo-cursor');
    if (!c) return done();
    const sx = parseFloat(c.style.left || '960');
    const sy = parseFloat(c.style.top || '760');
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
  window.__cursorClick = () => {
    const c = document.getElementById('demo-cursor');
    if (!c) return;
    c.classList.remove('click');
    void c.offsetWidth;
    c.classList.add('click');
  };
  window.__smoothScroll = (toY, ms = 1400) => new Promise((done) => {
    const sy = window.scrollY;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, sy + (toY - sy) * ease(t));
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
});

const hold = (ms) => page.waitForTimeout(ms);
const cursorTo = async (x, y, ms) => page.evaluate(([a, b, c]) => window.__cursorTo(a, b, c), [x, y, ms ?? 700]);
const scrollTo = async (y, ms) => page.evaluate(([a, b]) => window.__smoothScroll(a, b), [y, ms ?? 1400]);
const clickPulse = () => page.evaluate(() => window.__cursorClick());

/** Glide the cursor onto an element, pulse, and really click it. */
async function cursorClick(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('No bounding box for cursor target');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cursorTo(x, y, 800);
  await hold(150);
  await clickPulse();
  await locator.click();
}

/** Center an element on screen with the smooth scroller. */
async function scrollToElement(locator, ms = 1500) {
  const y = await locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - (window.innerHeight - el.getBoundingClientRect().height) / 2);
  await scrollTo(Math.max(0, Math.round(y)), ms);
}

console.log(`Recording portal walkthrough for ${EMAIL} at ${BASE}...`);

// ── Scene 1: the login screen, a fictional email typed in ──
await page.goto(`${BASE}/portal/login`, { waitUntil: 'networkidle' });
await hold(1300);
const emailInput = page.locator('input[type="email"]');
await cursorClick(emailInput);
await emailInput.pressSequentially('hello@herbalbutters.com', { delay: 55 });
await hold(550);
await cursorTo(960, 625, 500); // glide onto the "Email me a sign-in link" button
await hold(150);
await clickPulse();
await hold(750);

// ── Scene 2: into the portal (the magic-link "cut"). Land on the welcome. ──
await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle' });
await page.getByText('Welcome back', { exact: false }).first().waitFor({ timeout: 20000 });
await page.getByText('Your guide', { exact: false }).first().waitFor({ timeout: 20000 });
await hold(2600); // let the cards paint

// ── Scene 3: tuck the welcome up so the full guide frames at top-right ──
// The guide is sticky only within its short sidebar, so the hero beat has to
// happen near the top where the whole 560px panel is on screen.
await scrollTo(210, 1400);
await hold(1500);

// ── Scene 4: the AI guide answers a real question (the hero moment) ──
// Do NOT scroll while it answers, or the sticky panel slides out of frame.
const quick = page.getByRole('button', { name: "What's my project status?" });
if (await quick.count()) {
  await cursorClick(quick);
  // Wait for the live reply to land (typing dots gone).
  await page.waitForFunction(() => !document.querySelector('.animate-bounce'), null, { timeout: 30000 }).catch(() => {});
  await hold(500);
  const reply = await page.evaluate(() => {
    const bubbles = [...document.querySelectorAll('.rounded-bl-md')];
    return bubbles.length ? bubbles[bubbles.length - 1].textContent.trim() : '';
  });
  console.log(`Guide replied: ${reply.slice(0, 160)}...`);
  await hold(7000); // hold long: real answer + real billing side by side
} else {
  await hold(2600);
}

// ── Scene 5: now tour the workspace; the guide scrolls away naturally ──
await scrollTo(760, 1700);
await hold(2200); // project card: progress ring, in-build status
await scrollTo(1240, 1600);
await hold(2400); // launch countdown + milestones
await scrollTo(1900, 1700);
await hold(2100); // project intake form
await scrollTo(0, 1900);
await hold(2000); // rest on the welcome

await page.close();
const video = await page.video().path();
await context.close();
await browser.close();
console.log(`Saved: ${video}`);
