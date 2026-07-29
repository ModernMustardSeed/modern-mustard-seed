#!/usr/bin/env node
// "THE GRID" — set four of the MMS social library. Speed to lead, staged as a
// motorsport race: chequer strip, leaning speed streaks, and a timing tower
// classifying the reader against the field.
//
// Distinct from the other three on purpose. Sets one and two are warm cream
// screenprint; set three is near-black broadcast. This one is cold paper white,
// racing red, hard italic condensed caps. Everything generated in code.
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

const PHONE = '(406) 312-1223';

// ---------------------------------------------------------------- generators
// Motion blur as geometry: streaks leaning into the corner, denser where the
// number sits, so the card reads as speed before a single word is read.
function streaks(seedNum, w, h) {
  let s = seedNum;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const out = [];
  for (let i = 0; i < 78; i++) {
    const y = rnd() * h;
    const len = 90 + rnd() * 620;
    const x = rnd() * w - 120;
    const op = 0.03 + rnd() * 0.11;
    const th = 2 + rnd() * 9;
    out.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${len.toFixed(1)}" height="${th.toFixed(
        1,
      )}" fill="#0B0D10" opacity="${op.toFixed(3)}" transform="skewX(-16)"/>`,
    );
  }
  return out.join('');
}

// The chequered flag, as a two-row strip
function chequer(w, sq, rows = 2) {
  const cols = Math.ceil(w / sq);
  let out = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if ((r + c) % 2 === 0)
        out += `<rect x="${c * sq}" y="${r * sq}" width="${sq}" height="${sq}" fill="#0B0D10"/>`;
  return out;
}

// ---------------------------------------------------------------- the set
const CARDS = [
  {
    id: '01-seven-times',
    kind: 'stat',
    eyebrow: 'Speed to Lead / 01',
    seed: 5501,
    stat: '7',
    unit: '×',
    head: 'more likely to win the job if you answer inside the hour.',
    kicker: 'Sixty times, against the ones who waited a day.',
    tower: [
      ['P1', 'Answered inside the hour', '0:59:59'],
      ['P2', 'Answered the next day', '+24:00:00'],
    ],
    sub: 'Harvard audited 2,241 US companies by sending them real web enquiries and timing the reply. The gap between first and second was not talent. It was minutes.',
    src: 'Harvard Business Review · 2,241 US companies audited · 2011',
  },
  {
    id: '02-forty-two-hours',
    kind: 'stat',
    eyebrow: 'Speed to Lead / 02',
    seed: 7714,
    stat: '42',
    unit: 'hr',
    head: 'is how long the average reply actually takes.',
    kicker: 'Your customer is not waiting that long.',
    tower: [
      ['P1', 'What the customer expects', '1:00:00'],
      ['P2', 'What the field delivers', '+41:00:00'],
    ],
    sub: 'Not the worst. The average, among the companies that bothered to reply at all. Somebody enquired on Monday morning and heard back Tuesday night, by which point they had already hired you or someone else.',
    src: 'Harvard Business Review · 2,241 US companies audited · 2011',
  },
  {
    id: '03-dnf',
    kind: 'stat',
    eyebrow: 'Speed to Lead / 03',
    seed: 3388,
    stat: '23',
    unit: '%',
    head: 'never reply at all.',
    kicker: 'A quarter of the grid never leaves the line.',
    tower: [
      ['P1', 'Replied', 'Classified'],
      ['DNF', 'Never replied', '23% of the field'],
    ],
    sub: 'Nearly one business in four received the enquiry and simply never answered it. That is not a marketing problem or a pricing problem. That is a job that walked in the door and was left standing there.',
    src: 'Harvard Business Review · 2,241 US companies audited · 2011',
  },
  {
    id: '04-the-flag',
    kind: 'stat',
    eyebrow: 'Speed to Lead / 04',
    seed: 9126,
    stat: '56',
    unit: '%',
    head: 'expect to hear back within the hour.',
    kicker: 'That is the flag. Everything after it is late.',
    tower: [
      ['P1', 'Inside the hour', 'On the lead lap'],
      ['P2', 'After the hour', 'Lapped'],
    ],
    sub: 'This one is not from a boardroom, it is from home service customers surveyed this year. The hour is not a target somebody invented. It is what people already assume is normal.',
    src: 'Jobber home services consumer survey · 2026',
  },
  {
    id: '05-race-it',
    kind: 'call',
    eyebrow: 'Open invitation',
    seed: 1207,
    head: 'Race it.',
    kicker: 'It answers on ring one. Every time. At any hour.',
    sign: PHONE,
    signLabel: 'Try to beat my AI to the phone',
    sub: 'Call it and time it yourself. It picks up before the first ring finishes, tells you straight away that it is an AI, and books the job if you want it to. Then go ring your own number and compare.',
    src: 'Free. Any hour. No pitch trap.',
    sticker: 'It costs you nothing',
  },
  {
    id: '06-pit-stop',
    kind: 'list',
    eyebrow: 'Three seconds off your lap',
    seed: 4470,
    head: 'You do not need to be fast all day. You need to be fast first.',
    items: [
      'Auto text-back on every missed call, inside sixty seconds, even just "sorry we missed you, what do you need?"',
      'Name the person who owns the phone from eight to six. By name, on a rota, not by hope.',
      'Give the after-hours calls somewhere that answers instead of a beep.',
    ],
    src: 'Two of the three are free and take an afternoon.',
  },
];

// ---------------------------------------------------------------- template
const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#F2F3F5; --ink:#0B0D10; --red:#E10600; --steel:#9AA3AD; --chalk:#FFFFFF;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:${H}px;overflow:hidden}
  body{background:var(--paper);font-family:'Barlow',sans-serif;-webkit-font-smoothing:antialiased}

  .card{position:relative;width:1080px;height:${H}px;overflow:hidden;background:var(--paper)}
  .streaks{position:absolute;inset:0;width:1080px;height:${H}px}
  /* The livery stripe drives off the right edge. Kept narrow and shallow on
     purpose: at a steeper skew its lower corner swings left far enough to sit
     on top of the timing tower. */
  .wedge{position:absolute;right:-60px;top:0;width:206px;height:${H}px;background:var(--red);
    transform:skewX(-8deg);opacity:.96}
  .wedge2{position:absolute;right:152px;top:0;width:14px;height:${H}px;background:var(--ink);
    transform:skewX(-8deg)}
  .flag{position:absolute;left:0;width:1080px;height:${SQ ? 28 : 34}px}
  .flag.top{top:0}
  .flag.bot{bottom:0}

  .inner{position:relative;z-index:4;height:100%;
    padding:${SQ ? '62px 46px 60px' : '78px 58px 76px'};display:flex;flex-direction:column}

  .eye{display:flex;align-items:center;gap:16px;flex:none;font-family:'JetBrains Mono',monospace}
  .eye b{font-weight:700;font-size:${SQ ? 15 : 18}px;letter-spacing:.2em;text-transform:uppercase;color:var(--red)}
  .eye i{flex:1;height:2px;background:var(--ink);opacity:.85}
  .eye span{font-size:${SQ ? 15 : 18}px;letter-spacing:.2em;text-transform:uppercase;color:rgba(11,13,16,.55)}

  .mid{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}

  .num{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;
    font-size:${SQ ? 250 : 336}px;line-height:.82;color:var(--ink);letter-spacing:-.02em}
  .num u{text-decoration:none;font-size:.3em;color:var(--red);margin-left:8px;letter-spacing:0;
    vertical-align:.42em}

  h1{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;
    text-transform:uppercase;color:var(--ink);letter-spacing:-.005em;margin-top:${SQ ? 6 : 10}px}
  .kind-stat h1{font-size:${SQ ? 56 : 74}px;line-height:.96;max-width:${SQ ? 860 : 748}px}
  .kind-call h1{font-size:${SQ ? 96 : 132}px;line-height:.9}
  .kind-list h1{font-size:${SQ ? 48 : 62}px;line-height:1;max-width:748px}
  .kick{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;
    font-size:${SQ ? 34 : 44}px;line-height:1.06;color:var(--red);text-transform:uppercase;
    margin-top:${SQ ? 8 : 12}px;max-width:${SQ ? 840 : 730}px}

  /* the timing tower */
  .tower{margin-top:${SQ ? 20 : 28}px;border-top:3px solid var(--ink);border-bottom:3px solid var(--ink);
    max-width:${SQ ? 860 : 748}px}
  .tower .row{display:flex;align-items:center;gap:${SQ ? 14 : 20}px;
    padding:${SQ ? '9px 0' : '12px 0'};border-bottom:1px solid rgba(11,13,16,.2)}
  .tower .row:last-child{border-bottom:0}
  .tower .pos{flex:none;min-width:${SQ ? 54 : 64}px;text-align:center;
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:${SQ ? 17 : 20}px;
    background:var(--ink);color:var(--paper);padding:${SQ ? '4px 8px' : '5px 10px'}}
  .tower .row.dnf .pos{background:var(--red)}
  .tower .who{flex:1;font-family:'Barlow',sans-serif;font-weight:500;
    font-size:${SQ ? 19 : 23}px;color:rgba(11,13,16,.8)}
  .tower .t{flex:none;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 19 : 23}px;color:var(--ink);font-variant-numeric:tabular-nums}
  .tower .row.dnf .t{color:var(--red)}

  .sign{align-self:flex-start;background:var(--ink);padding:${SQ ? '12px 24px 16px' : '16px 32px 21px'};
    margin-top:${SQ ? 16 : 22}px;transform:skewX(-8deg)}
  .sign > *{transform:skewX(8deg)}
  .sign span{display:block;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 13 : 16}px;letter-spacing:.2em;text-transform:uppercase;color:var(--red);margin-bottom:6px}
  .sign b{display:block;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;
    font-size:${SQ ? 52 : 70}px;line-height:1;color:var(--chalk)}

  ol{list-style:none;counter-reset:s;margin-top:${SQ ? 20 : 28}px;
    display:flex;flex-direction:column;gap:${SQ ? 13 : 17}px;max-width:${SQ ? 860 : 752}px}
  ol li{counter-increment:s;display:flex;gap:${SQ ? 15 : 20}px;align-items:flex-start;
    font-size:${SQ ? 19 : 24}px;line-height:1.36;color:rgba(11,13,16,.84)}
  ol li::before{content:'0' counter(s);flex:none;font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 16 : 20}px;color:var(--red);padding-top:3px}

  .foot{flex:none;display:flex;flex-direction:column;gap:${SQ ? 11 : 15}px;
    max-width:${SQ ? 880 : 760}px}
  .sub{font-size:${SQ ? 19 : 23}px;line-height:1.5;color:rgba(11,13,16,.74);
    max-width:${SQ ? 840 : 740}px;margin-top:${SQ ? 16 : 24}px}
  .src{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:${SQ ? 13 : 16}px;
    letter-spacing:.04em;color:rgba(11,13,16,.5)}
  .bar{display:flex;justify-content:space-between;align-items:center;gap:18px;
    border-top:3px solid var(--ink);padding-top:${SQ ? 12 : 15}px;
    font-family:'JetBrains Mono',monospace;font-weight:700;
    font-size:${SQ ? 13 : 16}px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink)}
  .bar .sticker{background:var(--red);color:var(--chalk);padding:${SQ ? '5px 12px' : '6px 14px'};
    letter-spacing:.13em}
</style></head><body>${body}</body></html>`;

const card = (c) => {
  const stat = c.kind === 'stat' ? `<div class="num">${c.stat}<u>${c.unit}</u></div>` : '';
  const kicker = c.kicker ? `<p class="kick">${c.kicker}</p>` : '';
  const sign = c.sign ? `<div class="sign"><span>${c.signLabel}</span><b>${c.sign}</b></div>` : '';
  const tower = c.tower
    ? `<div class="tower">${c.tower
        .map(
          (r) =>
            `<div class="row ${r[0] === 'DNF' ? 'dnf' : ''}"><span class="pos">${r[0]}</span><span class="who">${r[1]}</span><span class="t">${r[2]}</span></div>`,
        )
        .join('')}</div>`
    : '';
  const lede =
    c.kind === 'list'
      ? `<ol>${c.items.map((i) => `<li>${i}</li>`).join('')}</ol>`
      : `<p class="sub">${c.sub}</p>`;
  const right = c.sticker
    ? `<span class="sticker">${c.sticker}</span>`
    : `<span>MODERNMUSTARDSEED.COM</span>`;
  const sq = SQ ? 17 : 17;

  return shell(`<div class="card kind-${c.kind}">
    <svg class="streaks" viewBox="0 0 1080 ${H}">${streaks(c.seed, 1080, H)}</svg>
    <div class="wedge"></div>
    <div class="wedge2"></div>
    <svg class="flag top" viewBox="0 0 1080 ${sq * 2}">${chequer(1080, sq)}</svg>
    <svg class="flag bot" viewBox="0 0 1080 ${sq * 2}">${chequer(1080, sq)}</svg>
    <div class="inner">
      <div class="eye"><b>${c.eyebrow}</b><i></i></div>
      <div class="mid">
        ${stat}
        <h1>${c.head}</h1>
        ${kicker}
        ${tower}
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
