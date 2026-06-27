/**
 * LinkedIn carousel for the AI voice agent. A square multi-slide PDF; upload it
 * to LinkedIn as a document and it becomes a swipeable carousel. Pop-art, one
 * idea per slide. Run: node scripts/make-carousel-pdf.mjs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const CREAM = rgb(0.984, 0.965, 0.918), INK = rgb(0.086, 0.086, 0.086), YELLOW = rgb(0.961, 0.717, 0);
const RED = rgb(0.878, 0.188, 0.118), WHITE = rgb(1, 1, 1), BODY = rgb(0.227, 0.216, 0.2), MUTED = rgb(0.55, 0.53, 0.48);
const clean = (s) => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').split('').filter((c) => c.charCodeAt(0) <= 255).join('');
const S = 800, M = 64;

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
let mascot = null, heart = null;
try { mascot = await doc.embedPng(await sharp(existsSync('public/brand/mascot.png') ? 'public/brand/mascot.png' : 'public/mascot.png').resize({ height: 200 }).png().toBuffer()); } catch {}
try { if (existsSync('public/brand/sap-heart.png')) heart = await doc.embedPng(readFileSync('public/brand/sap-heart.png')); } catch {}

const wrap = (s, font, size, maxW) => { const o = []; for (const raw of clean(s).split('\n')) { const ws = raw.split(' '); let l = ''; for (const w of ws) { const t = l ? l + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > maxW && l) { o.push(l); l = w; } else l = t; } o.push(l); } return o; };

function slide({ bg, eyebrow, eyebrowColor, head, headColor, sub, subColor, n }) {
  const page = doc.addPage([S, S]);
  page.drawRectangle({ x: 0, y: 0, width: S, height: S, color: bg });
  let y = S - M - 30;
  if (eyebrow) { page.drawText(clean(eyebrow), { x: M, y, size: 16, font: bold, color: eyebrowColor, characterSpacing: 3 }); y -= 20; }
  // Headline block, vertically centered-ish
  const headLines = wrap(head, bold, 52, S - 2 * M);
  let hy = S / 2 + (headLines.length * 56) / 2 + (sub ? 30 : 0);
  for (const ln of headLines) { page.drawText(ln, { x: M, y: hy, size: 52, font: bold, color: headColor }); hy -= 56; }
  if (sub) { hy -= 14; for (const ln of wrap(sub, reg, 22, S - 2 * M)) { page.drawText(ln, { x: M, y: hy, size: 22, font: reg, color: subColor }); hy -= 30; } }
  // footer
  page.drawText('modernmustardseed.com', { x: M, y: 44, size: 13, font: bold, color: subColor });
  if (n) page.drawText(n, { x: S - M - reg.widthOfTextAtSize(n, 13), y: 44, size: 13, font: reg, color: subColor });
  return page;
}

// 1. Cover (dark)
{
  const page = doc.addPage([S, S]);
  page.drawRectangle({ x: 0, y: 0, width: S, height: S, color: INK });
  if (mascot) { const mh = 64, mw = (mascot.width / mascot.height) * mh; page.drawImage(mascot, { x: M, y: S - M - mh, width: mw, height: mh }); page.drawText('MODERN MUSTARD SEED', { x: M + mw + 14, y: S - M - 38, size: 16, font: bold, color: YELLOW, characterSpacing: 2.5 }); }
  let hy = S / 2 + 90;
  for (const ln of wrap('Your phone,\nanswered.\nAlways.', bold, 64, S - 2 * M)) { page.drawText(ln, { x: M, y: hy, size: 64, font: bold, color: WHITE }); hy -= 68; }
  hy -= 16;
  page.drawText('AI voice agents that pick up every call, in any language.', { x: M, y: hy, size: 22, font: ital, color: rgb(0.85, 0.84, 0.8) });
  page.drawText('swipe ->', { x: M, y: 44, size: 16, font: bold, color: YELLOW, characterSpacing: 2 });
}

slide({ bg: CREAM, eyebrow: 'THE LEAK', eyebrowColor: RED, head: 'Most buyers go with whoever answers first.', headColor: INK, sub: 'Every call that rolls to voicemail is a customer who just dialed your competitor.', subColor: BODY, n: '2' });
slide({ bg: YELLOW, eyebrow: 'IT REMEMBERS', eyebrowColor: INK, head: 'It knows who is calling.', headColor: INK, sub: 'Recognizes returning callers, recalls the last conversation, and greets them by name. Real memory, not a phone tree.', subColor: INK, n: '3' });
slide({ bg: INK, eyebrow: '100+ LANGUAGES', eyebrowColor: YELLOW, head: 'It speaks their language.', headColor: WHITE, sub: 'Detects the caller and replies in their language. English, Spanish, French, Mandarin, Russian, and dozens more.', subColor: rgb(0.85, 0.84, 0.8), n: '4' });
slide({ bg: CREAM, eyebrow: '24/7 SALES REP', eyebrowColor: RED, head: 'Not just a receptionist. A closer.', headColor: INK, sub: 'Answers inbound around the clock, calls back every web lead in seconds, and even runs outbound campaigns.', subColor: BODY, n: '5' });
slide({ bg: YELLOW, eyebrow: 'IT CLOSES', eyebrowColor: INK, head: 'Books, takes orders, upsells.', headColor: INK, sub: 'Real calendar bookings. Full takeout orders straight to your kitchen. The natural add-on, every time.', subColor: INK, n: '6' });
slide({ bg: CREAM, eyebrow: 'EVERYTHING LOGGED', eyebrowColor: RED, head: 'Every call, transcribed.', headColor: INK, sub: 'Both sides, summarized, in one place. Coach your team from real conversations.', subColor: BODY, n: '7' });

// Final CTA (dark)
{
  const page = doc.addPage([S, S]);
  page.drawRectangle({ x: 0, y: 0, width: S, height: S, color: INK });
  let hy = S / 2 + 70;
  for (const ln of wrap('Hear it\nyourself.', bold, 60, S - 2 * M)) { page.drawText(ln, { x: M, y: hy, size: 60, font: bold, color: WHITE }); hy -= 64; }
  hy -= 12;
  page.drawText('modernmustardseed.com/voice-agents', { x: M, y: hy, size: 22, font: bold, color: YELLOW });
  if (heart) { const hh = 80, hw = (heart.width / heart.height) * hh; page.drawImage(heart, { x: M, y: 70, width: hw, height: hh }); page.drawText('Modern Mustard Seed', { x: M + hw + 8, y: 96, size: 16, font: bold, color: rgb(0.85, 0.84, 0.8) }); }
}

const bytes = await doc.save();
if (!existsSync('public/downloads')) mkdirSync('public/downloads', { recursive: true });
writeFileSync('public/downloads/ai-voice-agents-carousel.pdf', bytes);
try { writeFileSync(`${process.env.USERPROFILE}\\Downloads\\ai-voice-agents-carousel.pdf`, bytes); } catch {}
console.log(`carousel PDF: ${Math.round(bytes.length / 1024)} KB, ${doc.getPageCount()} slides -> public/downloads/ai-voice-agents-carousel.pdf + ~/Downloads`);
