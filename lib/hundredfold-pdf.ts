/**
 * PDF deliverables for HUNDREDFOLD members: lead magnets, guides, checklists.
 *
 * Sarah, 2026-08-07: "do they have a chip that builds and deploys tools and
 * pdfs and other things for them?" This is the PDF half.
 *
 * The document is authored by the model as STRUCTURE (a typed outline), never
 * as a blob of prose we then try to lay out. That split is the whole reason
 * this produces something an owner would put their name on: the model decides
 * what the guide says, this file decides what it looks like, and neither gets
 * to ruin the other. Same division of labour as lib/press-pdf.ts, which is the
 * working reference for the type embedding below.
 *
 * ⚠️ The document is the MEMBER'S, not ours. Their business name is on the
 * cover and there is no Modern Mustard Seed branding anywhere in it. A lead
 * magnet with our logo on it is useless to the person handing it out.
 */

import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PLAYFAIR_700_B64, DMSANS_400_B64, DMSANS_700_B64 } from './proposal-fonts';

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.086, 0.086, 0.086);
const BODY = rgb(0.23, 0.22, 0.2);
const MUTED = rgb(0.54, 0.51, 0.47);
const RULE = rgb(0.9, 0.87, 0.8);

/** The member's accent, parsed from a hex string with a safe default. */
function accentOf(hex?: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return rgb(0.76, 0.15, 0.1);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * WinAnsi safety. The embedded subsets cannot draw a curly quote or an em dash,
 * and pdf-lib throws rather than dropping the glyph, so a single smart quote
 * from the model would fail the whole build. Normalising here is also how the
 * no-em-dash rule gets enforced mechanically instead of hopefully.
 */
function safe(s: string): string {
  return String(s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, ', ')
    .replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
    .replace(/[^\x20-\x7E -ÿ]/g, '')
    .trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of safe(text).split(/\n+/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const probe = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(probe, size) <= maxWidth) line = probe;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* The document shape the model fills in                                       */
/* -------------------------------------------------------------------------- */

export type PdfBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'checklist'; items: string[] }
  | { type: 'callout'; title?: string; text: string }
  | { type: 'steps'; items: { title: string; text: string }[] };

export type PdfDoc = {
  title: string;
  subtitle?: string;
  /** The member's business. Their name on their document, never ours. */
  business: string;
  /** How the reader is meant to use it, one line, on the cover. */
  promise?: string;
  accentHex?: string;
  blocks: PdfBlock[];
  /** The one thing the reader should do next, and how to reach them. */
  cta?: { text: string; contact?: string };
};

/* -------------------------------------------------------------------------- */
/* The renderer                                                                */
/* -------------------------------------------------------------------------- */

export async function buildMemberPdf(doc: PdfDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const display = await pdf.embedFont(Buffer.from(PLAYFAIR_700_B64, 'base64'), { subset: true });
  const sans = await pdf.embedFont(Buffer.from(DMSANS_400_B64, 'base64'), { subset: true });
  const sansBold = await pdf.embedFont(Buffer.from(DMSANS_700_B64, 'base64'), { subset: true });
  const accent = accentOf(doc.accentHex);

  pdf.setTitle(safe(doc.title));
  pdf.setAuthor(safe(doc.business));
  pdf.setCreator(safe(doc.business));

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  /** Break to a new page when the next element would not fit whole. */
  const room = (needed: number) => {
    if (y - needed >= MARGIN + 28) return;
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const text = (s: string, font: PDFFont, size: number, color = BODY, lead = 1.5, x = MARGIN, width = CONTENT_W) => {
    for (const line of wrap(s, font, size, width)) {
      room(size * lead);
      page.drawText(line, { x, y: y - size, font, size, color });
      y -= size * lead;
    }
  };

  /* Cover ---------------------------------------------------------------- */
  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: accent });
  y -= 34;

  const eyebrow = safe(doc.business).toUpperCase();
  page.drawText(eyebrow.slice(0, 60), { x: MARGIN, y: y - 9, font: sansBold, size: 9, color: accent });
  y -= 40;

  for (const line of wrap(doc.title, display, 30, CONTENT_W)) {
    room(42);
    page.drawText(line, { x: MARGIN, y: y - 30, font: display, size: 30, color: INK });
    y -= 40;
  }

  if (doc.subtitle) {
    y -= 6;
    text(doc.subtitle, sans, 13, MUTED, 1.55);
  }
  if (doc.promise) {
    y -= 14;
    page.drawRectangle({ x: MARGIN, y: y - 4, width: 46, height: 2, color: accent });
    y -= 22;
    text(doc.promise, sans, 12, BODY, 1.6);
  }

  y -= 24;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: RULE });
  y -= 30;

  /* Body ----------------------------------------------------------------- */
  for (const block of doc.blocks) {
    if (block.type === 'heading') {
      room(46);
      y -= 12;
      for (const line of wrap(block.text, display, 17, CONTENT_W)) {
        room(26);
        page.drawText(line, { x: MARGIN, y: y - 17, font: display, size: 17, color: INK });
        y -= 25;
      }
      page.drawRectangle({ x: MARGIN, y: y + 4, width: 30, height: 2, color: accent });
      y -= 16;
      continue;
    }

    if (block.type === 'paragraph') {
      text(block.text, sans, 11, BODY, 1.62);
      y -= 10;
      continue;
    }

    if (block.type === 'bullets' || block.type === 'checklist') {
      const box = block.type === 'checklist';
      for (const item of block.items) {
        const lines = wrap(item, sans, 11, CONTENT_W - 24);
        room(lines.length * 17 + 6);
        if (box) {
          page.drawRectangle({
            x: MARGIN + 1,
            y: y - 11,
            width: 10,
            height: 10,
            borderColor: accent,
            borderWidth: 1.1,
          });
        } else {
          page.drawCircle({ x: MARGIN + 5, y: y - 6, size: 2.2, color: accent });
        }
        lines.forEach((line, i) => {
          page.drawText(line, { x: MARGIN + 22, y: y - 11 + (i === 0 ? 0 : 0), font: sans, size: 11, color: BODY });
          if (i < lines.length - 1) y -= 17;
        });
        y -= 21;
      }
      y -= 8;
      continue;
    }

    if (block.type === 'steps') {
      block.items.forEach((step, i) => {
        const titleLines = wrap(step.title, sansBold, 12, CONTENT_W - 34);
        const bodyLines = wrap(step.text, sans, 11, CONTENT_W - 34);
        room(titleLines.length * 18 + bodyLines.length * 17 + 20);
        page.drawText(String(i + 1).padStart(2, '0'), {
          x: MARGIN,
          y: y - 12,
          font: sansBold,
          size: 12,
          color: accent,
        });
        titleLines.forEach((line) => {
          page.drawText(line, { x: MARGIN + 32, y: y - 12, font: sansBold, size: 12, color: INK });
          y -= 18;
        });
        bodyLines.forEach((line) => {
          page.drawText(line, { x: MARGIN + 32, y: y - 11, font: sans, size: 11, color: BODY });
          y -= 17;
        });
        y -= 12;
      });
      continue;
    }

    // callout
    const lines = wrap(block.text, sans, 11, CONTENT_W - 34);
    const titleH = block.title ? 20 : 0;
    const h = lines.length * 17 + titleH + 26;
    room(h + 10);
    page.drawRectangle({ x: MARGIN, y: y - h + 8, width: CONTENT_W, height: h, color: rgb(1, 0.99, 0.96) });
    page.drawRectangle({ x: MARGIN, y: y - h + 8, width: 3, height: h, color: accent });
    y -= 16;
    if (block.title) {
      page.drawText(safe(block.title), { x: MARGIN + 18, y: y - 11, font: sansBold, size: 11, color: INK });
      y -= 20;
    }
    lines.forEach((line) => {
      page.drawText(line, { x: MARGIN + 18, y: y - 11, font: sans, size: 11, color: BODY });
      y -= 17;
    });
    y -= 22;
  }

  /* Close ---------------------------------------------------------------- */
  if (doc.cta) {
    room(90);
    y -= 12;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: RULE });
    y -= 26;
    text(doc.cta.text, sansBold, 12, INK, 1.55);
    if (doc.cta.contact) {
      y -= 4;
      text(doc.cta.contact, sans, 11, accent, 1.5);
    }
  }

  /* Page furniture ------------------------------------------------------- */
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const label = safe(doc.business);
    p.drawText(label.slice(0, 48), { x: MARGIN, y: 30, font: sans, size: 8, color: MUTED });
    const n = `${i + 1}`;
    p.drawText(n, {
      x: PAGE_W - MARGIN - sans.widthOfTextAtSize(n, 8),
      y: 30,
      font: sans,
      size: 8,
      color: MUTED,
    });
  });

  return pdf.save();
}
