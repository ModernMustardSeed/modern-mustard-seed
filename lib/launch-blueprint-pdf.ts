/**
 * The branded MUSTARD LAUNCH Blueprint PDF. Renders a founder's personalized
 * launch plan (from lib/mustard-launch generateBlueprint) as a pop-art one-pager
 * they keep and work through. pdf-lib + Helvetica, same layout discipline as the
 * launch-checklist PDF: a manual cursor engine and a clean() that strips any
 * char Helvetica cannot draw (and converts em/en dashes to hyphens, house rule).
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { LAUNCH_PHASES } from '@/data/mustard-launch';
import type { Blueprint } from './mustard-launch';

const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const YELLOW = rgb(0.961, 0.718, 0);
const CREAM = rgb(0.984, 0.965, 0.918);
const MUTED = rgb(0.34, 0.32, 0.29);

const W = 612;
const H = 792;
const M = 54; // margin

function clean(s: string): string {
  return (s || '')
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xff]/g, '')
    .trim();
}

export async function buildLaunchBlueprintPdf(bp: Blueprint): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([W, H]);
  let y = H;

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = clean(text).split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const ensure = (h: number) => {
    if (y - h < M) newPage();
  };
  const text = (s: string, f: PDFFont, size: number, color = INK, maxW = W - M * 2, lh = 1.32) => {
    for (const ln of wrap(s, f, size, maxW)) {
      ensure(size * lh);
      page.drawText(ln, { x: M, y: y - size, size, font: f, color });
      y -= size * lh;
    }
  };

  // ── Cover band ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 210, width: W, height: 210, color: rgb(0.031, 0.047, 0.086) });
  // halftone dots
  for (let gx = 14; gx < W; gx += 22) {
    for (let gy = H - 200; gy < H - 8; gy += 22) {
      page.drawCircle({ x: gx, y: gy, size: 1.4, color: rgb(0.961, 0.718, 0), opacity: 0.16 });
    }
  }
  page.drawText('[ CLEARED FOR IGNITION ]', { x: M, y: H - 48, size: 10, font: bold, color: YELLOW });
  page.drawText('MUSTARD LAUNCH', { x: M, y: H - 88, size: 30, font: bold, color: CREAM });
  page.drawText('YOUR BLUEPRINT', { x: M, y: H - 116, size: 13, font: font, color: rgb(0.8, 0.78, 0.72) });

  y = H - 150;
  page.drawText(clean(bp.businessName).slice(0, 46), { x: M, y, size: 18, font: bold, color: YELLOW });
  y = H - 172;
  page.drawText(clean(bp.category).toUpperCase().slice(0, 60), { x: M, y, size: 9, font: bold, color: rgb(0.78, 0.76, 0.7) });
  y = H - 240;

  if (bp.oneLiner) {
    text(bp.oneLiner, bold, 13, INK);
    y -= 6;
  }

  // Signature move callout
  if (bp.signatureMove) {
    const moveLines = wrap(bp.signatureMove, font, 10.5, W - M * 2 - 28);
    const boxH = 28 + moveLines.length * 14;
    ensure(boxH + 14);
    page.drawRectangle({ x: M, y: y - boxH, width: W - M * 2, height: boxH, color: rgb(0.984, 0.965, 0.918), borderColor: INK, borderWidth: 2 });
    page.drawText('YOUR SIGNATURE FIRST MOVE', { x: M + 12, y: y - 18, size: 8, font: bold, color: RED });
    let my = y - 34;
    for (const ln of moveLines) {
      page.drawText(ln, { x: M + 12, y: my, size: 10.5, font, color: INK });
      my -= 14;
    }
    y -= boxH + 20;
  }

  // ── Phases ─────────────────────────────────────────────────────────────
  for (const phase of LAUNCH_PHASES) {
    const bpPhase = bp.phases.find((p) => p.phaseId === phase.id);
    if (!bpPhase || bpPhase.missions.length === 0) continue;

    ensure(58);
    // phase header row
    page.drawRectangle({ x: M, y: y - 26, width: 52, height: 22, color: INK });
    page.drawText(phase.code, { x: M + 8, y: y - 20, size: 10, font: bold, color: YELLOW });
    page.drawText(clean(phase.system), { x: M + 64, y: y - 14, size: 9, font: bold, color: RED });
    page.drawText(clean(phase.title), { x: M + 64, y: y - 27, size: 12.5, font: bold, color: INK });
    y -= 44;

    for (const m of bpPhase.missions) {
      ensure(30);
      // checkbox
      page.drawRectangle({ x: M, y: y - 12, width: 11, height: 11, borderColor: INK, borderWidth: 1.5 });
      const titleLines = wrap(m.title, bold, 11, W - M * 2 - 22);
      let ty = y;
      for (const ln of titleLines) {
        page.drawText(ln, { x: M + 22, y: ty - 10, size: 11, font: bold, color: INK });
        ty -= 14;
      }
      y = ty - 2;
      if (m.detail) {
        for (const ln of wrap(m.detail, font, 9.5, W - M * 2 - 22)) {
          ensure(13);
          page.drawText(ln, { x: M + 22, y: y - 9, size: 9.5, font, color: MUTED });
          y -= 13;
        }
      }
      y -= 8;
    }
    y -= 8;
  }

  // ── Close ──────────────────────────────────────────────────────────────
  ensure(70);
  y -= 6;
  page.drawRectangle({ x: M, y: y - 54, width: W - M * 2, height: 54, color: rgb(0.961, 0.718, 0), borderColor: INK, borderWidth: 2 });
  page.drawText('Ready to build the whole thing?', { x: M + 14, y: y - 22, size: 12, font: bold, color: INK });
  page.drawText('Get the Launch Kit or open the Launch Room at modernmustardseed.com/mustard-launch', {
    x: M + 14, y: y - 40, size: 9.5, font, color: INK,
  });
  y -= 74;

  // footer verse (mustard seed, house close)
  const verse = 'If you have faith as small as a mustard seed, nothing will be impossible for you. Matthew 17:20';
  for (const ln of wrap(verse, font, 8.5, W - M * 2)) {
    ensure(12);
    page.drawText(ln, { x: M, y: y - 8, size: 8.5, font, color: MUTED });
    y -= 12;
  }

  return doc.save();
}
