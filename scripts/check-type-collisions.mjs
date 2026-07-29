#!/usr/bin/env node
/**
 * Find display type whose INK actually collides.
 *
 * Sarah, 2026-07-29: "in some of them, the text in hero is too on top of each
 * other. like the period literally clash with the letters in some cases."
 *
 * The naive version of this check measured Range bounding boxes and flagged 55 of
 * 56 pages, which is a false-positive rate, not a finding: a character's box is
 * its font's em box, and em boxes overlap at any line-height under about 1.2 even
 * when nothing visually touches. A check that fails everything gets ignored, which
 * is worse than no check.
 *
 * So this measures INK, via canvas actualBoundingBox metrics:
 *   - VERTICAL: does line N's real descender ink reach line N+1's real ascender ink
 *   - HORIZONTAL: after letter-spacing is applied, does glyph A's right ink cross
 *     glyph B's left ink (this is the period-into-letter clash)
 *
 *   node scripts/check-type-collisions.mjs <file.html|url> [...]
 *   node scripts/check-type-collisions.mjs --fleet
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { chromium } = await import('file:///C:/Users/moder/cross-covenant/node_modules/playwright/index.mjs');

const PROBE = `(() => {
  const MIN_SIZE = 34;      // display type only
  const H_TOL = 0.5;        // px of ink overlap forgiven horizontally
  const V_TOL = 1.0;        // px of ink overlap forgiven vertically
  const out = [];
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');

  const els = new Set([...document.querySelectorAll('h1,h2,h3,.mast-name,[class*="head"],[class*="title"],[class*="word"]')]);

  for (const el of els) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    if (size < MIN_SIZE || cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (!(el.textContent || '').trim()) continue;

    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const tracking = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
    const lineHeight = cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight);
    const sample = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 44);

    /* ---------- horizontal: the period-into-letter clash ---------- */
    const text = (el.textContent || '').replace(/\\s+/g, ' ');
    for (let i = 0; i < text.length - 1; i++) {
      const a = text[i], b = text[i + 1];
      if (a === ' ' || b === ' ') continue;
      const ma = ctx.measureText(a), mb = ctx.measureText(b);
      const advance = ma.width + tracking;
      const inkRightA = ma.actualBoundingBoxRight;
      const inkLeftB = mb.actualBoundingBoxLeft; // positive when ink sits left of origin
      const gap = (advance - inkLeftB) - inkRightA;
      if (gap < -H_TOL) {
        out.push({ kind: 'GLYPH', pair: JSON.stringify(a + b), px: Math.round(-gap * 10) / 10, size: Math.round(size), detail: cs.letterSpacing, sample });
      }
    }

    /* ---------- vertical: descender ink into the next line ---------- */
    // Only meaningful when the element actually wraps to more than one line.
    const rects = el.getClientRects();
    if (rects.length > 1 || (el.getBoundingClientRect().height > lineHeight * 1.4)) {
      const m = ctx.measureText(text);
      const inkDescent = m.actualBoundingBoxDescent;
      const inkAscent = m.actualBoundingBoxAscent;
      const bleed = (inkDescent + inkAscent) - lineHeight;
      if (bleed > V_TOL) {
        out.push({ kind: 'LINES', pair: 'descender/ascender', px: Math.round(bleed * 10) / 10, size: Math.round(size), detail: 'line-height ' + Math.round(lineHeight) + 'px', sample });
      }
    }
  }

  const seen = new Set();
  return out.sort((a, b) => b.px - a.px).filter((r) => {
    const k = r.kind + r.sample + r.pair;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
})()`;

async function scan(browser, url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    return { label, hits: await page.evaluate(PROBE) };
  } catch (e) {
    return { label, hits: [], error: e.message.slice(0, 80) };
  } finally {
    await page.close();
  }
}

const args = process.argv.slice(2);
const browser = await chromium.launch();
const results = [];

if (args.includes('--fleet')) {
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const sb = createClient(
    process.env.supabase_url || process.env.SUPABASE_URL,
    process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data } = await sb.from('outbound_demo_sites').select('id,business_name,html').eq('status', 'ready');
  const tmp = path.join(os.tmpdir(), 'collision-scan');
  if (!existsSync(tmp)) mkdirSync(tmp, { recursive: true });
  for (const r of data) {
    const f = path.join(tmp, r.id + '.html');
    writeFileSync(f, r.html);
    results.push(await scan(browser, 'file:///' + f.replace(/\\/g, '/'), r.business_name));
  }
} else {
  for (const a of args) {
    const url = a.startsWith('http') ? a : 'file:///' + path.resolve(a).replace(/\\/g, '/');
    results.push(await scan(browser, url, a));
  }
}
await browser.close();

let bad = 0;
for (const r of results) {
  if (r.error) { console.log(`ERROR ${r.label}: ${r.error}`); continue; }
  if (!r.hits.length) continue;
  bad += 1;
  console.log(`\n${r.label}`);
  for (const h of r.hits.slice(0, 4)) {
    console.log(`   ${h.kind.padEnd(5)} ${h.pair.padEnd(22)} ${String(h.px).padStart(6)}px  @${h.size}px  ${h.detail}   "${h.sample}"`);
  }
}
console.log(`\n${bad} of ${results.length} page(s) have colliding display INK.`);
process.exit(bad ? 1 : 0);
