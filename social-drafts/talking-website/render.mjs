#!/usr/bin/env node
// "THE TALKING WEBSITE" — set nine of the MMS social library, and the second
// NON-data set. No statistics, no sources, no teardown. It exists to explain a
// brand new thing to people who have never heard of it, and to hand them a live
// number they can dial in ten seconds.
//
// Direction: "Say Hello" (Sarah picked it off the 2026-07-30 study). The white
// hand-inked speech bubble is the signature and it appears on EVERY card, tail
// always pointing at Mr. Mustard, because the whole product is that the site
// speaks. The bottom ink bar carries the domain and the live number on every
// card, so a screenshot of any single card is still a working ad.
//
// The mascot is the real brand PNG (public/brand/mascot-full.png). Every prop
// is drawn in SVG at his own line weight (10-14px ink strokes, flat fills, no
// gradients) so nothing looks pasted on. No image model needed.
//
// Usage: node render.mjs [cardId ...] [--square]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARGV = process.argv.slice(2);
const SQ = ARGV.includes('--square');
const H = SQ ? 1080 : 1350;
const OUT = path.join(HERE, SQ ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const MASCOT =
  'file:///' + path.resolve(HERE, '../../public/brand/mascot-full.png').replace(/\\/g, '/');
const MASCOT_RATIO = 1190 / 876;

const INK = '#161616';
const MUSTARD = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const CREAM = '#FBF6EA';
const PAPER = '#FFFFFF';

const S = SQ ? 0.8 : 1; // type scale
const G = SQ ? 0.82 : 1; // geometry scale
const BAR = Math.round(74 * S);

// Where things sit on his body, as a fraction of the mascot box. Used to land
// props in his hand and speech rings at his mouth without hand-tuning per card.
const GLOVE = [0.145, 0.375];
const MOUTH = [0.47, 0.6];

// ---------------------------------------------------------------- devices
function burst(cx, cy, colour, wedges = 24, r = 1900) {
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

// concentric "he is speaking" rings. sweep 0 opens them to his left.
const rings = (cx, cy, n, r0, step, colour, sw = 10, sweep = 0) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = r0 + i * step;
    out += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep} ${cx} ${cy + r}" fill="none"
      stroke="${colour}" stroke-width="${sw}" stroke-linecap="round" opacity="${1 - i * 0.17}"/>`;
  }
  return out;
};

// a rotary handset, sized to sit in his raised open glove
const HANDSET = {
  vb: [300, 400],
  grip: [100, 196],
  svg: `<path d="M40 96 q0-56 56-56 h34 q24 0 24 26 v52 q0 24-24 24 h-12 q-14 0-14 14 v96
           q0 14 14 14 h12 q24 0 24 24 v52 q0 26-24 26 H96 q-56 0-56-56 z"
        fill="${PAPER}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>`,
};

// a little desk bell for the card about the back office
const BELL = {
  vb: [300, 300],
  grip: [150, 150],
  svg: `<g>
    <path d="M40 210 q0-110 110-110 q110 0 110 110 z" fill="${CREAM}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <rect x="20" y="210" width="260" height="34" rx="17" fill="${MUSTARD}" stroke="${INK}" stroke-width="13"/>
    <circle cx="150" cy="78" r="24" fill="${RED}" stroke="${INK}" stroke-width="12"/>
  </g>`,
};

// ---------------------------------------------------------------- scenes
// Scene coordinates are bottom-anchored: give a y measured up from the bottom
// of the card and it survives the switch to the 1080x1080 square cut.
const up = (y) => H - Math.round(y * G);
const px = (v) => Math.round(v * G);

// 02 — a lit window cut into the cream, the only dark thing on the card
function windowScene() {
  const x = px(524), w = px(516), h = px(596);
  const top = up(206) - h;
  return `
    <defs>
      <radialGradient id="lamp" cx="50%" cy="56%" r="62%">
        <stop offset="0%" stop-color="#FFE9A3" stop-opacity=".95"/>
        <stop offset="46%" stop-color="${MUSTARD}" stop-opacity=".62"/>
        <stop offset="100%" stop-color="${MUSTARD}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="${x + px(14)}" y="${top + px(16)}" width="${w}" height="${h}" rx="${px(18)}" fill="${INK}" opacity=".2"/>
    <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${px(18)}" fill="#131A2A" stroke="${INK}" stroke-width="${px(14)}"/>
    <rect x="${x + w / 2 - px(6)}" y="${top + px(14)}" width="${px(12)}" height="${h - px(28)}" fill="${INK}" opacity=".85"/>
    <rect x="${x + px(14)}" y="${top + h * 0.4}" width="${w - px(28)}" height="${px(12)}" fill="${INK}" opacity=".85"/>
    <ellipse cx="${x + w / 2}" cy="${top + h * 0.6}" rx="${w * 0.62}" ry="${h * 0.56}" fill="url(#lamp)"/>
    <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${px(18)}" fill="none" stroke="${INK}" stroke-width="${px(14)}"/>
    <rect x="${x - px(26)}" y="${top + h - px(6)}" width="${w + px(52)}" height="${px(26)}" rx="${px(13)}"
          fill="${CREAM}" stroke="${INK}" stroke-width="${px(12)}"/>`;
}

// 03 — six lit rooms of the back office, drawn as a cutaway
const ROOMS = ['BOOKINGS', 'ORDERS', 'FOLLOW UPS', 'INVOICES', 'REVIEWS', 'THE INBOX'];
function roomsScene() {
  const w = px(280), h = px(196), gap = px(18);
  const x0 = Math.round((1080 - (w * 3 + gap * 2)) / 2);
  const y0 = up(352) - (h * 2 + gap);
  let out = '';
  ROOMS.forEach((label, i) => {
    const x = x0 + (i % 3) * (w + gap);
    const y = y0 + Math.floor(i / 3) * (h + gap);
    out += `<g>
      <rect x="${x + px(8)}" y="${y + px(9)}" width="${w}" height="${h}" rx="${px(7)}" fill="${INK}" opacity=".18"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${px(7)}" fill="${PAPER}" stroke="${INK}" stroke-width="${px(10)}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${px(48)}" fill="${MUSTARD}" stroke="${INK}" stroke-width="${px(10)}"/>
      <text x="${x + w / 2}" y="${y + px(33)}" text-anchor="middle" font-family="JetBrains Mono, monospace"
            font-size="${px(20)}" font-weight="700" letter-spacing="${px(2)}" fill="${INK}">${label}</text>
      <rect x="${x + px(26)}" y="${y + px(86)}" width="${w - px(96)}" height="${px(12)}" rx="${px(6)}" fill="${INK}" opacity=".2"/>
      <rect x="${x + px(26)}" y="${y + px(112)}" width="${w - px(150)}" height="${px(12)}" rx="${px(6)}" fill="${INK}" opacity=".2"/>
      <circle cx="${x + w - px(52)}" cy="${y + px(136)}" r="${px(26)}" fill="${RED}" stroke="${INK}" stroke-width="${px(9)}"/>
    </g>`;
  });
  return out;
}

// 04 — five people asking five things at once
const ASKS = ['Are you open?', 'How much?', 'Tuesday work?', 'Do you deliver?', 'Where are you?'];
function crowdScene() {
  // staggered down the left half, every tail clear of the copy underneath
  const spots = [
    [px(56), up(730), 1],
    [px(336), up(650), 0.86],
    [px(64), up(570), 0.94],
    [px(336), up(492), 0.86],
    [px(56), up(452), 0.9],
  ];
  return spots
    .map(([x, y, s], i) => {
      const w = px(300) * s, h = px(104) * s;
      return `<g>
        <rect x="${x + px(7)}" y="${y + px(8)}" width="${w}" height="${h}" rx="${h / 2}" fill="${INK}" opacity=".16"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${PAPER}" stroke="${INK}" stroke-width="${px(11)}"/>
        <path d="M${x + w * 0.66} ${y + h - px(6)} l${px(10) * s} ${px(46) * s} l${px(46) * s} ${-px(40) * s} z"
              fill="${PAPER}" stroke="${INK}" stroke-width="${px(11)}" stroke-linejoin="round"/>
        <text x="${x + w / 2}" y="${y + h * 0.64}" text-anchor="middle" font-family="DM Sans, sans-serif"
              font-size="${px(30) * s}" font-weight="700" fill="${INK}">${ASKS[i]}</text>
      </g>`;
    })
    .join('');
}

// 05 — the day sheet it handed you, three jobs already done
const LINES = [
  ['7:12 AM', 'Booked the Tuesday install'],
  ['11:48 AM', 'Took the reorder, sent the invoice'],
  ['9:03 PM', 'Answered the after hours call'],
];
function sheetScene() {
  const w = px(540), h = px(398);
  const x = px(66), y = up(342) - h;
  let items = '';
  LINES.forEach(([t, txt], i) => {
    const ly = y + px(126) + i * px(104);
    items += `<g>
      <circle cx="${x + px(54)}" cy="${ly}" r="${px(25)}" fill="${MUSTARD}" stroke="${INK}" stroke-width="${px(9)}"/>
      <path d="M${x + px(42)} ${ly} l${px(9)} ${px(11)} l${px(19)} ${-px(21)}" fill="none" stroke="${INK}"
            stroke-width="${px(9)}" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${x + px(96)}" y="${ly - px(6)}" font-family="JetBrains Mono, monospace" font-size="${px(19)}"
            font-weight="700" letter-spacing="${px(2)}" fill="${RED}">${t}</text>
      <text x="${x + px(96)}" y="${ly + px(28)}" font-family="DM Sans, sans-serif" font-size="${px(25)}"
            font-weight="500" fill="${INK}">${txt}</text>
    </g>`;
  });
  return `<g transform="rotate(-2.4 ${x + w / 2} ${y + h / 2})">
    <rect x="${x + px(10)}" y="${y + px(12)}" width="${w}" height="${h}" rx="${px(8)}" fill="${INK}" opacity=".18"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${px(8)}" fill="${PAPER}" stroke="${INK}" stroke-width="${px(11)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${px(62)}" fill="${INK}"/>
    <text x="${x + px(30)}" y="${y + px(41)}" font-family="JetBrains Mono, monospace" font-size="${px(22)}"
          font-weight="700" letter-spacing="${px(3)}" fill="${CREAM}">WHILE YOU WORKED</text>
    ${items}
  </g>`;
}

// 06 — the number, set like a plate you could dial off the screen
function plateScene() {
  const w = px(496), h = px(212);
  const x = 1080 - px(56) - w, y = up(560);
  return `<g>
    <rect x="${x + px(11)}" y="${y + px(12)}" width="${w}" height="${h}" rx="${px(20)}" fill="${INK}" opacity=".2"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${px(20)}" fill="${MUSTARD}" stroke="${INK}" stroke-width="${px(12)}"/>
    <text x="${x + w / 2}" y="${y + px(74)}" text-anchor="middle" font-family="JetBrains Mono, monospace"
          font-size="${px(21)}" font-weight="700" letter-spacing="${px(5)}" fill="${INK}">TALK TO IT NOW</text>
    <text x="${x + w / 2}" y="${y + px(154)}" text-anchor="middle" font-family="JetBrains Mono, monospace"
          font-size="${px(52)}" font-weight="700" letter-spacing="${px(1)}" fill="${INK}">(406) 312-1223</text>
  </g>`;
}

// ---------------------------------------------------------------- the set
const CARDS = [
  {
    id: '01-talks-back',
    eyebrow: 'New, and a little strange',
    head: 'YOUR WEBSITE<br>TALKS BACK<br>NOW.',
    sub: 'Not a chat bubble. An actual voice. It picks up, answers the question, and books the job while you are up a ladder.',
    burstAt: [760, 400],
    tail: 'right',
    mascot: { w: 500, right: 10, bottom: 176 },
    hand: 'handset',
    speaks: true,
    subMax: 470,
  },
  {
    id: '02-after-hours',
    eyebrow: '11:42 PM',
    head: 'IT WAS AWAKE.<br>YOU WERE<br>ASLEEP.',
    sub: 'The call that came in after you locked up did not hit voicemail. It got answered, and the appointment was on your calendar before morning.',
    burstAt: [300, 430],
    tail: 'right',
    scene: windowScene,
    mascot: { w: 316, left: 624, bottom: 262 },
    speaks: true,
    speakColour: '#FFE9A3',
    subMax: 430,
  },
  {
    id: '03-back-office',
    eyebrow: 'The part nobody sees',
    head: 'IT RUNS THE<br>BACK OFFICE<br>TOO.',
    sub: 'Bookings, orders, follow ups, invoices, reviews, the inbox. The paperwork handles itself behind a website that talks.',
    burstAt: [540, 380],
    tail: 'left',
    scene: roomsScene,
    mascot: { w: 278, right: 14, bottom: 122 },
    subMax: 430,
  },
  {
    id: '04-all-at-once',
    eyebrow: 'Growing without the headache',
    head: 'YOU TAKE ONE<br>CALL AT A TIME.<br>IT DOES NOT.',
    sub: 'Five people can ask it five different things at the same second and all five get a real answer. That is what growing feels like without hiring anybody.',
    burstAt: [800, 420],
    tail: 'right',
    scene: crowdScene,
    mascot: { w: 420, right: 26, bottom: 176 },
    subMax: 440,
  },
  {
    id: '05-while-you-worked',
    eyebrow: 'What it did today',
    head: 'BOOKED IT.<br>INVOICED IT.<br>WROTE IT DOWN.',
    sub: 'You never touched your phone. It handed you the day already sorted.',
    burstAt: [820, 400],
    tail: 'right',
    scene: sheetScene,
    mascot: { w: 396, right: 20, bottom: 176 },
    subMax: 440,
  },
  {
    id: '06-call-it',
    eyebrow: 'Go on, it is a real number',
    head: 'CALL IT<br>AND SEE.',
    sub: 'Ask it anything you would ask a receptionist. This is the same thing we build for your business, just wearing our name.',
    burstAt: [280, 440],
    tail: 'left',
    scene: plateScene,
    mascot: { w: 452, left: 40, bottom: 168 },
    hand: 'handset',
    bubMax: 700,
    subMax: 452,
    subPos: 'right',
  },
];

// ---------------------------------------------------------------- template
const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Titan+One&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:${H}px;overflow:hidden}
  body{-webkit-font-smoothing:antialiased}
  .card{position:relative;width:1080px;height:${H}px;overflow:hidden;background:${CREAM};color:${INK}}
  .bg,.scene,.rings{position:absolute;inset:0;width:1080px;height:${H}px}
  .bg{opacity:.42}
  .dots{position:absolute;inset:0;opacity:.16;mix-blend-mode:multiply;
    background-image:radial-gradient(${INK} 2.1px,transparent 2.2px);background-size:17px 17px}
  .scene{z-index:2}
  .rings{z-index:3}
  .mascot{position:absolute;z-index:4;filter:drop-shadow(0 ${Math.round(16 * G)}px 0 rgba(22,22,22,.15))}
  .prop{position:absolute;z-index:5;overflow:visible}

  .inner{position:relative;z-index:6;height:100%;display:flex;flex-direction:column;
    padding:${Math.round(56 * S)}px ${Math.round(56 * S)}px ${BAR + Math.round(44 * S)}px}
  .eye{align-self:flex-start;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${Math.round(19 * S)}px;letter-spacing:.2em;text-transform:uppercase;
    padding:${Math.round(9 * S)}px ${Math.round(18 * S)}px;border:${Math.round(4 * S)}px solid ${INK};
    border-radius:999px;background:${CREAM};flex:none}
  .bub{position:relative;margin-top:${Math.round(22 * S)}px;background:${PAPER};
    border:${Math.round(13 * S)}px solid ${INK};border-radius:${Math.round(56 * S)}px;
    padding:${Math.round(38 * S)}px ${Math.round(42 * S)}px ${Math.round(44 * S)}px;flex:none}
  .bub:after,.bub:before{content:'';position:absolute;width:0;height:0}
  .bub.r:after{right:${Math.round(150 * S)}px;bottom:${-Math.round(94 * S)}px;
    border-left:${Math.round(116 * S)}px solid transparent;border-top:${Math.round(94 * S)}px solid ${INK}}
  .bub.r:before{right:${Math.round(172 * S)}px;bottom:${-Math.round(62 * S)}px;z-index:2;
    border-left:${Math.round(78 * S)}px solid transparent;border-top:${Math.round(62 * S)}px solid ${PAPER}}
  .bub.l:after{left:${Math.round(150 * S)}px;bottom:${-Math.round(94 * S)}px;
    border-right:${Math.round(116 * S)}px solid transparent;border-top:${Math.round(94 * S)}px solid ${INK}}
  .bub.l:before{left:${Math.round(172 * S)}px;bottom:${-Math.round(62 * S)}px;z-index:2;
    border-right:${Math.round(78 * S)}px solid transparent;border-top:${Math.round(62 * S)}px solid ${PAPER}}
  h1{font-family:'Titan One',cursive;font-weight:400;font-size:${Math.round(96 * S)}px;
    line-height:.95;letter-spacing:-.01em;text-shadow:${Math.round(7 * S)}px ${Math.round(7 * S)}px 0 rgba(22,22,22,.18)}
  .sub{margin-top:auto;font-family:'DM Sans',sans-serif;font-weight:500;
    font-size:${Math.round(29 * S)}px;line-height:1.32}
  .sub.right{align-self:flex-end;text-align:right}
  .bar{position:absolute;left:0;right:0;bottom:0;z-index:7;background:${INK};color:${CREAM};
    height:${BAR}px;display:flex;align-items:center;justify-content:space-between;
    padding:0 ${Math.round(56 * S)}px;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${Math.round(22 * S)}px;letter-spacing:.1em;text-transform:uppercase}
  .bar .tel{color:${MUSTARD}}
</style></head><body>${body}</body></html>`;

const card = (c) => {
  const m = c.mascot;
  const mw = px(m.w);
  const mh = Math.round(mw * MASCOT_RATIO);
  const mLeft = m.left != null ? px(m.left) : 1080 - px(m.right) - mw;
  const mBottom = px(m.bottom);
  const mTop = H - mBottom - mh;

  const at = (f) => [mLeft + f[0] * mw, mTop + f[1] * mh];

  let prop = '';
  if (c.hand) {
    const P = c.hand === 'bell' ? BELL : HANDSET;
    const [gx, gy] = at(GLOVE);
    const scale = px(c.hand === 'bell' ? 132 : 190) / P.vb[0];
    const w = P.vb[0] * scale, h = P.vb[1] * scale;
    prop = `<svg class="prop" viewBox="0 0 ${P.vb[0]} ${P.vb[1]}"
      style="left:${Math.round(gx - P.grip[0] * scale)}px;top:${Math.round(gy - P.grip[1] * scale)}px;
      width:${Math.round(w)}px;height:${Math.round(h)}px;transform:rotate(${c.hand === 'bell' ? 6 : -14}deg)">${P.svg}</svg>`;
  }

  const speak = c.speaks
    ? (() => {
        const [x, y] = at(MOUTH);
        const side = mLeft > 540 ? 0 : 1; // rings open toward the middle of the card
        return `<svg class="rings" viewBox="0 0 1080 ${H}">${rings(
          Math.round(x + (side ? mw * 0.34 : -mw * 0.06)),
          Math.round(y),
          4,
          px(96),
          px(38),
          c.speakColour || INK,
          px(10),
          side,
        )}</svg>`;
      })()
    : '';

  return shell(`<div class="card">
    <svg class="bg" viewBox="0 0 1080 ${H}">${burst(
      px(c.burstAt[0]),
      Math.round(c.burstAt[1] * G),
      MUSTARD,
    )}</svg>
    <div class="dots"></div>
    ${c.scene ? `<svg class="scene" viewBox="0 0 1080 ${H}">${c.scene()}</svg>` : ''}
    ${speak}
    <img class="mascot" src="${MASCOT}" style="left:${mLeft}px;top:${mTop}px;width:${mw}px">
    ${prop}
    <div class="inner">
      <div class="eye">${c.eyebrow}</div>
      <div class="bub ${c.tail === 'left' ? 'l' : 'r'}"${
        c.bubMax ? ` style="align-self:flex-start;max-width:${px(c.bubMax)}px"` : ''
      }><h1>${c.head}</h1></div>
      <p class="sub${c.subPos === 'right' ? ' right' : ''}" style="max-width:${px(c.subMax)}px">${c.sub}</p>
    </div>
    <div class="bar"><span>modernmustardseed.com</span><span class="tel">(406) 312-1223</span></div>
  </div>`);
};

// ---------------------------------------------------------------- render
const only = ARGV.filter((a) => a !== '--square');
const set = only.length ? CARDS.filter((c) => only.includes(c.id)) : CARDS;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: H } });
for (const c of set) {
  const html = path.join(OUT, `${c.id}.html`);
  fs.writeFileSync(html, card(c));
  await page.goto('file:///' + html.replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${c.id}.png`) });
  console.log(`rendered ${c.id}.png ${SQ ? '(square)' : '(feed)'}`);
}
await browser.close();
