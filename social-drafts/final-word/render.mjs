#!/usr/bin/env node
// Set: THE FINAL WORD (a Christian's handbook for AI).
//
// Usage: node render.mjs            -> cards/         (1080x1350 feed)
//        node render.mjs --square   -> cards-square/  (1080x1080 X cut)
//
// Then copy both into public/social/final-word/ with the -square suffix.
//
// House rule: card sets are drawn in code, never generated art. This set has
// no photograph at all, on purpose. The handbook is a book of words under one
// authority, and its share cards are the words themselves on daylight paper:
// ink, a gold rule, the verse. The six compositions are different because the
// six ideas are different shapes: a thesis, a list of four refusals, a numbered
// procedure, an eight-item column, a verse set large, and a two-column ledger.
//
// The headlines are the `headline` strings in data/handbook.ts HANDBOOK_POSTS,
// so what the admin tile says is what the PNG says.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// No Playwright in this repo. The CXC repo has 1.60; require it by path, because an
// ESM import of a Windows path is not a URL and Node refuses it.
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/SMSca/dev/mms/products/cross-covenant/node_modules/playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080;
const H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const PAPER = '#FBFBF8';
const INK = '#17203A';
const INK2 = '#4A5068';
const MUTE = '#6E6A5E';
const GOLD = '#F5B700';
const GOLD_INK = '#7A5A00';
const GOLD_SOFT = '#FFF3C7';
const LEAF = '#2E7D4F';
const EMBER = '#C8402E';
const LINE = '#DDD9CE';

const FOOT = 'FREE · CROSSANDCOVENANT.CO/HANDBOOK';

/**
 * One object per card. `kind` picks the composition. Every card carries the
 * eyebrow, the headline burned in, a scripture reference, and the footer.
 */
const CARDS = [
  {
    key: '01-final-word',
    kind: 'thesis',
    eye: 'THE FINAL WORD · 01',
    head: 'The Spirit has the <em>final word.</em> The machine is a tool.',
    verse: 'Now these Jews were more noble than those in Thessalonica; they received the word with all eagerness, examining the Scriptures daily to see if these things were so.',
    ref: 'ACTS 17:11, ESV',
  },
  {
    key: '02-never',
    kind: 'never',
    eye: 'THE FINAL WORD · 02',
    head: 'Four things AI must <em>never</em> become.',
    items: ['Your pastor', 'Your confessor', 'Your closest friend', 'Your Bible'],
    kick: 'AI helps with tasks. People handle hearts.',
    ref: 'HEBREWS 10:24-25',
  },
  {
    key: '03-preferred',
    kind: 'steps',
    eye: 'THE FINAL WORD · 03',
    head: 'Make your pastor a preferred source in Google. <em>Four minutes.</em>',
    items: [
      ['Sign in', 'and open google.com/preferences/source'],
      ['Search', 'your church, then your pastor, then the ministries you trust'],
      ['Tick the box', 'each site lands under Your sources'],
      ['Check it took', 'a Preferred badge in Top Stories, AI Overviews, AI Mode'],
    ],
    ref: 'PROVERBS 18:17',
  },
  {
    key: '04-tests',
    kind: 'tests',
    eye: 'THE FINAL WORD · 04',
    head: 'Test everything. <em>Eight tests,</em> sixty seconds.',
    items: [
      ['Scripture', 'Isaiah 8:20'],
      ['Christ', '1 John 4:2'],
      ['Gospel', 'Galatians 1:8'],
      ['Fruit', 'Matthew 7:16'],
      ['Source', 'Proverbs 18:17'],
      ['Flattery', 'Proverbs 27:6'],
      ['Isolation', 'Hebrews 10:25'],
      ['Counsel', 'Proverbs 11:14'],
    ],
    kick: 'Fail one, set it aside until a person you trust has looked.',
    ref: '1 THESSALONIANS 5:21',
  },
  {
    key: '05-build',
    kind: 'verse',
    eye: 'THE FINAL WORD · 05',
    head: 'The first person filled with the Spirit was a <em>craftsman.</em>',
    verse: 'and I have filled him with the Spirit of God, with ability and intelligence, with knowledge and all craftsmanship,',
    ref: 'EXODUS 31:3, ESV',
    kick: 'Building is holy work, and it has never been faster to start.',
  },
  {
    key: '06-ledger',
    kind: 'ledger',
    eye: 'THE FINAL WORD · 06',
    head: 'It will put the Word in every language. It will also <em>invent a verse.</em>',
    left: ['The Word in every language', 'Study at any depth', 'Ideas become products in days', 'Small churches, big-church operations', 'A tutor that never tires'],
    right: ['It will invent Scripture', 'It will flatter you', 'It will be there instead of your church', 'It will speak as God if you let it', 'It will never be still'],
    ref: 'PSALM 46:10',
  },
];

const esc = (s) => s.replace(/&(?!lt;|gt;|amp;|#)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* The square cut is a real design, not a squashed feed card. */
const S = SQUARE ? 0.86 : 1;
const px = (n) => Math.round(n * S);

function body(c) {
  switch (c.kind) {
    case 'thesis':
      return `<div class="verse"><p>${esc(c.verse)}</p><cite>${c.ref}</cite></div>`;
    case 'never':
      return `<ol class="never">${c.items
        .map((t) => `<li><span class="no">Never</span><span class="what">${esc(t)}</span></li>`)
        .join('')}</ol><p class="kick">${esc(c.kick)}</p><cite class="solo">${c.ref}</cite>`;
    case 'steps':
      return `<ol class="steps">${c.items
        .map(([b, t], i) => `<li><span class="n">${i + 1}</span><span><strong>${esc(b)}</strong> ${esc(t)}</span></li>`)
        .join('')}</ol><cite class="solo">${c.ref}</cite>`;
    case 'tests':
      return `<ol class="tests">${c.items
        .map(([t, r], i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">The ${esc(t)} test</span><span class="r">${esc(r)}</span></li>`)
        .join('')}</ol><p class="kick">${esc(c.kick)}</p><cite class="solo">${c.ref}</cite>`;
    case 'verse':
      return `<div class="verse big"><p>${esc(c.verse)}</p><cite>${c.ref}</cite></div><p class="kick">${esc(c.kick)}</p>`;
    case 'ledger':
      return `<div class="ledger">
        <div><h3><i class="dot leaf"></i>Benefits</h3><ul>${c.left.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div><h3><i class="dot ember"></i>Warnings</h3><ul>${c.right.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      </div><cite class="solo">${c.ref}</cite>`;
    default:
      return '';
  }
}

function cardHTML(c) {
  return `<div class="c">
    <div class="glow"></div>
    <div class="top">
      <div class="seed"></div>
      <span class="eye">${c.eye}</span>
      <span class="free">FREE</span>
    </div>
    <h1 class="${c.kind === 'ledger' || c.kind === 'steps' ? 'small' : ''}">${c.head}</h1>
    <div class="rule"></div>
    <div class="body">${body(c)}</div>
    <div class="foot"><span>${FOOT}</span><span class="brand">CROSS + COVENANT</span></div>
  </div>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;background:${PAPER}}
.c{width:${W}px;height:${H}px;background:${PAPER};color:${INK};position:relative;overflow:hidden;
  padding:${px(72)}px ${px(76)}px ${px(64)}px;display:flex;flex-direction:column;
  font-family:'Source Serif 4',Georgia,serif}
.glow{position:absolute;top:${px(-260)}px;right:${px(-200)}px;width:${px(760)}px;height:${px(760)}px;border-radius:50%;
  background:radial-gradient(circle, rgba(245,183,0,.42) 0%, rgba(245,183,0,.14) 45%, rgba(245,183,0,0) 70%)}

.top{position:relative;display:flex;align-items:center;gap:${px(16)}px;
  font-family:'IBM Plex Mono',monospace;font-size:${px(20)}px;font-weight:500;letter-spacing:.16em;color:${MUTE}}
.seed{width:${px(16)}px;height:${px(16)}px;border-radius:50%;background:${GOLD};box-shadow:0 0 0 ${px(5)}px ${GOLD_SOFT}}
.free{margin-left:auto;color:${GOLD_INK};font-weight:500}

h1{position:relative;font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;letter-spacing:-.03em;
  font-size:${px(94)}px;line-height:.98;margin-top:${px(56)}px;text-wrap:balance}
h1.small{font-size:${px(70)}px}
h1 em{font-style:normal;color:${GOLD_INK}}
.rule{width:${px(150)}px;height:${px(8)}px;background:${GOLD};margin-top:${px(34)}px}

.body{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding-top:${px(30)}px}

.verse{border-left:${px(7)}px solid ${GOLD};padding:${px(6)}px 0 ${px(6)}px ${px(30)}px}
.verse p{font-style:italic;font-size:${px(42)}px;line-height:1.38;color:${INK}}
.verse.big p{font-size:${px(50)}px;line-height:1.3}
.verse cite,.solo{display:block;margin-top:${px(16)}px;font-style:normal;font-family:'IBM Plex Mono',monospace;
  font-size:${px(18)}px;letter-spacing:.16em;color:${MUTE}}
.solo{margin-top:${px(28)}px}

.kick{margin-top:${px(30)}px;font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:700;
  font-size:${px(34)}px;line-height:1.2;color:${INK2};text-wrap:balance}

.never{list-style:none;display:flex;flex-direction:column}
.never li{display:flex;align-items:baseline;gap:${px(22)}px;padding:${px(18)}px 0;border-bottom:${px(2)}px solid ${LINE}}
.never .no{font-family:'IBM Plex Mono',monospace;font-size:${px(20)}px;letter-spacing:.18em;text-transform:uppercase;color:${EMBER};width:${px(120)}px;flex:none}
.never .what{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;font-size:${px(66)}px;letter-spacing:-.02em;line-height:1}

.steps{list-style:none;display:flex;flex-direction:column;gap:${px(18)}px}
.steps li{display:grid;grid-template-columns:${px(64)}px 1fr;gap:${px(18)}px;align-items:start;font-size:${px(32)}px;line-height:1.35;color:${INK2}}
.steps .n{width:${px(52)}px;height:${px(52)}px;border-radius:50%;background:${GOLD};color:${INK};display:grid;place-items:center;
  font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;font-size:${px(26)}px;margin-top:${px(2)}px}
.steps strong{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;color:${INK};display:block;font-size:${px(34)}px;line-height:1.1;margin-bottom:${px(4)}px}

.tests{list-style:none;display:grid;grid-template-columns:1fr 1fr;column-gap:${px(40)}px;row-gap:${px(10)}px}
.tests li{display:grid;grid-template-columns:${px(44)}px 1fr;grid-template-rows:auto auto;column-gap:${px(12)}px;
  padding:${px(10)}px 0;border-bottom:${px(2)}px solid ${LINE}}
.tests .n{grid-row:1/3;font-family:'IBM Plex Mono',monospace;font-size:${px(18)}px;color:${GOLD_INK};padding-top:${px(8)}px}
.tests .t{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;font-size:${px(34)}px;line-height:1.1;color:${INK}}
.tests .r{font-family:'IBM Plex Mono',monospace;font-size:${px(15)}px;letter-spacing:.12em;text-transform:uppercase;color:${MUTE};margin-top:${px(4)}px}

.ledger{display:grid;grid-template-columns:1fr 1fr;border:${px(2)}px solid ${LINE};border-radius:${px(10)}px;overflow:hidden;background:#fff}
.ledger>div{padding:${px(26)}px ${px(28)}px}
.ledger>div+div{border-left:${px(2)}px solid ${LINE}}
.ledger h3{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;font-size:${px(30)}px;display:flex;align-items:center;gap:${px(12)}px;margin-bottom:${px(14)}px}
.dot{width:${px(16)}px;height:${px(16)}px;border-radius:50%;display:inline-block}
.dot.leaf{background:${LEAF}} .dot.ember{background:${EMBER}}
.ledger ul{list-style:none}
.ledger li{font-size:${px(27)}px;line-height:1.3;color:${INK2};padding:${px(9)}px 0;border-top:${px(1)}px dashed ${LINE}}
.ledger li:first-child{border-top:0}

.foot{position:relative;margin-top:${px(40)}px;border-top:${px(3)}px solid ${INK};padding-top:${px(18)}px;display:flex;justify-content:space-between;
  font-family:'IBM Plex Mono',monospace;font-size:${px(18)}px;letter-spacing:.14em;color:${INK}}
.foot .brand{color:${MUTE}}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

for (const c of CARDS) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>${cardHTML(c)}</body></html>`;

  const file = path.join(OUT, `${c.key}.html`);
  fs.writeFileSync(file, html);
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  // A card whose body runs past the footer, or whose footer runs off the
  // sheet, is a card with a clipped punchline. Fail rather than ship it.
  const fit = await page.evaluate(() => {
    const c = document.querySelector('.c');
    const foot = document.querySelector('.foot');
    const body = document.querySelector('.body');
    const h1 = document.querySelector('h1');
    const f = foot.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    const lines = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
    return {
      overflow: c.scrollHeight > c.clientHeight + 1,
      footBottom: Math.round(f.bottom),
      bodyOver: b.bottom > f.top + 1,
      h1lines: lines,
      wide: [...document.querySelectorAll('.c *')].some((el) => el.scrollWidth > el.clientWidth + 2),
    };
  });
  if (fit.overflow || fit.footBottom > H) throw new Error(`${c.key}: content runs past the sheet (${fit.footBottom}px)`);
  if (fit.bodyOver) throw new Error(`${c.key}: the body overlaps the footer`);
  if (fit.wide) throw new Error(`${c.key}: something is wider than its box`);

  await page.screenshot({ path: path.join(OUT, `${c.key}.png`) });
  fs.unlinkSync(file);
  console.log(`OK ${SQUARE ? 'square' : 'feed  '} ${c.key}  h1 ${fit.h1lines} lines, foot at ${fit.footBottom}`);
}

await browser.close();
