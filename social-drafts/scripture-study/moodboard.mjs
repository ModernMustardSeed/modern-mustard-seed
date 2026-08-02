#!/usr/bin/env node
// Set fourteen direction study: three worlds, identical content (Psalm 119:105
// KJV), so the pick is about design. Renders moodboard.png for approval in chat.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const W = 2340, H = 1420;

const VERSE = 'Thy word is a lamp unto my feet, and a light unto my path.';
const REF = 'PSALM 119:105 · KJV';

function art(key) {
  const p = path.join(HERE, 'art', `${key}.png`);
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;1,400;1,500&family=Marcellus&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Cardo:ital,wght@0,400;1,400&family=Cinzel:wght@400;600&family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:#191613;font-family:'DM Sans',sans-serif;color:#EDE6D6;padding:44px 48px}
.head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:30px}
.head h1{font-family:'JetBrains Mono',monospace;font-size:26px;letter-spacing:.3em;color:#EDE6D6}
.head span{font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.18em;color:rgba(237,230,214,.55)}
.row{display:flex;gap:36px;height:1220px}
.col{flex:1;display:flex;flex-direction:column;gap:18px}
.tag{font-family:'JetBrains Mono',monospace;font-size:20px;letter-spacing:.24em;color:#EDE6D6}
.tag b{color:#F5B700}
.line{font-size:19px;line-height:1.45;color:rgba(237,230,214,.72);min-height:56px}
.card{flex:1;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 60px rgba(0,0,0,.5)}
.plate{height:560px;flex:none;overflow:hidden;position:relative}
.plate img{width:100%;height:100%;object-fit:cover;display:block}
.chips{display:flex;gap:10px;margin-top:2px}
.chip{width:44px;height:44px;border-radius:4px;border:1px solid rgba(255,255,255,.25)}
.fonts{font-size:16px;color:rgba(237,230,214,.6);line-height:1.5}

/* 1 · CATHEDRAL GLASS */
.glass{background:#101319}
.glass .txt{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 52px;background:
  radial-gradient(120% 90% at 50% 0%,rgba(245,183,0,.10),rgba(16,19,25,0) 55%),#101319}
.glass .verse{font-family:'EB Garamond',serif;font-style:italic;font-size:44px;line-height:1.3;color:#F2E9D2;text-wrap:balance}
.glass .ref{font-family:'Marcellus',serif;font-size:20px;letter-spacing:.34em;color:#C9A227;margin-top:26px}
.glass .plate:after{content:'';position:absolute;inset:0;box-shadow:inset 0 -60px 80px rgba(16,19,25,.55)}

/* 2 · THE BROADSIDE */
.broad{background:#F4EDDD;color:#1C1710}
.broad .txt{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:36px 52px;
  border-top:5px double #1C1710;margin:0 18px 18px;background:#F4EDDD}
.broad .verse{font-family:'IM Fell English',serif;font-size:45px;line-height:1.28;color:#1C1710;text-wrap:balance}
.broad .verse i{font-style:italic}
.broad .ref{font-family:'IM Fell English SC',serif;font-size:24px;letter-spacing:.2em;color:#C53A2B;margin-top:22px}
.broad .plate{margin:18px 18px 0;border:3px solid #1C1710}

/* 3 · GOLD ILLUMINATION */
.illum{background:#0D1626}
.illum .txt{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 52px;background:
  linear-gradient(180deg,rgba(201,162,39,.06),rgba(13,22,38,0) 40%),#0D1626}
.illum .verse{font-family:'Cardo',serif;font-size:42px;line-height:1.34;color:#EFE2BC;text-wrap:balance}
.illum .verse:first-letter{font-size:74px;color:#C9A227;font-weight:700;line-height:.9}
.illum .ref{font-family:'Cinzel',serif;font-size:20px;letter-spacing:.3em;color:#C9A227;margin-top:24px}
.illum .plate{border-bottom:1px solid rgba(201,162,39,.5)}
</style></head><body>
<div class="head"><h1>SET FOURTEEN · SCRIPTURE ON THE CARD</h1><span>SAME VERSE, THREE WORLDS · PICK ONE</span></div>
<div class="row">

  <div class="col">
    <div class="tag"><b>1</b> · CATHEDRAL GLASS</div>
    <div class="line">Jewel-glass light on nave dark. The verse reads like it is lit from behind. Emotion: awe. The set would be twelve windows, one verse each, closing on the mustard tree in glass.</div>
    <div class="card glass">
      <div class="plate"><img src="${art('glass')}"></div>
      <div class="txt"><div class="verse">${VERSE}</div><div class="ref">${REF}</div></div>
    </div>
    <div class="chips"><div class="chip" style="background:#101319"></div><div class="chip" style="background:#C9A227"></div><div class="chip" style="background:#8C1F28"></div><div class="chip" style="background:#1F4E79"></div><div class="chip" style="background:#2E5E3A"></div></div>
    <div class="fonts">EB Garamond italic verse · Marcellus gold reference · glass plates from Codex</div>
  </div>

  <div class="col">
    <div class="tag"><b>2</b> · THE BROADSIDE</div>
    <div class="line">Hand-press hymn sheet. Heavy woodcut ink on cream, one vermillion accent, double rules. Emotion: conviction, heritage. Prints beautifully, feels like it was found in a family Bible.</div>
    <div class="card broad">
      <div class="plate"><img src="${art('woodcut')}"></div>
      <div class="txt"><div class="verse">${VERSE}</div><div class="ref">${REF}</div></div>
    </div>
    <div class="chips"><div class="chip" style="background:#F4EDDD"></div><div class="chip" style="background:#1C1710"></div><div class="chip" style="background:#C53A2B"></div></div>
    <div class="fonts">IM Fell English verse (17th century press face) · Fell small caps reference · woodcut plates from Codex</div>
  </div>

  <div class="col">
    <div class="tag"><b>3</b> · GOLD ILLUMINATION</div>
    <div class="line">Book of hours on MMS midnight. Gold leaf filigree, drop cap, verse set like treasure. Emotion: reverence, preciousness. The most giftable of the three.</div>
    <div class="card illum">
      <div class="plate"><img src="${art('illumination')}"></div>
      <div class="txt"><div class="verse">${VERSE}</div><div class="ref">${REF}</div></div>
    </div>
    <div class="chips"><div class="chip" style="background:#0D1626"></div><div class="chip" style="background:#C9A227"></div><div class="chip" style="background:#8C1F28"></div><div class="chip" style="background:#EFE2BC"></div></div>
    <div class="fonts">Cardo verse with gold drop cap · Cinzel reference · illumination plates from Codex</div>
  </div>

</div>
</body></html>`;

const file = path.join(HERE, 'moodboard.html');
fs.writeFileSync(file, HTML);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file:///' + file.replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(HERE, 'moodboard.png') });
await browser.close();
console.log('OK moodboard.png');
