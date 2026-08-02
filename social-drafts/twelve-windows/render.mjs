#!/usr/bin/env node
// Set fourteen: THE TWELVE WINDOWS. Twelve KJV verses set over stained glass
// plates (gen-art.mjs) on nave dark, per the approved Cathedral Glass study.
// The verse is ACTUAL SCRIPTURE, quoted exactly; the art carries no text.
// Usage: node render.mjs            -> cards/         (1080x1350 feed)
//        node render.mjs --square   -> cards-square/  (1080x1080 X cut, re-typeset)
//        node render.mjs 03-eagle   -> just that card

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080, H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const CARDS = [
  { key: '01-lamp', no: '01', ref: 'PSALM 119:105', verse: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { key: '02-shepherd', no: '02', ref: 'PSALM 23:1', verse: 'The LORD is my shepherd; I shall not want.' },
  { key: '03-eagle', no: '03', ref: 'ISAIAH 40:31', verse: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { key: '04-be-still', no: '04', ref: 'PSALM 46:10', verse: 'Be still, and know that I am God' },
  { key: '05-rest', no: '05', ref: 'MATTHEW 11:28', verse: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { key: '06-paths', no: '06', ref: 'PROVERBS 3:5-6', verse: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.' },
  { key: '07-strength', no: '07', ref: 'PHILIPPIANS 4:13', verse: 'I can do all things through Christ which strengtheneth me.' },
  { key: '08-shine', no: '08', ref: 'MATTHEW 5:16', verse: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' },
  { key: '09-hills', no: '09', ref: 'PSALM 121:1-2', verse: 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.' },
  { key: '10-courage', no: '10', ref: 'JOSHUA 1:9', verse: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { key: '11-light', no: '11', ref: 'JOHN 8:12', verse: 'I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.' },
  { key: '12-mustard-tree', no: '12', ref: 'MATTHEW 13:31-32', verse: 'The kingdom of heaven is like to a grain of mustard seed, which a man took, and sowed in his field: which indeed is the least of all seeds: but when it is grown, it is the greatest among herbs, and becometh a tree, so that the birds of the air come and lodge in the branches thereof.' },
];

// Per-plate crop tuning after eyeballing the art. Default center 45%.
const POS = {};

function art(key) {
  const p = path.join(HERE, 'art', `${key}.png`);
  if (!fs.existsSync(p)) throw new Error(`missing plate art/${key}.png, run gen-art.mjs first`);
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

// Verses run 8 to 59 words; pick a starting size by length, then the in-page
// guard steps down further if the text block still overflows vertically.
function verseSize(words) {
  const n = words.split(/\s+/).length;
  if (SQUARE) return n <= 15 ? 34 : n <= 30 ? 29 : n <= 45 ? 25 : 22;
  return n <= 15 ? 42 : n <= 30 ? 36 : n <= 45 ? 31 : 27;
}

function cardHTML(c) {
  return `
  <div class="c">
    <div class="plate"><img src="${art(c.key)}" style="object-position:${POS[c.key] || 'center 45%'}"><i></i></div>
    <div class="inner">
      <div class="eye"><span>THE TWELVE WINDOWS</span><b></b><span>No. ${c.no} of 12</span></div>
      <div class="vwrap">
        <p class="verse" style="font-size:${verseSize(c.verse)}px">${c.verse}</p>
        <p class="ref">${c.ref} &middot; KJV</p>
      </div>
      <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
    </div>
  </div>`;
}

const PLATE_H = SQUARE ? 520 : 660;
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;background:#101319}
.c{width:${W}px;height:${H}px;background:#101319;display:flex;flex-direction:column}
.plate{position:relative;height:${PLATE_H}px;flex:none;overflow:hidden}
.plate img{width:100%;height:100%;object-fit:cover;display:block}
.plate i{position:absolute;inset:0;box-shadow:inset 0 -84px 90px rgba(16,19,25,.92), inset 0 30px 50px rgba(16,19,25,.35)}
.inner{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;min-height:0;
  padding:${SQUARE ? '18px 64px 26px' : '24px 72px 34px'};color:#F2E9D2;background:
  radial-gradient(130% 95% at 50% 0%,rgba(201,162,39,.10),rgba(16,19,25,0) 55%),#101319}
.eye{display:flex;align-items:center;gap:16px;width:100%;flex:none;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13.5 : 15}px;letter-spacing:.24em;color:rgba(201,162,39,.75)}
.eye b{flex:1;height:1px;background:#C9A227;opacity:.3}
.vwrap{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  overflow:hidden;margin-top:${SQUARE ? 6 : 10}px}
.verse{font-family:'EB Garamond',serif;font-style:italic;font-weight:400;line-height:1.32;color:#F2E9D2;
  max-width:900px;text-wrap:balance}
.ref{font-family:'Marcellus',serif;font-size:${SQUARE ? 17 : 20}px;letter-spacing:.34em;color:#C9A227;
  margin-top:${SQUARE ? 18 : 26}px}
.bar{display:flex;justify-content:space-between;width:100%;flex:none;border-top:1px solid rgba(201,162,39,.45);
  margin-top:${SQUARE ? 12 : 18}px;padding-top:13px;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 12.5 : 14}px;letter-spacing:.18em;color:rgba(242,233,210,.55)}
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
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@1,400;1,500&family=Marcellus&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>${cardHTML(c)}</body></html>`;
  const file = path.join(OUT, `${c.key}.html`);
  fs.writeFileSync(file, html);
  await page.goto('file:///' + file.replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  // Long verses could overflow the fixed text block; vertical scrollHeight vs
  // clientHeight is reliable here (block flow, unlike the nowrap-h1 width trap).
  const fitted = await page.evaluate((floor) => {
    const wrap = document.querySelector('.vwrap');
    const v = document.querySelector('.verse');
    let size = parseFloat(getComputedStyle(v).fontSize);
    while (wrap.scrollHeight > wrap.clientHeight && size > floor) {
      size -= 1;
      v.style.fontSize = `${size}px`;
    }
    return size;
  }, SQUARE ? 18 : 22);
  await page.screenshot({ path: path.join(OUT, `${c.key}.png`) });
  const base = verseSize(c.verse);
  console.log(`OK ${SQUARE ? 'square' : 'feed'} ${c.key}${fitted < base ? `  (verse ${base}->${fitted}px)` : ''}`);
}
await browser.close();
