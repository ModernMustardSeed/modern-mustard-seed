#!/usr/bin/env node
// Direction study for the NINTH MMS social set: THE TALKING WEBSITE.
//
// Core emotion, named before anything was drawn: RELIEF, with a spark of
// wonder. The buyer is a small business owner drowning in the back office.
// The promise is "it talks, it books, it takes the order, it writes it all
// down, you go do the work." So no cold tech, no stats, no teardown.
//
// Every direction is Mr. Mustard led (the real brand PNG) and every one carries
// the live number and the domain, because the whole point of this product is
// that a stranger can dial it and talk to it inside ten seconds.
//
// Same headline, same sub, same contact bar in all three, so the only variable
// is the design. Usage: node moodboard.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MASCOT =
  'file:///' + path.resolve(HERE, '../../public/brand/mascot-full.png').replace(/\\/g, '/');

const INK = '#161616';
const MUSTARD = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const CREAM = '#FBF6EA';

// ---------------------------------------------------------------- content
const CARD = {
  eyebrow: 'New, and a little strange',
  head: 'YOUR WEBSITE<br>TALKS BACK<br>NOW.',
  sub: 'It answers the phone, books the job, takes the order, and writes it all down while you are on a ladder. Call the number. Ask it anything.',
  site: 'modernmustardseed.com',
  tel: '(406) 312-1223',
};

// ---------------------------------------------------------------- devices
function burst(cx, cy, colour, wedges = 24, r = 1800) {
  let out = '';
  for (let i = 0; i < wedges; i += 2) {
    const a1 = (i / wedges) * Math.PI * 2;
    const a2 = ((i + 1) / wedges) * Math.PI * 2;
    out += `<polygon points="${cx},${cy} ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r} ${
      cx + Math.cos(a2) * r
    },${cy + Math.sin(a2) * r}" fill="${colour}"/>`;
  }
  return out;
}

// concentric "he is speaking" arcs, drawn at his own line weight
const arcs = (cx, cy, n, r0, step, colour, sw = 11, sweep = 1) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = r0 + i * step;
    out += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep} ${cx} ${cy + r}" fill="none"
      stroke="${colour}" stroke-width="${sw}" stroke-linecap="round" opacity="${1 - i * 0.16}"/>`;
  }
  return out;
};

// a rotary handset with a coiled cord, sized for his raised glove
const HANDSET = `<g>
  <path d="M40 96 q0-56 56-56 h34 q24 0 24 26 v52 q0 24-24 24 h-12 q-14 0-14 14 v96
           q0 14 14 14 h12 q24 0 24 24 v52 q0 26-24 26 H96 q-56 0-56-56 z"
        fill="${CREAM}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
</g>`;

// six back-office stations for direction three
const DESKS = [
  'BOOKINGS',
  'ORDERS',
  'FOLLOW UPS',
  'INVOICES',
  'REVIEWS',
  'THE INBOX',
];

// ---------------------------------------------------------------- directions
const DIRECTIONS = [
  {
    id: 'hello',
    name: 'Say Hello',
    thesis:
      'The speech bubble is the whole design. Cream, a mustard sunburst, and one enormous hand inked bubble carrying the line, with Mr. Mustard holding a real handset underneath it. Reads as warm and human in a scrolling feed, and it is the same family as Race Day so the page already looks like a library instead of a pile.',
    type: 'Titan One · DM Sans · JetBrains Mono',
    palette: [CREAM, MUSTARD, INK, RED, '#FFFFFF'],
    card: () => `
      <div class="c hel">
        <svg class="bg" viewBox="0 0 1080 1350">${burst(760, 400, MUSTARD)}</svg>
        <div class="dots"></div>
        <img class="mascot" src="${MASCOT}">
        <svg class="scene" viewBox="0 0 1080 1350">
          ${arcs(742, 906, 4, 104, 40, INK, 10, 0)}
        </svg>
        <svg class="prop" viewBox="0 0 300 400">${HANDSET}</svg>
        <div class="inner">
          <div class="eye">${CARD.eyebrow}</div>
          <div class="bub">
            <h1>${CARD.head}</h1>
          </div>
          <p class="sub">${CARD.sub}</p>
        </div>
        <div class="bar">
          <span>${CARD.site}</span><span class="tel">${CARD.tel}</span>
        </div>
      </div>`,
  },
  {
    id: 'nightshift',
    name: 'The Night Shift',
    thesis:
      'One lit window on a dark street at eleven at night, and the light is him. Near black ground so it is the only dark thing in a white feed, a real pool of lamplight, a sleeping roofline underneath with every other window dead. Sells relief rather than novelty, and it is the strongest scroll stopper of the three.',
    type: 'Anton · DM Sans · JetBrains Mono',
    palette: ['#0A0D14', MUSTARD, '#FFE38A', CREAM, '#2A3040'],
    card: () => {
      // a sleeping street: every other shop dark, dead windows, his is the one lit
      const roof = (() => {
        let o = '';
        const spans = [
          [-30, 210, 300],
          [180, 150, 386],
          [330, 200, 264],
          [1000, 160, 330],
          [860, 150, 250],
        ];
        for (const [x, w, h] of spans) {
          o += `<rect x="${x}" y="${880 - h}" width="${w}" height="${h + 470}" fill="#05070C"/>`;
          for (let r = 0; r < Math.floor(h / 96); r++)
            for (let c = 0; c < Math.floor(w / 70); c++)
              o += `<rect x="${x + 26 + c * 70}" y="${880 - h + 42 + r * 96}" width="30" height="40" rx="3" fill="#151B2A"/>`;
        }
        return o;
      })();
      return `
      <div class="c nig">
        <svg class="bg" viewBox="0 0 1080 1350">
          <defs>
            <radialGradient id="glow" cx="50%" cy="42%" r="58%">
              <stop offset="0%" stop-color="#FFE38A" stop-opacity=".98"/>
              <stop offset="52%" stop-color="${MUSTARD}" stop-opacity=".72"/>
              <stop offset="100%" stop-color="${MUSTARD}" stop-opacity=".18"/>
            </radialGradient>
            <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${MUSTARD}" stop-opacity=".42"/>
              <stop offset="100%" stop-color="${MUSTARD}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="1080" height="1350" fill="#0A0D14"/>
          <ellipse cx="700" cy="450" rx="600" ry="500" fill="${MUSTARD}" opacity=".10"/>
          ${roof}
          <polygon points="524,796 1044,796 1160,1120 410,1120" fill="url(#spill)"/>
          <g>
            <rect x="524" y="176" width="520" height="620" rx="14" fill="url(#glow)"/>
            <rect x="524" y="176" width="520" height="620" rx="14" fill="none" stroke="#0A0D14" stroke-width="18"/>
            <rect x="524" y="176" width="520" height="620" rx="14" fill="none" stroke="${MUSTARD}" stroke-width="7" opacity=".8"/>
            <rect x="778" y="176" width="12" height="620" fill="#0A0D14" opacity=".8"/>
            <rect x="524" y="470" width="520" height="12" fill="#0A0D14" opacity=".8"/>
          </g>
          <rect x="494" y="118" width="580" height="66" rx="10" fill="#05070C"/>
          <text x="784" y="164" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="30"
                font-weight="700" letter-spacing="7" fill="${MUSTARD}">STILL OPEN</text>
        </svg>
        <img class="mascot" src="${MASCOT}">
        <svg class="scene" viewBox="0 0 1080 1350">
          ${arcs(748, 606, 4, 92, 36, '#0A0D14', 9, 0)}
        </svg>
        <div class="inner">
          <div class="eye"><i></i><span>11:42 PM</span></div>
          <h1>${CARD.head}</h1>
          <p class="sub">${CARD.sub}</p>
          <div class="bar">
            <span>${CARD.site}</span><span class="tel">${CARD.tel}</span>
          </div>
        </div>
      </div>`;
    },
  },
  {
    id: 'backoffice',
    name: 'The Back Office',
    thesis:
      'A cutaway of the building behind the website. Six lit rooms doing the paperwork, brass tubes shooting between them, and Mr. Mustard out front as the foreman. The only direction that draws the back office half of the promise instead of just claiming it, and the room labels change per card so the set never repeats itself.',
    type: 'Archivo Black · DM Sans · JetBrains Mono',
    palette: [BLUE, MUSTARD, CREAM, INK, RED],
    card: () => {
      const rooms = DESKS.map((d, i) => {
        const x = 66 + (i % 3) * 300;
        const y = 214 + Math.floor(i / 3) * 240;
        return `<g>
          <rect x="${x}" y="${y}" width="264" height="214" rx="8" fill="${CREAM}" stroke="${INK}" stroke-width="11"/>
          <rect x="${x}" y="${y}" width="264" height="52" fill="${MUSTARD}" stroke="${INK}" stroke-width="11"/>
          <rect x="${x + 30}" y="${y + 112}" width="204" height="14" rx="7" fill="${INK}" opacity=".22"/>
          <rect x="${x + 30}" y="${y + 142}" width="150" height="14" rx="7" fill="${INK}" opacity=".22"/>
          <circle cx="${x + 214}" cy="${y + 156}" r="30" fill="${RED}" stroke="${INK}" stroke-width="10"/>
          <text x="${x + 132}" y="${y + 37}" text-anchor="middle" font-family="JetBrains Mono, monospace"
                font-size="21" font-weight="700" letter-spacing="2" fill="${INK}">${d}</text>
        </g>`;
      }).join('');
      const tubes = `
        <path d="M120 190 q420 -104 840 0" fill="none" stroke="${MUSTARD}" stroke-width="16" stroke-linecap="round" opacity=".95"/>
        <path d="M330 452 q210 92 400 0" fill="none" stroke="${MUSTARD}" stroke-width="14" stroke-linecap="round" opacity=".8"/>
        <circle cx="700" cy="152" r="19" fill="${CREAM}" stroke="${INK}" stroke-width="9"/>
        <circle cx="452" cy="490" r="17" fill="${CREAM}" stroke="${INK}" stroke-width="9"/>`;
      return `
      <div class="c bak">
        <svg class="bg" viewBox="0 0 1080 1350">
          <rect width="1080" height="1350" fill="${BLUE}"/>
          ${tubes}
          ${rooms}
        </svg>
        <div class="dots"></div>
        <img class="mascot" src="${MASCOT}">
        <div class="inner">
          <div class="eye">${CARD.eyebrow}</div>
          <h1>${CARD.head}</h1>
          <p class="sub">${CARD.sub}</p>
          <div class="bar">
            <span>${CARD.site}</span><span class="tel">${CARD.tel}</span>
          </div>
        </div>
      </div>`;
    },
  },
];

// ---------------------------------------------------------------- stylesheet
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#191919;font-family:'DM Sans',sans-serif;width:2160px;height:1330px;overflow:hidden}
.board{padding:52px 56px;display:flex;flex-direction:column;height:100%;gap:30px}
.bhead{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex:none}
.bhead h2{font-weight:700;font-size:40px;letter-spacing:-.03em;color:#F5F5F5}
.bhead p{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#8A8A8A;margin-top:8px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1;min-height:0}
.col{display:flex;flex-direction:column;gap:20px;min-height:0}
.frame{width:100%;height:806px;overflow:hidden;position:relative;flex:none;box-shadow:0 26px 60px rgba(0,0,0,.55)}
.frame .c{position:absolute;top:0;left:0;width:1080px;height:1350px;transform:scale(.5926);transform-origin:top left}
.meta{display:flex;flex-direction:column;gap:10px}
.meta h3{font-weight:700;font-size:27px;color:#F5F5F5;letter-spacing:-.02em}
.meta .th{font-size:15px;line-height:1.5;color:#A8A8A8;max-width:50ch}
.meta .ty{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E6E}
.chips{display:flex;gap:7px}
.chips i{width:30px;height:30px;display:block;border:1px solid rgba(255,255,255,.22)}

.c{position:relative;overflow:hidden}
.c .bg,.c .scene{position:absolute;inset:0;width:1080px;height:1350px}
.c .dots{position:absolute;inset:0;opacity:.16;mix-blend-mode:multiply;
  background-image:radial-gradient(${INK} 2.1px,transparent 2.2px);background-size:17px 17px}
.c .mascot{position:absolute;filter:drop-shadow(0 16px 0 rgba(22,22,22,.15))}
.c .inner{position:relative;z-index:6;height:100%;display:flex;flex-direction:column}
.c .bar{display:flex;justify-content:space-between;align-items:center;
  font-family:'JetBrains Mono',monospace;font-weight:700;font-size:22px;letter-spacing:.1em;text-transform:uppercase}

/* ---------------- 01 SAY HELLO ---------------- */
.hel{background:${CREAM};color:${INK}}
.hel .bg{opacity:.42}
.hel .inner{padding:58px 56px 128px}
.hel .eye{align-self:flex-start;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:19px;
  letter-spacing:.2em;text-transform:uppercase;padding:9px 18px;border:4px solid ${INK};border-radius:999px;
  background:${CREAM}}
.hel .bub{position:relative;margin-top:24px;background:#FFFFFF;border:13px solid ${INK};border-radius:56px;
  padding:40px 42px 46px;flex:none}
.hel .bub:after{content:'';position:absolute;right:150px;bottom:-96px;width:0;height:0;
  border-left:118px solid transparent;border-top:96px solid ${INK}}
.hel .bub:before{content:'';position:absolute;right:172px;bottom:-64px;z-index:2;width:0;height:0;
  border-left:80px solid transparent;border-top:64px solid #FFFFFF}
.hel h1{font-family:'Titan One',cursive;font-weight:400;font-size:100px;line-height:.94;letter-spacing:-.01em;
  text-shadow:7px 7px 0 rgba(22,22,22,.18)}
.hel .sub{margin-top:auto;font-weight:500;font-size:30px;line-height:1.32;max-width:470px}
.hel .mascot{width:500px;right:10px;bottom:176px;z-index:3}
.hel .prop{position:absolute;width:190px;height:253px;left:579px;top:630px;z-index:4;overflow:visible;
  transform:rotate(-14deg)}
.hel .scene{z-index:2}
.hel .bar{position:absolute;left:0;right:0;bottom:0;z-index:7;background:${INK};color:${CREAM};
  padding:26px 56px}
.hel .bar .tel{color:${MUSTARD}}

/* ---------------- 02 THE NIGHT SHIFT ---------------- */
.nig{background:#0A0D14;color:${CREAM}}
.nig .inner{padding:60px 58px 62px}
.nig .eye{display:flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-weight:700;
  font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:${MUSTARD};flex:none;
  align-self:flex-start;padding:8px 16px;border:2px solid rgba(245,183,0,.45);border-radius:999px;
  background:rgba(10,13,20,.7)}
.nig .eye i{width:14px;height:14px;border-radius:50%;background:${MUSTARD};box-shadow:0 0 22px ${MUSTARD}}
.nig h1{font-family:'Anton',sans-serif;font-weight:400;font-size:104px;line-height:.92;letter-spacing:.005em;
  margin-top:auto;max-width:660px;text-shadow:0 8px 40px rgba(10,13,20,.96)}
.nig .sub{margin-top:20px;font-weight:400;font-size:27px;line-height:1.4;max-width:720px;color:rgba(251,246,234,.86);
  text-shadow:0 4px 26px rgba(10,13,20,.98)}
.nig .bar{margin-top:26px;padding-top:20px;border-top:2px solid rgba(245,183,0,.5);color:rgba(251,246,234,.72)}
.nig .bar .tel{color:${MUSTARD};font-size:26px}
.nig .mascot{width:340px;left:614px;bottom:554px;z-index:3}
.nig .scene{z-index:2}

/* ---------------- 03 THE BACK OFFICE ---------------- */
.bak{background:${BLUE};color:${CREAM}}
.bak .inner{padding:58px 56px 62px}
.bak .eye{align-self:flex-start;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:19px;
  letter-spacing:.2em;text-transform:uppercase;padding:9px 18px;border:4px solid ${CREAM};border-radius:999px}
.bak h1{font-family:'Archivo Black',sans-serif;font-size:92px;line-height:.95;letter-spacing:-.02em;
  margin-top:auto;max-width:640px;text-shadow:8px 8px 0 rgba(22,22,22,.32)}
.bak .sub{margin-top:20px;font-weight:500;font-size:28px;line-height:1.34;max-width:600px;color:rgba(251,246,234,.92)}
.bak .bar{margin-top:26px;padding-top:20px;border-top:4px solid ${MUSTARD}}
.bak .bar .tel{color:${MUSTARD}}
.bak .mascot{width:330px;right:24px;bottom:248px;z-index:4}
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;700&family=Titan+One&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="board">
  <div class="bhead">
    <div>
      <h2>Set nine · The Talking Website · direction study</h2>
      <p>Same headline, same number, three worlds · core emotion = relief with a spark of wonder</p>
    </div>
    <p style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.18em;color:#6E6E6E">MODERN MUSTARD SEED · 2026-07-30</p>
  </div>
  <div class="cols">
    ${DIRECTIONS.map(
      (d) => `<div class="col">
        <div class="frame">${d.card()}</div>
        <div class="meta">
          <h3>${d.name}</h3>
          <p class="th">${d.thesis}</p>
          <p class="ty">${d.type}</p>
          <div class="chips">${d.palette.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
        </div>
      </div>`,
    ).join('')}
  </div>
</div>
</body></html>`;

const out = path.join(HERE, 'moodboard.html');
fs.writeFileSync(out, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2160, height: 1330 }, deviceScaleFactor: 1 });
await page.goto('file:///' + out.replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(HERE, 'moodboard.png') });
await browser.close();
console.log('rendered moodboard.png');
