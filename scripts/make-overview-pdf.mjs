/**
 * Modern Mustard Seed overview one-pager. Replaces the old languages-only sheet
 * with what the studio does as a whole: AI voice agents, websites, AI
 * optimization, custom software, with the voice agent as the hero. Dark hero
 * band, four offering cards, a Mr. Mustard strip, heart sign-off. For
 * LinkedIn / email / ads. Run: node scripts/make-overview-pdf.mjs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const CREAM = rgb(0.984, 0.965, 0.918), INK = rgb(0.086, 0.086, 0.086), YELLOW = rgb(0.961, 0.717, 0);
const RED = rgb(0.878, 0.188, 0.118), WHITE = rgb(1, 1, 1), BODY = rgb(0.227, 0.216, 0.2), MUTED = rgb(0.62, 0.6, 0.55);
const clean = (s) => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').split('').filter((c) => c.charCodeAt(0) <= 255).join('');

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
const W = 612, H = 792, M = 44;
const page = doc.addPage([W, H]);
page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });
const t = (s, x, y, size, font = reg, color = INK, sp = 0) => page.drawText(clean(s), { x, y, size, font, color, ...(sp ? { characterSpacing: sp } : {}) });
const wrap = (s, font, size, maxW) => { const o = []; for (const w of clean(s).split(' ')) { const ln = o.length ? o[o.length - 1] + ' ' + w : w; if (o.length && font.widthOfTextAtSize(ln, size) > maxW) o.push(w); else o[o.length ? o.length - 1 : 0] = ln; if (!o.length) o.push(w); } return o; };
function sticker(x, y, w, h, fill, off = 5, border = INK) {
  page.drawRectangle({ x: x + off, y: y - off, width: w, height: h, color: INK });
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: 2 });
}

// Dark hero band
const heroH = 196;
page.drawRectangle({ x: 0, y: H - heroH, width: W, height: heroH, color: INK });
let hy = H - 40;
try {
  const sgn = existsSync('public/brand/mascot.png') ? 'public/brand/mascot.png' : 'public/mascot.png';
  const png = await doc.embedPng(await sharp(sgn).resize({ height: 200, withoutEnlargement: true }).png().toBuffer());
  const mh = 40, mw = (png.width / png.height) * mh;
  page.drawImage(png, { x: M, y: hy - mh, width: mw, height: mh });
  t('MODERN MUSTARD SEED', M + mw + 10, hy - 18, 11, bold, YELLOW, 2.5);
  t('AI product studio  ·  Kalispell, MT', M + mw + 10, hy - 33, 9.5, reg, MUTED);
} catch { t('MODERN MUSTARD SEED', M, hy - 18, 12, bold, YELLOW, 2.5); }
hy -= 64;
for (const ln of wrap('We build the apps, sites, and AI tools that run your business.', bold, 27, W - 2 * M)) { t(ln, M, hy, 27, bold, WHITE); hy -= 31; }
hy -= 4;
t('Shipped in weeks, not months. Custom. And you own it.', M, hy, 13, ital, rgb(0.86, 0.85, 0.82));

// Offerings
let y = H - heroH - 34;
t('WHAT WE BUILD', M, y, 10, bold, RED, 3); y -= 22;
const cards = [
  ['AI Voice Agents', 'A 24/7 agent that answers every call in a natural voice, in 100+ languages. Books, sells, never sleeps.'],
  ['Websites that sell', 'Modern sites that actually bring in business and convert, designed and live in weeks.'],
  ['AI Optimization', 'Get found and chosen by AI search (ChatGPT, Google AI), and automate the busywork that eats your day.'],
  ['Custom Software & Apps', 'One clean tool built for exactly how you work, instead of five apps that almost fit.'],
];
const cw = (W - 2 * M - 16) / 2, ch = 96;
for (let i = 0; i < cards.length; i++) {
  const col = i % 2, row = Math.floor(i / 2);
  const x = M + col * (cw + 16), cy = y - row * (ch + 16);
  sticker(x, cy - ch, cw, ch, WHITE, 4);
  page.drawRectangle({ x: x + 14, y: cy - 20, width: 22, height: 5, color: YELLOW });
  t(cards[i][0], x + 14, cy - 40, 15, bold, INK);
  let ly = cy - 58;
  for (const ln of wrap(cards[i][1], reg, 10, cw - 28)) { t(ln, x + 14, ly, 10, reg, BODY); ly -= 13; }
}
y -= 2 * ch + 16 + 26;

// Mr. Mustard strip (mustard)
const sh = 70;
sticker(M, y - sh, W - 2 * M, sh, YELLOW, 5);
t('MEET MR. MUSTARD, OUR AI VOICE AGENT', M + 18, y - 24, 11, bold, INK, 1.5);
let my = y - 40;
for (const ln of wrap('Remembers every caller, speaks 100+ languages, runs inbound and outbound, books appointments, takes orders, and upsells. Hear him live and pick a language.', reg, 10.5, W - 2 * M - 36)) { t(ln, M + 18, my, 10.5, reg, INK); my -= 13.5; }
y -= sh + 24;

// CTA line
t('HEAR IT', M, y, 10, bold, RED, 2); t('modernmustardseed.com/voice-agents', M + 50, y, 12.5, bold, INK);
y -= 18;
t('BOOK', M, y, 10, bold, RED, 2); t('modernmustardseed.com/book', M + 50, y, 12.5, bold, INK);
y -= 30;

// Heart sign-off, ", Sarah" set toward the bottom of the heart
try {
  if (existsSync('public/brand/sap-heart.png')) {
    const hp = await doc.embedPng(readFileSync('public/brand/sap-heart.png'));
    const hh = 54, hw = (hp.width / hp.height) * hh;
    page.drawImage(hp, { x: M, y: y - hh, width: hw, height: hh });
    t(', Sarah', M + hw + 6, y - 40, 20, ital, INK);
  }
} catch {}
t('sarah@modernmustardseed.com   ·   modernmustardseed.com', W - M - reg.widthOfTextAtSize('sarah@modernmustardseed.com   ·   modernmustardseed.com', 9), 32, 9, reg, MUTED);

const bytes = await doc.save();
if (!existsSync('public/downloads')) mkdirSync('public/downloads', { recursive: true });
writeFileSync('public/downloads/modern-mustard-seed-overview.pdf', bytes);
try { writeFileSync(`${process.env.USERPROFILE}\\Downloads\\modern-mustard-seed-overview.pdf`, bytes); } catch {}
console.log(`overview PDF: ${Math.round(bytes.length / 1024)} KB -> public/downloads/modern-mustard-seed-overview.pdf + ~/Downloads`);
