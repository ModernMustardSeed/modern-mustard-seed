#!/usr/bin/env node
// SEE YOURS direction study v2, after Sarah rejected the flat-vector Marquee.
// Rule this round: stunning art carries every direction. One cinematic fal
// plate (art/storefront-dusk.png) + one REAL built-demo screenshot.
// Usage: node moodboard-v2.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const b64 = (p, mime) => `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
const SCENE = b64(path.join(HERE, 'art', 'storefront-dusk.png'), 'image/png');
const SHOT = b64(path.join(HERE, '..', '..', 'public', 'work-shots', 'linen-fresh.jpg'), 'image/jpeg');

const COPY = {
  head: 'See your business with the lights on.',
  kick: 'A free talking-website demo, built from your real business.',
  url: 'MODERNMUSTARDSEED.COM/DEMOS',
};

const DIRECTIONS = [
  {
    id: 'lit-window',
    name: 'The Lit Window',
    emotion: 'Longing. The shop everyone is drawn to at dusk is yours.',
    thesis:
      'Full-bleed cinematic paintings, a different glowing trade each card, and YOUR NAME HERE painted softly onto the blank sign in every scene. Type lives in a quiet scrim at the bottom.',
    type: 'DM Serif Display · DM Sans',
    palette: ['#0E2233', '#F5A623', '#FFF3DC', '#173248', '#8A5A1F'],
    card: () => `
      <div class="c lit">
        <img class="scene" src="${SCENE}">
        <div class="signname">YOUR NAME HERE</div>
        <div class="scrim">
          <h1>${COPY.head}</h1>
          <p class="kick">${COPY.kick}</p>
          <div class="bar"><span>MODERN MUSTARD SEED</span><span>${COPY.url}</span></div>
        </div>
      </div>`,
  },
  {
    id: 'glow-up',
    name: 'The Glow-Up',
    emotion: 'Recognition. The left half is your website now. The right half is two minutes away.',
    thesis:
      'The same painting split down the middle: lights off, lights on. Before and after, the oldest thumb-stopper there is, done as art instead of screenshots. Each card splits a different scene.',
    type: 'DM Serif Display · JetBrains Mono',
    palette: ['#2A2A2A', '#F5A623', '#0E2233', '#FFF3DC', '#9AA0A6'],
    card: () => `
      <div class="c glo">
        <img class="scene off" src="${SCENE}">
        <img class="scene on" src="${SCENE}">
        <i class="seam"></i>
        <span class="tag left">YOUR SITE NOW</span>
        <span class="tag right">LIGHTS ON</span>
        <div class="scrim">
          <h1>Same business. Lights on.</h1>
          <p class="kick">${COPY.kick}</p>
          <div class="bar"><span>MODERN MUSTARD SEED</span><span>${COPY.url}</span></div>
        </div>
      </div>`,
  },
  {
    id: 'gallery',
    name: 'The Gallery',
    emotion: 'Wanting one. Real demos we built, hung and lit like paintings.',
    thesis:
      'A dark gallery wall, one spotlight, a REAL built-demo screenshot in a gold frame with a museum plaque: built in two minutes, free. Six cards, six real demos. Proof instead of promise.',
    type: 'DM Serif Display · Jost',
    palette: ['#151312', '#C9A24B', '#F3EAD3', '#242021', '#FFFFFF'],
    card: () => `
      <div class="c gal">
        <div class="spot"></div>
        <div class="frame3">
          <img src="${SHOT}">
        </div>
        <div class="plaque"><b>UNTITLED (YOUR BUSINESS)</b><span>BUILT IN TWO MINUTES · ADMISSION FREE</span></div>
        <div class="scrim">
          <h1>We hang one of these for free.</h1>
          <p class="kick">${COPY.kick}</p>
          <div class="bar"><span>MODERN MUSTARD SEED</span><span>${COPY.url}</span></div>
        </div>
      </div>`,
  },
];

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#191919;font-family:'Inter',sans-serif;width:2160px;height:1500px;overflow:hidden}
.board{padding:52px 56px;display:flex;flex-direction:column;height:100%;gap:30px}
.bhead{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex:none}
.bhead h2{font-weight:800;font-size:40px;letter-spacing:-.03em;color:#F5F5F5}
.bhead p{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#8A8A8A;margin-top:8px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1;min-height:0}
.col2{display:flex;flex-direction:column;gap:20px;min-height:0}
.frame2{width:100%;height:786px;overflow:hidden;position:relative;flex:none;box-shadow:0 26px 60px rgba(0,0,0,.55)}
.frame2 .c{position:absolute;top:0;left:0;width:1080px;height:1350px;transform:scale(.5824);transform-origin:top left}
.meta{display:flex;flex-direction:column;gap:9px}
.meta h3{font-weight:800;font-size:27px;color:#F5F5F5;letter-spacing:-.02em}
.meta .em{font-size:15px;color:#D8D8D8;font-weight:600}
.meta .th{font-size:14.5px;line-height:1.5;color:#A8A8A8;max-width:48ch}
.meta .ty{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E6E}
.chips{display:flex;gap:7px}
.chips i{width:30px;height:30px;display:block;border:1px solid rgba(255,255,255,.22)}

.c{position:relative;overflow:hidden}
.c h1{font-family:'DM Serif Display',serif;font-size:58px;line-height:1.08;color:#FFF3DC;letter-spacing:-.01em;text-wrap:balance}
.c .kick{font-family:'DM Sans',sans-serif;font-size:24px;line-height:1.4;color:rgba(255,243,220,.85);margin-top:12px}
.c .bar{display:flex;justify-content:space-between;border-top:2px solid rgba(245,166,35,.5);padding-top:14px;margin-top:22px;
  font-family:'JetBrains Mono',monospace;font-size:15px;letter-spacing:.16em;color:rgba(255,243,220,.8)}
.c .scrim{position:absolute;left:0;right:0;bottom:0;padding:150px 58px 50px;z-index:5;text-align:left;
  background:linear-gradient(180deg,rgba(10,16,24,0) 0%,rgba(10,16,24,.82) 42%,rgba(10,16,24,.94) 100%)}

/* A THE LIT WINDOW */
.lit .scene{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 40%}
.lit .signname{position:absolute;left:35%;top:22.5%;width:37%;text-align:center;transform:rotate(-1.6deg);
  font-family:'DM Serif Display',serif;font-size:34px;letter-spacing:.12em;color:#7A4E16;opacity:.92;
  mix-blend-mode:multiply;z-index:3}

/* B THE GLOW-UP */
.glo{background:#0E2233}
.glo .scene{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 40%}
.glo .scene.off{clip-path:inset(0 50% 0 0);filter:grayscale(.95) brightness(.48) contrast(.92)}
.glo .scene.on{clip-path:inset(0 0 0 50%);filter:saturate(1.12)}
.glo .seam{position:absolute;left:calc(50% - 3px);top:0;bottom:0;width:6px;z-index:4;
  background:linear-gradient(180deg,rgba(245,166,35,.1),#F5A623 30%,#F5A623 70%,rgba(245,166,35,.1));
  box-shadow:0 0 34px 6px rgba(245,166,35,.65)}
.glo .tag{position:absolute;top:64px;z-index:4;font-family:'JetBrains Mono',monospace;font-size:19px;letter-spacing:.22em;
  padding:12px 20px;border:2px solid}
.glo .tag.left{left:58px;color:#C7CCD1;border-color:rgba(199,204,209,.6);background:rgba(20,20,20,.55)}
.glo .tag.right{right:58px;color:#F5A623;border-color:#F5A623;background:rgba(14,22,32,.6)}

/* C THE GALLERY */
.gal{background:#151312}
.gal .spot{position:absolute;inset:0;
  background:radial-gradient(ellipse 62% 46% at 50% 34%, rgba(243,234,211,.16) 0%, rgba(243,234,211,0) 70%)}
.gal .frame3{position:absolute;left:120px;right:120px;top:120px;height:600px;z-index:2;
  border:16px solid #C9A24B;outline:5px solid #2A2018;outline-offset:-21px;background:#000;
  box-shadow:0 40px 80px rgba(0,0,0,.7), inset 0 0 0 22px #0d0b0a;transform:rotate(-.6deg)}
.gal .frame3 img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.gal .plaque{position:absolute;left:50%;top:762px;transform:translateX(-50%);z-index:2;background:#242021;
  border:2px solid rgba(201,162,75,.7);padding:18px 30px;display:flex;flex-direction:column;gap:7px;text-align:center}
.gal .plaque b{font-family:'Jost',sans-serif;font-weight:600;font-size:21px;letter-spacing:.14em;color:#F3EAD3}
.gal .plaque span{font-family:'JetBrains Mono',monospace;font-size:14.5px;letter-spacing:.14em;color:#C9A24B}
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Serif+Display&family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=Jost:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="board">
  <div class="bhead">
    <div>
      <h2>SEE YOURS · study two · art-first</h2>
      <p>The flat marquee is dead · every direction here is carried by real or cinematic imagery · pick one and I build it</p>
    </div>
    <p style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.18em;color:#6E6E6E">MODERN MUSTARD SEED · 2026-07-30</p>
  </div>
  <div class="cols">
    ${DIRECTIONS.map(
      (d) => `<div class="col2">
        <div class="frame2">${d.card()}</div>
        <div class="meta">
          <h3>${d.name}</h3>
          <p class="em">${d.emotion}</p>
          <p class="th">${d.thesis}</p>
          <p class="ty">${d.type}</p>
          <div class="chips">${d.palette.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
        </div>
      </div>`,
    ).join('')}
  </div>
</div>
</body></html>`;

const out = path.join(HERE, 'moodboard-v2.html');
fs.writeFileSync(out, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2160, height: 1500 }, deviceScaleFactor: 1 });
await page.goto('file:///' + out.replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(HERE, 'moodboard-v2.png') });
await browser.close();
console.log('moodboard-v2.png written');
