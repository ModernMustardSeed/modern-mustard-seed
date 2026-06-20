import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { checklistForVertical, verticalById, type VerticalId, type ResolvedItem } from '@/data/launch-checklist';

// Pop-art palette in 0..1 rgb (mirrors lib/proposal-pdf.ts)
const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const CREAM = rgb(1, 0.953, 0.8);
const HAIR = rgb(0.9, 0.87, 0.8);

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

/** Width of a string drawn with extra letter spacing. */
function spacedWidth(text: string, font: PDFFont, size: number, tracking: number): number {
  const t = clean(text);
  if (!t) return 0;
  return font.widthOfTextAtSize(t, size) + tracking * Math.max(0, t.length - 1);
}

/** Build a branded, multi-page launch checklist PDF for one vertical. */
export async function buildLaunchChecklistPdf(verticalId: VerticalId): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 612;
  const H = 792;
  const M = 54;
  const contentW = W - 2 * M;
  const FOOT = 44; // reserved space at the bottom of every page

  const vertical = verticalById(verticalId);
  const phases = checklistForVertical(verticalId);

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
    const foot = 'modernmustardseed.com  ·  Apps, sites, and AI tools shipped in weeks, not months  ·  Book a free call';
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
  const bandH = 168;
  const bandTop = H;
  const bandBottom = H - bandH;
  page.drawRectangle({ x: 0, y: bandBottom, width: W, height: bandH, color: CREAM });
  page.drawRectangle({ x: 0, y: bandBottom - 3, width: W, height: 3, color: INK });

  // Red mono-style eyebrow with letter spacing
  drawSpaced('MODERN MUSTARD SEED', M, bandTop - 46, bold, 10, RED, 3.2);

  // Big bold title (two lines so it breathes)
  page.drawText('The New Business', { x: M, y: bandTop - 86, size: 27, font: bold, color: INK });
  page.drawText('Launch Checklist', { x: M, y: bandTop - 116, size: 27, font: bold, color: INK });

  // Subtitle: chosen vertical label (text only, never emoji)
  const subtitle = `Tailored for: ${clean(vertical.label)}`;
  page.drawText(subtitle, { x: M, y: bandTop - 144, size: 12, font: ital, color: BODY });

  // Begin body below the band
  y = bandBottom - 24;
  const intro =
    'Every step to open, legalize, and digitize a new business, in the order that actually works. ' +
    'Official links and tools live in the interactive version online. The Modern Mustard Seed mark shows what we can build for you.';
  para(intro, { size: 10.5, color: BODY, gap: 12 });

  // ───────────────────────── Phases and items ─────────────────────────
  const phaseHeader = (eyebrow: string, title: string, blurb: string) => {
    ensure(54);
    y -= 6;
    drawSpaced(clean(eyebrow).toUpperCase(), M, y - 9, bold, 8.5, RED, 2.4);
    y -= 22;
    ensure(34);
    page.drawText(clean(title), { x: M, y: y - 15, size: 16, font: bold, color: INK });
    y -= 24;
    para(blurb, { size: 9.5, color: MUTED, gap: 10 });
    page.drawRectangle({ x: M, y: y + 2, width: contentW, height: 1, color: HAIR });
    y -= 8;
  };

  const tagLabel = (it: ResolvedItem): string => {
    const parts = [it.time, it.cost].map((p) => (p ? clean(p) : '')).filter(Boolean);
    return parts.join('  ·  ');
  };

  const item = (it: ResolvedItem) => {
    const titleSize = 11.5;
    const boxIndent = 22;
    const tag = tagLabel(it);
    const tagSize = 8;
    const tagW = tag ? reg.widthOfTextAtSize(tag, tagSize) : 0;

    // Make sure the title line plus at least one line of "why" fits together.
    ensure(titleSize + 6 + 12);

    // Checkbox square, ink outline, top-aligned with the title cap height
    const boxY = y - titleSize - 1;
    page.drawRectangle({ x: M, y: boxY, width: 11, height: 11, borderColor: INK, borderWidth: 1.4 });

    // Title (wrapped, leaving room for the time/cost tag on the first line)
    const titleMax = contentW - boxIndent - (tag ? tagW + 14 : 0);
    const titleLines = wrap(it.title, bold, titleSize, titleMax);
    titleLines.forEach((ln, i) => {
      page.drawText(ln, { x: M + boxIndent, y: y - titleSize, size: titleSize, font: bold, color: INK });
      if (i === 0 && tag) {
        page.drawText(tag, { x: W - M - tagW, y: y - titleSize + 0.5, size: tagSize, font: reg, color: MUTED });
      }
      if (i < titleLines.length - 1) y -= titleSize * 1.28;
    });
    y -= titleSize * 1.28 + 2;

    // Why
    para(it.why, { size: 9.5, color: BODY, gap: 3, indent: boxIndent });

    // Vertical-specific tip
    if (it.note) {
      const tipLines = wrap(it.note, ital, 9, contentW - boxIndent - 26);
      ensure(9 * 1.4 * tipLines.length + 2);
      page.drawText('Tip:', { x: M + boxIndent, y: y - 9, size: 9, font: bold, color: RED });
      tipLines.forEach((ln, i) => {
        page.drawText(ln, { x: M + boxIndent + 26, y: y - 9, size: 9, font: ital, color: MUTED });
        if (i < tipLines.length - 1) y -= 9 * 1.4;
      });
      y -= 9 * 1.4 + 2;
    }

    // Modern Mustard Seed upsell pill
    if (it.mms) {
      const pillLabel = clean(it.mms.label);
      const pillSize = 8.5;
      ensure(18);
      const pad = 8;
      const txtW = bold.widthOfTextAtSize(pillLabel, pillSize);
      const pillW = txtW + pad * 2;
      const pillH = 15;
      const py = y - pillH;
      page.drawRectangle({ x: M + boxIndent, y: py, width: pillW, height: pillH, color: YELLOW });
      page.drawText(pillLabel, { x: M + boxIndent + pad, y: py + 4, size: pillSize, font: bold, color: INK });
      y -= pillH + 4;
    }

    y -= 8; // breathing room between items
  };

  phases.forEach((phase) => {
    phaseHeader(phase.eyebrow, phase.title, phase.blurb);
    phase.items.forEach(item);
  });

  // ───────────────────────── Closing block ─────────────────────────
  ensure(56);
  y -= 6;
  page.drawRectangle({ x: M, y: y - 1, width: contentW, height: 2, color: INK });
  y -= 16;
  page.drawText('Want this done for you in weeks, not months?', { x: M, y: y - 13, size: 13, font: bold, color: INK });
  y -= 26;
  para(
    'Modern Mustard Seed builds the website, the AI agents, the CRM, and the automations that run a new business, ' +
      'so you can skip the busywork and open with a system that sells. Book a free call at modernmustardseed.com.',
    { size: 10, color: BODY, gap: 6 },
  );
  para('"If you have faith as small as a mustard seed, nothing will be impossible for you." Matthew 17:20', {
    size: 9,
    font: ital,
    color: MUTED,
    gap: 0,
  });

  drawFooter();
  return doc.save();
}
