#!/usr/bin/env node
// "RACE DAY" — set five of the MMS social library, and the first NON-data set.
// No statistics, no sources, no teardown. Mr. Mustard, comic sunbursts, Ben-Day
// dots and hand-drawn racing props, built to be liked and shared rather than
// argued with.
//
// The mascot is the real brand PNG (public/brand/mascot-full.png). Every prop
// around him is drawn in SVG at his line weight (10-14px ink strokes, flat
// fills, no gradients) so nothing looks pasted on. No image model needed.
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

const INK = '#161616';
const MUSTARD = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const CREAM = '#FBF6EA';

// ---------------------------------------------------------------- devices
// The comic sunburst: alternating wedges from a point. The single most
// magnetic shape in a feed, and it costs nothing to draw.
function burst(cx, cy, colour, wedges = 24, r = 1700) {
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

const chequer = (w, sq, rows = 2) => {
  let out = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < Math.ceil(w / sq); c++)
      if ((r + c) % 2 === 0)
        out += `<rect x="${c * sq}" y="${r * sq}" width="${sq}" height="${sq}" fill="${INK}"/>`;
  return out;
};

// Speed whiskers trailing off an object
const speedLines = (x, y, n, len, gap, colour = INK) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const l = len * (0.5 + Math.abs(Math.sin(i * 1.7)) * 0.9);
    out += `<rect x="${x - l}" y="${y + i * gap}" width="${l}" height="13" rx="6.5" fill="${colour}"/>`;
  }
  return out;
};

// ---------------------------------------------------------------- props
const PROPS = {
  // a chequered flag on a pole, sized to sit in his raised glove
  flag: `<g>
    <rect x="352" y="0" width="20" height="430" rx="10" fill="${INK}"/>
    <g transform="translate(18,16) rotate(-4)">
      <rect x="0" y="0" width="332" height="212" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
      ${(() => {
        let o = '';
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 6; c++)
            if ((r + c) % 2 === 0)
              o += `<rect x="${6 + c * 53.3}" y="${6 + r * 50}" width="53.3" height="50" fill="${INK}"/>`;
        return o;
      })()}
      <rect x="0" y="0" width="332" height="212" fill="none" stroke="${INK}" stroke-width="12"/>
    </g>
  </g>`,

  // start gantry: two dead lights and one lit
  lights: `<g>
    <rect x="0" y="0" width="330" height="126" rx="26" fill="${INK}"/>
    <circle cx="70" cy="63" r="34" fill="${RED}" stroke="${CREAM}" stroke-width="7"/>
    <circle cx="165" cy="63" r="34" fill="${RED}" stroke="${CREAM}" stroke-width="7"/>
    <circle cx="260" cy="63" r="40" fill="${MUSTARD}" stroke="${CREAM}" stroke-width="8"/>
  </g>`,

  tyre: `<g>
    <circle cx="120" cy="120" r="115" fill="${INK}"/>
    <circle cx="120" cy="120" r="58" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
    <circle cx="120" cy="120" r="24" fill="${MUSTARD}" stroke="${INK}" stroke-width="10"/>
    ${(() => {
      let o = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        o += `<rect x="${120 + Math.cos(a) * 88 - 9}" y="${120 + Math.sin(a) * 88 - 9}" width="18" height="18" rx="4" fill="${CREAM}" opacity=".85"/>`;
      }
      return o;
    })()}
  </g>`,

  wrench: `<g transform="rotate(-32)">
    <rect x="88" y="86" width="46" height="228" rx="23" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
    <path d="M62 104 L62 26 L100 26 L100 62 L122 62 L122 26 L160 26 L160 104
             Q160 142 111 142 Q62 142 62 104 Z"
          fill="${CREAM}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  </g>`,

  can: `<g>
    <rect x="0" y="40" width="210" height="250" rx="26" fill="${RED}" stroke="${INK}" stroke-width="13"/>
    <rect x="34" y="86" width="142" height="70" rx="12" fill="${CREAM}" stroke="${INK}" stroke-width="10"/>
    <rect x="72" y="0" width="66" height="52" rx="16" fill="${INK}"/>
    <path d="M210 96 h74 v-46" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
  </g>`,

  bubble: `<g>
    <rect x="0" y="0" width="470" height="180" rx="52" fill="${CREAM}" stroke="${INK}" stroke-width="13"/>
    <path d="M92 172 l-16 74 l84 -66 z" fill="${CREAM}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
  </g>`,
};

// ---------------------------------------------------------------- the set
const CARDS = [
  {
    id: '01-green-flag',
    bg: MUSTARD,
    burst: CREAM,
    bop: 0.5,
    burstAt: [540, 470],
    ink: INK,
    eyebrow: 'Monday',
    head: 'GREEN<br>FLAG.',
    sub: 'New week. Fresh tank. Let us go.',
    mascot: { w: 560, bottom: 410, left: 520, flip: false },
    props: [{ k: 'lights', x: 92, y: 172, s: 1 }],
    lines: { x: 470, y: 620, n: 5, len: 300, gap: 34 },
  },
  {
    id: '02-pit-crew',
    bg: BLUE,
    burst: CREAM,
    bop: 0.13,
    burstAt: [540, 500],
    ink: CREAM,
    eyebrow: 'What we actually do',
    head: 'YOU DRIVE.<br>WE WRENCH.',
    sub: 'You are the one with the talent. We are the ones in the pit lane with the tools.',
    mascot: { w: 520, bottom: 440, left: 290, flip: false },
    props: [
      { k: 'tyre', x: 690, y: 560, s: 1.05 },
      { k: 'wrench', x: 806, y: 262, s: 0.92 },
    ],
  },
  {
    id: '03-send-it',
    bg: RED,
    burst: CREAM,
    bop: 0.13,
    burstAt: [660, 520],
    ink: CREAM,
    eyebrow: 'Wednesday',
    head: 'SEND<br>IT.',
    sub: 'The plan was never going to feel ready. Go anyway.',
    mascot: { w: 540, bottom: 410, left: 470, flip: false, rot: -13 },
    props: [],
    lines: { x: 460, y: 500, n: 7, len: 420, gap: 40, colour: CREAM },
  },
  {
    id: '04-chequered',
    bg: CREAM,
    burst: MUSTARD,
    bop: 0.55,
    burstAt: [540, 480],
    ink: INK,
    eyebrow: 'Friday',
    head: 'YOU FINISHED<br>THE WEEK.',
    sub: 'Nobody clapped. So here, this is us clapping.',
    mascot: { w: 560, bottom: 408, left: 262, flip: false },
    props: [{ k: 'flag', x: -14, y: 158, s: 1 }],
  },
  {
    id: '05-tag-your-crew',
    bg: BLUE,
    burst: CREAM,
    bop: 0.13,
    burstAt: [540, 470],
    ink: CREAM,
    eyebrow: 'Roll call',
    head: 'TAG YOUR<br>PIT CREW.',
    sub: 'The person who answers the phone when you cannot. Go on, name them.',
    mascot: { w: 520, bottom: 430, left: 276, flip: false },
    props: [{ k: 'bubble', x: 548, y: 120, s: 1, over: true }],
    bubbleText: 'WHO IS YOURS?',
  },
  {
    id: '06-fuel',
    bg: MUSTARD,
    burst: CREAM,
    bop: 0.5,
    burstAt: [430, 500],
    ink: INK,
    eyebrow: 'Every small business, ever',
    head: 'RUNS ON<br>COFFEE AND<br>STUBBORNNESS.',
    sub: 'Premium unleaded is for people with a marketing department.',
    mascot: { w: 470, bottom: 470, left: 160, flip: false },
    hs: 0.8,
    props: [{ k: 'can', x: 700, y: 470, s: 1.05 }],
  },
];

// ---------------------------------------------------------------- template
const S = SQ ? 0.8 : 1; // one scale knob for the square cut

const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Titan+One&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:${H}px;overflow:hidden}
  body{-webkit-font-smoothing:antialiased}
  .card{position:relative;width:1080px;height:${H}px;overflow:hidden}
  .burst,.dots,.scene,.flagstrip{position:absolute;inset:0;width:1080px;height:${H}px}
  .burst{opacity:.5}
  .dots{opacity:.16;mix-blend-mode:multiply;
    background-image:radial-gradient(${INK} 2.1px,transparent 2.2px);background-size:17px 17px}
  .scene svg,.scene img{position:absolute}
  .mascot{filter:drop-shadow(0 18px 0 rgba(22,22,22,.16))}

  .inner{position:relative;z-index:5;height:100%;
    padding:${SQ ? '54px 52px 62px' : '62px 58px 74px'};display:flex;flex-direction:column}
  .eye{flex:none;align-self:flex-start;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${Math.round(19 * S)}px;letter-spacing:.2em;text-transform:uppercase;
    padding:${SQ ? '7px 15px' : '9px 18px'};border:4px solid currentColor;border-radius:999px}
  .type{margin-top:auto;flex:none}
  h1{font-family:'Titan One',cursive;font-weight:400;
    font-size:${Math.round(112 * S)}px;line-height:.94;letter-spacing:-.01em;
    text-shadow:${Math.round(7 * S)}px ${Math.round(7 * S)}px 0 rgba(22,22,22,.22)}
  .sub{font-family:'DM Sans',sans-serif;font-weight:500;
    font-size:${Math.round(30 * S)}px;line-height:1.34;margin-top:${Math.round(20 * S)}px;
    max-width:${Math.round(820 * S)}px;opacity:.92}
  .bar{margin-top:${Math.round(28 * S)}px;padding-top:${Math.round(18 * S)}px;
    border-top:5px solid currentColor;display:flex;justify-content:space-between;align-items:center;
    font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${Math.round(17 * S)}px;letter-spacing:.18em;text-transform:uppercase}
  .flagstrip{top:auto;bottom:0;height:${Math.round(30 * S)}px}
  .bubbletext{position:absolute;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;
    font-family:'Titan One',cursive;color:${INK};
    font-size:${Math.round(40 * S)}px;letter-spacing:-.01em}
</style></head><body>${body}</body></html>`;

const card = (c) => {
  const m = c.mascot;
  const sc = SQ ? 0.84 : 1;
  const mw = Math.round(m.w * sc);
  const mBottom = Math.round(m.bottom * sc) + (SQ ? -40 : 0);
  const mLeft = Math.round(m.left * sc) + (SQ ? 40 : 0);

  const drawProps = (list) => (list || [])
    .map((p) => {
      const x = Math.round(p.x * sc) + (SQ ? 30 : 0);
      const y = Math.round(p.y * sc);
      const s = (p.s || 1) * sc;
      return `<svg viewBox="0 0 600 600" style="left:${x}px;top:${y}px;width:${Math.round(
        600 * s,
      )}px;height:${Math.round(600 * s)}px;overflow:visible">${PROPS[p.k]}</svg>`;
    })
    .join('');
  const props = drawProps((c.props || []).filter((p) => !p.over));
  const propsOver = drawProps((c.props || []).filter((p) => p.over));

  const lines = c.lines
    ? `<svg viewBox="0 0 1080 ${H}" style="left:0;top:0;width:1080px;height:${H}px">${speedLines(
        Math.round(c.lines.x * sc),
        Math.round(c.lines.y * sc),
        c.lines.n,
        Math.round(c.lines.len * sc),
        Math.round(c.lines.gap * sc),
        c.lines.colour || INK,
      )}</svg>`
    : '';

  const bub = (c.props || []).find((p) => p.k === 'bubble');
  const bubbleText =
    c.bubbleText && bub
      ? `<div class="bubbletext" style="left:${
          Math.round((bub.x + 235 * (bub.s || 1)) * sc) + (SQ ? 30 : 0)
        }px;top:${Math.round((bub.y + 90 * (bub.s || 1)) * sc)}px">${c.bubbleText}</div>`
      : '';

  return shell(`<div class="card" style="background:${c.bg};color:${c.ink}">
    <svg class="burst" style="opacity:${c.bop ?? 0.5}" viewBox="0 0 1080 ${H}">${burst(
      Math.round(c.burstAt[0]),
      Math.round(c.burstAt[1] * (SQ ? 0.86 : 1)),
      c.burst,
    )}</svg>
    <div class="dots"></div>
    <div class="scene">
      ${lines}
      ${props}
      <img class="mascot" src="${MASCOT}" style="left:${mLeft}px;bottom:${mBottom}px;top:auto;width:${mw}px;${
        m.rot ? `transform:rotate(${m.rot}deg);` : ''
      }${m.flip ? 'scale-x:-1;' : ''}">
      ${propsOver}
      ${bubbleText}
    </div>
    <svg class="flagstrip" viewBox="0 0 1080 ${Math.round(30 * S)}">${chequer(
      1080,
      Math.round(15 * S),
    )}</svg>
    <div class="inner">
      <div class="eye">${c.eyebrow}</div>
      <div class="type">
        <h1${c.hs ? ` style="font-size:${Math.round(112 * S * c.hs)}px"` : ''}>${c.head}</h1>
        <p class="sub">${c.sub}</p>
        <div class="bar"><span>Modern Mustard Seed</span><span>modernmustardseed.com</span></div>
      </div>
    </div>
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
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${c.id}.png`) });
  console.log(`rendered ${c.id}.png ${SQ ? '(square)' : '(feed)'}`);
}
await browser.close();
