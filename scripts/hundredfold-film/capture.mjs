/**
 * THE CAMERA for the HUNDREDFOLD films.
 *
 * Drives the REAL production surfaces with a REAL member session, in one
 * continuous take, holding each beat on screen for exactly as long as its
 * narration takes to say. Because the take is continuous and the holds are
 * voice-sized, the finished film needs no editing pass: concatenated narration
 * laid over the trimmed take lines up by construction.
 *
 * ⚠️ FIVE RULES, ALL LEARNED THE HARD WAY. Break one and the film looks broken
 * in a way that is hard to attribute:
 *
 * 1. RECORD AT THE EXACT VIEWPORT SIZE. Playwright's `recordVideo` NEVER
 *    upscales: ask for a frame larger than the viewport and you get the page in
 *    the top-left corner with grey padding filling the rest. Record 1280x720,
 *    upscale to 1080p in ffmpeg with lanczos.
 * 2. KILL `scroll-behavior: smooth` BEFORE ANY SCROLL. MMS sets it globally in
 *    globals.css, and it silently eats a per-frame `window.scrollTo` loop: each
 *    call restarts the smooth animation, so the viewport never visibly moves
 *    until the loop ends. The cinematic scrolls here are the whole visual
 *    language of the film, so this is not optional.
 * 3. PRE-SET THE CONSENT COOKIE. Never dismiss the banner on camera.
 * 4. THE TRIM IS TAIL-ANCHORED. Chromium's screencast starts a few hundred ms
 *    after the context does, and the lead-in varies per run, so the END of the
 *    raw file is the only reliable landmark.
 * 5. NO PRICES OR CLAIMS ARE TYPED HERE. Every number on screen comes from the
 *    live page, so the film cannot drift from what the product actually says.
 *
 * [[debugging_playwright_screen_capture_ads]]
 */

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const W = 1280;
export const H = 720;

/* -------------------------------------------------------------------------- */
/* The session                                                                 */
/* -------------------------------------------------------------------------- */

const b64url = (s) => Buffer.from(s, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Mint a member session cookie the same way lib/client-auth.ts does.
 *
 * The payload is a colon-delimited `sess:email:expires` string, NOT JSON, and
 * `kind` is inside the signed payload so a magic-link token can never be used
 * as a session. Getting this shape wrong produces a clean 307 to the login page
 * that looks exactly like a wrong secret.
 */
export async function memberSessionCookie(email, secret) {
  if (!secret) throw new Error('CLIENT_SESSION_SECRET is not set, so the portal cannot be filmed.');
  const expires = Date.now() + 2 * 60 * 60 * 1000; // two hours is plenty for a take
  const payload = `sess:${email.toLowerCase().trim()}:${expires}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  let bin = '';
  for (const byte of new Uint8Array(sig)) bin += String.fromCharCode(byte);
  return `${b64url(unescape(encodeURIComponent(payload)))}.${b64url(bin)}`;
}

/* -------------------------------------------------------------------------- */
/* In-page helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A visible cursor, so a click reads as a person doing something rather than
 * the page changing on its own.
 */
const CURSOR = `
(() => {
  if (window.__hfCursor) return;
  window.__hfCursor = true;
  const put = () => {
    if (!document.body || document.getElementById('__hfcur')) return;
    const d = document.createElement('div');
    d.id = '__hfcur';
    d.style.cssText = 'position:fixed;left:-100px;top:-100px;width:22px;height:22px;border-radius:50%;background:rgba(245,183,0,.92);box-shadow:0 0 0 3px rgba(22,22,22,.85),0 6px 18px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1),transform .12s';
    document.body.appendChild(d);
  };
  document.addEventListener('DOMContentLoaded', put);
  put();
  window.__hfMove = (x, y) => { const d = document.getElementById('__hfcur'); if (d) { d.style.left = (x - 11) + 'px'; d.style.top = (y - 11) + 'px'; } };
  window.__hfTap = () => { const d = document.getElementById('__hfcur'); if (d) { d.style.transform = 'scale(.62)'; setTimeout(() => { d.style.transform = 'scale(1)'; }, 130); } };
})();
`;

/** Rule 2. Also kills reduced-motion-hostile transitions during a scroll. */
const KILL_SMOOTH = `document.documentElement.style.scrollBehavior = 'auto';`;

/**
 * Rule 6, learned on the first cut: CLEAR THE FURNITURE.
 *
 * The live site carries a chat launcher, a proactive "not sure where to start"
 * bubble, and a bottom consent strip, all `position: fixed` at z-index 79 to
 * 120. On a normal visit they are the product doing its job. On camera they sit
 * in the same corner of every single shot, and the proactive bubble animates in
 * mid-sentence during an unrelated beat, which reads as a bug in the film.
 *
 * Hidden by z-index rather than by class name on purpose: the classes are
 * Tailwind soup that changes whenever somebody restyles the widget, and the
 * next person to do that will not know this file exists. Anything fixed and
 * floating above the page is furniture; the nav at z-50 is part of the site and
 * stays.
 */
const CLEAR_FURNITURE = `
(() => {
  const hide = () => {
    document.querySelectorAll('body *').forEach((el) => {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed') return;
      const z = parseInt(s.zIndex || '0', 10);
      if (z > 60 && el.id !== '__hfcur') el.style.setProperty('display', 'none', 'important');
    });
  };
  const boot = () => { hide(); new MutationObserver(hide).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
`;

/* -------------------------------------------------------------------------- */
/* The take                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param beats  [{ id, ms }] in order, ms = how long that beat's narration runs
 * @param scenes { [beatId]: async (ctx) => void }  what the camera does
 */
export async function shoot({ workDir, base, cookie, beats, scenes, log = () => {} }) {
  const rawDir = path.join(workDir, 'raw');
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--force-prefers-reduced-motion=0'],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, // rule 1: frame == viewport
    recordVideo: { dir: rawDir, size: { width: W, height: H } },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
  });

  const host = new URL(base).origin;
  // Rule 3: never dismiss the banner on camera.
  await ctx.addCookies([{ name: 'mms_consent', value: 'denied', url: host }]);
  if (cookie) await ctx.addCookies([{ name: 'mms_client', value: cookie, url: host }]);
  await ctx.addInitScript(CURSOR);

  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);

  /* ---- the camera's vocabulary ---- */

  /** Set by the beat loop. Scenes size their motion against the beat's end. */
  let deadline = 0;
  const remaining = () => Math.max(0, deadline - Date.now());

  const go = async (url, { wait = 1400 } = {}) => {
    await page.goto(url.startsWith('http') ? url : `${base}${url}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(KILL_SMOOTH);
    await page.evaluate(CLEAR_FURNITURE);
    await page.waitForTimeout(Math.min(wait, remaining()));
  };

  /** Move the visible cursor to an element and click it. */
  const click = async (selector, { settle = 900 } = {}) => {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 20_000 });
    const box = await el.boundingBox();
    if (box) {
      await page.evaluate(([x, y]) => window.__hfMove?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.__hfTap?.());
    }
    await el.click({ timeout: 20_000 });
    await page.evaluate(KILL_SMOOTH);
    await page.waitForTimeout(Math.min(settle, remaining()));
  };

  /**
   * A slow, per-frame scroll from the current position to `toY`, spread across
   * `ms`. rAF-driven rather than `scrollIntoView` so the motion is filmable
   * instead of instantaneous, and it only works at all because of rule 2.
   */
  const glide = async (toY, ms) => {
    await page.evaluate(
      async ([target, dur]) => {
        document.documentElement.style.scrollBehavior = 'auto';
        const from = window.scrollY;
        const max = Math.max(0, document.body.scrollHeight - window.innerHeight);
        const to = Math.min(Math.max(0, target), max);
        const t0 = performance.now();
        // easeInOutCubic: starts and lands softly, so no frame looks like a jump cut
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        await new Promise((done) => {
          const step = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            window.scrollTo(0, from + (to - from) * ease(t));
            if (t < 1) requestAnimationFrame(step);
            else done();
          };
          requestAnimationFrame(step);
        });
      },
      [toY, ms],
    );
  };

  /**
   * ⚠️ THE ONLY WAY THIS FILM SHOULD TRAVEL.
   *
   * Sarah's verdict on another cut on 2026-08-07: *"it makes you nauseous and
   * bounces around."* The cause was camera speed. A held shot that creeps at
   * 21 to 50 px/s reads as film; anything faster is a whip pan, and the first
   * version of this rig was travelling at 110 to 215 px/s on every beat.
   *
   * So distance is never typed. You give a SPEED, and the shot travels whatever
   * that speed covers in the time the narration has left. It is impossible to
   * write a nauseating shot with this, which is the point: the constraint is
   * the API rather than a number somebody has to remember.
   *
   * The cuts do the travelling. [[mms-site-film-rig]]
   */
  const creep = async (pxPerSec = 38) => {
    const ms = remaining();
    if (ms < 250) return;
    const from = await page.evaluate(() => window.scrollY);
    await glide(from + Math.round((pxPerSec * ms) / 1000), ms - 120);
  };

  /** Scroll so an element sits nicely in frame, over `ms`. */
  const glideTo = async (selector, ms, { offset = 90 } = {}) => {
    const y = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return window.scrollY + el.getBoundingClientRect().top;
    }, selector);
    if (y === null) {
      // Never fail a take over one missing anchor; hold instead and say so.
      log(`  ! anchor not found: ${selector}`);
      await page.waitForTimeout(ms);
      return;
    }
    await glide(y - offset, ms);
  };

  /** Hold whatever is on screen until the beat's own narration is finished. */
  const holdOut = async () => {
    const left = remaining();
    if (left > 0) await page.waitForTimeout(left);
  };

  /** Place the shot off camera. Only safe immediately after a cut (a nav or a
   *  tab click), where the viewer is not watching the page move. */
  const placeAt = async (y) => {
    await page.evaluate((top) => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, top);
    }, y);
  };

  const camera = { page, go, click, glide, glideTo, creep, placeAt, remaining, holdOut, base, W, H };

  /* ---- roll ---- */

  const t0 = Date.now();
  const at = () => Date.now() - t0;
  const timeline = [];
  // Chromium's screencast lags the context; hold a moment so beat one is not
  // half-missing, and count it into the score so the tail-anchored trim keeps it.
  const LEAD_MS = 1200;
  await page.waitForTimeout(LEAD_MS);

  /**
   * ⚠️ EVERY BEAT CONSUMES EXACTLY ITS NARRATION'S LENGTH, navigation included.
   *
   * The first cut let each scene do its navigation and THEN hold for `beat.ms`,
   * so every beat overran by however long the page took to load. The overruns
   * summed to about sixteen seconds across twelve beats, and because the trim
   * is tail-anchored, the whole picture slid ahead of the voice: the film
   * opened on beat three while the narrator was still saying beat one.
   *
   * So the deadline is set HERE, before the scene runs, and every wait inside
   * the camera clamps to what is left of it. A scene that still overruns is a
   * real problem (it steals from the next beat), so it is reported rather than
   * absorbed silently.
   */
  for (const beat of beats) {
    const start = at();
    const scene = scenes[beat.id];
    if (!scene) throw new Error(`no scene for beat "${beat.id}" (lines.mjs and capture.mjs disagree)`);
    deadline = Date.now() + beat.ms;
    log(`  · ${beat.id} (${Math.round(beat.ms / 100) / 10}s)`);
    await scene(camera, beat.ms);
    await holdOut();
    const spent = at() - start;
    const drift = spent - beat.ms;
    if (drift > 250) log(`    ! overran by ${drift}ms (this beat steals from the next one)`);
    timeline.push({ id: beat.id, startMs: start, endMs: at() });
  }

  const scoreMs = at();
  await page.waitForTimeout(400);
  await ctx.close();
  await browser.close();

  const raw = readdirSync(rawDir)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => path.join(rawDir, f))[0];
  if (!raw || !existsSync(raw)) throw new Error('the recorder produced no file');

  return { raw, timeline, scoreMs, leadMs: LEAD_MS };
}

export { CURSOR, KILL_SMOOTH };
export const readEnv = (file = '.env.local') => {
  const out = {};
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* rely on the environment */
  }
  return out;
};
