#!/usr/bin/env node
// Set thirteen: THE MUSTARD SEED TWENTY. Twenty WPA-style Kingdom-trade posters,
// Codex plates (gen-art.mjs) on cream with the same double-rule poster frame as
// main-street-twenty. No stats, no pitch: honor line + scripture reference.
// Usage: node render.mjs             -> cards/         (1080x1350 feed)
//        node render.mjs --square    -> cards-square/  (1080x1080 X cut, re-typeset)
//        node render.mjs 09-gardener -> just that card (same filter shape as gen-art.mjs)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080, H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const SERIES = 'Twenty posters for the trades the Kingdom was told through.';

const CARDS = [
  { key: '01-sower', no: '01', trade: 'THE SOWER', ref: 'MATTHEW 13:3', honor: 'Scatters like the seed will never run out.' },
  { key: '02-shepherd', no: '02', trade: 'THE SHEPHERD', ref: 'LUKE 15:4', honor: 'Counts to ninety-nine and heads back out.' },
  { key: '03-fisherman', no: '03', trade: 'THE FISHERMAN', ref: 'MATTHEW 4:19', honor: 'The first ones called were mid-shift at this job.' },
  { key: '04-vinedresser', no: '04', trade: 'THE VINEDRESSER', ref: 'JOHN 15:2', honor: 'Prunes what he loves so it bears more.' },
  { key: '05-builder', no: '05', trade: 'THE BUILDER', ref: 'LUKE 6:48', honor: 'Digs past the sand until the footing is rock.' },
  { key: '06-baker', no: '06', trade: 'THE BAKER', ref: 'MATTHEW 13:33', honor: 'Works the leaven through all three measures.' },
  { key: '07-carpenter', no: '07', trade: 'THE CARPENTER', ref: 'MARK 6:3', honor: 'The trade heaven chose for thirty quiet years.' },
  { key: '08-potter', no: '08', trade: 'THE POTTER', ref: 'JEREMIAH 18:4', honor: 'Makes it again instead of throwing it away.' },
  { key: '09-gardener', no: '09', trade: 'THE GARDENER', ref: 'JOHN 20:15', honor: 'On the third morning, the Lord was taken for one.' },
  { key: '10-harvester', no: '10', trade: 'THE HARVESTER', ref: 'MATTHEW 9:37', honor: 'Says the harvest is plenty. Prays for hands.' },
  { key: '11-lamplighter', no: '11', trade: 'THE LAMPLIGHTER', ref: 'MATTHEW 5:15', honor: 'Sets the lamp on the stand, never under it.' },
  { key: '12-pearl-merchant', no: '12', trade: 'THE PEARL MERCHANT', ref: 'MATTHEW 13:46', honor: 'Sold the whole inventory for the one.' },
  { key: '13-treasure-finder', no: '13', trade: 'THE TREASURE FINDER', ref: 'MATTHEW 13:44', honor: 'Sells everything for one field and calls it joy.' },
  { key: '14-net-mender', no: '14', trade: 'THE NET MENDER', ref: 'MARK 1:19', honor: 'Was mending nets when the call came.' },
  { key: '15-tentmaker', no: '15', trade: 'THE TENTMAKER', ref: 'ACTS 18:3', honor: 'Paid for the letters with needle and canvas.' },
  { key: '16-dyer', no: '16', trade: 'THE DYER', ref: 'ACTS 16:14', honor: 'Sold purple. Then hosted the first church in Europe.' },
  { key: '17-seamstress', no: '17', trade: 'THE SEAMSTRESS', ref: 'ACTS 9:39', honor: 'Every widow in town kept what she made them.' },
  { key: '18-watchman', no: '18', trade: 'THE WATCHMAN', ref: 'PSALM 130:6', honor: 'The Psalms measure waiting by this shift.' },
  { key: '19-physician', no: '19', trade: 'THE PHYSICIAN', ref: 'COLOSSIANS 4:14', honor: 'Comes when called. The letters say beloved.' },
  { key: '20-mustard-seed', no: '20', trade: 'THE MUSTARD SEED', ref: 'MATTHEW 13:32', honor: 'Smallest seed in the drawer. Ask the birds.' },
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
      <div class="eye"><span>THE MUSTARD SEED TWENTY</span><b></b><span>No. ${c.no} of 20</span></div>
      <h1>${c.trade}</h1>
      <p class="honor">${c.honor}</p>
      <p class="ref">${c.ref}</p>
      <p class="series">${SERIES}</p>
      <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
    </div>
  </div></div>`;
}

// Same slack math as main-street-twenty (.series is margin-top:auto, all
// leftover height pools into one gap), minus room for the scripture ref line.
const PLATE_H = SQUARE ? 630 : 764;
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
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 14.5 : 16}px;letter-spacing:.22em;color:#3B6B8A}
.eye b{flex:1;height:1px;background:#26321F;opacity:.4}
h1{font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:.045em;
  font-size:${SQUARE ? 88 : 112}px;line-height:1;margin-top:${SQUARE ? 12 : 22}px;white-space:nowrap}
.honor{font-family:'Lora',serif;font-style:italic;font-weight:500;color:#3B6B8A;
  font-size:${SQUARE ? 30 : 37}px;line-height:1.25;margin-top:${SQUARE ? 10 : 18}px;max-width:900px;text-wrap:balance}
.ref{font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 14 : 16}px;letter-spacing:.3em;
  color:rgba(38,50,31,.55);margin-top:${SQUARE ? 10 : 14}px}
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
  // Long trade names (THE TREASURE FINDER runs past the 910px measure) would
  // ship silently clipped by the overflow:hidden frame. The h1 is a nowrap
  // flex item so it never shrinks below its text: scrollWidth === clientWidth
  // always, and that comparison only fires on sub-pixel rounding luck. Measure
  // the h1's real box against its parent's content width instead.
  const fitted = await page.evaluate((floor) => {
    const h = document.querySelector('h1');
    const p = h.parentElement;
    const ps = getComputedStyle(p);
    const limit = p.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
    let size = parseFloat(getComputedStyle(h).fontSize);
    while (h.getBoundingClientRect().width > limit && size > floor) {
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
