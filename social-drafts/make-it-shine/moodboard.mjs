#!/usr/bin/env node
// Direction study for MMS social set ten: SEE YOURS / MAKE IT SHINE.
// The mirror set for other people's groups: what would YOUR business look like
// with a designer talking website? Every direction carries a blank
// YOUR NAME HERE in the place of honor. Same copy in all three worlds so the
// choice is design, not words. All generated in code, no image model.
//
// Usage: node moodboard.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const COPY = {
  eye: 'SET TEN · SEE YOURS',
  head: 'Your business. Shining.',
  kick: 'Best way to make it thrive? Make it shine.',
  sub: 'We build a real talking-website demo for YOUR business. Free, no card, just to see. Most owners stare at it for a while.',
  url: 'MODERNMUSTARDSEED.COM/DEMOS',
};

// four-point jewelry sparkle
function spark(cx, cy, r, o = 1) {
  return `<path d="M${cx},${cy - r} Q${cx + r * 0.12},${cy - r * 0.12} ${cx + r},${cy} Q${cx + r * 0.12},${cy + r * 0.12} ${cx},${cy + r} Q${cx - r * 0.12},${cy + r * 0.12} ${cx - r},${cy} Q${cx - r * 0.12},${cy - r * 0.12} ${cx},${cy - r}Z" fill="#FFFFFF" opacity="${o}"/>`;
}

// marquee bulb border for a rounded sign
function bulbs() {
  const pts = [];
  for (let x = 120; x <= 960; x += 84) { pts.push([x, 330], [x, 830]); }
  for (let y = 414; y <= 750; y += 84) { pts.push([120, y], [960, y]); }
  return pts
    .map(
      ([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#FFD98A" opacity=".28"/>
                   <circle cx="${x}" cy="${y}" r="11" fill="#FFE9B8"/>
                   <circle cx="${x - 3}" cy="${y - 3}" r="4" fill="#FFFFFF"/>`,
    )
    .join('');
}

const DIRECTIONS = [
  {
    id: 'gold-leaf',
    name: 'The Gold Leaf',
    emotion: 'Pride of craft. Your name hand-lettered in gold on the shop glass.',
    thesis:
      'Sign-painter’s window: deep bottle-green glass, double-arch gold frame, pinstripe flourishes. The oldest way a town knew a business had made it.',
    type: 'Rye · Libre Caslon Text',
    palette: ['#0F2C24', '#D4A72C', '#F3EAD3', '#0B1F19', '#FFFFFF'],
    card: () => `
      <div class="c glf">
        <svg class="frame" viewBox="0 0 1080 760">
          <path d="M140,700 L140,300 Q140,140 340,120 Q540,100 740,120 Q940,140 940,300 L940,700"
                fill="none" stroke="#D4A72C" stroke-width="7"/>
          <path d="M170,700 L170,315 Q170,168 355,150 Q540,132 725,150 Q910,168 910,315 L910,700"
                fill="none" stroke="#D4A72C" stroke-width="2.5"/>
          <path d="M320,635 Q540,585 760,635" fill="none" stroke="#D4A72C" stroke-width="4"/>
          <path d="M400,668 Q540,640 680,668" fill="none" stroke="#D4A72C" stroke-width="2"/>
        </svg>
        <div class="inner">
          <div class="eye"><span>${COPY.eye}</span></div>
          <div class="mid">
            <p class="pre">EST. THE DAY YOU SAY SO</p>
            <div class="name">YOUR<br>NAME<br>HERE</div>
          </div>
          <div class="foot">
            <h1>${COPY.head}</h1>
            <p class="kick">${COPY.kick}</p>
            <p class="sub">${COPY.sub}</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>${COPY.url}</span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'vitrine',
    name: 'The Vitrine',
    emotion: 'Being treasured. Your business under museum glass, lit like it costs something.',
    thesis:
      'Jeweler’s case: near-black velvet, one spotlight cone, a glass dome on a pedestal, four-point sparkles, and a small brass plaque with your name on it.',
    type: 'Marcellus · Jost',
    palette: ['#120E18', '#C9A24B', '#E8DFCE', '#2A2138', '#FFFFFF'],
    card: () => `
      <div class="c vit">
        <svg class="scene" viewBox="0 0 1080 900">
          <path d="M320,660 L320,420 Q320,215 540,215 Q760,215 760,420 L760,660 Z"
                fill="rgba(232,223,206,.05)" stroke="#E8DFCE" stroke-width="4" opacity=".9"/>
          <path d="M385,330 Q450,248 545,238" fill="none" stroke="#FFFFFF" stroke-width="7" opacity=".55" stroke-linecap="round"/>
          <rect x="280" y="660" width="520" height="26" fill="#C9A24B"/>
          <rect x="320" y="686" width="440" height="130" fill="#1C1526"/>
          <rect x="395" y="716" width="290" height="64" rx="6" fill="#C9A24B"/>
          ${spark(430, 360, 24, 0.9)}${spark(655, 430, 32, 1)}${spark(560, 300, 16, 0.7)}${spark(480, 520, 20, 0.8)}
        </svg>
        <div class="inner">
          <div class="eye"><span>${COPY.eye}</span></div>
          <div class="plaque">YOUR NAME HERE</div>
          <div class="foot">
            <h1>${COPY.head}</h1>
            <p class="kick">${COPY.kick}</p>
            <p class="sub">${COPY.sub}</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>${COPY.url}</span></div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'marquee',
    name: 'The Marquee',
    emotion: 'Arrival. Your name in warm bulbs over Main Street.',
    thesis:
      'Small-town theater marquee at dusk: an ivory sign board ringed in glowing bulbs, fat slab letters, one red chevron. The most literal make-it-shine there is.',
    type: 'Alfa Slab One · DM Sans',
    palette: ['#1A140E', '#FFF8E7', '#FFD98A', '#D64533', '#3A2E1F'],
    card: () => `
      <div class="c mrq">
        <svg class="sign" viewBox="0 0 1080 900">
          <rect x="90" y="300" width="900" height="560" rx="34" fill="#FFF8E7" stroke="#3A2E1F" stroke-width="10"/>
          <rect x="60" y="230" width="960" height="86" rx="18" fill="#D64533"/>
          <rect x="150" y="360" width="780" height="440" fill="none" stroke="#3A2E1F" stroke-width="3" opacity=".25"/>
          ${bulbs()}
        </svg>
        <div class="inner">
          <div class="eye"><span>${COPY.eye}</span></div>
          <p class="tonight">TONIGHT AND EVERY NIGHT</p>
          <div class="name">YOUR<br>NAME<br>HERE.</div>
          <div class="foot">
            <h1>${COPY.head}</h1>
            <p class="kick">${COPY.kick}</p>
            <p class="sub">${COPY.sub}</p>
            <div class="bar"><span>MODERN MUSTARD SEED</span><span>${COPY.url}</span></div>
          </div>
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

.c .eye{font-family:'JetBrains Mono',monospace;letter-spacing:.24em;font-size:17px}
.c h1{letter-spacing:-.015em}
.c .bar{display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;letter-spacing:.16em;font-size:15px;padding-top:15px}

/* ---------------- A THE GOLD LEAF ---------------- */
.glf{background:#0F2C24;color:#F3EAD3;font-family:'Libre Caslon Text',serif;position:relative;overflow:hidden}
.glf::before{content:'';position:absolute;inset:0;opacity:.35;
  background:radial-gradient(ellipse 70% 45% at 50% 34%, rgba(212,167,44,.25) 0%, rgba(212,167,44,0) 70%)}
.glf .frame{position:absolute;left:0;top:40px;width:1080px;height:760px}
.glf .inner{position:relative;height:100%;padding:56px 58px 50px;display:flex;flex-direction:column}
.glf .eye{color:#D4A72C;text-align:center}
.glf .mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;margin-top:-40px}
.glf .pre{font-family:'JetBrains Mono',monospace;font-size:15px;letter-spacing:.3em;color:rgba(243,234,211,.55)}
.glf .name{font-family:'Rye',serif;font-size:132px;line-height:1.04;margin-top:26px;color:#D4A72C;
  text-shadow:0 3px 0 #7A5C12, 0 6px 18px rgba(0,0,0,.5)}
.glf .foot{flex:none;display:flex;flex-direction:column;gap:12px;text-align:center;align-items:center}
.glf h1{font-size:56px;font-weight:700}
.glf .kick{font-style:italic;font-size:29px;color:#D4A72C}
.glf .sub{font-family:'Inter',sans-serif;font-size:20px;line-height:1.5;color:rgba(243,234,211,.75);max-width:800px}
.glf .bar{width:100%;border-top:2px solid rgba(212,167,44,.5);color:rgba(243,234,211,.8)}

/* ---------------- B THE VITRINE ---------------- */
.vit{background:#120E18;color:#E8DFCE;font-family:'Marcellus',serif;position:relative;overflow:hidden}
.vit .scene{position:absolute;left:0;top:30px;width:1080px;height:900px}
.vit .inner{position:relative;height:100%;padding:56px 58px 50px;display:flex;flex-direction:column}
.vit .eye{color:#C9A24B;text-align:center}
.vit .plaque{position:absolute;left:50%;top:746px;transform:translateX(-50%);width:290px;text-align:center;
  font-family:'Jost',sans-serif;font-weight:600;font-size:25px;letter-spacing:.12em;color:#120E18;line-height:64px}
.vit .foot{margin-top:auto;display:flex;flex-direction:column;gap:12px;text-align:center;align-items:center}
.vit h1{font-size:58px;font-weight:400}
.vit .kick{font-family:'Jost',sans-serif;font-size:27px;color:#C9A24B;letter-spacing:.02em}
.vit .sub{font-family:'Jost',sans-serif;font-size:20px;line-height:1.5;color:rgba(232,223,206,.7);max-width:780px}
.vit .bar{width:100%;border-top:1px solid rgba(201,162,75,.5);color:rgba(232,223,206,.75)}

/* ---------------- C THE MARQUEE ---------------- */
.mrq{background:#1A140E;color:#FFF8E7;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
.mrq::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 75% 42% at 50% 42%, rgba(255,217,138,.22) 0%, rgba(255,217,138,0) 70%)}
.mrq .sign{position:absolute;left:0;top:0;width:1080px;height:900px}
.mrq .inner{position:relative;height:100%;padding:56px 58px 50px;display:flex;flex-direction:column;align-items:center}
.mrq .eye{color:#FFD98A}
.mrq .tonight{position:absolute;left:0;right:0;top:262px;text-align:center;
  font-family:'JetBrains Mono',monospace;font-size:19px;letter-spacing:.32em;color:#FFF8E7}
.mrq .name{font-family:'Alfa Slab One',serif;font-size:108px;line-height:1.08;color:#3A2E1F;text-align:center;margin-top:238px}
.mrq .foot{margin-top:auto;display:flex;flex-direction:column;gap:12px;text-align:center;align-items:center}
.mrq h1{font-size:56px;font-weight:800;letter-spacing:-.02em}
.mrq .kick{font-size:28px;font-weight:700;color:#FFD98A}
.mrq .sub{font-size:20px;line-height:1.5;color:rgba(255,248,231,.75);max-width:790px}
.mrq .bar{width:100%;border-top:2px solid rgba(255,217,138,.45);color:rgba(255,248,231,.8)}
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=DM+Sans:wght@400;700&family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=Jost:wght@400;600&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Marcellus&family=Rye&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="board">
  <div class="bhead">
    <div>
      <h2>Set ten · direction study · SEE YOURS</h2>
      <p>The mirror set: your name in the place of honor · same words, three worlds · pick one and I build the full set</p>
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
