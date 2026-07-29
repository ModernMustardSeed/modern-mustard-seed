#!/usr/bin/env node
// Direction study for MMS social sets six, seven, eight. One complete visual
// world per topic, rendered into a single moodboard screenshot for Sarah.
//
// Deliberately nothing like the five shipped sets (mid-century screenprint x2,
// The Signal dark oscilloscope, The Grid racing, Race Day comic sunburst).
// Everything generated in code: no art plates, no image model required.
//
// Usage: node moodboard.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- generators

// five-point star polygon
function starPts(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(' ');
}

// a laurel branch: tapering leaves along an arc
function laurel(cx, cy, R, fromDeg, toDeg, n, color) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = ((fromDeg + (toDeg - fromDeg) * t) * Math.PI) / 180;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    const rot = (a * 180) / Math.PI + 90;
    const size = 34 - t * 16;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${size.toFixed(1)}" ry="${(size * 0.36).toFixed(1)}" fill="${color}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return s;
}

// metro route: polyline with 45-degree bends, white casing under color
function route(points, color) {
  const d = 'M' + points.map((p) => p.join(',')).join(' L');
  return `
    <path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="28" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="17" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function station(x, y) {
  return `<circle cx="${x}" cy="${y}" r="13" fill="#FFFFFF" stroke="#17150F" stroke-width="6"/>`;
}

// ---------------------------------------------------------------- directions
const DIRECTIONS = [
  {
    id: 'now-showing',
    name: 'Now Showing',
    topic: 'SET SIX · REVIEWS — the BrightLocal 2026 cluster (97 / 68 / 74 / 71)',
    emotion: 'Pride. Your business reviewed like a film, laurels and all.',
    thesis:
      'Prestige film one-sheet. Bone paper, ink, antique-gold laurels, a star row. Every card treats the reader’s business as the picture the whole town is reviewing.',
    type: 'Fraunces · JetBrains Mono',
    palette: ['#F2EDE3', '#14110C', '#B9962B', '#7A2E2B', '#FFFFFF'],
    card: () => `
      <div class="c shw">
        <div class="inner">
          <div class="eye"><span>NOW SHOWING</span><i></i><span>SET SIX / 01</span></div>
          <svg class="stars" viewBox="0 0 560 90">
            ${[0, 1, 2, 3, 4].map((i) => `<polygon points="${starPts(65 + i * 108, 45, 40)}" fill="${i < 5 ? '#B9962B' : 'none'}" stroke="#B9962B" stroke-width="4"/>`).join('')}
          </svg>
          <div class="mid">
            <svg class="wreath" viewBox="0 0 1080 620">
              ${laurel(540, 250, 330, 104, 212, 11, '#B9962B')}
              ${laurel(540, 250, 330, 76, -32, 11, '#B9962B')}
            </svg>
            <div class="num">97<u>%</u></div>
            <h1>read the reviews before they ever walk in.</h1>
            <p class="kick">Your storefront has a comments section now.</p>
          </div>
          <div class="foot">
            <p class="sub">Not some of your customers. Ninety-seven in a hundred. The question is not whether your business gets reviewed, it is whether you are in the conversation about it.</p>
            <p class="src">BrightLocal Local Consumer Review Survey · 1,002 US consumers · 2026</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'metro',
    name: 'The Metro',
    topic: 'SET SEVEN · GET FOUND — Google profile, pin, hours, the free fixes',
    emotion: 'Relief. A you-are-here ring on a clean transit map.',
    thesis:
      'Transit-map wayfinding. Warm paper, four bold route lines with 45-degree bends, stations, and one YOU ARE HERE roundel. Being findable, drawn literally.',
    type: 'Schibsted Grotesk · IBM Plex Mono',
    palette: ['#F7F4EC', '#17150F', '#D62828', '#1D4ED8', '#0F8A4B'],
    card: () => `
      <div class="c met">
        <svg class="map" viewBox="0 0 1080 1350">
          ${route([[-20, 150], [260, 150], [430, 320], [430, 620], [640, 830], [1100, 830]], '#D62828')}
          ${route([[160, -20], [160, 380], [340, 560], [340, 1370]], '#1D4ED8')}
          ${route([[-20, 520], [300, 520], [480, 340], [760, 340], [900, 200], [900, -20]], '#0F8A4B')}
          ${route([[620, -20], [620, 240], [800, 420], [800, 700], [1000, 900], [1100, 900]], '#F5B700')}
          ${station(260, 150)}${station(160, 380)}${station(300, 520)}${station(620, 240)}${station(760, 340)}
          <circle cx="430" cy="430" r="36" fill="#FFFFFF" stroke="#17150F" stroke-width="8"/>
          <circle cx="430" cy="430" r="14" fill="#D62828"/>
          <line x1="466" y1="412" x2="560" y2="366" stroke="#17150F" stroke-width="4"/>
          <rect x="560" y="330" width="322" height="70" fill="#17150F"/>
          <text x="721" y="377" text-anchor="middle" font-family="Schibsted Grotesk" font-weight="800" font-size="30" letter-spacing="4" fill="#F7F4EC">YOU ARE HERE</text>
        </svg>
        <div class="plate">
          <div class="eye"><span>STOP 01</span><i></i><span>GET FOUND</span></div>
          <div class="num">67<u>%</u></div>
          <h1>start at Google when they need someone local.</h1>
          <p class="kick">If your pin is wrong, you are not on the map.</p>
          <p class="src">DreamHost Local Business Trust Index · 1,201 US consumers · 2026</p>
          <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
        </div>
      </div>`,
  },
  {
    id: 'column',
    name: 'The Column',
    topic: 'SET EIGHT · ASK MUSTARD — an advice column, questions from the comments',
    emotion: 'Trust. Straight answers in print, no pitch.',
    thesis:
      'Newspaper advice column. Newsprint, a masthead, a drop cap, one highlighter swipe. Readers write in, Mustard answers straight. The set that farms questions.',
    type: 'Abril Fatface · Lora',
    palette: ['#F3EFE4', '#1A1815', '#FFDD55', '#C4160B', '#8A8578'],
    card: () => `
      <div class="c col">
        <div class="inner">
          <div class="tag">THE SMALL BUSINESS DESK · KALISPELL, MONTANA · NO CHARGE</div>
          <h1 class="mast">Ask Mustard.</h1>
          <div class="rules"></div>
          <p class="kick">You write in. I answer straight. Column No. 01.</p>
          <div class="letter">
            <p class="q">&ldquo;Dear Mustard, my nephew says I have to post every single day or the algorithm buries me. I do not have the time. Is he right?&rdquo;</p>
            <p class="sig">&mdash; BURIED IN BILLINGS</p>
          </div>
          <div class="ans">
            <span class="drop">N</span>
            <p>o. <mark>Consistency beats frequency</mark>, and it is not close. Two honest posts a week you can keep up for a year will outwork a daily sprint that dies in March. The algorithm does not bury you. Quitting does.</p>
          </div>
          <div class="next">
            <span>NEXT WEEK</span>
            <p>&ldquo;Do I really need to be on TikTok?&rdquo; The short answer is no. The long answer is in the comments.</p>
          </div>
          <div class="foot">
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>ASK YOURS IN THE COMMENTS</span></div>
          </div>
        </div>
      </div>`,
  },
];

// ---------------------------------------------------------------- stylesheet
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#191919;font-family:'Inter',sans-serif;width:2160px;height:1500px;overflow:hidden}
.board{padding:52px 56px;display:flex;flex-direction:column;height:100%;gap:30px}
.bhead{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex:none}
.bhead h2{font-family:'Inter',sans-serif;font-weight:800;font-size:40px;letter-spacing:-.03em;color:#F5F5F5}
.bhead p{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#8A8A8A;margin-top:8px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1;min-height:0}
.col2{display:flex;flex-direction:column;gap:20px;min-height:0}
.frame{width:100%;height:786px;overflow:hidden;position:relative;flex:none;box-shadow:0 26px 60px rgba(0,0,0,.55)}
.frame .c{position:absolute;top:0;left:0;width:1080px;height:1350px;transform:scale(.5824);transform-origin:top left}
.meta{display:flex;flex-direction:column;gap:9px}
.meta h3{font-family:'Inter',sans-serif;font-weight:800;font-size:27px;color:#F5F5F5;letter-spacing:-.02em}
.meta .tp{font-family:'JetBrains Mono',monospace;font-size:12.5px;letter-spacing:.08em;color:#F5B700}
.meta .em{font-size:15px;color:#D8D8D8;font-weight:600}
.meta .th{font-size:14.5px;line-height:1.5;color:#A8A8A8;max-width:48ch}
.meta .ty{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E6E}
.chips{display:flex;gap:7px}
.chips i{width:30px;height:30px;display:block;border:1px solid rgba(255,255,255,.22)}

/* ---------------- 01 NOW SHOWING ---------------- */
.shw{background:#F2EDE3;color:#14110C;font-family:'Fraunces',serif;position:relative}
.shw .inner{height:100%;padding:60px 58px 54px;display:flex;flex-direction:column;align-items:center;text-align:center}
.shw .eye{display:flex;align-items:center;gap:16px;width:100%;flex:none;
  font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.24em;color:#7A2E2B}
.shw .eye i{flex:1;height:1px;background:#14110C;opacity:.35}
.shw .stars{width:400px;height:64px;margin-top:44px;flex:none}
.shw .mid{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;width:100%}
.shw .wreath{position:absolute;left:0;top:34%;transform:translateY(-50%);width:1080px;height:620px;opacity:.9;pointer-events:none}
.shw .num{font-weight:900;font-size:330px;line-height:.82;letter-spacing:-.04em;font-variation-settings:'opsz' 144}
.shw .num u{text-decoration:none;font-size:.34em;color:#7A2E2B}
.shw h1{font-weight:600;font-size:64px;line-height:1.08;max-width:820px;margin-top:22px;letter-spacing:-.015em}
.shw .kick{font-style:italic;font-weight:500;font-size:37px;color:#7A2E2B;margin-top:16px}
.shw .foot{flex:none;display:flex;flex-direction:column;gap:15px;width:100%;align-items:center}
.shw .sub{font-family:'Inter',sans-serif;font-size:21.5px;line-height:1.55;color:rgba(20,17,12,.72);max-width:800px}
.shw .src{font-family:'JetBrains Mono',monospace;font-size:14.5px;letter-spacing:.06em;color:rgba(20,17,12,.55)}
.shw .bar{display:flex;justify-content:space-between;width:100%;border-top:2px solid #14110C;padding-top:15px;
  font-family:'JetBrains Mono',monospace;font-size:15px;letter-spacing:.18em;color:rgba(20,17,12,.7)}

/* ---------------- 02 THE METRO ---------------- */
.met{background:#F7F4EC;position:relative;overflow:hidden;font-family:'Schibsted Grotesk',sans-serif;color:#17150F}
.met::before{content:'';position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(23,21,15,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(23,21,15,.07) 1px,transparent 1px);
  background-size:60px 60px}
.met .map{position:absolute;inset:0;width:1080px;height:1350px}
.met .plate{position:absolute;left:52px;right:52px;bottom:52px;background:#FFFFFF;border:4px solid #17150F;
  padding:42px 46px 36px;display:flex;flex-direction:column;box-shadow:10px 10px 0 0 #17150F}
.met .eye{display:flex;align-items:center;gap:16px;font-family:'IBM Plex Mono',monospace;font-size:17px;
  letter-spacing:.22em;color:#1D4ED8;font-weight:600}
.met .eye i{flex:1;height:2px;background:#17150F;opacity:.25}
.met .num{font-weight:800;font-size:210px;line-height:.85;letter-spacing:-.05em;margin-top:18px}
.met .num u{text-decoration:none;font-size:.36em;color:#D62828}
.met h1{font-weight:800;font-size:52px;line-height:1.04;letter-spacing:-.025em;margin-top:10px;max-width:820px}
.met .kick{font-size:30px;font-weight:700;color:#D62828;margin-top:14px}
.met .src{font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:.04em;color:rgba(23,21,15,.55);margin-top:20px}
.met .bar{display:flex;justify-content:space-between;border-top:3px solid #17150F;padding-top:13px;margin-top:14px;
  font-family:'IBM Plex Mono',monospace;font-size:14.5px;letter-spacing:.16em;color:rgba(23,21,15,.75);font-weight:600}

/* ---------------- 03 THE COLUMN ---------------- */
.col{background:#F3EFE4;color:#1A1815;font-family:'Lora',serif;position:relative}
.col::before{content:'';position:absolute;inset:0;opacity:.55;
  background-image:radial-gradient(circle,rgba(26,24,21,.055) 1px,transparent 1px);background-size:5px 5px}
.col .inner{position:relative;height:100%;padding:56px 62px 52px;display:flex;flex-direction:column}
.col .tag{font-family:'JetBrains Mono',monospace;font-size:15.5px;letter-spacing:.2em;text-align:center;
  border-top:2px solid #1A1815;border-bottom:1px solid #1A1815;padding:12px 0;flex:none}
.col .mast{font-family:'Abril Fatface',serif;font-weight:400;font-size:150px;line-height:1;text-align:center;
  margin-top:34px;letter-spacing:-.01em}
.col .rules{height:9px;border-top:4px solid #1A1815;border-bottom:1.5px solid #1A1815;margin-top:26px;flex:none}
.col .kick{font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.14em;text-transform:uppercase;
  text-align:center;margin-top:22px;color:#C4160B}
.col .letter{margin-top:44px;padding:0 26px;flex:none}
.col .q{font-style:italic;font-size:41px;line-height:1.34;letter-spacing:-.005em}
.col .sig{font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.18em;margin-top:22px;text-align:right;color:rgba(26,24,21,.65)}
.col .ans{margin-top:40px;padding:0 26px;display:flex;gap:6px}
.col .drop{font-family:'Abril Fatface',serif;font-size:130px;line-height:.78;padding-top:10px}
.col .ans p{font-size:29px;line-height:1.52}
.col .ans mark{background:#FFDD55;padding:2px 8px}
.col .next{margin-top:auto;border:2px solid #1A1815;padding:24px 28px;display:flex;gap:22px;align-items:baseline;background:#FFFFFF}
.col .next span{font-family:'JetBrains Mono',monospace;font-size:16px;letter-spacing:.2em;color:#C4160B;flex:none}
.col .next p{font-size:24px;line-height:1.45;font-style:italic}
.col .foot{margin-top:26px}
.col .bar{display:flex;justify-content:space-between;border-top:2px solid #1A1815;padding-top:14px;
  font-family:'JetBrains Mono',monospace;font-size:15px;letter-spacing:.16em;color:rgba(26,24,21,.7)}
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,900;1,9..144,500&family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Schibsted+Grotesk:wght@400;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="board">
  <div class="bhead">
    <div>
      <h2>Sets six, seven, eight · direction study</h2>
      <p>One world per set, sourced numbers only · approve all three, or swap any one and I re-study it</p>
    </div>
    <p style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.18em;color:#6E6E6E">MODERN MUSTARD SEED · 2026-07-29</p>
  </div>
  <div class="cols">
    ${DIRECTIONS.map(
      (d) => `<div class="col2">
        <div class="frame">${d.card()}</div>
        <div class="meta">
          <h3>${d.name}</h3>
          <p class="tp">${d.topic}</p>
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

const out = path.join(HERE, 'moodboard.html');
fs.writeFileSync(out, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2160, height: 1500 }, deviceScaleFactor: 1 });
await page.goto('file:///' + out.replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(HERE, 'moodboard.png') });
await browser.close();
console.log('moodboard.png written');
