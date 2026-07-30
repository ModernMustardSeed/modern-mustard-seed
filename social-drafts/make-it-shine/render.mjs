#!/usr/bin/env node
// Set ten v2: THE LIT WINDOW. Cinematic dusk paintings (fal, art/scene-*.png)
// with a REAL site we built floating in the glow. Showcase set for other
// people's groups; the free-demo invite rides the comments.
// Usage: node render.mjs            -> cards/         (1080x1350 feed)
//        node render.mjs --square   -> cards-square/  (1080x1080 X cut)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080, H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p, mime) => `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
const scene = (k) => b64(path.join(HERE, 'art', `${k}.png`), 'image/png');
const shotLocal = (k) => b64(path.join(HERE, 'shots', `${k}.png`), 'image/png');
const shotWork = (k) => b64(path.join(HERE, '..', '..', 'public', 'work-shots', `${k}.jpg`), 'image/jpeg');

const KICK = 'Yours would look nothing like these. That is the point.';

const CARDS = [
  {
    key: '01-wildmere', scene: 'scene-honey', shot: shotLocal('wildmere'), pos: 'center 30%',
    chip: 'WILDMERE HONEY CO.',
    head: 'A honey company’s site that pours like golden hour.',
  },
  {
    key: '02-cross-covenant', scene: 'scene-apparel', shot: shotLocal('cross-covenant'), pos: 'center 56%',
    chip: 'CROSS + COVENANT',
    head: 'A faith apparel house with a real storefront.',
  },
  {
    key: '03-hall-roofing', scene: 'scene-roofing', shot: shotWork('hall-roofing'), pos: 'center 42%',
    chip: 'HALL ROOFING',
    head: 'A roofing site that answers the phone at midnight.',
  },
  {
    key: '04-chinatown', scene: 'scene-restaurant', shot: shotWork('chinatown'), pos: 'center 40%',
    chip: 'CHINATOWN',
    head: 'A restaurant site that takes calls through dinner rush.',
  },
  {
    key: '05-wild-hope', scene: 'scene-lodge', shot: shotWork('wild-hope'), pos: 'center 42%',
    chip: 'WILD HOPE',
    head: 'A mountain stay you can smell the pines through.',
  },
  {
    key: '06-dd-landscaping', scene: 'scene-garden', shot: shotWork('dd-landscaping'), pos: 'center 40%',
    chip: 'D&D LANDSCAPING',
    head: 'A landscaping site as sharp as the Saturday lawns.',
  },
];

function cardHTML(c, i) {
  return `
  <div class="c">
    <img class="scene" src="${scene(c.scene)}" style="object-position:${c.pos}">
    <div class="eye"><span>SITES WE BUILT</span><span>0${i + 1} / 06</span></div>
    <div class="panel">
      <span class="chip">${c.chip}</span>
      <img src="${c.shot}">
    </div>
    <div class="scrim">
      <h1>${c.head}</h1>
      <p class="kick">${KICK}</p>
      <div class="bar"><span>MODERN MUSTARD SEED</span><span>FREE DEMO OF YOURS · MODERNMUSTARDSEED.COM/DEMOS</span></div>
    </div>
  </div>`;
}

const PANEL = SQUARE
  ? { top: 400, left: 90, height: 400 }
  : { top: 560, left: 90, height: 480 };

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:#0E2233;position:relative;overflow:hidden;font-family:'DM Sans',sans-serif}
.scene{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.eye{position:absolute;left:52px;right:52px;top:44px;display:flex;justify-content:space-between;z-index:6;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 16 : 18}px;letter-spacing:.26em;color:#FFF3DC;
  text-shadow:0 2px 14px rgba(0,0,0,.75)}
.panel{position:absolute;left:${PANEL.left}px;right:${PANEL.left}px;top:${PANEL.top}px;height:${PANEL.height}px;z-index:5;
  border:6px solid #FFF3DC;background:#0b0b0b;
  box-shadow:0 30px 70px rgba(0,0,0,.65), 0 0 90px 12px rgba(245,166,35,.32)}
.panel img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.panel .chip{position:absolute;left:-6px;top:-27px;transform:translateY(-100%);background:#0F1822;color:#FFF3DC;
  border:2px solid rgba(255,243,220,.85);padding:12px 20px;font-family:'JetBrains Mono',monospace;
  font-size:${SQUARE ? 16 : 18}px;letter-spacing:.2em;font-weight:700}
.scrim{position:absolute;left:0;right:0;bottom:0;z-index:6;padding:${SQUARE ? '120px 54px 40px' : '150px 58px 48px'};
  background:linear-gradient(180deg,rgba(8,13,20,0) 0%,rgba(8,13,20,.85) 46%,rgba(8,13,20,.96) 100%)}
h1{font-family:'DM Serif Display',serif;font-size:${SQUARE ? 44 : 52}px;line-height:1.1;color:#FFF3DC;
  letter-spacing:-.01em;text-wrap:balance;max-width:920px}
.kick{font-size:${SQUARE ? 20 : 23}px;font-weight:700;color:#F5A623;margin-top:${SQUARE ? 10 : 14}px}
.bar{display:flex;justify-content:space-between;gap:20px;border-top:2px solid rgba(245,166,35,.5);
  padding-top:${SQUARE ? 12 : 15}px;margin-top:${SQUARE ? 16 : 20}px;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 12.5 : 14}px;letter-spacing:.14em;color:rgba(255,243,220,.85)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (let i = 0; i < CARDS.length; i++) {
  const c = CARDS[i];
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>${cardHTML(c, i)}</body></html>`;
  const file = path.join(OUT, `${c.key}.html`);
  fs.writeFileSync(file, html);
  await page.goto('file:///' + file.replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${c.key}.png`) });
  console.log(`OK ${SQUARE ? 'square' : 'feed'} ${c.key}`);
}
await browser.close();
