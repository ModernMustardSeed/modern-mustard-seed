#!/usr/bin/env node
// Set ten: THE MARQUEE (See Yours / make it shine). The mirror set for other
// people's groups: your name in warm bulbs over Main Street, and a free
// talking-website demo behind the link in the comments. Drawn entirely in
// code: sign board, bulb ring, red header, slab letters. No image model.
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

const NIGHT = '#1A140E', IVORY = '#FFF8E7', BULB = '#FFE9B8', GLOW = '#FFD98A', RED = '#D64533', INK = '#3A2E1F';

const CARDS = [
  {
    key: '01-your-name', bar: 'TONIGHT AND EVERY NIGHT', sign: ['YOUR', 'NAME', 'HERE.'],
    head: 'Ever seen your business with its name in lights?',
    kick: 'You’re about to.',
    sub: 'We build designer talking websites for local businesses. And we will build a demo of yours, just so you can look at it.',
  },
  {
    key: '02-it-talks', bar: 'THE TALKING WEBSITE', sign: ['IT', 'TALKS.'],
    head: 'A designer website that answers out loud.',
    kick: 'First of its kind.',
    sub: 'What a visitor reads on the page is exactly what a caller hears at midnight. One brain, one voice, yours.',
  },
  {
    key: '03-free-to-see', bar: 'ADMISSION FREE · NO CARD', sign: ['FREE', 'TO SEE.'],
    head: 'We build a real demo for YOUR business. Free.',
    kick: 'No card. No call. Just look.',
    sub: 'Sixty seconds of questions about your business, and the forge does the rest. You get a link to a real, working demo made for you.',
  },
  {
    key: '04-one-of-one', bar: 'NOT A TEMPLATE', sign: ['ONE', 'OF ONE.'],
    head: 'Built from your actual business. Not a template.',
    kick: 'Your trade, your town, your voice.',
    sub: 'It reads what you tell it, your services, your hours, even your current website, and dresses your business the way it deserves.',
  },
  {
    key: '05-go-see-yours', bar: 'LINK IN THE COMMENTS', sign: ['GO SEE', 'YOURS.'], arrow: true,
    head: 'Go look at yours.',
    kick: 'Two minutes, start to shine.',
    sub: 'Type in your business. See it lit up. Worst case, you spend a couple of minutes admiring what could be.',
  },
  {
    key: '06-make-it-shine', bar: 'MAIN STREET, ANYWHERE', sign: ['MAKE IT', 'SHINE.'], sparks: true,
    head: 'Best way to make your business thrive? Make it shine.',
    kick: 'Tonight and every night.',
    sub: 'People pick the business that looks alive. The lights are how they know. Yours should be on.',
  },
];

// geometry per cut
const G = SQUARE
  ? { barY: 128, barH: 66, boardY: 208, boardH: 384, nameSize3: 84, nameSize2: 102 }
  : { barY: 190, barH: 82, boardY: 288, boardH: 500, nameSize3: 104, nameSize2: 126 };

function bulbs() {
  const inset = 32, top = G.boardY + inset, bot = G.boardY + G.boardH - inset;
  const pts = [];
  for (let x = 122; x <= 958; x += 76) pts.push([x, top], [x, bot]);
  for (let y = top + 76; y <= bot - 40; y += 76) pts.push([122, y], [958, y]);
  return pts
    .map(
      ([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="${GLOW}" opacity=".26"/>
                   <circle cx="${x}" cy="${y}" r="10" fill="${BULB}"/>
                   <circle cx="${x - 3}" cy="${y - 3}" r="3.6" fill="#FFFFFF"/>`,
    )
    .join('');
}

function spark(cx, cy, r, o = 1) {
  return `<path d="M${cx},${cy - r} Q${cx + r * 0.12},${cy - r * 0.12} ${cx + r},${cy} Q${cx + r * 0.12},${cy + r * 0.12} ${cx},${cy + r} Q${cx - r * 0.12},${cy + r * 0.12} ${cx - r},${cy} Q${cx - r * 0.12},${cy - r * 0.12} ${cx},${cy - r}Z" fill="#FFFFFF" opacity="${o}"/>`;
}

function signSVG(c) {
  const arrow = c.arrow
    ? `<g transform="translate(540 ${G.boardY + G.boardH + 8})">
         <polygon points="-46,6 46,6 0,52" fill="${RED}"/>
         <polygon points="-24,54 24,54 0,84" fill="${RED}" opacity=".75"/>
       </g>`
    : '';
  const sparks = c.sparks
    ? `${spark(150, G.barY - 46, 26, 0.95)}${spark(942, G.boardY + 40, 20, 0.8)}${spark(84, G.boardY + G.boardH - 60, 18, 0.7)}${spark(1002, G.barY + 10, 14, 0.85)}`
    : '';
  return `<svg class="sign" viewBox="0 0 1080 ${H}">
    <rect x="90" y="${G.boardY}" width="900" height="${G.boardH}" rx="30" fill="${IVORY}" stroke="${INK}" stroke-width="9"/>
    <rect x="60" y="${G.barY}" width="960" height="${G.barH}" rx="16" fill="${RED}"/>
    ${bulbs()}${arrow}${sparks}
  </svg>`;
}

function cardHTML(c) {
  const lines = c.sign.length;
  const size = lines === 3 ? G.nameSize3 : G.nameSize2;
  return `
  <div class="c">
    ${signSVG(c)}
    <div class="inner">
      <p class="bartext" style="top:${G.barY + G.barH / 2}px">${c.bar}</p>
      <div class="name" style="top:${G.boardY + G.boardH / 2}px;font-size:${size}px">${c.sign.join('<br>')}</div>
      <div class="foot">
        <h1>${c.head}</h1>
        <p class="kick">${c.kick}</p>
        <p class="sub">${c.sub}</p>
        <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM/DEMOS</span></div>
      </div>
    </div>
  </div>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:${NIGHT};color:${IVORY};font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
.c::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 78% ${SQUARE ? 40 : 36}% at 50% ${SQUARE ? 34 : 32}%, rgba(255,217,138,.24) 0%, rgba(255,217,138,0) 72%)}
.sign{position:absolute;inset:0;width:100%;height:100%}
.inner{position:relative;height:100%}
.bartext{position:absolute;left:0;right:0;transform:translateY(-50%);text-align:center;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 17 : 20}px;letter-spacing:.32em;color:${IVORY};font-weight:700}
.name{position:absolute;left:150px;right:150px;transform:translateY(-50%);text-align:center;
  font-family:'Alfa Slab One',serif;line-height:1.08;color:${INK}}
.foot{position:absolute;left:${SQUARE ? 54 : 58}px;right:${SQUARE ? 54 : 58}px;bottom:${SQUARE ? 40 : 48}px;
  display:flex;flex-direction:column;gap:${SQUARE ? 10 : 13}px;text-align:center;align-items:center}
h1{font-size:${SQUARE ? 44 : 54}px;font-weight:800;letter-spacing:-.02em;line-height:1.08;max-width:900px;text-wrap:balance}
.kick{font-size:${SQUARE ? 24 : 28}px;font-weight:700;color:${GLOW}}
.sub{font-size:${SQUARE ? 18.5 : 21}px;line-height:1.5;color:rgba(255,248,231,.78);max-width:${SQUARE ? 840 : 800}px}
.bar{display:flex;justify-content:space-between;width:100%;border-top:2px solid rgba(255,217,138,.45);padding-top:${SQUARE ? 12 : 15}px;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13.5 : 15}px;letter-spacing:.16em;color:rgba(255,248,231,.8)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const c of CARDS) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=DM+Sans:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
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
