/**
 * Multi-page branded PDF of the AI Voice Agent whitepaper. Reads the SAME
 * content as the web page (data/voice-agent-whitepaper.ts), so there is one
 * source of truth. Output: public/downloads/ai-voice-agents-whitepaper.pdf +
 * ~/Downloads. Run: node scripts/make-whitepaper-pdf.mjs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

// Pull the content object straight out of the .ts source (pure data literal).
const src = readFileSync(new URL('../data/voice-agent-whitepaper.ts', import.meta.url), 'utf8');
const m = src.match(/export const WHITEPAPER\s*=\s*(\{[\s\S]*?\});\s*\n\s*export type/);
if (!m) throw new Error('could not parse whitepaper content');
const WP = eval('(' + m[1] + ')');

const CREAM = rgb(0.984, 0.965, 0.918), INK = rgb(0.086, 0.086, 0.086), YELLOW = rgb(0.961, 0.717, 0);
const RED = rgb(0.878, 0.188, 0.118), WHITE = rgb(1, 1, 1), BODY = rgb(0.227, 0.216, 0.2), MUTED = rgb(0.5, 0.48, 0.44);
const clean = (s) => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').split('').filter((c) => c.charCodeAt(0) <= 255).join('');

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
const W = 612, H = 792, M = 56, CW = W - 2 * M, FOOT = 46;
let mascot = null;
try { const sgn = existsSync('public/brand/mascot.png') ? 'public/brand/mascot.png' : 'public/mascot.png'; mascot = await doc.embedPng(await sharp(sgn).resize({ height: 200, withoutEnlargement: true }).png().toBuffer()); } catch {}

let page, y, pageNo = 0;
function footer() {
  page.drawText('Modern Mustard Seed   ·   modernmustardseed.com/voice-agents', { x: M, y: 30, size: 9, font: reg, color: MUTED });
  const pn = String(pageNo);
  page.drawText(pn, { x: W - M - reg.widthOfTextAtSize(pn, 9), y: 30, size: 9, font: reg, color: MUTED });
}
function newPage() {
  if (page) footer();
  page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });
  pageNo += 1;
  y = H - M;
}
function need(h) { if (y - h < FOOT) newPage(); }
function wrap(text, font, size, maxW) {
  const out = [];
  for (const raw of clean(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
function para(text, { font = reg, size = 11, color = BODY, lead = 16, gap = 8, x = M, maxW = CW } = {}) {
  for (const ln of wrap(text, font, size, maxW)) { need(lead); page.drawText(ln, { x, y, size, font, color }); y -= lead; }
  y -= gap;
}

newPage();
// Cover header
if (mascot) { const mh = 52, mw = (mascot.width / mascot.height) * mh; page.drawImage(mascot, { x: M, y: y - mh, width: mw, height: mh }); page.drawText('MODERN MUSTARD SEED', { x: M + mw + 12, y: y - 22, size: 11, font: bold, color: RED, characterSpacing: 2 }); page.drawText('AI voice agents that answer every call', { x: M + mw + 12, y: y - 38, size: 10, font: reg, color: BODY }); y -= mh + 16; }
page.drawRectangle({ x: M, y: y - 2, width: CW, height: 3, color: INK }); y -= 30;
page.drawText('WHITEPAPER', { x: M, y, size: 11, font: bold, color: RED, characterSpacing: 3 }); y -= 30;
for (const ln of wrap(WP.title, bold, 30, CW)) { need(36); page.drawText(ln, { x: M, y, size: 30, font: bold, color: INK }); y -= 34; }
y -= 6;
para(WP.subtitle, { font: ital, size: 13, color: INK, lead: 18, gap: 12 });
para(`${WP.author}   ·   ${WP.dateLabel}   ·   ${WP.readingMinutes} min read`, { font: bold, size: 9.5, color: MUTED, gap: 14 });
para(WP.intro, { size: 11.5, lead: 16.5, gap: 18 });

// Sections
for (let i = 0; i < WP.sections.length; i++) {
  const s = WP.sections[i];
  need(40);
  page.drawText(String(i + 1).padStart(2, '0'), { x: M, y, size: 13, font: bold, color: YELLOW });
  for (const ln of wrap(s.heading, bold, 16, CW - 28)) { page.drawText(ln, { x: M + 28, y, size: 16, font: bold, color: INK }); y -= 21; }
  y -= 6;
  for (const p of s.body) para(p, { size: 11.5, lead: 16.5, gap: 8 });
  if (s.bullets) {
    for (const b of s.bullets) {
      need(20);
      page.drawText('-', { x: M + 4, y, size: 11.5, font: bold, color: RED });
      const head = clean(b.title) + ':  ';
      page.drawText(head, { x: M + 16, y, size: 11.5, font: bold, color: INK });
      const indent = M + 16 + bold.widthOfTextAtSize(head, 11.5);
      const lines = wrap(b.text, reg, 11.5, W - M - indent);
      page.drawText(lines[0] || '', { x: indent, y, size: 11.5, font: reg, color: BODY }); y -= 16;
      for (const ln of lines.slice(1)) { need(16); page.drawText(ln, { x: M + 16, y, size: 11.5, font: reg, color: BODY }); y -= 16; }
      y -= 4;
    }
    y -= 6;
  }
  y -= 6;
}

// CTA block
need(110);
const ch = 96;
page.drawRectangle({ x: M + 4, y: y - ch - 4, width: CW, height: ch, color: INK });
page.drawRectangle({ x: M, y: y - ch, width: CW, height: ch, color: YELLOW, borderColor: INK, borderWidth: 2 });
page.drawText(clean(WP.cta.heading), { x: M + 20, y: y - 26, size: 15, font: bold, color: INK });
let cy = y - 46;
for (const ln of wrap(WP.cta.body, reg, 11, CW - 40)) { page.drawText(ln, { x: M + 20, y: cy, size: 11, font: reg, color: INK }); cy -= 15; }
page.drawText('modernmustardseed.com/voice-agents   ·   book a call: modernmustardseed.com/book', { x: M + 20, y: y - ch + 16, size: 10, font: bold, color: INK });
footer();

const bytes = await doc.save();
if (!existsSync('public/downloads')) mkdirSync('public/downloads', { recursive: true });
writeFileSync('public/downloads/ai-voice-agents-whitepaper.pdf', bytes);
try { writeFileSync(`${process.env.USERPROFILE}\\Downloads\\ai-voice-agents-whitepaper.pdf`, bytes); } catch {}
console.log(`whitepaper PDF: ${Math.round(bytes.length / 1024)} KB, ${pageNo} pages -> public/downloads/ai-voice-agents-whitepaper.pdf + ~/Downloads`);
