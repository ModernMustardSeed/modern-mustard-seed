#!/usr/bin/env node
// Set: THE FIELD GUIDE (Claude Code, for people who have never built anything).
//
// Usage: node render.mjs            -> cards/         (1080x1350 feed)
//        node render.mjs --square   -> cards-square/  (1080x1080 X cut)
//
// Then copy both into public/social/field-guide/ with the -square suffix.
//
// TWO THINGS EVERY CARD HAS TO DO, per Sarah 2026-08-21:
//
// 1. LOOK LIKE US. The first cut was a terminal on a cream sheet: correct, and
//    it could have belonged to any developer tool on earth. So the ground is
//    now the homepage journey itself, Mr. and Mrs. Mustard driving the east
//    shore, picking cherries, at the ranch gate, under the tree. That artwork
//    already exists in public/journey/, which is better than generating more:
//    it is the same footage the site opens with, so the card and the homepage
//    are visibly one world.
//
// 2. SAY "THIS IS FOR YOU" TO SOMEBODY WHO HAS NEVER CODED. Not in those
//    words. The sticker in the corner says NEVER CODED? START HERE, the eyebrow
//    says the beginner's field guide, and the words on every card are plain
//    English. Somebody scrolling has about a second to decide the thing is not
//    over their head, and that decision is made by the sticker, not the copy.
//
// The plate over the photo is the house grammar: ink outline, hard offset
// shadow, cream fill. Same move as the metro set, different ground.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQUARE = process.argv.includes('--square');
const W = 1080;
const H = SQUARE ? 1080 : 1350;
const OUT = path.join(HERE, SQUARE ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });

const INK = '#161616';
const CREAM = '#FBF6EA';
const PAPER = '#FFFDF6';
const YELLOW = '#F5B700';
const GOLD = '#FFDD55';
const RED = '#E0301E';
const TERM = '#0E1014';

/** From cards/ or cards-square/ back up to public/journey. */
const scene = (f) => `../../../public/journey/${f}.jpg`;

/**
 * Line kinds inside the terminal window:
 *   you  what a human types, after a mustard chevron
 *   ai   what comes back, dim
 *   cmd  a shell command, gold
 *   note a grey comment under a command
 *   hi   the one line the card is actually about, mustard on ink
 */
const CARDS = [
  {
    key: '01-no-code',
    art: 'poster-drive',
    eye: 'THE BEGINNER’S FIELD GUIDE · 01',
    head: 'You do not need to know how to <em>code</em>.',
    kick: 'You need to know what you want, and how to check that you got it.',
    term: [
      ['you', 'build me a page where people can request a quote'],
      ['ai', 'Reading your project...'],
      ['ai', 'Here is the plan. Three files, one form, emails you'],
      ['ai', 'on every request. Want me to build it?'],
      ['you', 'yes, and show me it working'],
    ],
    sq: 4,
    foot: 'THE FREE GUIDE · MODERNMUSTARDSEED.COM/FIELDGUIDE',
  },
  {
    key: '02-four-lines',
    art: 'poster-sign',
    mascot: true,
    eye: 'THE BEGINNER’S FIELD GUIDE · 02',
    head: 'Four lines and you are <em>building</em>.',
    kick: 'That is the entire setup. There is no step five.',
    term: [
      ['cmd', 'npm install -g @anthropic-ai/claude-code'],
      ['note', 'once, ever'],
      ['cmd', 'cd my-project'],
      ['note', 'it only sees the folder you start it in'],
      ['cmd', 'claude'],
      ['note', 'that is the whole thing'],
      ['cmd', '/init'],
      ['note', 'it writes itself a briefing. never skip this one'],
    ],
    sq: 6,
    foot: 'THE FREE GUIDE · MODERNMUSTARDSEED.COM/FIELDGUIDE',
  },
  {
    key: '03-six-words',
    art: 'poster-planting',
    eye: 'THE BEGINNER’S FIELD GUIDE · 03',
    head: 'The six most useful words you can <em>type</em>.',
    kick: 'It plans first. You read the plan. That is the whole trick.',
    term: [
      ['you', 'add checkout to the store'],
      ['hi', 'do not write any code yet'],
      ['ai', 'Understood. Here is the approach and every file'],
      ['ai', 'I would touch. Nothing has changed on disk.'],
    ],
    sq: 4,
    foot: 'MOST BAD CODE IS AN APPROVED BAD PLAN',
  },
  {
    key: '04-done',
    art: 'poster-orchard',
    eye: 'THE BEGINNER’S FIELD GUIDE · 04',
    head: 'Never accept <em>done</em> as evidence.',
    kick: 'A green terminal is a claim, not a fact. Ask for the proof.',
    term: [
      ['ai', 'Done! The checkout flow is now working.'],
      ['hi', 'run it and show me the real output'],
      ['ai', 'Running... 1 test failed.'],
      ['ai', 'You were right. Fixing the actual cause now.'],
    ],
    sq: 4,
    foot: 'RULE 01 OF TWELVE · MODERNMUSTARDSEED.COM/FIELDGUIDE',
  },
  {
    key: '05-the-loop',
    art: 'water',
    mascot: true,
    eye: 'THE BEGINNER’S FIELD GUIDE · 05',
    head: 'The loop that actually <em>works</em>.',
    kick: 'Skip straight to building and you get confident wreckage.',
    list: [
      ['Explore', 'Have it read the code and explain it back'],
      ['Plan', 'It thinks, it cannot touch a file. Read the plan'],
      ['Build', 'One outcome per request. Small pieces'],
      ['Prove', 'Ask for the real output, not a summary'],
      ['Save', 'Say "commit this" every time it works'],
    ],
    foot: 'ALL FIVE, IN FULL · MODERNMUSTARDSEED.COM/FIELDGUIDE',
  },
  {
    key: '06-free',
    art: 'poster-tree',
    mascot: true,
    eye: 'THE BEGINNER’S FIELD GUIDE · FREE',
    head: 'We wrote the guide we wish we <em>had</em>.',
    kick: 'No signup. No email. Print the card and pin it up.',
    list: [
      ['17 prompts', 'Ready to paste, one tap to copy'],
      ['The loop', 'Explore, plan, build, prove, save'],
      ['CLAUDE.md', 'The template that fixes everything'],
      ['12 rules', 'Learned the expensive way, on real builds'],
      ['Triage', 'Every symptom, and what causes it'],
    ],
    foot: 'MODERNMUSTARDSEED.COM/FIELDGUIDE',
  },
];

const esc = (s) => s.replace(/&(?!lt;|gt;|amp;|#)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* The square cut is a real design, not a squashed feed card. */
const S = SQUARE ? 0.84 : 1;
const px = (n) => Math.round(n * S);

function termHTML(c) {
  const lines = SQUARE && c.sq ? c.term.slice(0, c.sq) : c.term;
  const rows = lines
    .map(([kind, text]) => {
      const t = esc(text);
      if (kind === 'you') return `<div class="l you"><b>&gt;</b><span>${t}</span></div>`;
      if (kind === 'hi') return `<div class="l hi"><b>&gt;</b><span>${t}</span></div>`;
      if (kind === 'cmd') return `<div class="l cmd"><span>${t}</span></div>`;
      if (kind === 'note') return `<div class="l note"><span># ${t}</span></div>`;
      return `<div class="l ai"><span>${t}</span></div>`;
    })
    .join('');
  return `<div class="term">
    <div class="chrome"><i></i><i></i><i></i><span>claude</span></div>
    <div class="body">${rows}<div class="l cursor"><b>&gt;</b><u></u></div></div>
  </div>`;
}

function listHTML(c) {
  return `<ol class="list">${c.list
    .map(
      ([label, text], i) =>
        `<li><b>${String(i + 1).padStart(2, '0')}</b><span><strong>${esc(label)}</strong>${esc(text)}</span></li>`,
    )
    .join('')}</ol>`;
}

function cardHTML(c) {
  return `<div class="c">
    <img class="bgfill" src="${scene(c.art)}" alt="">
    <img class="bg" src="${scene(c.art)}" alt="">
    <div class="scrim"></div>

    <div class="sticker">
      <span class="s1">Never coded?</span>
      <span class="s2">Start here</span>
    </div>

    <div class="seal">
      <svg viewBox="0 0 24 24" width="${px(30)}" height="${px(30)}" aria-hidden="true">
        <path d="M12 22c-4.4 0-8-3.2-8-7.4C4 9.6 8.6 5 12 2c3.4 3 8 7.6 8 12.6 0 4.2-3.6 7.4-8 7.4z" fill="${INK}"/>
        <path d="M12 19.6c-3 0-5.6-2.2-5.6-5.1 0-3.5 3.2-7 5.6-9.2 2.4 2.2 5.6 5.7 5.6 9.2 0 2.9-2.6 5.1-5.6 5.1z" fill="${GOLD}"/>
      </svg>
      <span>MODERN MUSTARD SEED</span>
    </div>

    <div class="stack">
      ${c.mascot ? '<img class="mascot" src="../../../public/brand/mascot-full.png" alt="">' : ''}
      <div class="plate">
      <div class="eye"><span>${c.eye}</span><b></b><span>FREE</span></div>
      <h1>${c.head}</h1>
      <p class="kick">${esc(c.kick)}</p>
      ${c.term ? termHTML(c) : listHTML(c)}
        <div class="bar"><span>${c.foot}</span></div>
      </div>
    </div>
  </div>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:${INK};color:${INK};position:relative;overflow:hidden;
  font-family:'DM Sans',sans-serif;font-feature-settings:'liga' 0,'clig' 0}

/* The homepage journey is the ground. Same world as the site opens with. */
.bgfill{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  filter:blur(${px(46)}px) saturate(1.15) brightness(.55);transform:scale(1.15)}
.bg{position:absolute;top:0;left:0;width:100%;height:auto;display:block}
.scrim{position:absolute;left:0;right:0;top:0;height:${px(420)}px;
  background:linear-gradient(180deg, rgba(10,8,4,.42) 0%, rgba(10,8,4,.12) 55%, rgba(10,8,4,0) 100%)}

/* The one-second decision: this is not over your head. */
.sticker{position:absolute;top:${px(84)}px;right:${px(44)}px;transform:rotate(-3.5deg);
  background:${YELLOW};border:${px(5)}px solid ${INK};border-radius:${px(14)}px;
  box-shadow:${px(9)}px ${px(9)}px 0 0 ${INK};padding:${px(13)}px ${px(24)}px ${px(15)}px;text-align:center}
.sticker .s1{display:block;font-family:'JetBrains Mono',monospace;font-size:${px(19)}px;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;color:#8A1006}
.sticker .s2{display:block;margin-top:${px(2)}px;font-family:'Playfair Display',serif;font-weight:900;
  font-size:${px(46)}px;line-height:1.02;letter-spacing:-.02em;color:${INK}}

.seal{position:absolute;top:${px(56)}px;left:${px(46)}px;display:flex;align-items:center;gap:${px(11)}px;
  font-family:'JetBrains Mono',monospace;font-size:${px(17)}px;font-weight:700;letter-spacing:.2em;
  color:rgba(255,255,255,.92);text-shadow:0 ${px(2)}px ${px(6)}px rgba(0,0,0,.5)}
.seal svg{filter:drop-shadow(0 ${px(2)}px ${px(4)}px rgba(0,0,0,.45))}

/* The plate is anchored to the bottom, so the picture takes whatever the
   words leave. Short card, more Montana. */
.stack{position:absolute;left:${px(44)}px;right:${px(44)}px;bottom:${px(44)}px}
.plate{position:relative;
  background:${PAPER};border:${px(5)}px solid ${INK};border-radius:${px(20)}px;
  box-shadow:${px(14)}px ${px(14)}px 0 0 ${YELLOW};
  padding:${px(38)}px ${px(40)}px ${px(34)}px}

/* Three of the six scenes are landscape with nobody in them. He fixes that by
   leaning on the card, which is also how he behaves on the site. */
.mascot{position:absolute;left:${px(-16)}px;bottom:100%;margin-bottom:${px(-34)}px;
  height:${px(300)}px;width:auto;z-index:2;
  filter:drop-shadow(0 ${px(6)}px ${px(14)}px rgba(0,0,0,.35))}

.eye{display:flex;align-items:center;gap:${px(16)}px;font-family:'JetBrains Mono',monospace;
  font-size:${px(17)}px;font-weight:700;letter-spacing:.2em;color:${RED}}
.eye b{flex:1;height:${px(3)}px;background:${INK};opacity:.22}

h1{font-family:'Playfair Display',serif;font-weight:900;letter-spacing:-.025em;
  font-size:${px(72)}px;line-height:1.04;margin-top:${px(22)}px;padding-bottom:.03em}
h1 em{font-style:italic;color:${RED}}

.kick{font-size:${px(27)}px;line-height:1.42;font-weight:500;color:rgba(22,22,22,.7);
  margin-top:${px(16)}px}

.term{margin-top:${px(28)}px;background:${TERM};border:${px(4)}px solid ${INK};border-radius:${px(14)}px;
  overflow:hidden}
.chrome{display:flex;align-items:center;gap:${px(10)}px;padding:${px(13)}px ${px(20)}px;
  border-bottom:${px(2)}px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05)}
.chrome i{width:${px(12)}px;height:${px(12)}px;border-radius:50%;background:rgba(255,255,255,.22)}
.chrome span{margin-left:${px(10)}px;font-family:'JetBrains Mono',monospace;font-size:${px(15)}px;
  font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.35)}
.body{padding:${px(20)}px ${px(22)}px ${px(22)}px;font-family:'JetBrains Mono',monospace;
  font-size:${px(21)}px;line-height:1.6}
.l{display:flex;gap:${px(12)}px;padding:${px(2)}px 0;white-space:nowrap}
.l b{color:${YELLOW};font-weight:700;flex:none}
.you span{color:#F3EEE1}
.ai span{color:rgba(243,238,225,.55)}
.cmd span{color:${GOLD};font-weight:700}
.note span{color:rgba(243,238,225,.4)}
.hi{background:${YELLOW};margin:${px(6)}px -${px(22)}px;padding:${px(6)}px ${px(22)}px}
.hi b,.hi span{color:${INK};font-weight:700}
.cursor u{display:inline-block;width:${px(13)}px;height:${px(23)}px;background:${YELLOW};text-decoration:none}

.list{list-style:none;margin-top:${px(26)}px;display:flex;flex-direction:column}
.list li{display:grid;grid-template-columns:${px(56)}px 1fr;gap:${px(6)}px;align-items:baseline;
  padding:${px(13)}px 0;border-bottom:${px(2)}px solid rgba(22,22,22,.12)}
.list li:last-child{border-bottom:0;padding-bottom:0}
.list b{font-family:'JetBrains Mono',monospace;font-size:${px(20)}px;font-weight:700;color:${RED}}
.list span{font-size:${px(26)}px;line-height:1.3;color:rgba(22,22,22,.62)}
.list strong{font-weight:800;display:block;font-size:${px(31)}px;color:${INK}}

.bar{margin-top:${px(28)}px;border-top:${px(4)}px solid ${INK};padding-top:${px(15)}px;
  font-family:'JetBrains Mono',monospace;font-size:${px(17)}px;font-weight:700;letter-spacing:.13em;
  color:rgba(22,22,22,.7)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

for (const c of CARDS) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,900;1,900&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>${cardHTML(c)}</body></html>`;

  const file = path.join(OUT, `${c.key}.html`);
  fs.writeFileSync(file, html);
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);

  // A card whose plate eats the picture, or whose terminal runs past its own
  // window, is a card with a clipped punchline. Fail rather than ship it.
  const fit = await page.evaluate(() => {
    const plate = document.querySelector('.plate');
    const sticker = document.querySelector('.sticker');
    const term = document.querySelector('.term');
    const p = plate.getBoundingClientRect();
    const s = sticker.getBoundingClientRect();
    return {
      top: Math.round(p.top),
      gap: Math.round(p.top - s.bottom),
      wide: term ? term.scrollWidth > term.clientWidth + 2 : false,
      loaded: document.querySelector('.bg').naturalWidth > 0,
    };
  });
  if (!fit.loaded) throw new Error(`${c.key}: the journey art did not load (${c.art})`);
  if (fit.gap < 24) throw new Error(`${c.key}: the plate reaches the sticker, only ${fit.gap}px of sky left`);
  if (fit.wide) throw new Error(`${c.key}: a terminal line is wider than the window. Shorten it.`);

  await page.screenshot({ path: path.join(OUT, `${c.key}.png`) });
  fs.unlinkSync(file);
  console.log(`OK ${SQUARE ? 'square' : 'feed  '} ${c.key}  ${c.art}, ${fit.gap}px of sky`);
}

await browser.close();
