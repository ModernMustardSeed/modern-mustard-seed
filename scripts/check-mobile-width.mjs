#!/usr/bin/env node
/**
 * The phone-width gate.
 *
 * Loads every public page at 360px and asserts the document never grows wider
 * than the screen. It also EXERCISES the pages, because the bug this was written
 * for only appeared after an interaction: picking a time on /book rendered the
 * HELD stamp, which hung off the card's right edge and pushed the document to
 * 450px inside a 360px screen. Nothing was wrong until a visitor touched
 * something, so a static screenshot pass had nothing to find.
 *
 *   node scripts/check-mobile-width.mjs [baseUrl] [path ...]
 *
 * Default base is http://localhost:3311, so run it against `next start` rather
 * than `next dev` (see next-dev-api-404). Exits 1 on any overflow and names the
 * widest element on the page so the fix has an address.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const BASE = args[0]?.startsWith('http') ? args.shift() : 'http://localhost:3311';
const WIDTH = 360;

const PATHS = args.length ? args : [
  '/', '/inquire', '/work', '/services', '/work-with-us', '/the-system',
  '/talking-website', '/websites', '/ai-websites', '/brand', '/voice-agents',
  '/voice-agents/whitepaper', '/command-center', '/chief', '/ai-native', '/ads',
  '/launch-film', '/mustard', '/playbook', '/ai-proof', '/for',
  '/for/restaurants', '/montana', '/montana/kalispell', '/resources', '/blog',
  '/about', '/sarahscarano', '/world', '/contact', '/sample-proposal', '/book',
  '/pictures', '/voice-agents/roofers',
];

/** Touch the things a visitor touches, so state-only overflow gets caught. */
async function exercise(page) {
  // Cookie bar out of the way.
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach((b) => {
      const t = (b.textContent || '').trim().toLowerCase();
      if (t === 'accept all' || t === 'essential only') b.click();
    });
  }).catch(() => { });
  // Fill any short text inputs so cards that mirror a form fill in.
  await page.evaluate(() => {
    document.querySelectorAll('input[type="text"], input:not([type]), input[type="tel"], input[type="email"]').forEach((el, i) => {
      if (el.offsetParent === null) return;
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, el.type === 'email' ? 'sarah@modernmustardseed.com' : 'Modern Mustard Seed');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }).catch(() => { });
  // Pick the first time slot, open the first accordion, flip the first toggle.
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
    const slot = btns.find((b) => /\d{1,2}:\d{2}\s*(am|pm)/i.test(b.textContent || ''));
    if (slot) slot.click();
    const d = document.querySelector('details');
    if (d) d.open = true;
  }).catch(() => { });
  await page.waitForTimeout(700);
  // Shut anything a generic click may have opened (the nav drawer above all),
  // so the measurement is of the page, not of a menu sitting over it.
  await page.keyboard.press('Escape').catch(() => { });
  await page.evaluate(() => {
    document.querySelectorAll('[aria-label="Close menu"]').forEach((b) => b.click());
  }).catch(() => { });
  await page.waitForTimeout(500);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();

const failures = [];

for (const p of PATHS) {
  try {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    try { await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 }); }
    catch { console.log(`  ??  ${p}  (did not load)`); continue; }
  }
  await exercise(page);
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);

  const r = await page.evaluate((W) => {
    const de = document.documentElement;
    // The nav drawer is parked off-screen at translate-x-full when closed. It is
    // supposed to sit out there, so it is not what cuts a page off.
    const parked = (el) => {
      let a = el;
      while (a && a !== document.body) {
        if (/translate-x-full/.test((a.className || '').toString())) return true;
        a = a.parentElement;
      }
      return false;
    };
    let worst = null;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.left >= W - 1) continue;       // entirely off-stage
      if (cs.pointerEvents === 'none' && !el.textContent?.trim()) continue; // decorative bleed
      if (parked(el)) continue;
      // A marquee, a reel, or a full-bleed canvas is meant to run wide inside its
      // own mask. Only flag it if the mask itself is what spills.
      const RIDES_A_TRACK = /marquee|mm-proof|wsx-track|-track|ticker|game-canvas/;
      const cls = (el.className || '').toString();
      if (RIDES_A_TRACK.test(cls)) continue;
      if (el.tagName === 'CANVAS') continue;
      // The contents of a marquee run wide on purpose, inside its own mask.
      let onTrack = false, a1 = el.parentElement;
      while (a1 && a1 !== document.body) {
        if (RIDES_A_TRACK.test((a1.className || '').toString())) { onTrack = true; break; }
        a1 = a1.parentElement;
      }
      if (onTrack) continue;
      let masked = false, a2 = el.parentElement;
      while (a2 && a2 !== document.body) {
        const acs = getComputedStyle(a2);
        // A fixed ancestor sizes to the viewport and never creates page scroll,
        // so its children cannot be what cuts the page off. (Under Playwright's
        // mobile emulation a fixed box can also measure a few px wider than the
        // device width, which is an emulation artifact, not a defect.)
        if (acs.position === 'fixed') { masked = true; break; }
        // A deliberate horizontal scroller is allowed to run wide.
        if (acs.overflowX === 'auto' || acs.overflowX === 'scroll') { masked = true; break; }
        if (acs.overflowX === 'hidden' || acs.overflowX === 'clip') {
          if (a2.getBoundingClientRect().right <= W + 2) { masked = true; }
          break;
        }
        a2 = a2.parentElement;
      }
      if (masked) continue;
      const over = b.right - W;
      if (over <= 1) continue;
      if (!worst || over > worst.over) {
        worst = {
          over: Math.round(over),
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 120),
          text: (el.textContent || '').trim().slice(0, 50),
        };
      }
    }
    return { ok: !worst, scrollWidth: de.scrollWidth, worst };
  }, WIDTH);

  if (r.ok) {
    console.log(`  ok  ${p}`);
  } else {
    failures.push({ path: p, ...r });
    console.log(`  XX  ${p}  scrollWidth=${r.scrollWidth} (screen ${WIDTH})`);
    if (r.worst) {
      console.log(`        +${r.worst.over}px  <${r.worst.tag}>  ${r.worst.cls}`);
      if (r.worst.text) console.log(`        "${r.worst.text}"`);
    }
  }
}

await browser.close();

if (failures.length) {
  console.log(`\n${failures.length} page(s) run wider than ${WIDTH}px. A phone cuts those off down the right side.`);
  process.exit(1);
}
console.log(`\nEvery page fits ${WIDTH}px, before and after a visitor touches it.`);
