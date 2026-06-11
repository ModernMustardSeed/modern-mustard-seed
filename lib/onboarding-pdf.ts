import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import {
  ONBOARDING_INTRO,
  MODULES,
  FIRST_WEEK,
  GLOSSARY,
  TOTAL_MINUTES,
} from '@/data/onboarding';

// Pop-art palette in 0..1 rgb (mirrors lib/launch-checklist-pdf.ts)
const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const CREAM = rgb(1, 0.953, 0.8);
const HAIR = rgb(0.9, 0.87, 0.8);
const LINK = rgb(0.16, 0.32, 0.62);

/**
 * Strip anything Helvetica StandardFonts cannot draw (WinAnsi / Latin1 only),
 * and remove em and en dashes per the house style. Keeps the middle dot (0xB7).
 */
function clean(input: string): string {
  return String(input ?? '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .split('')
    .filter((ch) => ch.charCodeAt(0) <= 255)
    .join('');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of clean(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

/** Build the branded, multi-page new-hire onboarding handbook PDF. */
export async function buildOnboardingPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 612;
  const H = 792;
  const M = 54;
  const contentW = W - 2 * M;
  const FOOT = 44; // reserved space at the bottom of every page

  let page!: PDFPage;
  let y = 0;
  let pageNo = 0;

  /** Draw text with extra spacing between glyphs (for mono-style eyebrows). */
  const drawSpaced = (
    text: string,
    x: number,
    yy: number,
    font: PDFFont,
    size: number,
    color: ReturnType<typeof rgb>,
    tracking: number,
  ) => {
    let cx = x;
    for (const ch of clean(text)) {
      page.drawText(ch, { x: cx, y: yy, size, font, color });
      cx += font.widthOfTextAtSize(ch, size) + tracking;
    }
  };

  const drawFooter = () => {
    const fy = M - 18;
    page.drawRectangle({ x: M, y: fy + 16, width: contentW, height: 1, color: HAIR });
    const foot = 'modernmustardseed.com  ·  New Hire Handbook  ·  Confidential';
    page.drawText(clean(foot), { x: M, y: fy, size: 8, font: reg, color: MUTED });
    const num = `${pageNo}`;
    const nw = bold.widthOfTextAtSize(num, 8);
    page.drawText(num, { x: W - M - nw, y: fy, size: 8, font: bold, color: MUTED });
  };

  const newPage = () => {
    if (page) drawFooter();
    page = doc.addPage([W, H]);
    pageNo += 1;
    y = H - M;
  };

  const ensure = (h: number) => {
    if (y - h < FOOT + 6) newPage();
  };

  const para = (
    text: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number; lh?: number } = {},
  ) => {
    const { size = 10, font = reg, color = BODY, gap = 4, indent = 0, lh = 1.4 } = opts;
    const lines = wrap(text, font, size, contentW - indent);
    for (const ln of lines) {
      ensure(size * lh);
      page.drawText(ln, { x: M + indent, y: y - size, size, font, color });
      y -= size * lh;
    }
    y -= gap;
  };

  // ───────────────────────── Cover header band ─────────────────────────
  newPage();
  const bandH = 196;
  const bandTop = H;
  const bandBottom = H - bandH;
  page.drawRectangle({ x: 0, y: bandBottom, width: W, height: bandH, color: CREAM });
  page.drawRectangle({ x: 0, y: bandBottom - 3, width: W, height: 3, color: INK });

  // Red mono-style eyebrow with letter spacing (never draw the module emoji)
  drawSpaced('MODERN MUSTARD SEED', M, bandTop - 50, bold, 10, RED, 3.2);

  // Big bold title
  page.drawText('New Hire Handbook', { x: M, y: bandTop - 102, size: 30, font: bold, color: INK });

  // Subtitle line
  page.drawText('Everything you need to get started', { x: M, y: bandTop - 132, size: 13, font: ital, color: BODY });

  // Read-time line
  page.drawText(clean(`About ${TOTAL_MINUTES} minutes to read`), {
    x: M,
    y: bandTop - 158,
    size: 10,
    font: reg,
    color: MUTED,
  });

  // ───────────────────────── Intro ─────────────────────────
  y = bandBottom - 30;
  if (clean(ONBOARDING_INTRO.title) !== clean('New Hire Handbook')) {
    page.drawText(clean(ONBOARDING_INTRO.title), { x: M, y: y - 18, size: 18, font: bold, color: INK });
    y -= 32;
  }
  para(ONBOARDING_INTRO.body, { size: 10.5, color: BODY, gap: 14 });

  // ───────────────────────── Modules ─────────────────────────
  const moduleHeader = (eyebrow: string, n: number, title: string, summary: string, minutes: number) => {
    ensure(64);
    y -= 8;
    drawSpaced(clean(eyebrow).toUpperCase(), M, y - 9, bold, 8.5, RED, 2.4);

    // Minutes tag on the eyebrow line, right aligned
    const tag = clean(`${minutes} min`);
    const tagW = reg.widthOfTextAtSize(tag, 8.5);
    page.drawText(tag, { x: W - M - tagW, y: y - 9, size: 8.5, font: reg, color: MUTED });
    y -= 24;

    ensure(34);
    page.drawText(clean(`${n}. ${title}`), { x: M, y: y - 16, size: 16, font: bold, color: INK });
    y -= 26;
    para(summary, { size: 9.5, font: ital, color: MUTED, gap: 8 });
    page.drawRectangle({ x: M, y: y + 2, width: contentW, height: 1, color: HAIR });
    y -= 10;
  };

  const blockIndent = 14;

  const drawBlock = (block: (typeof MODULES)[number]['blocks'][number]) => {
    if (block.heading) {
      ensure(13 * 1.4 + 4);
      page.drawText(clean(block.heading), { x: M, y: y - 11.5, size: 11.5, font: bold, color: INK });
      y -= 11.5 * 1.4 + 2;
    }
    if (block.body) {
      para(block.body, { size: 10, color: BODY, gap: 6 });
    }
    if (block.bullets && block.bullets.length) {
      for (const b of block.bullets) {
        const size = 10;
        const lh = 1.4;
        const lines = wrap(b, reg, size, contentW - blockIndent - 12);
        ensure(size * lh);
        // Mustard dot, vertically centered on the first line cap height
        page.drawCircle({ x: M + blockIndent + 2, y: y - size + 3, size: 2.2, color: YELLOW });
        lines.forEach((ln, i) => {
          ensure(size * lh);
          page.drawText(ln, { x: M + blockIndent + 12, y: y - size, size, font: reg, color: BODY });
          y -= size * lh;
        });
        y -= 2;
      }
      y -= 4;
    }
    if (block.links && block.links.length) {
      for (const lk of block.links) {
        const label = clean(`${lk.label}: ${lk.url}`);
        const size = 9;
        const lines = wrap(label, reg, size, contentW - blockIndent);
        lines.forEach((ln) => {
          ensure(size * 1.4);
          page.drawText(ln, { x: M + blockIndent, y: y - size, size, font: reg, color: LINK });
          y -= size * 1.4;
        });
        y -= 2;
      }
      y -= 4;
    }
  };

  MODULES.forEach((mod, idx) => {
    moduleHeader(mod.eyebrow, idx + 1, mod.title, mod.summary, mod.minutes);
    mod.blocks.forEach(drawBlock);
    y -= 6;
  });

  // ───────────────────────── Your first week ─────────────────────────
  const sectionHeader = (eyebrow: string, title: string) => {
    ensure(60);
    y -= 10;
    page.drawRectangle({ x: M, y: y - 1, width: contentW, height: 2, color: INK });
    y -= 18;
    drawSpaced(clean(eyebrow).toUpperCase(), M, y - 9, bold, 8.5, RED, 2.4);
    y -= 22;
    page.drawText(clean(title), { x: M, y: y - 18, size: 18, font: bold, color: INK });
    y -= 30;
  };

  sectionHeader('Get rolling', 'Your first week');
  for (const it of FIRST_WEEK) {
    const labelSize = 11;
    const boxIndent = 22;
    // Make sure the label plus one line of detail fit together.
    ensure(labelSize + 4 + 10 * 1.4);
    const boxY = y - labelSize - 1;
    page.drawRectangle({ x: M, y: boxY, width: 11, height: 11, borderColor: INK, borderWidth: 1.4 });
    page.drawText(clean(it.label), { x: M + boxIndent, y: y - labelSize, size: labelSize, font: bold, color: INK });
    y -= labelSize * 1.3 + 1;
    para(it.detail, { size: 9.5, color: MUTED, gap: 6, indent: boxIndent });
  }

  // ───────────────────────── Glossary ─────────────────────────
  sectionHeader('Plain English', 'Glossary');
  for (const g of GLOSSARY) {
    const termSize = 10.5;
    ensure(termSize * 1.3 + 9.5 * 1.4);
    page.drawText(clean(g.term), { x: M, y: y - termSize, size: termSize, font: bold, color: INK });
    y -= termSize * 1.3;
    para(g.def, { size: 9.5, color: BODY, gap: 7, indent: 12 });
  }

  // ───────────────────────── Closing ─────────────────────────
  ensure(40);
  y -= 6;
  page.drawRectangle({ x: M, y: y - 1, width: contentW, height: 1, color: HAIR });
  y -= 16;
  para('"If you have faith as small as a mustard seed, nothing will be impossible for you." Matthew 17:20', {
    size: 9,
    font: ital,
    color: MUTED,
    gap: 0,
  });

  drawFooter();
  return doc.save();
}
