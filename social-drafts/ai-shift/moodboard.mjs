#!/usr/bin/env node
// Direction study for the third MMS social set. Three complete visual worlds,
// same card content in each so they can be judged against each other, rendered
// into one moodboard screenshot for Sarah to pick from.
//
// Deliberately nothing like the first two sets (mid-century screenprint, cream
// + mustard + halftone). Everything here is generated in code: no art plates,
// no image model, no fal wallet required.
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
// Real, sourced, already verified. Same on all three so only the design differs.
const CARD = {
  stat: '45',
  unit: '%',
  head: 'now use AI to find a local business.',
  kicker: 'Last year it was six.',
  sub: 'Something is reading every website in your town and deciding which three names to say out loud. It cannot recommend what it cannot read.',
  src: 'BrightLocal Local Consumer Review Survey · 1,002 US consumers · 2026',
};

// ---------------------------------------------------------------- generators
// 01 an oscilloscope trace: a signal that decays, then spikes
function waveform(w, h) {
  const pts = [];
  for (let x = 0; x <= w; x += 4) {
    const t = x / w;
    const env = Math.exp(-2.6 * t) * 0.55 + (t > 0.72 ? Math.exp(-26 * (t - 0.72)) * 1.15 : 0);
    const carrier =
      Math.sin(t * 46) * 0.6 + Math.sin(t * 111 + 1.3) * 0.28 + (rnd() - 0.5) * 0.16;
    pts.push([x, h / 2 - carrier * env * h * 0.46]);
  }
  return 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
}

// 03 a contour field: nested closed rings, each one wobbled a little further
function contours(w, h, rings) {
  const cx = w * 0.5, cy = h * 0.52, out = [];
  for (let r = 0; r < rings; r++) {
    const base = 40 + r * 46;
    const wob = 0.05 + r * 0.016;
    const pts = [];
    for (let a = 0; a <= 360; a += 6) {
      const rad = (a * Math.PI) / 180;
      const n =
        Math.sin(rad * 3 + r * 0.7) * wob +
        Math.sin(rad * 5 - r * 0.4) * wob * 0.6 +
        Math.sin(rad * 2 + r) * wob * 0.5;
      const rr = base * (1 + n);
      pts.push([cx + Math.cos(rad) * rr * 1.42, cy + Math.sin(rad) * rr]);
    }
    out.push('M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + 'Z');
  }
  return out;
}

// ---------------------------------------------------------------- directions
const DIRECTIONS = [
  {
    id: 'signal',
    name: 'The Signal',
    thesis:
      'Cinematic broadcast. Near-black, one high-voltage accent, an oscilloscope trace of a lead going quiet. Reads like a film title card and detonates in a white feed.',
    type: 'Anton · JetBrains Mono',
    palette: ['#05070A', '#E8FF52', '#FF3B30', '#8A94A6', '#F2F4F7'],
    card: () => `
      <div class="c sig">
        <svg class="trace" viewBox="0 0 1080 420" preserveAspectRatio="none">
          <path d="${waveform(1080, 420)}" fill="none" stroke="#E8FF52" stroke-width="3"/>
          <path d="${waveform(1080, 420)}" fill="none" stroke="#E8FF52" stroke-width="9" opacity=".16"/>
        </svg>
        <div class="grid"></div>
        <div class="inner">
          <div class="eye"><b>REC</b><i></i><span>SIGNAL / 01</span></div>
          <div class="mid">
            <div class="num">${CARD.stat}<u>${CARD.unit}</u></div>
            <h1>${CARD.head}</h1>
            <p class="kick">${CARD.kicker}</p>
          </div>
          <div class="foot">
            <p class="sub">${CARD.sub}</p>
            <p class="src">${CARD.src}</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'ledger',
    name: 'The Ledger',
    thesis:
      'Data brutalism. Bone paper, hairline rules, tabular figures, one blood accent. It looks like a leaked audit of the reader’s own business rather than an ad.',
    type: 'Archivo Black · Space Mono',
    palette: ['#EDEAE3', '#0A0A0A', '#D6002A', '#6B6B6B', '#FFFFFF'],
    card: () => {
      const rows = [
        ['2025', '06', '░░░░░░░░░░░░░░░░░░░░'],
        ['2026', '45', '███████████████░░░░░'],
      ];
      return `
      <div class="c led">
        <div class="inner">
          <div class="eye"><span>EXHIBIT A</span><i></i><span>LOCAL DISCOVERY</span></div>
          <div class="tbl">
            ${rows
              .map(
                (r, i) => `<div class="row ${i === 1 ? 'hot' : ''}">
                  <span class="y">${r[0]}</span>
                  <span class="v">${r[1]}<u>%</u></span>
                  <span class="b">${r[2]}</span>
                </div>`,
              )
              .join('')}
          </div>
          <div class="mid">
            <div class="num">${CARD.stat}<u>${CARD.unit}</u></div>
            <h1>${CARD.head}</h1>
          </div>
          <p class="kick">${CARD.kicker}</p>
          <p class="sub">${CARD.sub}</p>
          <div class="foot">
            <p class="src">${CARD.src}</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>FILED 2026</span></div>
          </div>
        </div>
      </div>`;
    },
  },
  {
    id: 'terrain',
    name: 'The Terrain',
    thesis:
      'Generated topography. Deep ink and copper contour lines mapping the market around you, with the number cut clean through the ridge. Every card in the set gets its own unrepeatable landform.',
    type: 'Bodoni Moda · Inter',
    palette: ['#0B0F14', '#C8763C', '#E8DCCB', '#4A6572', '#F5EFE4'],
    card: () => `
      <div class="c ter">
        <svg class="topo" viewBox="0 0 1080 1350">
          ${contours(1080, 1350, 13)
            .map(
              (d, i) =>
                `<path d="${d}" fill="none" stroke="${i === 6 ? '#C8763C' : '#C8763C'}" stroke-width="${i === 6 ? 3.2 : 1.15}" opacity="${i === 6 ? 0.95 : 0.34 + i * 0.02}"/>`,
            )
            .join('')}
        </svg>
        <div class="inner">
          <div class="eye"><span>FIELD SURVEY</span><i></i><span>NO. 01</span></div>
          <div class="mid">
            <div class="num">${CARD.stat}<u>${CARD.unit}</u></div>
            <h1>${CARD.head}</h1>
            <p class="kick">${CARD.kicker}</p>
          </div>
          <div class="foot">
            <p class="sub">${CARD.sub}</p>
            <p class="src">${CARD.src}</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>MODERNMUSTARDSEED.COM</span></div>
          </div>
        </div>
      </div>`,
  },
];

// ---------------------------------------------------------------- stylesheet
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#191919;font-family:'Inter',sans-serif;width:2160px;height:1420px;overflow:hidden}
.board{padding:52px 56px;display:flex;flex-direction:column;height:100%;gap:30px}
.bhead{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex:none}
.bhead h2{font-family:'Inter',sans-serif;font-weight:800;font-size:40px;letter-spacing:-.03em;color:#F5F5F5}
.bhead p{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#8A8A8A;margin-top:8px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1;min-height:0}
.col{display:flex;flex-direction:column;gap:20px;min-height:0}
.frame{width:100%;height:786px;overflow:hidden;position:relative;flex:none;box-shadow:0 26px 60px rgba(0,0,0,.55)}
.frame .c{position:absolute;top:0;left:0;width:1080px;height:1350px;transform:scale(.5824);transform-origin:top left}
.meta{display:flex;flex-direction:column;gap:10px}
.meta h3{font-family:'Inter',sans-serif;font-weight:800;font-size:27px;color:#F5F5F5;letter-spacing:-.02em}
.meta .th{font-size:15px;line-height:1.5;color:#A8A8A8;max-width:46ch}
.meta .ty{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E6E}
.chips{display:flex;gap:7px}
.chips i{width:30px;height:30px;display:block;border:1px solid rgba(255,255,255,.22)}

/* ---------------- 01 THE SIGNAL ---------------- */
.sig{background:#05070A;position:relative;overflow:hidden;font-family:'JetBrains Mono',monospace}
.sig .grid{position:absolute;inset:0;opacity:.12;
  background-image:linear-gradient(#8A94A6 1px,transparent 1px),linear-gradient(90deg,#8A94A6 1px,transparent 1px);
  background-size:54px 54px}
.sig .trace{position:absolute;left:0;top:300px;width:1080px;height:420px;opacity:.9}
.sig .inner{position:relative;z-index:2;height:100%;padding:62px 58px 54px;display:flex;flex-direction:column}
.sig .eye{display:flex;align-items:center;gap:16px;flex:none}
.sig .eye b{font-size:19px;font-weight:700;letter-spacing:.2em;color:#FF3B30}
.sig .eye i{flex:1;height:1px;background:#8A94A6;opacity:.4}
.sig .eye span{font-size:19px;letter-spacing:.22em;color:#8A94A6}
.sig .mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.sig .num{font-family:'Anton',sans-serif;font-size:360px;line-height:.78;color:#E8FF52;letter-spacing:-.02em}
.sig .num u{text-decoration:none;font-size:.34em;color:#FF3B30;margin-left:6px}
.sig h1{font-family:'Anton',sans-serif;font-weight:400;font-size:82px;line-height:.98;color:#F2F4F7;
  letter-spacing:.004em;text-transform:uppercase;margin-top:14px;max-width:900px}
.sig .kick{font-family:'Anton',sans-serif;font-size:82px;line-height:.98;color:#E8FF52;text-transform:uppercase}
.sig .foot{flex:none;display:flex;flex-direction:column;gap:16px}
.sig .sub{font-size:23px;line-height:1.5;color:#8A94A6;max-width:860px}
.sig .src{font-size:16px;letter-spacing:.06em;color:#5C6575}
.sig .bar{display:flex;justify-content:space-between;border-top:1px solid rgba(138,148,166,.3);padding-top:16px;
  font-size:16px;letter-spacing:.18em;color:#8A94A6}

/* ---------------- 02 THE LEDGER ---------------- */
.led{background:#EDEAE3;font-family:'Space Mono',monospace;color:#0A0A0A}
.led .inner{height:100%;padding:60px 58px 52px;display:flex;flex-direction:column}
.led .eye{display:flex;align-items:center;gap:18px;font-size:18px;letter-spacing:.22em;flex:none}
.led .eye i{flex:1;height:2px;background:#0A0A0A}
.led .tbl{margin-top:34px;border-top:2px solid #0A0A0A;border-bottom:2px solid #0A0A0A;flex:none}
.led .row{display:flex;align-items:baseline;gap:26px;padding:16px 4px;border-bottom:1px solid rgba(10,10,10,.18)}
.led .row:last-child{border-bottom:0}
.led .row .y{font-size:22px;width:92px;letter-spacing:.06em}
.led .row .v{font-family:'Archivo Black',sans-serif;font-size:40px;width:130px;font-variant-numeric:tabular-nums}
.led .row .v u{text-decoration:none;font-size:.5em}
.led .row .b{font-size:26px;letter-spacing:-.06em;color:rgba(10,10,10,.45)}
.led .row.hot .v,.led .row.hot .b{color:#D6002A}
.led .mid{margin-top:40px;flex:none}
.led .num{font-family:'Archivo Black',sans-serif;font-size:280px;line-height:.8;letter-spacing:-.05em}
.led .num u{text-decoration:none;font-size:.32em;color:#D6002A}
.led h1{font-family:'Archivo Black',sans-serif;font-size:60px;line-height:1.02;letter-spacing:-.03em;margin-top:16px;max-width:900px}
.led .kick{font-size:30px;margin-top:18px;color:#D6002A;letter-spacing:-.01em}
.led .sub{font-size:22px;line-height:1.55;margin-top:22px;color:rgba(10,10,10,.72);max-width:880px}
.led .foot{margin-top:auto;display:flex;flex-direction:column;gap:14px}
.led .src{font-size:16px;color:rgba(10,10,10,.55);letter-spacing:.02em}
.led .bar{display:flex;justify-content:space-between;border-top:2px solid #0A0A0A;padding-top:14px;font-size:16px;letter-spacing:.18em}

/* ---------------- 03 THE TERRAIN ---------------- */
.ter{background:#0B0F14;position:relative;overflow:hidden;font-family:'Inter',sans-serif;color:#E8DCCB}
.ter .topo{position:absolute;inset:0;width:1080px;height:1350px}
.ter .inner{position:relative;z-index:2;height:100%;padding:62px 58px 54px;display:flex;flex-direction:column;
  background:radial-gradient(ellipse 70% 50% at 50% 62%, rgba(11,15,20,.86) 30%, rgba(11,15,20,0) 100%)}
.ter .eye{display:flex;align-items:center;gap:18px;flex:none;
  font-family:'Inter',sans-serif;font-size:17px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:#C8763C}
.ter .eye i{flex:1;height:1px;background:#C8763C;opacity:.5}
.ter .mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.ter .num{font-family:'Bodoni Moda',serif;font-weight:900;font-size:340px;line-height:.8;color:#F5EFE4;letter-spacing:-.04em}
.ter .num u{text-decoration:none;font-size:.3em;color:#C8763C;margin-left:4px}
.ter h1{font-family:'Bodoni Moda',serif;font-weight:700;font-size:70px;line-height:1.06;margin-top:20px;max-width:880px;color:#F5EFE4}
.ter .kick{font-family:'Bodoni Moda',serif;font-style:italic;font-weight:500;font-size:46px;color:#C8763C;margin-top:12px}
.ter .foot{flex:none;display:flex;flex-direction:column;gap:16px}
.ter .sub{font-size:23px;line-height:1.55;color:rgba(232,220,203,.78);max-width:850px}
.ter .src{font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,220,203,.5)}
.ter .bar{display:flex;justify-content:space-between;border-top:1px solid rgba(200,118,60,.45);padding-top:16px;
  font-size:15px;letter-spacing:.2em;color:rgba(232,220,203,.6)}
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;0,6..96,900;1,6..96,500&family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="board">
  <div class="bhead">
    <div>
      <h2>Set three · direction study</h2>
      <p>Same card, same sourced number, three different worlds · pick one and I build the full set</p>
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
