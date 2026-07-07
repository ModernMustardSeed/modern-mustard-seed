/**
 * The MUSTARD PRESS PDF: the BISTRO layout set in real vector type with the
 * embedded brand faces (Playfair Display 700, DM Sans 400/700). Mirrors
 * lib/press.ts renderProofHtml so the paid file matches the on-page proof.
 * `watermark: true` produces the free PROOF; false produces the clean PIECE.
 */

import { PDFDocument, rgb, degrees, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PLAYFAIR_700_B64, DMSANS_400_B64, DMSANS_700_B64 } from './proposal-fonts';
import type { PressCatalog, PressProfile } from '@/lib/press-store';

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 48;
const CREAM = rgb(0.984, 0.965, 0.918); // #FBF6EA
const INK = rgb(0.086, 0.086, 0.086); // #161616
const GOLD = rgb(0.722, 0.525, 0.043); // #B8860B
const GRAY = rgb(0.35, 0.35, 0.35);

// WinAnsi safety for embedded subsets: strip anything exotic.
function safe(s: string): string {
  return String(s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, '-')
    .replace(/·/g, '·')
    .replace(/[^\x20-\x7E -ÿ·]/g, '');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(probe, size) <= maxWidth) line = probe;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function tracked(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, gap: number, color = INK) {
  let cx = x;
  for (const ch of text) {
    page.drawText(ch, { x: cx, y, font, size, color });
    cx += font.widthOfTextAtSize(ch, size) + gap;
  }
}

function trackedWidth(text: string, font: PDFFont, size: number, gap: number): number {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, size) + gap;
  return Math.max(0, w - gap);
}

export async function renderPressPdf(
  profile: PressProfile,
  catalog: PressCatalog,
  opts: { watermark: boolean }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const body = await doc.embedFont(Buffer.from(DMSANS_400_B64, 'base64'), { subset: true });
  const bold = await doc.embedFont(Buffer.from(DMSANS_700_B64, 'base64'), { subset: true });
  const display = await doc.embedFont(Buffer.from(PLAYFAIR_700_B64, 'base64'), { subset: true });
  doc.setTitle(`${profile.business} · set at Mustard Press`);
  doc.setProducer('MUSTARD PRESS · modernmustardseed.com/press');

  const itemCount = catalog.sections.reduce((n, s) => n + s.items.length, 0);
  const twoCol = itemCount > 14;

  const pages: PDFPage[] = [];
  const newPage = () => {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });
    pages.push(p);
    return p;
  };

  // ── Header (page 1 only) ──
  let page = newPage();
  let headerBottom = PAGE_H - MARGIN;
  {
    const tag = safe(profile.tagline).toUpperCase();
    if (tag) {
      const w = trackedWidth(tag, bold, 7.5, 3.4);
      tracked(page, tag, (PAGE_W - w) / 2, headerBottom - 8, bold, 7.5, 3.4, GOLD);
    }
    headerBottom -= 30;
    const name = safe(profile.business);
    let nameSize = 34;
    while (display.widthOfTextAtSize(name, nameSize) > PAGE_W - MARGIN * 2 && nameSize > 18) nameSize -= 2;
    page.drawText(name, {
      x: (PAGE_W - display.widthOfTextAtSize(name, nameSize)) / 2,
      y: headerBottom - nameSize,
      font: display,
      size: nameSize,
      color: INK,
    });
    headerBottom -= nameSize + 14;
    const city = safe(profile.city).toUpperCase();
    if (city) {
      const w = trackedWidth(city, bold, 6.5, 2.8);
      tracked(page, city, (PAGE_W - w) / 2, headerBottom - 6, bold, 6.5, 2.8, INK);
    }
    headerBottom -= 20;
    page.drawLine({ start: { x: MARGIN, y: headerBottom }, end: { x: PAGE_W - MARGIN, y: headerBottom }, thickness: 2.2, color: INK });
    page.drawLine({ start: { x: MARGIN, y: headerBottom - 4 }, end: { x: PAGE_W - MARGIN, y: headerBottom - 4 }, thickness: 0.7, color: INK });
    headerBottom -= 24;
  }

  // ── Column frames ──
  const FOOTER_H = 64;
  const colWidth = twoCol ? (PAGE_W - MARGIN * 2 - 30) / 2 : PAGE_W - MARGIN * 2;
  type Frame = { page: PDFPage; x: number; y: number };
  const frames: Frame[] = twoCol
    ? [
        { page, x: MARGIN, y: headerBottom },
        { page, x: MARGIN + colWidth + 30, y: headerBottom },
      ]
    : [{ page, x: MARGIN, y: headerBottom }];
  let fi = 0;

  const ensure = (needed: number) => {
    while (frames[fi].y - needed < MARGIN + FOOTER_H) {
      fi += 1;
      if (fi >= frames.length) {
        page = newPage();
        const top = PAGE_H - MARGIN;
        if (twoCol) frames.push({ page, x: MARGIN, y: top }, { page, x: MARGIN + colWidth + 30, y: top });
        else frames.push({ page, x: MARGIN, y: top });
      }
    }
  };

  // ── Sections ──
  for (const sec of catalog.sections) {
    ensure(46);
    let f = frames[fi];
    const title = safe(sec.title).toUpperCase();
    const tw = trackedWidth(title, bold, 8, 3.2);
    f.page.drawRectangle({ x: f.x, y: f.y - 18, width: tw + 16, height: 17, color: INK });
    tracked(f.page, title, f.x + 8, f.y - 13, bold, 8, 3.2, CREAM);
    f.y -= 30;

    for (const item of sec.items) {
      const nameSize = 10.5;
      const priceSize = 11;
      const price = safe(item.price);
      const priceW = display.widthOfTextAtSize(price, priceSize);
      const nameMax = colWidth - priceW - 20;
      const nameText = safe(item.name);
      const detailText = item.detail ? safe(item.detail) : '';
      const nameW = bold.widthOfTextAtSize(nameText, nameSize);
      const detailW = detailText ? body.widthOfTextAtSize(` · ${detailText}`, 9.5) : 0;
      const oneLine = nameW + detailW <= nameMax;
      const noteLines = item.note ? wrap(safe(item.note), body, 8, colWidth - 8) : [];
      const needed = (oneLine ? 16 : 28) + noteLines.length * 10 + 4;
      ensure(needed);
      f = frames[fi];

      const baseline = f.y - nameSize;
      f.page.drawText(nameText, { x: f.x, y: baseline, font: bold, size: nameSize, color: INK });
      let afterNameX = f.x + nameW;
      if (detailText && oneLine) {
        f.page.drawText(` · ${detailText}`, { x: afterNameX, y: baseline, font: body, size: 9.5, color: GRAY });
        afterNameX += detailW;
      }
      // dotted leader + right-aligned price
      const priceX = f.x + colWidth - priceW;
      const dotsStart = afterNameX + 6;
      const dotsEnd = priceX - 6;
      if (dotsEnd > dotsStart + 8) {
        f.page.drawLine({
          start: { x: dotsStart, y: baseline + 2 },
          end: { x: dotsEnd, y: baseline + 2 },
          thickness: 1.1,
          color: GOLD,
          dashArray: [1.2, 3],
        });
      }
      f.page.drawText(price, { x: priceX, y: baseline, font: display, size: priceSize, color: INK });
      f.y = baseline - 4;

      if (detailText && !oneLine) {
        const dLines = wrap(detailText, body, 9.5, colWidth - 8);
        for (const dl of dLines.slice(0, 2)) {
          f.page.drawText(dl, { x: f.x + 2, y: f.y - 9.5, font: body, size: 9.5, color: GRAY });
          f.y -= 12;
        }
      }
      for (const nl of noteLines.slice(0, 2)) {
        f.page.drawText(nl, { x: f.x + 2, y: f.y - 8, font: body, size: 8, color: GRAY });
        f.y -= 10;
      }
      f.y -= 5;
    }
    frames[fi].y -= 10;
  }

  // ── Footer on every page ──
  for (const p of pages) {
    p.drawLine({ start: { x: MARGIN, y: MARGIN + 34 }, end: { x: PAGE_W - MARGIN, y: MARGIN + 34 }, thickness: 0.7, color: INK });
    const foots = catalog.footnotes.map(safe).join('  ·  ');
    if (foots) {
      const lines = wrap(foots, body, 7.5, PAGE_W - MARGIN * 2);
      let fy = MARGIN + 24;
      for (const l of lines.slice(0, 2)) {
        p.drawText(l, { x: (PAGE_W - body.widthOfTextAtSize(l, 7.5)) / 2, y: fy, font: body, size: 7.5, color: GRAY });
        fy -= 9;
      }
    }
    const mark = 'SET BY HAND AT MUSTARD PRESS';
    const mw = trackedWidth(mark, bold, 6, 2.4);
    tracked(p, mark, (PAGE_W - mw) / 2, MARGIN + 2, bold, 6, 2.4, GOLD);
  }

  // ── Watermark ──
  if (opts.watermark) {
    for (const p of pages) {
      p.drawText('PROOF', {
        x: 96,
        y: 240,
        font: display,
        size: 110,
        color: rgb(0.722, 0.525, 0.043),
        opacity: 0.14,
        rotate: degrees(28),
      });
    }
  }

  return doc.save();
}
