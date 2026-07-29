#!/usr/bin/env node
// Set seven: THE METRO (get found). Transit-map wayfinding drawn entirely in
// code: warm paper, four route lines with 45-degree bends, stations, and a
// YOU ARE HERE roundel. No generated art, no image wallet.
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

const INK = '#17150F';
const LINES = ['#D62828', '#1D4ED8', '#0F8A4B', '#F5B700'];

const CARDS = [
  {
    key: '01-start-here', eye: 'STOP 01', tag: 'GET FOUND', num: '67', unit: '%',
    head: 'start at Google when they need someone local.',
    kick: 'If your pin is wrong, you are not on the map.',
    src: 'DreamHost Local Business Trust Index · 1,201 US consumers · 2026',
    ring: [430, 430],
  },
  {
    key: '02-the-pin', eye: 'STOP 02', tag: 'THE PIN',
    head: 'Your pin says closed. The town reads gone.',
    kick: 'Hours, address, phone. The same everywhere, or invisible.',
    src: 'A MISMATCHED PROFILE READS ABANDONED TO EVERYTHING THAT INDEXES IT',
    ring: [650, 380],
  },
  {
    key: '03-the-photos', eye: 'STOP 03', tag: 'PROOF',
    head: 'Real photos are proof of life on the map.',
    kick: 'Shots of actual jobs beat a logo on an empty profile.',
    src: 'PHONE PHOTOS ARE FINE. TEN REAL ONES BEAT ONE PERFECT ONE',
    ring: [300, 360],
  },
  {
    key: '04-the-schedule', eye: 'STOP 04', tag: 'THE SCHEDULE',
    head: 'Your reviews ride this line too.',
    kick: 'Ask one happy customer a week. That is the whole schedule.',
    src: 'ASK IN PERSON, SAME DAY, WHILE THE JOB IS STILL WARM',
    ring: [560, 300],
  },
  {
    key: '05-search-yourself', eye: 'THE DARE', tag: 'INCOGNITO',
    head: 'Search your trade and your town. Incognito.',
    kick: 'Are you on the map, or under it?',
    src: 'FREE GRADE ON WHAT THE MACHINES SEE · MODERNMUSTARDSEED.COM/WEBSITE-AUDIT',
    ring: [430, 500],
  },
  {
    key: '06-three-stops', eye: 'THE LINE MAP', tag: 'ALL FREE',
    head: 'Three stops to findable.',
    kick: 'All three are free. None of them need a marketing degree.',
    list: [
      'Claim the Google profile and fill in every field it offers.',
      'Match hours, address, and phone everywhere they appear.',
      'Add new photos and answer reviews, weekly.',
    ],
    src: 'THE WHOLE ROUTE TAKES ONE HONEST AFTERNOON',
    ring: [700, 400],
  },
];

// Base route network (45-degree bends). Per card: mirror alternates, colors
// rotate, and a vertical drift keeps every card's landform unique.
const BASE = [
  [[-20, 150], [260, 150], [430, 320], [430, 620], [640, 830], [1100, 830]],
  [[160, -20], [160, 380], [340, 560], [340, 1370]],
  [[-20, 520], [300, 520], [480, 340], [760, 340], [900, 200], [900, -20]],
  [[620, -20], [620, 240], [800, 420], [800, 700], [1000, 900], [1100, 900]],
];

function mapSVG(i, ring) {
  const mirror = i % 2 === 1;
  const dy = (i % 3) * 60 - 60;
  const tx = (p) => [mirror ? 1080 - p[0] : p[0], p[1] + dy];
  const routes = BASE.map((pts, r) => {
    const color = LINES[(r + i) % 4];
    const d = 'M' + pts.map((p) => tx(p).join(',')).join(' L');
    return `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="28" stroke-linejoin="round" stroke-linecap="round"/>
            <path d="${d}" fill="none" stroke="${color}" stroke-width="17" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const stations = [BASE[0][1], BASE[1][1], BASE[2][1], BASE[3][1], BASE[2][3]]
    .map((p) => {
      const [x, y] = tx(p);
      return `<circle cx="${x}" cy="${y}" r="13" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/>`;
    }).join('');
  const [rx, ry] = ring;
  const labelLeft = rx > 540;
  const bx = labelLeft ? rx - 36 - 322 - 58 : rx + 36 + 58;
  return `<svg class="map" viewBox="0 0 1080 1350" preserveAspectRatio="xMidYMin slice">
    ${routes}${stations}
    <circle cx="${rx}" cy="${ry}" r="36" fill="#FFFFFF" stroke="${INK}" stroke-width="8"/>
    <circle cx="${rx}" cy="${ry}" r="14" fill="#D62828"/>
    <line x1="${labelLeft ? rx - 36 : rx + 36}" y1="${ry - 18}" x2="${labelLeft ? bx + 322 : bx}" y2="${ry - 52}" stroke="${INK}" stroke-width="4"/>
    <rect x="${bx}" y="${ry - 122}" width="322" height="70" fill="${INK}"/>
    <text x="${bx + 161}" y="${ry - 75}" text-anchor="middle" font-family="Schibsted Grotesk" font-weight="800" font-size="30" letter-spacing="4" fill="#F7F4EC">YOU ARE HERE</text>
  </svg>`;
}

function cardHTML(c, i) {
  const num = c.num ? `<div class="num">${c.num}<u>${c.unit}</u></div>` : '';
  const list = c.list
    ? `<ol>${c.list.map((l, n) => `<li><b>${n + 1}</b><span>${l}</span></li>`).join('')}</ol>`
    : '';
  return `
  <div class="c">
    ${mapSVG(i, c.ring)}
    <div class="plate">
      <div class="eye"><span>${c.eye}</span><b></b><span>${c.tag}</span></div>
      ${num}
      <h1 class="${c.num ? '' : 'solo'}">${c.head}</h1>
      ${list}
      <p class="kick">${c.kick}</p>
      <p class="src">${c.src}</p>
      <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
    </div>
  </div>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:#F7F4EC;color:${INK};position:relative;overflow:hidden;
  font-family:'Schibsted Grotesk',sans-serif}
.c::before{content:'';position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(23,21,15,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(23,21,15,.07) 1px,transparent 1px);
  background-size:60px 60px}
.map{position:absolute;inset:0;width:100%;height:100%}
.plate{position:absolute;left:${SQUARE ? 44 : 52}px;right:${SQUARE ? 44 : 52}px;bottom:${SQUARE ? 44 : 52}px;
  background:#FFFFFF;border:4px solid ${INK};padding:${SQUARE ? '30px 38px 26px' : '38px 44px 32px'};
  display:flex;flex-direction:column;box-shadow:10px 10px 0 0 ${INK}}
.eye{display:flex;align-items:center;gap:16px;font-family:'IBM Plex Mono',monospace;
  font-size:${SQUARE ? 15 : 17}px;letter-spacing:.22em;color:#1D4ED8;font-weight:600}
.eye b{flex:1;height:2px;background:${INK};opacity:.25}
.num{font-weight:800;font-size:${SQUARE ? 138 : 172}px;line-height:.88;letter-spacing:-.05em;margin-top:${SQUARE ? 10 : 16}px}
.num u{text-decoration:none;font-size:.36em;color:#D62828}
h1{font-weight:800;font-size:${SQUARE ? 38 : 44}px;line-height:1.05;letter-spacing:-.025em;margin-top:${SQUARE ? 8 : 10}px;max-width:860px}
h1.solo{font-size:${SQUARE ? 47 : 56}px;margin-top:${SQUARE ? 12 : 18}px}
.kick{font-size:${SQUARE ? 23 : 27}px;font-weight:700;color:#D62828;margin-top:${SQUARE ? 10 : 14}px}
ol{list-style:none;margin-top:${SQUARE ? 12 : 18}px;display:flex;flex-direction:column;gap:${SQUARE ? 8 : 12}px}
ol li{display:flex;gap:16px;align-items:baseline;font-size:${SQUARE ? 21 : 24}px;font-weight:500;line-height:1.3}
ol li b{font-family:'IBM Plex Mono',monospace;color:#1D4ED8;font-weight:600;flex:none}
.src{font-family:'IBM Plex Mono',monospace;font-size:${SQUARE ? 12.5 : 13.5}px;letter-spacing:.05em;
  color:rgba(23,21,15,.55);margin-top:${SQUARE ? 14 : 20}px}
.bar{display:flex;justify-content:space-between;border-top:3px solid ${INK};padding-top:12px;margin-top:12px;
  font-family:'IBM Plex Mono',monospace;font-size:${SQUARE ? 13 : 14.5}px;letter-spacing:.16em;color:rgba(23,21,15,.75);font-weight:600}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (let i = 0; i < CARDS.length; i++) {
  const c = CARDS[i];
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Schibsted+Grotesk:wght@400;500;700;800&display=swap" rel="stylesheet">
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
