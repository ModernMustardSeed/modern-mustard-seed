/**
 * Branded one-pager: "Your phone now speaks every customer's language."
 * A pop-art MMS sales sheet for the multilingual AI voice agent, for LinkedIn,
 * email, and ads. Writes to public/downloads/ (web-servable) + ~/Downloads.
 *
 * Run: node scripts/make-multilingual-pdf.mjs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const CREAM = rgb(0.984, 0.965, 0.918);
const INK = rgb(0.086, 0.086, 0.086);
const YELLOW = rgb(0.961, 0.717, 0);
const RED = rgb(0.878, 0.188, 0.118);
const BLUE = rgb(0.118, 0.314, 0.784);
const WHITE = rgb(1, 1, 1);
const BODY = rgb(0.227, 0.216, 0.2);

const clean = (s) => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').split('').filter((c) => c.charCodeAt(0) <= 255).join('');

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
const W = 612, H = 792, M = 48;
const page = doc.addPage([W, H]);
page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });

const text = (s, x, y, size, font = reg, color = INK, spacing = 0) => page.drawText(clean(s), { x, y, size, font, color, ...(spacing ? { characterSpacing: spacing } : {}) });
const centerText = (s, y, size, font, color) => { const c = clean(s); const w = font.widthOfTextAtSize(c, size); page.drawText(c, { x: (W - w) / 2, y, size, font, color }); };
function sticker(x, y, w, h, fill, off = 5) {
  page.drawRectangle({ x: x + off, y: y - off, width: w, height: h, color: INK });
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: INK, borderWidth: 2 });
}

let y = H - M;

// Mascot + brand eyebrow
try {
  const src = existsSync('public/brand/mascot.png') ? 'public/brand/mascot.png' : 'public/mascot.png';
  if (existsSync(src)) {
    const small = await sharp(src).resize({ height: 200, withoutEnlargement: true }).png().toBuffer();
    const png = await doc.embedPng(small);
    const mh = 46, mw = (png.width / png.height) * mh;
    page.drawImage(png, { x: M, y: y - mh, width: mw, height: mh });
    text('MODERN MUSTARD SEED', M + mw + 12, y - 20, 11, bold, RED, 2);
    text('AI voice agents that answer every call', M + mw + 12, y - 36, 10, reg, BODY);
    y -= mh + 14;
  }
} catch { /* skip mascot */ }

page.drawRectangle({ x: M, y: y - 2, width: W - 2 * M, height: 2.5, color: INK });
y -= 34;

// Headline
text("Your phone now speaks", M, y, 33, bold, INK); y -= 36;
text('every ', M, y, 33, bold, INK);
const everyW = bold.widthOfTextAtSize('every ', 33);
// "language" in a mustard sticker chip, inline
const chipW = bold.widthOfTextAtSize("customer's language", 33) + 16;
sticker(M + everyW, y - 6, chipW, 40, YELLOW, 4);
text("customer's language", M + everyW + 8, y + 3, 33, bold, INK);
y -= 50;

// Subhead
const sub = 'A 24/7 AI voice agent that picks up every call in a natural human voice, in 100+ languages. It detects the caller and answers in their language, books the appointment, and captures every lead. No voicemail. No language barrier.';
const subWords = clean(sub).split(' ');
let line = ''; const subSize = 12.5; const maxW = W - 2 * M;
for (const wd of subWords) { const t = line ? line + ' ' + wd : wd; if (reg.widthOfTextAtSize(t, subSize) > maxW) { text(line, M, y, subSize, reg, BODY); y -= 17; line = wd; } else line = t; }
if (line) { text(line, M, y, subSize, reg, BODY); y -= 17; }
y -= 14;

// Language chips
text('SPEAKS', M, y, 9, bold, RED, 2);
text('100+ LANGUAGES', M + 46, y, 9, bold, INK, 2);
y -= 20;
const langs = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Russian', '+ 94 more'];
let cx = M;
for (const l of langs) {
  const w = reg.widthOfTextAtSize(l, 11) + 20;
  if (cx + w > W - M) { cx = M; y -= 30; }
  const fill = l.startsWith('+') ? CREAM : WHITE;
  sticker(cx, y - 20, w, 24, fill, 3);
  text(l, cx + 10, y - 13, 11, l.startsWith('+') ? ital : reg, INK);
  cx += w + 10;
}
y -= 48;

// Value cards 2x2
const cards = [
  ['Never miss a call', 'Nights, weekends, the lunch rush, after hours. It answers every line, every time.'],
  ['Speak their language', 'Detects the caller and replies in their language, and can switch mid-conversation.'],
  ['Books and qualifies', 'Puts real appointments on your calendar and drops clean, noted leads into your CRM.'],
  ['Live in about 2 weeks', 'Your number, your brand, your custom voice. Built fast, and you own it outright.'],
];
const cardW = (W - 2 * M - 16) / 2, cardH = 84;
for (let i = 0; i < cards.length; i++) {
  const col = i % 2, row = Math.floor(i / 2);
  const x = M + col * (cardW + 16);
  const cy = y - row * (cardH + 16);
  sticker(x, cy - cardH, cardW, cardH, WHITE, 4);
  text(cards[i][0], x + 14, cy - 24, 14, bold, INK);
  const words = clean(cards[i][1]).split(' '); let ln = ''; let ly = cy - 42;
  for (const wd of words) { const t = ln ? ln + ' ' + wd : wd; if (reg.widthOfTextAtSize(t, 10) > cardW - 28) { text(ln, x + 14, ly, 10, reg, BODY); ly -= 13; ln = wd; } else ln = t; }
  if (ln) text(ln, x + 14, ly, 10, reg, BODY);
}
y -= 2 * (cardH + 16) + 6;

// CTA band
const ctaH = 70;
sticker(M, y - ctaH, W - 2 * M, ctaH, YELLOW, 5);
text('HEAR IT YOURSELF', M + 20, y - 26, 11, bold, INK, 1.5);
text('modernmustardseed.com/voice-agents', M + 20, y - 46, 15, bold, INK);
const bookLabel = 'Book a call:  modernmustardseed.com/book';
text(bookLabel, W - M - 20 - reg.widthOfTextAtSize(bookLabel, 11), y - 46, 11, reg, INK);
y -= ctaH + 24;

// Footer
centerText('Modern Mustard Seed   ·   Sarah Scarano   ·   sarah@modernmustardseed.com', 40, 10, reg, BODY);

const bytes = await doc.save();
if (!existsSync('public/downloads')) mkdirSync('public/downloads', { recursive: true });
writeFileSync('public/downloads/mms-multilingual-voice-agents.pdf', bytes);
try { writeFileSync('/c/Users/moder/Downloads/mms-multilingual-voice-agents.pdf', bytes); } catch {}
try { writeFileSync(process.env.USERPROFILE ? `${process.env.USERPROFILE}\\Downloads\\mms-multilingual-voice-agents.pdf` : 'mms.pdf', bytes); } catch {}
console.log(`PDF written (${Math.round(bytes.length / 1024)} KB): public/downloads/mms-multilingual-voice-agents.pdf + ~/Downloads`);
