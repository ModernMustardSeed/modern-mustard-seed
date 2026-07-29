#!/usr/bin/env node
// Direction study for THE MUSTARD TREE, the one-prompt-in / whole-business-out
// flagship. Three complete visual worlds, same content in each so they can be
// judged against each other, rendered into one moodboard screenshot for Sarah.
//
// All three live INSIDE the locked MMS pop-art cabin (cream #FBF6EA, ink
// #161616, gold #F5B700, red #E0301E, blue #1E50C8, DM Sans / Playfair /
// Cormorant / JetBrains Mono). Core emotion: AWE. Everything generated in
// code: no art plates, no image model, no fal wallet required.
//
// Usage: node moodboard.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// deterministic noise so re-renders are identical
let seed = 20260729;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

// ---------------------------------------------------------------- the content
const CARD = {
  name: 'THE MUSTARD TREE',
  head: 'One seed in.<br>A whole business out.',
  seedPrompt: '&ldquo;a candle company that smells like Montana&rdquo;',
  sub: 'Type one sentence. Wake up to a living company: plan, brand, store, site, books, and a staff of agents already working in the branches.',
  organs: ['THE PLAN', 'THE BRAND', 'THE STORE', 'THE SITE', 'THE BOOKS', 'THE MARKETING'],
  staff: [
    ['THE FOUNDER', '#F5B700'],
    ['THE DESIGNER', '#E0301E'],
    ['THE MARKETER', '#1E50C8'],
    ['THE CLERK', '#F5B700'],
    ['THE STRATEGIST', '#E0301E'],
    ['THE BUILDER', '#1E50C8'],
  ],
};

// ---------------------------------------------------------------- generators
// canopy: gold halftone dots clustered around each branch tip
function canopy(tips) {
  const dots = [];
  // one broad crown cluster so the tree reads full, then per-tip clusters
  const all = [[540, 235, 34, 190], ...tips.map(([x, y]) => [x, y, 24, 92])];
  for (const [tx, ty, count, spread] of all) {
    const n = count + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * spread;
      const r = 5 + rnd() * 13;
      const roll = rnd();
      const fill = roll > 0.93 ? '#E0301E' : roll > 0.86 ? '#1E50C8' : '#F5B700';
      const op = 0.55 + rnd() * 0.45;
      dots.push(
        `<circle cx="${(tx + Math.cos(a) * d * 1.25).toFixed(1)}" cy="${(ty + Math.sin(a) * d).toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${op.toFixed(2)}"/>`,
      );
    }
  }
  return dots.join('');
}

const BRANCHES = [
  { x: 155, y: 340, label: 'THE PLAN', gold: false },
  { x: 305, y: 190, label: 'THE BRAND', gold: true },
  { x: 545, y: 122, label: 'THE STORE', gold: false },
  { x: 792, y: 182, label: 'THE SITE', gold: true },
  { x: 938, y: 330, label: 'THE BOOKS', gold: false },
  { x: 872, y: 498, label: 'THE MARKETING', gold: true },
];

function treeSvg() {
  const forkX = 540, forkY = 486, baseY = 742;
  const branches = BRANCHES.map((b) => {
    const cx = (forkX + b.x) / 2;
    const cy = Math.min(b.y, forkY) - 66;
    return `<path d="M${forkX},${forkY} Q${cx},${cy} ${b.x},${b.y}" fill="none" stroke="#161616" stroke-width="9" stroke-linecap="round"/>`;
  }).join('');
  const bird = (x, y, s) =>
    `<path d="M${x},${y} q${6 * s},${-9 * s} ${12 * s},0 q${6 * s},${-9 * s} ${12 * s},0" fill="none" stroke="#161616" stroke-width="4" stroke-linecap="round"/>`;
  return `
  <svg class="tree" viewBox="0 0 1080 800" fill="none">
    ${canopy(BRANCHES.map((b) => [b.x, b.y - 24]))}
    <path d="M${forkX},${baseY} C${forkX - 14},${baseY - 110} ${forkX + 12},${forkY + 90} ${forkX},${forkY}" stroke="#161616" stroke-width="21" stroke-linecap="round"/>
    ${branches}
    ${bird(292, 132, 1.15)} ${bird(760, 118, 1)} ${bird(918, 268, 0.85)}
    <line x1="70" y1="${baseY}" x2="1010" y2="${baseY}" stroke="#161616" stroke-width="5" stroke-linecap="round"/>
    <path d="M${forkX - 46},${baseY} Q${forkX},${baseY - 26} ${forkX + 46},${baseY}" fill="#FBF6EA" stroke="#161616" stroke-width="5"/>
    <circle cx="${forkX}" cy="${baseY - 7}" r="11" fill="#F5B700" stroke="#161616" stroke-width="4"/>
  </svg>`;
}

// staff portrait: geometric bust in a pop frame
function portrait([role, color], i) {
  const star =
    i === 0
      ? `<svg class="star" viewBox="0 0 24 24"><polygon points="12,1 15,8.5 23,9 17,14 19,22 12,17.5 5,22 7,14 1,9 9,8.5" fill="#F5B700" stroke="#161616" stroke-width="1.6"/></svg>`
      : '';
  return `
  <div class="pframe">
    ${star}
    <svg viewBox="0 0 100 100">
      <rect x="0" y="0" width="100" height="100" fill="${color}" opacity=".13"/>
      <circle cx="50" cy="36" r="17.5" fill="none" stroke="${color}" stroke-width="3.5" opacity=".85"/>
      <circle cx="50" cy="36" r="13" fill="#161616"/>
      <path d="M19,92 Q50,56 81,92 L81,100 L19,100 Z" fill="#161616"/>
    </svg>
    <p>${role}</p>
  </div>`;
}

// greenhouse feed
const FEED = [
  ['23:41', 'THE STRATEGIST', 'wrote the 90-day plan'],
  ['23:58', 'THE DESIGNER', 'inked the logo, three marks presented'],
  ['00:22', 'THE BUILDER', 'raised the storefront, 14 pages'],
  ['00:47', 'THE DESIGNER', 'dressed the store, photography set'],
  ['01:13', 'THE CLERK', 'opened the books, accounts live'],
  ['01:36', 'THE MARKETER', 'drafted launch week, 12 posts queued'],
  ['02:04', 'THE BUILDER', 'wired checkout, taxes, receipts'],
  ['02:31', 'THE MARKETER', 'built the welcome email flock'],
  ['02:58', 'THE FOUNDER', 'reviewed everything, 3 notes back'],
  ['03:19', 'THE BUILDER', 'fixes shipped, all green'],
];

// ---------------------------------------------------------------- directions
const DIRECTIONS = [
  {
    id: 'germination',
    name: '01 · The Germination',
    thesis:
      'Watch it grow. A screenprint mustard tree assembles out of one planted sentence, the business organs stickered on the branches, agents perched as birds. Extends the homepage mid-century family. Awe by time-lapse.',
    type: 'Playfair Display · DM Sans · JetBrains Mono',
    palette: ['#FBF6EA', '#161616', '#F5B700', '#E0301E', '#1E50C8'],
    card: () => `
      <div class="c ger">
        <div class="inner">
          <div class="eye"><b>${CARD.name}</b><i></i><span>PLANTING NO. 001</span></div>
          <h1>${CARD.head}</h1>
          <div class="hero">
            ${treeSvg()}
            ${BRANCHES.map(
              (b) =>
                `<span class="tag ${b.gold ? 'g' : ''}" style="left:${(b.x / 1080) * 100}%;top:${(b.y / 800) * 100}%">${b.label}</span>`,
            ).join('')}
          </div>
          <p class="plant"><b>PLANTED 11:58 PM</b> ▸ ${CARD.seedPrompt}</p>
          <div class="stages">
            <span>SEED</span><em>→</em><span>SPROUT</span><em>→</em><span>SAPLING</span><em>→</em><span class="hot">COMPANY</span>
          </div>
          <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
        </div>
      </div>`,
  },
  {
    id: 'founding',
    name: '02 · The Founding',
    thesis:
      'Your company gets born. A certificate of founding, a gold seal, and a portrait wall of the six agents already on staff before sunrise. Personification theater. Awe by &ldquo;I have a staff.&rdquo;',
    type: 'Playfair Display · Cormorant Garamond · JetBrains Mono',
    palette: ['#FBF6EA', '#161616', '#F5B700', '#E0301E', '#1E50C8'],
    card: () => `
      <div class="c fnd">
        <div class="ribbon">GRAND OPENING · OVERNIGHT</div>
        <div class="inner">
          <div class="eye"><span>CERTIFICATE OF FOUNDING</span><i></i><span>NO. 001</span></div>
          <div class="cert">
            <p class="pre">Be it known that on this night was established</p>
            <h1>${CARD.name}</h1>
            <p class="ital">grown from a single seed: ${CARD.seedPrompt}</p>
            <p class="wit">WITNESSED AND OPERATED BY A STAFF OF SIX</p>
            <svg class="seal" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="55" fill="#F5B700" stroke="#161616" stroke-width="4"/>
              <circle cx="60" cy="60" r="41" fill="none" stroke="#161616" stroke-width="2.5"/>
              ${Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return `<line x1="${60 + Math.cos(a) * 44}" y1="${60 + Math.sin(a) * 44}" x2="${60 + Math.cos(a) * 51}" y2="${60 + Math.sin(a) * 51}" stroke="#161616" stroke-width="2.5"/>`;
              }).join('')}
              <ellipse cx="60" cy="63" rx="10" ry="14" fill="#161616"/>
              <path d="M60,49 Q66,38 60,28" fill="none" stroke="#161616" stroke-width="4" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="wall">${CARD.staff.map(portrait).join('')}</div>
          <div class="bar"><span>MODERN MUSTARD SEED</span><span>ESTABLISHED OVERNIGHT</span></div>
        </div>
      </div>`,
  },
  {
    id: 'greenhouse',
    name: '03 · The Greenhouse',
    thesis:
      'The office never sleeps. A midnight pane framed in cream where the agent office visibly works the night shift, the organs checking off one by one until sunrise. Awe by proof. Credibility maximal.',
    type: 'JetBrains Mono · Playfair Display · DM Sans',
    palette: ['#FBF6EA', '#080C16', '#F5B700', '#E0301E', '#5C7188'],
    card: () => `
      <div class="c grn">
        <div class="pane">
          <div class="phead"><b>●</b><span>THE GREENHOUSE · LIVE</span><i></i><span>03:47 AM</span></div>
          <div class="feed">
            ${FEED.map(
              (l) => `<p><u>${l[0]}</u> ▸ <b>${l[1]}</b> ${l[2]}</p>`,
            ).join('')}
          </div>
          <div class="tiles">
            ${CARD.organs
              .map(
                (o, i) =>
                  `<div class="tile"><span>${o}</span>${i === 5 ? '<em class="live">● GROWING</em>' : '<em>✓ DONE</em>'}</div>`,
              )
              .join('')}
          </div>
          <div class="prog">
            <div class="track"><div class="fill"></div></div>
            <p>COMPANY ASSEMBLY 94% · SUNRISE 06:12</p>
          </div>
          <h1>${CARD.head}</h1>
        </div>
        <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
      </div>`,
  },
];

// ---------------------------------------------------------------- stylesheet
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#191919;font-family:'DM Sans',sans-serif;width:2160px;height:1420px;overflow:hidden}
.board{padding:52px 56px;display:flex;flex-direction:column;height:100%;gap:30px}
.bhead{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex:none}
.bhead h2{font-weight:800;font-size:40px;letter-spacing:-.03em;color:#F5F5F5}
.bhead p{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#8A8A8A;margin-top:8px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1;min-height:0}
.col{display:flex;flex-direction:column;gap:20px;min-height:0}
.frame{width:100%;height:786px;overflow:hidden;position:relative;flex:none;box-shadow:0 26px 60px rgba(0,0,0,.55)}
.frame .c{position:absolute;top:0;left:0;width:1080px;height:1350px;transform:scale(.5824);transform-origin:top left}
.meta{display:flex;flex-direction:column;gap:10px}
.meta h3{font-weight:800;font-size:27px;color:#F5F5F5;letter-spacing:-.02em}
.meta .th{font-size:15px;line-height:1.5;color:#A8A8A8;max-width:46ch}
.meta .ty{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E6E}
.chips{display:flex;gap:7px}
.chips i{width:30px;height:30px;display:block;border:1px solid rgba(255,255,255,.22)}

/* ---------------- 01 THE GERMINATION ---------------- */
.ger{background:#FBF6EA;position:relative;overflow:hidden;color:#161616}
.ger::before{content:'';position:absolute;inset:0;opacity:.5;
  background-image:radial-gradient(circle,rgba(245,183,0,.30) 18%,transparent 19%);
  background-size:30px 30px}
.ger .inner{position:relative;z-index:2;height:100%;padding:58px 56px 50px;display:flex;flex-direction:column}
.ger .eye{display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:19px;letter-spacing:.2em;flex:none}
.ger .eye b{color:#C4160B;font-weight:700}
.ger .eye i{flex:1;height:2px;background:#161616}
.ger .eye span{color:#161616}
.ger h1{font-family:'Playfair Display',serif;font-weight:800;font-size:97px;line-height:1.02;letter-spacing:-.02em;margin-top:26px}
.ger .hero{position:relative;flex:1;margin:6px -10px 0}
.ger .tree{position:absolute;inset:0;width:100%;height:100%}
.ger .tag{position:absolute;transform:translate(-50%,-135%);background:#fff;border:3px solid #161616;
  box-shadow:5px 5px 0 0 #161616;font-family:'JetBrains Mono',monospace;font-size:19px;font-weight:700;
  letter-spacing:.1em;padding:9px 14px;white-space:nowrap}
.ger .tag.g{background:#F5B700}
.ger .plant{font-family:'JetBrains Mono',monospace;font-size:23px;margin-top:10px;color:#161616}
.ger .plant b{color:#C4160B;letter-spacing:.08em}
.ger .stages{display:flex;align-items:center;gap:18px;margin-top:22px;font-family:'JetBrains Mono',monospace;
  font-size:19px;letter-spacing:.18em;color:rgba(22,22,22,.7)}
.ger .stages em{font-style:normal;color:#8f6600}
.ger .stages .hot{background:#161616;color:#F5B700;padding:7px 14px}
.ger .bar{display:flex;justify-content:space-between;border-top:3px solid #161616;padding-top:16px;margin-top:22px;
  font-family:'JetBrains Mono',monospace;font-size:16px;letter-spacing:.18em}

/* ---------------- 02 THE FOUNDING ---------------- */
.fnd{background:#FBF6EA;position:relative;overflow:hidden;color:#161616}
.fnd .ribbon{position:absolute;top:64px;right:-104px;transform:rotate(35deg);background:#E0301E;color:#FBF6EA;
  font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;letter-spacing:.16em;
  padding:12px 110px;z-index:5;border:3px solid #161616;box-shadow:4px 4px 0 0 #161616}
.fnd .inner{height:100%;padding:58px 56px 50px;display:flex;flex-direction:column}
.fnd .eye{display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:18px;
  letter-spacing:.22em;color:#C4160B;font-weight:700;flex:none}
.fnd .eye i{flex:1;height:2px;background:#161616}
.fnd .eye span:last-child{color:#161616}
.fnd .cert{position:relative;margin-top:30px;border:4px solid #161616;outline:3px solid #161616;outline-offset:7px;
  background:#fff;box-shadow:9px 9px 0 0 #F5B700;padding:44px 48px 52px;text-align:center;flex:none}
.fnd .pre{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:31px;color:rgba(22,22,22,.75)}
.fnd h1{font-family:'Playfair Display',serif;font-weight:800;font-size:88px;letter-spacing:-.01em;line-height:1;margin-top:14px}
.fnd .ital{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:32px;margin-top:16px}
.fnd .wit{font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.22em;margin-top:20px;color:#8f6600;font-weight:700}
.fnd .seal{position:absolute;left:-34px;bottom:-40px;width:132px;height:132px;transform:rotate(-12deg);
  filter:drop-shadow(4px 4px 0 rgba(22,22,22,.9))}
.fnd .wall{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:44px;flex:1;align-content:center}
.fnd .pframe{position:relative;background:#fff;border:3px solid #161616;box-shadow:6px 6px 0 0 #161616;
  padding:14px 14px 12px;display:flex;flex-direction:column;gap:10px}
.fnd .pframe svg{width:100%;aspect-ratio:1;display:block;background:#FBF6EA;border:2px solid #161616}
.fnd .pframe p{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;letter-spacing:.12em;text-align:center}
.fnd .pframe .star{position:absolute;top:-16px;right:-14px;width:40px;height:40px;background:none;border:0;z-index:3}
.fnd .bar{display:flex;justify-content:space-between;border-top:3px solid #161616;padding-top:16px;margin-top:30px;
  font-family:'JetBrains Mono',monospace;font-size:16px;letter-spacing:.18em}

/* ---------------- 03 THE GREENHOUSE ---------------- */
.grn{background:#FBF6EA;padding:46px 46px 42px;display:flex;flex-direction:column;color:#161616}
.grn .pane{flex:1;background:#080C16;border:3px solid #161616;box-shadow:10px 10px 0 0 #F5B700;
  padding:46px 48px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.grn .pane::before{content:'';position:absolute;inset:0;opacity:.10;
  background-image:linear-gradient(#5C7188 1px,transparent 1px),linear-gradient(90deg,#5C7188 1px,transparent 1px);
  background-size:52px 52px}
.grn .pane>*{position:relative;z-index:2}
.grn .phead{display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:19px;
  letter-spacing:.2em;color:#F5B700}
.grn .phead b{color:#E0301E;font-size:23px}
.grn .phead i{flex:1;height:1px;background:#5C7188;opacity:.5}
.grn .phead span:last-child{color:#8A94A6}
.grn .feed{margin-top:30px;display:flex;flex-direction:column;gap:13px;flex:none}
.grn .feed p{font-family:'JetBrains Mono',monospace;font-size:21.5px;color:rgba(251,246,234,.88)}
.grn .feed u{text-decoration:none;color:#5C7188}
.grn .feed b{color:#F5B700;font-weight:700}
.grn .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:32px}
.grn .tile{border:2px solid rgba(92,113,136,.55);padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.grn .tile span{font-family:'JetBrains Mono',monospace;font-size:15px;letter-spacing:.14em;color:#8A94A6}
.grn .tile em{font-style:normal;font-family:'JetBrains Mono',monospace;font-size:21px;font-weight:700;color:#F5B700}
.grn .tile em.live{color:#FF6B35}
.grn .prog{margin-top:30px}
.grn .track{height:16px;border:2px solid #5C7188;background:rgba(92,113,136,.15)}
.grn .fill{height:100%;width:94%;background:#F5B700}
.grn .prog p{font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.16em;color:#8A94A6;margin-top:12px}
.grn h1{font-family:'Playfair Display',serif;font-weight:800;font-size:72px;line-height:1.04;color:#FBF6EA;
  margin-top:auto;letter-spacing:-.01em}
.grn .bar{display:flex;justify-content:space-between;border-top:3px solid #161616;padding-top:14px;margin-top:26px;
  font-family:'JetBrains Mono',monospace;font-size:16px;letter-spacing:.18em}
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="board">
  <div class="bhead">
    <div>
      <h2>THE MUSTARD TREE · direction study</h2>
      <p>One prompt in, a whole business out · three worlds inside the locked MMS pop-art cabin · core emotion: awe</p>
    </div>
    <p style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.18em;color:#6E6E6E">MODERN MUSTARD SEED · 2026-07-29</p>
  </div>
  <div class="cols">
    ${DIRECTIONS.map(
      (d) => `<div class="col">
        <div class="frame">${d.card()}</div>
        <div class="meta">
          <h3>${d.name}</h3>
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
const page = await browser.newPage({ viewport: { width: 2160, height: 1420 }, deviceScaleFactor: 1 });
await page.goto('file:///' + out.replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(HERE, 'moodboard.png') });
await browser.close();
console.log('moodboard.png written');
