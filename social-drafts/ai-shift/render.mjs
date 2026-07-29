#!/usr/bin/env node
// "THE SIGNAL" — set three of the MMS social library. A deliberate break from
// the mid-century screenprint of ../missed-calls and ../websites: near-black
// broadcast card, high-voltage lime, giant Anton caps, and an oscilloscope
// trace generated per card so no two are alike. Nothing here needs an image
// model, which is the point.
//
// Direction approved by Sarah from moodboard.png on 2026-07-29.
//
// Usage: node render.mjs [cardId ...] [--square]
//   default  1080x1350 feed cut  -> cards/
//   --square 1080x1080 X cut     -> cards-square/

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

const AUDIT = 'modernmustardseed.com/website-audit';

// ---------------------------------------------------------------- the trace
// Each card seeds its own waveform, so the set reads as one instrument
// recording six different moments rather than one graphic reused six times.
function trace(seedNum, w, h, mode) {
  let s = seedNum;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pts = [];
  for (let x = 0; x <= w; x += 3) {
    const t = x / w;
    let env;
    if (mode === 'decay') {
      // a live call that fades to nothing, then one last spike
      env = Math.exp(-2.4 * t) * 0.5 + (t > 0.74 ? Math.exp(-30 * (t - 0.74)) * 1.1 : 0);
    } else if (mode === 'pulse') {
      // a strong, confident, repeating heartbeat: the CTA cards
      const beat = Math.abs(Math.sin(t * Math.PI * 3));
      env = Math.pow(beat, 7) * 1.0 + 0.06;
    } else if (mode === 'rise') {
      // something growing fast: the shift itself
      env = Math.pow(t, 2.4) * 1.05 + 0.05;
    } else {
      // steady transmission
      env = 0.34 + Math.sin(t * 7) * 0.1;
    }
    const carrier =
      Math.sin(t * 44 + seedNum) * 0.62 +
      Math.sin(t * 109 + seedNum * 1.7) * 0.26 +
      (rnd() - 0.5) * 0.18;
    pts.push([x, h / 2 - carrier * env * h * 0.46]);
  }
  return 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
}

// ---------------------------------------------------------------- the set
const CARDS = [
  {
    id: '01-the-shift',
    kind: 'stat',
    eyebrow: 'The AI Shift / 01',
    seed: 8231,
    mode: 'rise',
    stat: '45',
    unit: '%',
    head: 'now use AI to find a local business.',
    kicker: 'Last year it was six.',
    sub: 'Something is reading every website in your town and deciding which three names to say out loud. It cannot recommend what it cannot read.',
    src: 'BrightLocal Local Consumer Review Survey · 1,002 US consumers · 2026',
  },
  {
    id: '02-trusted',
    kind: 'stat',
    eyebrow: 'The AI Shift / 02',
    seed: 4417,
    mode: 'steady',
    stat: '42',
    unit: '%',
    head: 'trust what AI says as much as a real review.',
    kicker: 'That happened in one year.',
    sub: 'We spent a decade teaching owners that reviews decide everything. Four in ten people now give a machine the same weight they give a neighbour.',
    src: 'BrightLocal Local Consumer Review Survey · 1,002 US consumers · 2026',
  },
  {
    id: '03-the-catch',
    kind: 'stat',
    eyebrow: 'The AI Shift / 03',
    seed: 9052,
    mode: 'decay',
    stat: '3',
    unit: '%',
    head: 'actually start there.',
    kicker: 'Know the difference.',
    sub: 'Forty-five percent use AI somewhere in the hunt. Only three percent open it first. Anyone selling you panic is quoting the wrong number, and someone in the comments will catch it.',
    src: 'DreamHost Local Business Trust Index · 1,201 US consumers · 2026',
  },
  {
    id: '04-still-your-site',
    kind: 'stat',
    eyebrow: 'The AI Shift / 04',
    seed: 6688,
    mode: 'pulse',
    stat: '34',
    unit: '%',
    head: 'go straight to your website the moment AI names you.',
    kicker: 'Then what?',
    sub: 'Getting recommended is only half of it. The machine hands them over, they land on your page, and the page has about five seconds to prove you are real.',
    src: 'DreamHost Local Business Trust Index · 1,201 US consumers · 2026',
  },
  {
    id: '05-ask-it',
    kind: 'call',
    eyebrow: 'Open invitation',
    seed: 3141,
    mode: 'pulse',
    head: 'Ask it about your business.',
    kicker: 'Then see whose name comes back.',
    sign: AUDIT,
    signLabel: 'Free website audit',
    sub: 'Open ChatGPT right now and ask it for the best in your trade in your town. If you are not in the answer, that is the whole problem. It is also fixable, and I will show you the list for nothing.',
    src: 'Free. No credit card. No email needed to see the result.',
    sticker: { small: 'It costs you', big: 'Nothing' },
  },
  {
    id: '06-readable',
    kind: 'list',
    eyebrow: 'How a machine reads you',
    seed: 7720,
    mode: 'steady',
    head: 'Say it plainly. Say it once. Say it where it can be found.',
    items: [
      'Plain language on the page: what you do, and the towns you actually drive to.',
      'Real hours, real phone, real address, matching your Google profile exactly.',
      'The questions customers really ask, answered in writing, not buried in a PDF.',
    ],
    src: 'None of this requires hiring anybody.',
  },
];

// ---------------------------------------------------------------- template
const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root{
    --void:#05070A; --lime:#E8FF52; --alarm:#FF3B30;
    --steel:#8A94A6; --paper:#F2F4F7; --dim:#5C6575;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:${H}px;overflow:hidden}
  body{background:var(--void);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}

  .card{position:relative;width:1080px;height:${H}px;overflow:hidden;background:var(--void)}
  /* engineering grid, barely there */
  .grid{position:absolute;inset:0;opacity:.13;
    background-image:linear-gradient(var(--steel) 1px,transparent 1px),linear-gradient(90deg,var(--steel) 1px,transparent 1px);
    background-size:54px 54px}
  /* the trace sits behind the numeral, bleeding off both edges */
  .trace{position:absolute;left:0;width:1080px;height:${SQ ? 340 : 430}px;
    top:${SQ ? 250 : 330}px;opacity:.92}
  /* a soft pool of light under the number so type never fights the grid */
  .glow{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(ellipse 62% 34% at 32% ${SQ ? 42 : 40}%, rgba(232,255,82,.10), rgba(5,7,10,0) 70%)}
  .vig{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(ellipse 96% 78% at 50% 50%, rgba(5,7,10,0) 46%, rgba(5,7,10,.82) 100%)}

  .inner{position:relative;z-index:3;height:100%;
    padding:${SQ ? '46px 48px 42px' : '62px 58px 54px'};display:flex;flex-direction:column}

  /* eyebrow: a record light and a channel name */
  .eye{display:flex;align-items:center;gap:16px;flex:none;font-family:'JetBrains Mono',monospace}
  .eye b{display:flex;align-items:center;gap:9px;font-weight:700;
    font-size:${SQ ? 16 : 19}px;letter-spacing:.2em;color:var(--alarm);text-transform:uppercase}
  .eye b::before{content:'';width:${SQ ? 10 : 12}px;height:${SQ ? 10 : 12}px;background:var(--alarm);border-radius:50%}
  .eye i{flex:1;height:1px;background:var(--steel);opacity:.42}
  .eye span{font-size:${SQ ? 16 : 19}px;letter-spacing:.22em;color:var(--steel);text-transform:uppercase}

  /* The type block starts level with the trace so the numeral rides the signal,
     and the remaining air collects once, above the credit line. */
  .mid{flex:1;display:flex;flex-direction:column;justify-content:flex-start;
    min-height:0;padding-top:${SQ ? 236 : 292}px}
  /* The list card carries less type, so centre it instead of hanging it high. */
  .kind-list .mid{justify-content:center;padding-top:0}
  /* Type sits over a live trace, so every glyph gets its own pool of dark.
     Cheaper and better looking than boxing the text out of the artwork. */
  h1,.kick,.sub,ol li{text-shadow:0 2px 20px rgba(5,7,10,.96),0 0 7px rgba(5,7,10,.92)}
  .num{font-family:'Anton',sans-serif;font-size:${SQ ? 250 : 360}px;line-height:.78;
    color:var(--lime);letter-spacing:-.02em}
  .num u{text-decoration:none;font-size:.34em;color:var(--alarm);margin-left:6px}
  h1{font-family:'Anton',sans-serif;font-weight:400;text-transform:uppercase;color:var(--paper);
    letter-spacing:.004em;margin-top:${SQ ? 10 : 14}px}
  .kind-stat h1{font-size:${SQ ? 58 : 82}px;line-height:.98;max-width:${SQ ? 960 : 900}px}
  .kind-call h1{font-size:${SQ ? 76 : 104}px;line-height:.95}
  .kind-list h1{font-size:${SQ ? 50 : 68}px;line-height:1.02;max-width:940px}
  .kick{font-family:'Anton',sans-serif;text-transform:uppercase;color:var(--lime);
    font-size:${SQ ? 58 : 82}px;line-height:.98}
  .kind-call .kick{font-size:${SQ ? 40 : 54}px;color:var(--lime)}

  /* the printed sign, for the call cards */
  .sign{align-self:flex-start;border:3px solid var(--lime);background:rgba(232,255,82,.07);
    padding:${SQ ? '12px 22px 15px' : '16px 30px 20px'};margin-top:${SQ ? 16 : 22}px}
  .sign span{display:block;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 13 : 16}px;letter-spacing:.22em;text-transform:uppercase;color:var(--alarm);margin-bottom:7px}
  .sign b{display:block;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 30 : 40}px;line-height:1;letter-spacing:-.01em;color:var(--lime)}

  ol{list-style:none;counter-reset:s;margin-top:${SQ ? 20 : 28}px;
    display:flex;flex-direction:column;gap:${SQ ? 13 : 18}px}
  ol li{counter-increment:s;display:flex;gap:${SQ ? 14 : 20}px;align-items:baseline;
    font-size:${SQ ? 20 : 26}px;line-height:1.36;color:rgba(242,244,247,.86);max-width:930px}
  ol li::before{content:'0' counter(s);flex:none;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 17 : 21}px;color:var(--lime)}

  .foot{flex:none;display:flex;flex-direction:column;gap:${SQ ? 12 : 16}px}
  .sub{font-size:${SQ ? 19 : 23}px;line-height:1.5;color:rgba(138,148,166,.95);
    max-width:${SQ ? 980 : 880}px;margin-top:${SQ ? 16 : 24}px}
  .src{font-family:'JetBrains Mono',monospace;font-size:${SQ ? 13 : 16}px;letter-spacing:.05em;color:var(--dim)}
  .bar{display:flex;justify-content:space-between;align-items:center;gap:20px;
    border-top:1px solid rgba(138,148,166,.3);padding-top:${SQ ? 13 : 16}px;
    font-family:'JetBrains Mono',monospace;font-size:${SQ ? 13 : 16}px;letter-spacing:.18em;color:var(--steel)}
  .sticker{font-family:'JetBrains Mono',monospace;font-weight:700;background:var(--alarm);color:var(--void);
    padding:${SQ ? '5px 12px' : '7px 15px'};font-size:${SQ ? 13 : 16}px;letter-spacing:.14em;text-transform:uppercase}
</style></head><body>${body}</body></html>`;

const card = (c) => {
  const w = 1080;
  const th = SQ ? 340 : 430;
  const d = trace(c.seed, w, th, c.mode);
  const stat = c.kind === 'stat' ? `<div class="num">${c.stat}<u>${c.unit}</u></div>` : '';
  const kicker = c.kicker ? `<p class="kick">${c.kicker}</p>` : '';
  const sign = c.sign
    ? `<div class="sign"><span>${c.signLabel}</span><b>${c.sign}</b></div>`
    : '';
  const lede =
    c.kind === 'list'
      ? `<ol>${c.items.map((i) => `<li>${i}</li>`).join('')}</ol>`
      : `<p class="sub">${c.sub}</p>`;
  const right = c.sticker
    ? `<span class="sticker">${c.sticker.small} ${c.sticker.big}</span>`
    : `<span>MODERNMUSTARDSEED.COM</span>`;

  return shell(`<div class="card kind-${c.kind}">
    <div class="grid"></div>
    <svg class="trace" viewBox="0 0 ${w} ${th}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="var(--lime)" stroke-width="9" opacity=".15"/>
      <path d="${d}" fill="none" stroke="var(--lime)" stroke-width="3"/>
    </svg>
    <div class="glow"></div>
    <div class="vig"></div>
    <div class="inner">
      <div class="eye"><b>Rec</b><i></i><span>${c.eyebrow}</span></div>
      <div class="mid">
        ${stat}
        <h1>${c.head}</h1>
        ${kicker}
        ${sign}
        ${lede}
      </div>
      <div class="foot">
        <p class="src">${c.src}</p>
        <div class="bar"><span>MODERN MUSTARD SEED</span>${right}</div>
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
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${c.id}.png`) });
  console.log(`rendered ${c.id}.png ${SQ ? '(square)' : '(feed)'}`);
}
await browser.close();
