#!/usr/bin/env node
// Renders the MMS "Storefront Files" social set to exact-size PNGs.
//
// Same 1080x1350 frame language as ../missed-calls: rotated ink-bordered plate
// with a mustard offset shadow, mustard halftone paper, Playfair + DM Sans +
// JetBrains Mono composited here in real fonts.
//
// ART SLOT: if art/<plate>.png exists it is used as the plate image. Otherwise
// the card falls back to the flat screenprint SVG motif defined below, which is
// what ships today (the fal wallet was empty on 2026-07-28). To upgrade the whole
// set to Seedream plates later:  node fal-run.mjs all && node render.mjs
//
// Usage: node render.mjs [cardId ...]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'cards');
const ART = path.join(HERE, 'art');
const SITE = 'modernmustardseed.com/website-audit';

fs.mkdirSync(OUT, { recursive: true });

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';

// ------------------------------------------------------------ flat motifs
// Bold, confident, four-color. Simple primitives only, poster scale.
const V = 'viewBox="0 0 960 520" preserveAspectRatio="xMidYMid slice"';
const paper = `<rect width="960" height="520" fill="${CREAM}"/>`;
const ground = `<rect x="0" y="452" width="960" height="9" fill="${INK}"/>`;

const shop = (x, fill) => `
  <polygon points="${x},176 ${x + 110},104 ${x + 220},176" fill="${fill}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <rect x="${x}" y="176" width="220" height="276" fill="${CREAM}" stroke="${INK}" stroke-width="9"/>
  <rect x="${x + 30}" y="216" width="72" height="72" fill="${fill}" stroke="${INK}" stroke-width="8"/>
  <rect x="${x + 128}" y="216" width="62" height="72" fill="${CREAM}" stroke="${INK}" stroke-width="8"/>
  <rect x="${x + 74}" y="330" width="80" height="122" fill="${fill === MUSTARD ? MUSTARD : CREAM}" stroke="${INK}" stroke-width="9"/>`;

const MOTIFS = {
  // 01 they all start in the same place
  'google-first': `<svg ${V}>${paper}
    ${shop(60, CREAM)}${shop(340, MUSTARD)}${shop(620, CREAM)}
    ${ground}
    <circle cx="450" cy="250" r="168" fill="none" stroke="${INK}" stroke-width="20"/>
    <circle cx="450" cy="250" r="168" fill="${BLUE}" opacity=".10"/>
    <rect x="556" y="366" width="180" height="34" rx="17" fill="${INK}" transform="rotate(41 556 366)"/>
  </svg>`,

  // 02 the window and the door
  'window-and-door': `<svg ${V}>${paper}
    <polygon points="620,452 960,452 800,150 700,150" fill="${MUSTARD}" opacity=".85"/>
    <rect x="70" y="120" width="360" height="300" fill="${CREAM}" stroke="${INK}" stroke-width="11"/>
    <rect x="70" y="120" width="360" height="300" fill="${BLUE}" opacity=".08"/>
    <rect x="248" y="120" width="10" height="300" fill="${INK}"/>
    <rect x="70" y="266" width="360" height="10" fill="${INK}"/>
    <rect x="112" y="164" width="94" height="70" fill="${RED}"/>
    <rect x="298" y="308" width="94" height="70" fill="${MUSTARD}"/>
    <rect x="640" y="150" width="180" height="302" fill="${CREAM}" stroke="${INK}" stroke-width="11"/>
    <polygon points="640,150 640,452 548,420 548,182" fill="${CREAM}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/>
    <circle cx="612" cy="306" r="13" fill="${INK}"/>
    <circle cx="486" cy="228" r="40" fill="${INK}"/>
    <path d="M446 288 q40 -22 80 0 l14 164 h-108 z" fill="${INK}"/>
    ${ground}
  </svg>`,

  // 03 the blank sign
  'blank-facade': `<svg ${V}>${paper}
    <rect x="0" y="0" width="960" height="452" fill="${BLUE}" opacity=".13"/>
    <rect x="110" y="70" width="740" height="382" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
    <rect x="176" y="118" width="608" height="128" fill="${CREAM}" stroke="${INK}" stroke-width="14"/>
    <rect x="176" y="300" width="608" height="152" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="188" y="${312 + i * 28}" width="584" height="12" fill="${INK}" opacity=".82"/>`).join('')}
    <rect x="404" y="300" width="152" height="152" fill="${INK}" opacity=".14"/>
    <polygon points="866,452 936,452 916,392 886,392" fill="${INK}" opacity=".2"/>
    ${ground}
  </svg>`,

  // 04 the drawer the machine opens
  'card-catalog': `<svg ${V}>${paper}
    ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5].map((c) => `
      <rect x="${72 + c * 138}" y="${58 + r * 100}" width="118" height="80" fill="${CREAM}" stroke="${INK}" stroke-width="8"/>
      <rect x="${118 + c * 138}" y="${90 + r * 100}" width="26" height="9" fill="${INK}"/>`).join('')).join('')}
    <rect x="348" y="240" width="266" height="118" fill="${MUSTARD}" stroke="${INK}" stroke-width="11"/>
    <rect x="392" y="176" width="86" height="118" fill="${CREAM}" stroke="${INK}" stroke-width="9" transform="rotate(-7 392 176)"/>
    <rect x="470" y="292" width="52" height="11" fill="${INK}"/>
    <rect x="640" y="196" width="46" height="126" fill="${INK}"/>
    <rect x="596" y="238" width="52" height="34" fill="${INK}"/>
    <circle cx="576" cy="255" r="26" fill="${RED}" stroke="${INK}" stroke-width="9"/>
    ${ground}
  </svg>`,

  // 05 the report card
  'clipboard-grade': `<svg ${V}>${paper}
    <rect x="96" y="96" width="420" height="356" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
    <rect x="252" y="70" width="108" height="50" rx="14" fill="${INK}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="146" y="${176 + i * 52}" width="${i === 4 ? 180 : 320}" height="14" fill="${INK}" opacity=".8"/>`).join('')}
    <polyline points="186,318 268,392 452,182" fill="none" stroke="${RED}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="620,214 740,132 860,214" fill="${MUSTARD}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="620" y="214" width="240" height="238" fill="${CREAM}" stroke="${INK}" stroke-width="10"/>
    <rect x="656" y="254" width="76" height="70" fill="${MUSTARD}" stroke="${INK}" stroke-width="9"/>
    <rect x="700" y="352" width="86" height="100" fill="${MUSTARD}" stroke="${INK}" stroke-width="10"/>
    ${ground}
  </svg>`,

  // 06 the storefront itself
  'awning-shop': `<svg ${V}>${paper}
    <rect x="120" y="150" width="720" height="302" fill="${CREAM}" stroke="${INK}" stroke-width="12"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<polygon points="${132 + i * 120},60 ${252 + i * 120},60 ${222 + i * 120},152 ${162 + i * 120},152" fill="${i % 2 ? MUSTARD : RED}"/>`).join('')}
    <rect x="120" y="46" width="720" height="18" fill="${INK}"/>
    <polygon points="132,60 852,60 822,152 162,152" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
    <rect x="178" y="212" width="240" height="164" fill="${BLUE}" opacity=".14"/>
    <rect x="178" y="212" width="240" height="164" fill="none" stroke="${INK}" stroke-width="11"/>
    <rect x="298" y="212" width="10" height="164" fill="${INK}"/>
    <rect x="560" y="212" width="150" height="240" fill="${MUSTARD}" stroke="${INK}" stroke-width="12"/>
    <circle cx="588" cy="336" r="14" fill="${INK}"/>
    ${ground}
  </svg>`,
};

// ---------------------------------------------------------------- the set
const CARDS = [
  {
    id: '01-google-first',
    motif: 'google-first',
    kind: 'stat',
    eyebrow: 'The Storefront Files / 01',
    stat: '67',
    unit: '%',
    head: 'start at Google when they need someone local.',
    sub: 'Nobody drives around looking for a roofer anymore. They need a problem solved, they pull out a phone, and they start typing. Whatever comes back is the whole list of businesses that exist to them.',
    src: 'Source: DreamHost Local Business Trust Index, 1,201 US consumers, 2026',
  },
  {
    id: '02-verify-site',
    motif: 'window-and-door',
    kind: 'stat',
    eyebrow: 'The Storefront Files / 02',
    stat: '58',
    unit: '%',
    head: 'go to your website to check whether you are real.',
    sub: 'They find you somewhere else first, on Google, on Facebook, from a friend. Then they go to the website to confirm it. Social is the window. The website is the store they actually walk into.',
    src: 'Source: DreamHost Local Business Trust Index, 1,201 US consumers, 2026',
  },
  {
    id: '03-no-site',
    motif: 'blank-facade',
    kind: 'stat',
    eyebrow: 'The Storefront Files / 03',
    stat: '39',
    unit: '%',
    head: 'have walked away from a business that had no website.',
    sub: 'Not argued with it. Not asked around about it. Walked. Another 45% say a business with no website simply does not feel real to them. A blank sign above the door does the same thing.',
    src: 'Source: DreamHost Local Business Trust Index, 1,201 US consumers, 2026',
  },
  {
    id: '04-ai-front-door',
    motif: 'card-catalog',
    kind: 'stat',
    eyebrow: 'The Storefront Files / 04',
    stat: '45',
    unit: '%',
    head: 'now use AI to find local businesses. Last year it was 6%.',
    sub: 'Something new is reading every website in your town and deciding which three names to say out loud. It cannot recommend a business it cannot read. That is the whole game for the next few years.',
    src: 'Source: BrightLocal Local Consumer Review Survey, 1,002 US consumers, 2026',
  },
  {
    id: '05-grade-it',
    motif: 'clipboard-grade',
    kind: 'call',
    bigSign: true,
    eyebrow: 'Open invitation',
    head: 'Grade my website.',
    kicker: 'Then argue with the score.',
    sub: 'Drop your URL and an AI reads the actual page: brand, trust, SEO, AI-search readiness, conversion, design. You get a score out of 100, a letter grade, an honest headline, and a ranked to-do list. It takes under a minute.',
    src: 'Free. No credit card. No email needed to see the result.',
    sticker: { small: 'It costs you', big: 'Nothing' },
  },
  {
    id: '06-storefront',
    motif: 'awning-shop',
    kind: 'list',
    eyebrow: 'What the storefront has to do',
    head: 'Found. Believed. Easy to buy from.',
    items: [
      'Turn up when somebody nearby types the problem you solve.',
      'Prove in five seconds that you are real, local, and still in business.',
      'Make the next step obvious, whether that is a call, a form, or a booking.',
    ],
    src: 'Miss any one of the three and the other two stop paying you.',
  },
];

// ---------------------------------------------------------------- template
const dataUri = (f) =>
  `data:image/png;base64,${fs.readFileSync(path.join(ART, f)).toString('base64')}`;

const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --cream:${CREAM}; --ink:${INK}; --mustard:${MUSTARD}; --red:${RED};
    --red-dark:#C4160B; --blue:${BLUE}; --gold-dark:#8f6600;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:1350px;overflow:hidden}
  body{background:var(--cream);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  .paper{
    position:relative;width:1080px;height:1350px;padding:60px 62px 54px;
    display:flex;flex-direction:column;background-color:var(--cream);
    background-image:radial-gradient(var(--mustard) 1.6px, transparent 1.7px);
    background-size:15px 15px;
  }
  .paper::before{
    content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse 78% 62% at 50% 55%, var(--cream) 45%, rgba(251,246,234,0) 100%);
    pointer-events:none;
  }
  .paper::after{
    content:'';position:absolute;inset:0;pointer-events:none;opacity:.16;mix-blend-mode:multiply;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .layer{position:relative;z-index:2;display:flex;flex-direction:column;height:100%}

  .eyebrow{display:flex;align-items:center;gap:18px;flex:none}
  .eyebrow b{
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:21px;
    letter-spacing:.2em;text-transform:uppercase;color:var(--red-dark);white-space:nowrap;
  }
  .eyebrow i{flex:1;height:3px;background:var(--ink);display:block}

  .plate{flex:none;position:relative;margin:30px 0 0;transform:rotate(-1.1deg)}
  .plate .frame{
    position:relative;display:block;width:100%;height:var(--ph,462px);overflow:hidden;
    border:5px solid var(--ink);box-shadow:16px 16px 0 0 var(--mustard);background:var(--cream);
  }
  .plate img,.plate svg{display:block;width:100%;height:100%;object-fit:cover}
  /* screenprint misregistration: a red ghost of the motif, nudged off-plate */
  .plate .ghost{
    position:absolute;inset:0;opacity:.16;mix-blend-mode:multiply;
    transform:translate(7px,5px);filter:saturate(0) sepia(1) hue-rotate(-35deg) saturate(6);
    pointer-events:none;
  }
  .plate .dots{
    position:absolute;inset:0;pointer-events:none;opacity:.30;mix-blend-mode:multiply;
    background-image:radial-gradient(var(--ink) 1.1px, transparent 1.2px);background-size:7px 7px;
  }

  .stat{position:relative;height:0;z-index:3;display:flex}
  .stat .num{
    position:absolute;left:-10px;top:-92px;display:flex;align-items:baseline;
    background:var(--mustard);border:5px solid var(--ink);box-shadow:13px 13px 0 0 var(--ink);
    transform:rotate(-1.6deg);padding:6px 30px 22px;
    font-family:'Playfair Display',serif;font-weight:900;font-size:152px;line-height:1;
    letter-spacing:-.035em;color:var(--ink);
  }
  .stat .num u{text-decoration:none;color:var(--red);font-size:.56em;margin-left:6px}

  .sign{
    align-self:flex-start;background:var(--ink);border:5px solid var(--ink);
    box-shadow:13px 13px 0 0 var(--mustard);transform:rotate(-.7deg);
    padding:16px 32px 22px;margin-top:22px;
  }
  .sign b{
    display:block;font-family:'DM Sans',sans-serif;font-weight:700;font-size:52px;
    line-height:1;letter-spacing:-.02em;color:var(--cream);
  }
  .sign span{
    display:block;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:17px;
    letter-spacing:.2em;text-transform:uppercase;color:var(--mustard);margin-bottom:9px;
  }

  .body{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:4px}
  h1{font-family:'Playfair Display',serif;font-weight:800;color:var(--ink);letter-spacing:-.015em}
  .kind-stat h1{font-size:62px;line-height:1.03;max-width:955px}
  .kind-stat .body{padding-top:114px}
  .kind-call h1{font-size:104px;line-height:.94;letter-spacing:-.03em}
  .kind-list h1{font-size:70px;line-height:1;letter-spacing:-.025em}
  .kicker{
    font-family:'Playfair Display',serif;font-style:italic;font-weight:800;
    font-size:52px;line-height:1.06;color:var(--gold-dark);margin-top:8px;letter-spacing:-.01em;
  }
  .sub{font-size:27px;line-height:1.44;color:rgba(22,22,22,.86);max-width:900px;margin-top:22px}
  ol{list-style:none;counter-reset:s;margin-top:26px;display:flex;flex-direction:column;gap:15px}
  ol li{
    counter-increment:s;display:flex;gap:18px;align-items:baseline;
    font-size:26px;line-height:1.35;color:rgba(22,22,22,.88);max-width:930px;
  }
  ol li::before{
    content:counter(s);flex:none;width:44px;height:44px;border:3px solid var(--ink);
    background:var(--mustard);border-radius:50%;
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:22px;color:var(--ink);
    display:flex;align-items:center;justify-content:center;transform:translateY(6px);
  }
  .src{
    font-family:'JetBrains Mono',monospace;font-weight:500;font-size:18px;
    letter-spacing:.04em;color:rgba(22,22,22,.62);margin-top:22px;
  }

  .foot{flex:none;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-top:26px}
  .mark{
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:19px;
    letter-spacing:.16em;text-transform:uppercase;color:var(--ink);line-height:1.5;
  }
  .mark span{display:block;color:var(--gold-dark);letter-spacing:.1em}
  .sticker{
    background:var(--red);color:var(--cream);border:4px solid var(--ink);
    box-shadow:9px 9px 0 0 var(--ink);transform:rotate(-2.2deg);
    padding:12px 24px 15px;text-align:center;
  }
  .sticker small{
    display:block;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:16px;
    letter-spacing:.22em;text-transform:uppercase;opacity:.95;margin-bottom:2px;
  }
  .sticker strong{
    display:block;font-family:'DM Sans',sans-serif;font-weight:700;font-size:30px;
    letter-spacing:-.01em;line-height:1.1;
  }
</style></head><body>${body}</body></html>`;

const card = (c) => {
  const plateFile = path.join(ART, `${c.motif}.png`);
  const hasArt = fs.existsSync(plateFile);
  const art = hasArt
    ? `<img src="${dataUri(`${c.motif}.png`)}" alt="">`
    : `${MOTIFS[c.motif]}<div class="ghost">${MOTIFS[c.motif]}</div><div class="dots"></div>`;

  const stat =
    c.kind === 'stat'
      ? `<div class="stat"><div class="num">${c.stat}<u>${c.unit}</u></div></div>`
      : '';
  const lede =
    c.kind === 'list'
      ? `<ol>${c.items.map((i) => `<li>${i}</li>`).join('')}</ol>`
      : `<p class="sub">${c.sub}</p>`;
  const kicker = c.kicker ? `<p class="kicker">${c.kicker}</p>` : '';
  const sign = c.bigSign
    ? `<div class="sign"><span>Free audit at modernmustardseed.com</span><b>/website-audit</b></div>`
    : '';
  const ph = c.kind === 'stat' ? 520 : c.kind === 'list' ? 612 : 484;

  return shell(`<div class="paper kind-${c.kind}"><div class="layer">
    <div class="eyebrow"><b>${c.eyebrow}</b><i></i></div>
    <figure class="plate" style="--ph:${ph}px"><div class="frame">${art}</div></figure>
    ${stat}
    <div class="body">
      <h1>${c.head}</h1>
      ${kicker}
      ${sign}
      ${lede}
      <p class="src">${c.src}</p>
    </div>
    <div class="foot">
      <div class="mark">Modern Mustard Seed<span>modernmustardseed.com</span></div>
      <div class="sticker">
        <small>${c.sticker?.small ?? 'Free website audit'}</small>
        <strong>${c.sticker?.big ?? '/website-audit'}</strong>
      </div>
    </div>
  </div></div>`);
};

// ---------------------------------------------------------------- render
const only = process.argv.slice(2);
const set = only.length ? CARDS.filter((c) => only.includes(c.id)) : CARDS;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const c of set) {
  const html = path.join(OUT, `${c.id}.html`);
  fs.writeFileSync(html, card(c));
  await page.goto(`file:///${html.replace(/\\/g, '/')}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${c.id}.png`) });
  console.log(`rendered ${c.id}.png${fs.existsSync(path.join(ART, `${c.motif}.png`)) ? ' (seedream plate)' : ' (svg motif)'}`);
}
await browser.close();
