#!/usr/bin/env node
// Set six: NOW SHOWING (reviews). Prestige film one-sheet: engraved fal plates
// on bone paper, star row, Fraunces. Sourced numbers printed on every stat card.
// Usage: node render.mjs            -> cards/         (1080x1350 feed)
//        node render.mjs --square   -> cards-square/  (1080x1080 X cut, re-typeset)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080, H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const SRC = 'BrightLocal Local Consumer Review Survey · 1,002 US consumers · 2026';

const CARDS = [
  {
    key: '01-everyone', no: '01', num: '97', unit: '%', pos: 'center 74%',
    head: 'read the reviews before they ever walk in.',
    kick: 'Your storefront has a comments section now.',
    sub: 'Not some of your customers. Ninety-seven in a hundred. The question is not whether your business gets reviewed, it is whether you are in the conversation about it.',
    foot: SRC,
  },
  {
    key: '02-four-stars', no: '02', num: '68', unit: '%', pos: 'center 44%',
    head: 'will not even consider you under four stars.',
    kick: 'The cut line is higher than you think.',
    sub: 'Two in three filter at four stars before they read a single word. One rough review does not sink you. A thin, stale profile keeps you out of the running entirely.',
    foot: SRC,
  },
  {
    key: '03-fresh-ink', no: '03', num: '74', unit: '%', pos: 'center 58%',
    head: 'only trust reviews from the last three months.',
    kick: 'Last year’s rave is already yesterday’s paper.',
    sub: 'Reviews age like posters in the rain. A steady trickle of fresh ones beats a wall of old praise, so the ask never stops: one happy customer, one honest sentence, this week.',
    foot: SRC,
  },
  {
    key: '04-box-office', no: '04', num: '71', unit: '%', pos: 'center 46%',
    head: 'check Google before they buy the ticket.',
    kick: 'The box office window is open all night.',
    sub: 'Seven in ten read what the town says about you on Google before they spend. Your profile is the window they lean into. If it is dark, they walk to the next marquee.',
    foot: SRC,
  },
  {
    key: '05-say-something', no: '05', pos: 'center 43%',
    head: 'Reply to your oldest unanswered review today.',
    kick: 'The mic is still on.',
    sub: 'Praise or poison, an answered review says somebody is home. Two sentences, signed with your name. You write it for the next hundred people who read it, not the one who wrote it.',
    foot: 'THE DARE · TELL THE GROUP WHICH REVIEW YOU PICKED',
  },
  {
    key: '06-take-two', no: '06', pos: 'center 55%',
    head: 'A bad review is not the ending. It is take two.',
    kick: 'Every classic has one rotten notice.',
    sub: 'Answer it kind and factual, fix what was true, and let it sit. A wall of five stars with one honest scar and a calm reply reads more real than perfection ever does.',
    foot: 'NOW SHOWING · A SIX-CARD FEATURE ON REVIEWS',
  },
];

function starPts(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(' ');
}
const STARS = `<svg class="stars" viewBox="0 0 380 56">${[0, 1, 2, 3, 4]
  .map((i) => `<polygon points="${starPts(44 + i * 73, 28, 24)}" fill="#B9962B"/>`)
  .join('')}</svg>`;

function art(key) {
  const p = path.join(HERE, 'art', `${key}.png`);
  if (!fs.existsSync(p)) return '';
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function cardHTML(c) {
  const plate = art(c.key);
  const numBlock = c.num
    ? `<div class="num">${c.num}<u>${c.unit}</u></div><h1>${c.head}</h1>`
    : `<h1 class="solo">${c.head}</h1>`;
  return `
  <div class="c">
    ${plate ? `<div class="plate"><img src="${plate}" style="object-position:${c.pos || 'center 50%'}"><i></i></div>` : ''}
    <div class="inner">
      <div class="eye"><span>NOW SHOWING</span><b></b><span>SET SIX / ${c.no}</span></div>
      <div class="mid">
        ${STARS}
        ${numBlock}
        <p class="kick">${c.kick}</p>
        <p class="sub">${c.sub}</p>
      </div>
      <div class="foot">
        <p class="src">${c.foot}</p>
        <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
      </div>
    </div>
  </div>`;
}

const PLATE_H = SQUARE ? 380 : 560;
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:#F2EDE3;color:#14110C;font-family:'Fraunces',serif;
  position:relative;display:flex;flex-direction:column}
.plate{position:relative;height:${PLATE_H}px;flex:none;overflow:hidden}
.plate img{width:100%;height:100%;object-fit:cover;display:block}
.plate i{position:absolute;left:0;right:0;bottom:0;height:130px;
  background:linear-gradient(180deg,rgba(242,237,227,0) 0%,#F2EDE3 96%)}
.inner{flex:1;display:flex;flex-direction:column;padding:${SQUARE ? '26px 54px 40px' : '30px 58px 48px'};min-height:0}
.eye{display:flex;align-items:center;gap:16px;flex:none;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 15 : 17}px;letter-spacing:.24em;color:#7A2E2B}
.eye b{flex:1;height:1px;background:#14110C;opacity:.35}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:0}
.stars{width:${SQUARE ? 250 : 300}px;height:${SQUARE ? 38 : 46}px;margin-bottom:${SQUARE ? 12 : 18}px;flex:none}
.num{font-weight:900;font-size:${SQUARE ? 168 : 210}px;line-height:.85;letter-spacing:-.04em;font-variation-settings:'opsz' 144}
.num u{text-decoration:none;font-size:.36em;color:#7A2E2B}
h1{font-weight:600;font-size:${SQUARE ? 40 : 47}px;line-height:1.1;max-width:900px;margin-top:${SQUARE ? 10 : 14}px;letter-spacing:-.015em;text-wrap:balance}
h1.solo{font-weight:900;font-size:${SQUARE ? 58 : 68}px;line-height:1.06;max-width:880px;font-variation-settings:'opsz' 144}
.kick{font-style:italic;font-weight:500;font-size:${SQUARE ? 27 : 31}px;color:#7A2E2B;margin-top:${SQUARE ? 12 : 16}px}
.sub{font-family:'Inter',sans-serif;font-size:${SQUARE ? 18.5 : 20.5}px;line-height:1.5;color:rgba(20,17,12,.72);
  max-width:${SQUARE ? 830 : 800}px;margin-top:${SQUARE ? 14 : 20}px}
.foot{flex:none;display:flex;flex-direction:column;gap:13px;align-items:center}
.src{font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13 : 14.5}px;letter-spacing:.06em;color:rgba(20,17,12,.55);text-align:center}
.bar{display:flex;justify-content:space-between;width:100%;border-top:2px solid #14110C;padding-top:14px;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13.5 : 15}px;letter-spacing:.18em;color:rgba(20,17,12,.7)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const c of CARDS) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,900;1,9..144,500&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>${cardHTML(c)}</body></html>`;
  const file = path.join(OUT, `${c.key}.html`);
  fs.writeFileSync(file, html);
  await page.goto('file:///' + file.replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${c.key}.png`) });
  console.log(`OK ${SQUARE ? 'square' : 'feed'} ${c.key}`);
}
await browser.close();
