#!/usr/bin/env node
// Set twelve: THE MAIN STREET TWENTY. Twenty WPA-style trade posters, Codex
// plates (gen-art.mjs) on cream with a double-rule poster frame. No stats,
// no pitch: the honor line is the whole message.
// Usage: node render.mjs            -> cards/         (1080x1350 feed)
//        node render.mjs --square   -> cards-square/  (1080x1080 X cut, re-typeset)
//        node render.mjs 03-roofer  -> just that card (same filter shape as gen-art.mjs)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080, H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const SERIES = 'Twenty posters for the people who keep Main Street running.';

const CARDS = [
  { key: '01-plumber', no: '01', trade: 'THE PLUMBER', honor: 'Shows up when the ceiling is already raining.' },
  { key: '02-electrician', no: '02', trade: 'THE ELECTRICIAN', honor: 'Keeps the lights on for everyone else’s big night.' },
  { key: '03-roofer', no: '03', trade: 'THE ROOFER', honor: 'Stands between your family and the sky.' },
  { key: '04-hvac', no: '04', trade: 'THE HVAC TECH', honor: 'First call on the coldest morning of the year.' },
  { key: '05-landscaper', no: '05', trade: 'THE LANDSCAPER', honor: 'Plants things strangers slow down to look at.' },
  { key: '06-painter', no: '06', trade: 'THE PAINTER', honor: 'Cuts a line straight enough to trust by eye.' },
  { key: '07-carpenter', no: '07', trade: 'THE CARPENTER', honor: 'Measures twice so it stands for fifty years.' },
  { key: '08-mechanic', no: '08', trade: 'THE MECHANIC', honor: 'Hears what your car has been trying to say.' },
  { key: '09-barber', no: '09', trade: 'THE BARBER', honor: 'Sends everyone out taller than they came in.' },
  { key: '10-baker', no: '10', trade: 'THE BAKER', honor: 'Up at four so the town smells like morning.' },
  { key: '11-florist', no: '11', trade: 'THE FLORIST', honor: 'On call for the best day and the worst day.' },
  { key: '12-cafe', no: '12', trade: 'THE COFFEE HOUSE', honor: 'Knows the order before the door swings shut.' },
  { key: '13-welder', no: '13', trade: 'THE WELDER', honor: 'Joins what the world calls broken for good.' },
  { key: '14-cleaner', no: '14', trade: 'THE CLEANER', honor: 'The reason walking in feels like a deep breath.' },
  { key: '15-mover', no: '15', trade: 'THE MOVER', honor: 'Carries a whole life like it belongs to them.' },
  { key: '16-excavator', no: '16', trade: 'THE EXCAVATOR', honor: 'Reads the ground before anything can rise.' },
  { key: '17-plow', no: '17', trade: 'THE PLOW DRIVER', honor: 'Out at three so the town opens at eight.' },
  { key: '18-rancher', no: '18', trade: 'THE RANCHER', honor: 'Feeds first and eats last, every morning.' },
  { key: '19-cook', no: '19', trade: 'THE LINE COOK', honor: 'Feeds the rush without leaving the fire.' },
  { key: '20-handyman', no: '20', trade: 'THE HANDYMAN', honor: 'The number half the town keeps on the fridge.' },
];

// Per-plate crop tuning after eyeballing the art. Default center 42%.
const POS = {};

function art(key) {
  const p = path.join(HERE, 'art', `${key}.png`);
  if (!fs.existsSync(p)) throw new Error(`missing plate art/${key}.png, run gen-art.mjs first`);
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function cardHTML(c) {
  return `
  <div class="c"><div class="frame">
    <div class="plate"><img src="${art(c.key)}" style="object-position:${POS[c.key] || 'center 42%'}"><i></i></div>
    <div class="inner">
      <div class="eye"><span>THE MAIN STREET TWENTY</span><b></b><span>No. ${c.no} of 20</span></div>
      <h1>${c.trade}</h1>
      <p class="honor">${c.honor}</p>
      <p class="series">${SERIES}</p>
      <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
    </div>
  </div></div>`;
}

// The square cut is 270px shorter than the feed cut but carries the same type
// stack, so at 566 the leftover height pooled into one dead cream band above
// the series line (.series is margin-top:auto, all slack lands in one gap).
// The art takes that height back instead.
const PLATE_H = SQUARE ? 672 : 800;
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:#F2EAD8;padding:24px}
.frame{width:100%;height:100%;border:3px solid #26321F;outline:1px solid #26321F;outline-offset:-11px;
  display:flex;flex-direction:column;overflow:hidden;background:#F2EAD8}
.plate{position:relative;height:${PLATE_H}px;flex:none;overflow:hidden;margin:11px 11px 0}
.plate img{width:100%;height:100%;object-fit:cover;display:block}
.plate i{position:absolute;left:0;right:0;bottom:0;height:90px;
  background:linear-gradient(180deg,rgba(242,234,216,0) 0%,#F2EAD8 97%)}
.inner{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:${SQUARE ? '10px 54px 30px' : '16px 58px 40px'};min-height:0;color:#26321F}
.eye{display:flex;align-items:center;gap:16px;width:100%;flex:none;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 14.5 : 16}px;letter-spacing:.22em;color:#9C4A2B}
.eye b{flex:1;height:1px;background:#26321F;opacity:.4}
h1{font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:.045em;
  font-size:${SQUARE ? 88 : 112}px;line-height:1;margin-top:${SQUARE ? 12 : 22}px;white-space:nowrap}
.honor{font-family:'Lora',serif;font-style:italic;font-weight:500;color:#9C4A2B;
  font-size:${SQUARE ? 30 : 37}px;line-height:1.25;margin-top:${SQUARE ? 10 : 18}px;max-width:900px;text-wrap:balance}
.series{font-family:'DM Sans',sans-serif;font-size:${SQUARE ? 16.5 : 19}px;color:rgba(38,50,31,.62);
  margin-top:auto;padding-top:${SQUARE ? 8 : 12}px}
.bar{display:flex;justify-content:space-between;width:100%;border-top:2px solid #26321F;
  margin-top:${SQUARE ? 10 : 14}px;padding-top:13px;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13.5 : 15}px;letter-spacing:.18em;color:rgba(38,50,31,.75)}
`;

const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const JOBS = only ? CARDS.filter((c) => c.key === only) : CARDS;
if (!JOBS.length) { console.error(`no card named ${only}`); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const c of JOBS) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=Lora:ital,wght@1,500;1,600&family=DM+Sans:wght@400;500&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>${cardHTML(c)}</body></html>`;
  const file = path.join(OUT, `${c.key}.html`);
  fs.writeFileSync(file, html);
  await page.goto('file:///' + file.replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  // The trade name is nowrap, and .inner is a centered flex column, so the h1
  // shrink-wraps its text and any excess spills symmetrically past the padding
  // into .frame's overflow:hidden. THE COFFEE HOUSE is 924px against a 910px
  // measure today: only into the margin, but a longer name in a trade clone
  // (this render is meant to be copied per vertical) would reach the frame and
  // clip. Measuring the h1's own box against the parent's content width is the
  // only comparison that catches it; h1.scrollWidth equals h1.clientWidth here
  // precisely because the element is shrink-to-fit.
  const fitted = await page.evaluate((floor) => {
    const h = document.querySelector('h1');
    const inner = h.parentElement;
    const cs = getComputedStyle(inner);
    const avail = inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let size = parseFloat(getComputedStyle(h).fontSize);
    while (h.getBoundingClientRect().width > avail && size > floor) {
      size -= 1;
      h.style.fontSize = `${size}px`;
    }
    return size;
  }, SQUARE ? 62 : 78);
  await page.screenshot({ path: path.join(OUT, `${c.key}.png`) });
  const base = SQUARE ? 88 : 112;
  console.log(`OK ${SQUARE ? 'square' : 'feed'} ${c.key}${fitted < base ? `  (headline ${base}->${fitted}px)` : ''}`);
}
await browser.close();
