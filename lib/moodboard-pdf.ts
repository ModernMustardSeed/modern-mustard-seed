/**
 * THE DIRECTION BOARD, ON PAPER. Renders a project's moodboard as a keepable
 * two-page PDF (Sarah's rule: every deliverable exports to PDF). The board's
 * real display face is fetched from Google Fonts and embedded so the client
 * holds their actual letters, not a stand-in; if the fetch fails the render
 * falls back to a standard face rather than failing the download.
 *
 * Layout mirrors components/moodboard/MoodboardCanvas.tsx section for
 * section (01 direction, 02 letters, 03 colors, 04 hero, 05 photographs,
 * 06 signature moment, footnotes) so screen and paper never disagree.
 */

import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getPairing, type Moodboard } from './moodboard-shared';
import type { BoardData } from './moodboard-data';

const W = 612; // US Letter
const H = 792;
const M = 46;
const CW = W - M * 2;

const INK = rgb(0.086, 0.086, 0.086);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const RED = rgb(0.878, 0.188, 0.118);
const CREAM = rgb(0.984, 0.965, 0.918);
const GOLD_DEEP = rgb(0.56, 0.4, 0);
const GREEN = rgb(0.114, 0.478, 0.235);
const WHITE = rgb(1, 1, 1);

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** WinAnsi-safe text (fancy quotes appear in model output; standard fonts choke). */
function clean(s: string): string {
  return String(s ?? '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, ', ')
    .replace(/…/g, '...')
    // The middle dot is WinAnsi-safe and carries the board's list rhythm.
    .replace(/[^\x20-\x7E·\n]/g, '');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Letterspaced mono caps label (the print cousin of the tracked JetBrains labels). */
function label(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: RGB) {
  let cx = x;
  for (const ch of clean(text).toUpperCase()) {
    page.drawText(ch, { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(ch, size) + size * 0.32;
  }
  return cx;
}

async function fetchGoogleTtf(family: string): Promise<Uint8Array | null> {
  const fam = family.replace(/ /g, '+');
  for (const q of [`family=${fam}:wght@700`, `family=${fam}`]) {
    try {
      const res = await fetch(`https://fonts.googleapis.com/css2?${q}&display=swap`, {
        // A legacy UA makes Google serve plain TrueType instead of woff2.
        headers: { 'User-Agent': 'Mozilla/4.0 (compatible)' },
      });
      if (!res.ok) continue;
      const css = await res.text();
      const m = css.match(/url\((https:[^)]+\.ttf)\)/);
      if (!m) continue;
      const bytes = new Uint8Array(await (await fetch(m[1])).arrayBuffer());
      if (bytes.length > 1000) return bytes;
    } catch {
      /* try the next query */
    }
  }
  return null;
}

async function fetchImage(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    return null; // webp/heic and friends: skip rather than fail the PDF
  } catch {
    return null;
  }
}

/** Contain-fit an image inside a box, centered. */
function fitIn(img: PDFImage, boxW: number, boxH: number) {
  const s = Math.min(boxW / img.width, boxH / img.height);
  const w = img.width * s;
  const h = img.height * s;
  return { w, h, dx: (boxW - w) / 2, dy: (boxH - h) / 2 };
}

export async function renderMoodboardPdf(data: BoardData): Promise<Uint8Array> {
  const { board, businessName, approvedAt } = data;
  const pairing = getPairing(board.pairingId);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Direction Board: ${clean(businessName)}`);
  doc.setAuthor('Modern Mustard Seed');

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvB = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvI = await doc.embedFont(StandardFonts.HelveticaOblique);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoB = await doc.embedFont(StandardFonts.CourierBold);

  // The client's actual display face, or a dignified stand-in.
  let display: PDFFont;
  const ttf = await fetchGoogleTtf(pairing.display);
  if (ttf) {
    try {
      display = await doc.embedFont(ttf, { subset: true });
    } catch {
      display = await doc.embedFont(StandardFonts.TimesRomanBold);
    }
  } else {
    display = await doc.embedFont(StandardFonts.TimesRomanBold);
  }

  const anchor = hexToRgb(board.palette[1]?.hex || '#1c1c1c');
  const accentHex = board.palette.find((s) => /signature|accent/i.test(s.role))?.hex || board.palette[2]?.hex || '#B8860B';
  const accent = hexToRgb(accentHex);
  const neutral = hexToRgb(board.palette[0]?.hex || '#F6F3EC');

  const logo = data.logoUrl ? await fetchImage(doc, data.logoUrl) : null;
  const photos: PDFImage[] = [];
  for (const url of data.photos.slice(0, 4)) {
    const img = await fetchImage(doc, url);
    if (img) photos.push(img);
  }

  const header = (page: PDFPage) => {
    label(page, `Direction Board  ·  ${businessName}`, M, H - 40, monoB, 8, MUTED);
    const tag = 'MODERN MUSTARD SEED STUDIO';
    let tw = 0;
    for (const ch of tag) tw += monoB.widthOfTextAtSize(ch, 7) + 7 * 0.32;
    label(page, tag, W - M - tw, H - 40, monoB, 7, MUTED);
    page.drawRectangle({ x: M, y: H - 50, width: CW, height: 2, color: INK });
  };

  const footer = (page: PDFPage, n: number) => {
    page.drawRectangle({ x: M, y: 40, width: CW, height: 1, color: rgb(0.9, 0.87, 0.8) });
    page.drawText('Forged by Modern Mustard Seed  ·  modernmustardseed.com', { x: M, y: 28, size: 8, font: helv, color: MUTED });
    page.drawText(`${n} / 2`, { x: W - M - 18, y: 28, size: 8, font: mono, color: MUTED });
  };

  /* ────────────────── PAGE 1 ────────────────── */
  const p1 = doc.addPage([W, H]);
  header(p1);

  if (approvedAt) {
    p1.drawText('APPROVED', {
      x: W - M - 96,
      y: H - 82,
      size: 15,
      font: helvB,
      color: GREEN,
      rotate: degrees(6),
    });
    p1.drawText(new Date(approvedAt).toLocaleDateString('en-US'), {
      x: W - M - 92,
      y: H - 96,
      size: 8,
      font: mono,
      color: GREEN,
      rotate: degrees(6),
    });
  }

  let y = H - 92;

  // 01 · the direction
  label(p1, '01 · The Direction', M, y, monoB, 8, RED);
  y -= 14;
  let nameSize = 44;
  while (display.widthOfTextAtSize(clean(board.directionName), nameSize) > CW && nameSize > 20) nameSize -= 2;
  y -= nameSize;
  p1.drawText(clean(board.directionName), { x: M, y, size: nameSize, font: display, color: INK });
  y -= 20;
  for (const line of wrap(board.directionLine, helv, 11, CW - 60)) {
    p1.drawText(line, { x: M, y, size: 11, font: helv, color: BODY, lineHeight: 15 });
    y -= 15;
  }
  y -= 10;
  let chipX = M;
  for (const w of board.vibeWords) {
    const t = clean(w).toUpperCase();
    const tw = monoB.widthOfTextAtSize(t, 8) + t.length * 8 * 0.28;
    p1.drawRectangle({ x: chipX, y: y - 6, width: tw + 22, height: 21, borderColor: anchor, borderWidth: 1.5 });
    label(p1, t, chipX + 11, y, monoB, 8, anchor);
    chipX += tw + 34;
  }
  y -= 34;

  // 02 · the letters
  const typeBoxH = 118;
  p1.drawRectangle({ x: M, y: y - typeBoxH, width: CW, height: typeBoxH, color: neutral, borderColor: rgb(0.8, 0.77, 0.72), borderWidth: 1 });
  label(p1, '02 · The Letters', M + 16, y - 20, monoB, 8, MUTED);
  p1.drawText('Aa', { x: M + 16, y: y - 78, size: 52, font: display, color: anchor });
  p1.drawText(clean(pairing.display), { x: M + 92, y: y - 52, size: 15, font: display, color: INK });
  p1.drawText('for the headlines', { x: M + 92, y: y - 66, size: 9, font: helvI, color: MUTED });
  p1.drawText(clean('ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890'), { x: M + 16, y: y - 102, size: 12, font: display, color: BODY });
  const bx = M + CW * 0.56;
  p1.drawText(clean(pairing.body), { x: bx, y: y - 52, size: 13, font: helvB, color: INK });
  p1.drawText('for everything else', { x: bx, y: y - 66, size: 9, font: helvI, color: MUTED });
  for (const [i, line] of wrap('Clean, friendly, effortless to read on any phone.', helv, 9, CW * 0.38).entries()) {
    p1.drawText(line, { x: bx, y: y - 84 - i * 12, size: 9, font: helv, color: BODY });
  }
  y -= typeBoxH + 26;

  // 03 · the colors
  label(p1, '03 · The Colors', M, y, monoB, 8, RED);
  y -= 12;
  const swW = (CW - 4 * 10) / 5;
  const swH = 92;
  board.palette.slice(0, 5).forEach((s, i) => {
    const x = M + i * (swW + 10);
    p1.drawRectangle({ x, y: y - swH, width: swW, height: swH, color: hexToRgb(s.hex), borderColor: rgb(0.85, 0.82, 0.77), borderWidth: 0.75 });
    const nm = wrap(s.name, helvB, 8.5, swW).slice(0, 2);
    nm.forEach((line, j) => p1.drawText(line, { x, y: y - swH - 12 - j * 10, size: 8.5, font: helvB, color: INK }));
    p1.drawText(s.hex.toUpperCase(), { x, y: y - swH - 14 - nm.length * 10, size: 7, font: mono, color: MUTED });
  });
  y -= swH + 44;
  const roles = board.palette.slice(0, 5).map((s) => `${clean(s.name)}: ${clean(s.role)}`).join('  ·  ');
  for (const line of wrap(roles, helv, 8, CW).slice(0, 3)) {
    p1.drawText(line, { x: M, y, size: 8, font: helv, color: MUTED });
    y -= 11;
  }

  footer(p1, 1);

  /* ────────────────── PAGE 2 ────────────────── */
  const p2 = doc.addPage([W, H]);
  header(p2);
  y = H - 92;

  // 04 · how it opens (the hero mock)
  label(p2, '04 · How It Opens', M, y, monoB, 8, RED);
  y -= 14;
  const heroH = 190;
  // browser chrome
  p2.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: WHITE, borderColor: INK, borderWidth: 1.5 });
  [RED, rgb(0.96, 0.717, 0), GREEN].forEach((c, i) => {
    p2.drawCircle({ x: M + 14 + i * 14, y: y - 11, size: 4, color: c });
  });
  p2.drawText(`${clean(businessName).toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`, { x: M + 58, y: y - 15, size: 8, font: mono, color: MUTED });
  // hero body
  const heroTop = y - 22;
  p2.drawRectangle({ x: M, y: heroTop - heroH, width: CW, height: heroH, color: anchor, borderColor: INK, borderWidth: 1.5 });
  let hy = heroTop - 34;
  if (logo) {
    const f = fitIn(logo, 90, 30);
    p2.drawRectangle({ x: M + 24, y: hy - 34 + 2, width: f.w + 12, height: 34, color: WHITE });
    p2.drawImage(logo, { x: M + 30 + f.dx, y: hy - 32 + f.dy + 2, width: f.w, height: f.h });
    hy -= 46;
  }
  let heroSize = 21;
  let heroLines = wrap(board.heroLine, display, heroSize, CW - 120);
  while (heroLines.length > 2 && heroSize > 14) {
    heroSize -= 1.5;
    heroLines = wrap(board.heroLine, display, heroSize, CW - 120);
  }
  for (const line of heroLines.slice(0, 2)) {
    hy -= heroSize + 3;
    p2.drawText(line, { x: M + 24, y: hy, size: heroSize, font: display, color: WHITE });
  }
  hy -= 16;
  for (const line of wrap(board.heroSub, helv, 9.5, CW - 150).slice(0, 3)) {
    p2.drawText(line, { x: M + 24, y: hy, size: 9.5, font: helv, color: rgb(0.92, 0.92, 0.92) });
    hy -= 13;
  }
  hy -= 12;
  const ctaText = 'GET MY FREE QUOTE';
  const ctaW = helvB.widthOfTextAtSize(ctaText, 8) + ctaText.length * 8 * 0.32 + 30;
  p2.drawRectangle({ x: M + 24, y: hy - 8, width: ctaW, height: 24, color: accent });
  label(p2, ctaText, M + 39, hy, helvB, 8, WHITE);
  y = heroTop - heroH - 26;

  // 05 · photographs
  if (photos.length > 0) {
    label(p2, '05 · Your Photographs', M, y, monoB, 8, RED);
    y -= 12;
    const cols = Math.min(photos.length, 4);
    const phW = (CW - (cols - 1) * 8) / cols;
    const phH = 74;
    photos.slice(0, cols).forEach((img, i) => {
      const x = M + i * (phW + 8);
      p2.drawRectangle({ x, y: y - phH, width: phW, height: phH, color: CREAM, borderColor: rgb(0.85, 0.82, 0.77), borderWidth: 0.75 });
      const f = fitIn(img, phW - 4, phH - 4);
      p2.drawImage(img, { x: x + 2 + f.dx, y: y - phH + 2 + f.dy, width: f.w, height: f.h });
    });
    y -= phH + 14;
  } else {
    label(p2, '05 · The Photography', M, y, monoB, 8, RED);
    y -= 16;
  }
  for (const line of wrap(board.imageryNotes, helv, 9, CW).slice(0, 4)) {
    p2.drawText(line, { x: M, y, size: 9, font: helv, color: BODY });
    y -= 12.5;
  }
  y -= 18;

  // 06 · the one unforgettable thing
  const sigLines = wrap(board.signatureMoment, helv, 10, CW - 40);
  const sigH = 44 + sigLines.length * 14;
  p2.drawRectangle({ x: M, y: y - sigH, width: CW, height: sigH, color: CREAM, borderColor: INK, borderWidth: 1.5 });
  label(p2, '06 · The One Unforgettable Thing', M + 20, y - 22, monoB, 8, GOLD_DEEP);
  sigLines.forEach((line, i) => {
    p2.drawText(line, { x: M + 20, y: y - 42 - i * 14, size: 10, font: helv, color: INK });
  });
  y -= sigH + 24;

  // footnotes
  const colW = (CW - 24) / 2;
  label(p2, 'How It Moves', M, y, monoB, 7.5, MUTED);
  label(p2, 'How It Talks', M + colW + 24, y, monoB, 7.5, MUTED);
  y -= 13;
  const moves = wrap(board.motionNotes, helv, 8.5, colW).slice(0, 4);
  const talks = wrap(board.voiceNote, helv, 8.5, colW).slice(0, 4);
  for (let i = 0; i < Math.max(moves.length, talks.length); i++) {
    if (moves[i]) p2.drawText(moves[i], { x: M, y: y - i * 11.5, size: 8.5, font: helv, color: BODY });
    if (talks[i]) p2.drawText(talks[i], { x: M + colW + 24, y: y - i * 11.5, size: 8.5, font: helv, color: BODY });
  }

  footer(p2, 2);

  return doc.save();
}
