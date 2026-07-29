#!/usr/bin/env node
// Set eight: THE COLUMN (Ask Mustard). Newspaper advice column: newsprint,
// Abril Fatface masthead, Lora, drop cap, one highlighter swipe, a woodcut
// spot per card (fal, multiply-blended so the white paper vanishes), and a
// NEXT WEEK teaser that chains the cards into a serial.
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

const CARDS = [
  {
    key: '01-every-day', no: 'NO. 01',
    q: 'Dear Mustard, my nephew says I have to post every single day or the algorithm buries me. I do not have the time. Is he right?',
    sig: 'BURIED IN BILLINGS',
    drop: 'N',
    a: 'o. <mark>Consistency beats frequency</mark>, and it is not close. Two honest posts a week that you can keep up for a year will outwork a daily sprint that dies in March. The algorithm does not bury you. Quitting does.',
    next: '&ldquo;Do I really need to be on TikTok?&rdquo;',
  },
  {
    key: '02-tiktok', no: 'NO. 02',
    q: 'Dear Mustard, everyone keeps telling me my business needs to be on TikTok. I fix furnaces. Do I really?',
    sig: 'FREEZING IN FRENCHTOWN',
    drop: 'P',
    a: 'robably not. <mark>Fish where your customers already are.</mark> When a furnace dies at nine at night, nobody opens TikTok. They open Google, then they ask a Facebook group. Own those two first. If you love making videos, make them. If you do not, this is your permission to stop.',
    next: '&ldquo;How much should a website cost?&rdquo;',
  },
  {
    key: '03-what-it-costs', no: 'NO. 03',
    q: 'Dear Mustard, one guy quoted me four hundred dollars for a website and another quoted eight grand. What should it actually cost?',
    sig: 'SPOOKED IN SOMERS',
    drop: 'T',
    a: 'he honest answer is <mark>it depends on what the site has to do</mark>, and anyone who quotes you before asking questions is selling a template, not a website. Ask both of them what happens when a customer calls, books, or pays. The right price follows that answer. The wrong one follows silence.',
    next: '&ldquo;Is AI going to replace me?&rdquo;',
  },
  {
    key: '04-the-robot', no: 'NO. 04',
    q: 'Dear Mustard, straight up. Is AI coming for my business?',
    sig: 'WATCHING THE NEWS IN WHITEFISH',
    drop: 'N',
    a: 'ot the part of it that matters. AI cannot crimp a fitting or calm down a flooded kitchen at midnight. What it replaces is <mark>being unreachable</mark>: the missed call, the unanswered form, the question nobody wrote down. Let the machine hold the door. You do the work.',
    next: '&ldquo;The nasty review.&rdquo;',
  },
  {
    key: '05-the-gloves', no: 'NO. 05',
    q: 'Dear Mustard, somebody torched me in a review over something that was not even our fault. I want to go to war in the replies. Talk me down.',
    sig: 'SEEING RED IN RONAN',
    drop: 'H',
    a: 'ang the gloves up. <mark>Your reply is for the next hundred readers</mark>, not for the one who wrote it. Answer once: kind, factual, signed with your name. Fix what was true, correct what was not, and let it sit. Calm wins the room every single time.',
    next: '&ldquo;The slow season.&rdquo;',
  },
  {
    key: '06-slow-season', no: 'NO. 06',
    q: 'Dear Mustard, winter kills my trade for four months. What do I do until spring?',
    sig: 'SNOWED IN AT SEELEY LAKE',
    drop: 'P',
    a: 'lant. The slow season is when the seed goes in: rewrite the tired words on your website, shoot the photos you never shoot, ask for the reviews you never asked for, fix the pin and the hours. <mark>Spring rewards whoever planted in January.</mark> Ask anyone who farms.',
    next: 'Yours. Ask it in the comments.',
  },
];

function art(key) {
  const p = path.join(HERE, 'art', `${key}.png`);
  if (!fs.existsSync(p)) return '';
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function cardHTML(c) {
  const spot = art(c.key);
  return `
  <div class="c">
    <div class="inner">
      <div class="tag">THE SMALL BUSINESS DESK · KALISPELL, MONTANA · NO CHARGE</div>
      <h1 class="mast">Ask Mustard.</h1>
      <div class="rules"></div>
      <p class="kick">YOU WRITE IN. I ANSWER STRAIGHT. COLUMN ${c.no}.</p>
      <div class="body">
        <div class="text">
          <p class="q">&ldquo;${c.q}&rdquo;</p>
          <p class="sig">&mdash; ${c.sig}</p>
          <div class="ans"><span class="drop">${c.drop}</span><p>${c.a}</p></div>
        </div>
        ${spot ? `<img class="spot" src="${spot}">` : ''}
      </div>
      <div class="next"><span>NEXT WEEK</span><p><i>${c.next}</i></p></div>
      <div class="bar"><span>MODERN MUSTARD SEED</span><span>ASK YOURS IN THE COMMENTS</span></div>
    </div>
  </div>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:#F3EFE4;color:#1A1815;font-family:'Lora',serif;position:relative}
.c::before{content:'';position:absolute;inset:0;opacity:.55;
  background-image:radial-gradient(circle,rgba(26,24,21,.055) 1px,transparent 1px);background-size:5px 5px}
.inner{position:relative;height:100%;padding:${SQUARE ? '40px 54px 40px' : '52px 62px 48px'};display:flex;flex-direction:column}
.tag{font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13.5 : 15}px;letter-spacing:.2em;text-align:center;
  border-top:2px solid #1A1815;border-bottom:1px solid #1A1815;padding:${SQUARE ? 9 : 11}px 0;flex:none}
.mast{font-family:'Abril Fatface',serif;font-weight:400;font-size:${SQUARE ? 92 : 118}px;line-height:1;text-align:center;
  margin-top:${SQUARE ? 18 : 26}px;letter-spacing:-.01em}
.rules{height:9px;border-top:4px solid #1A1815;border-bottom:1.5px solid #1A1815;margin-top:${SQUARE ? 16 : 22}px;flex:none}
.kick{font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13.5 : 15.5}px;letter-spacing:.14em;
  text-align:center;margin-top:${SQUARE ? 13 : 18}px;color:#C4160B}
.body{display:flex;gap:${SQUARE ? 26 : 34}px;margin-top:${SQUARE ? 12 : 18}px;flex:1;min-height:0;align-items:center}
.text{flex:1;min-width:0}
.q{font-style:italic;font-size:${SQUARE ? 28 : 33}px;line-height:1.32;letter-spacing:-.005em}
.sig{font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13 : 15}px;letter-spacing:.18em;
  margin-top:${SQUARE ? 12 : 16}px;text-align:right;color:rgba(26,24,21,.65)}
.ans{margin-top:${SQUARE ? 16 : 26}px;display:flex;gap:6px}
.drop{font-family:'Abril Fatface',serif;font-size:${SQUARE ? 84 : 100}px;line-height:.76;padding-top:8px}
.ans p{font-size:${SQUARE ? 21.5 : 24}px;line-height:1.5}
.ans mark{background:#FFDD55;padding:2px 7px}
.spot{width:${SQUARE ? 250 : 330}px;flex:none;mix-blend-mode:multiply}
.next{flex:none;border:2px solid #1A1815;padding:${SQUARE ? '14px 20px' : '18px 24px'};display:flex;gap:20px;
  align-items:baseline;background:#FFFFFF;position:relative;z-index:1}
.next span{font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 13 : 14.5}px;letter-spacing:.2em;color:#C4160B;flex:none}
.next p{font-size:${SQUARE ? 19 : 21}px;line-height:1.4}
.bar{flex:none;display:flex;justify-content:space-between;border-top:2px solid #1A1815;padding-top:12px;margin-top:${SQUARE ? 14 : 18}px;
  font-family:'JetBrains Mono',monospace;font-size:${SQUARE ? 12.5 : 14}px;letter-spacing:.16em;color:rgba(26,24,21,.7)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const c of CARDS) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=JetBrains+Mono:wght@400;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
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
