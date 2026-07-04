import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { playbookForNiche, nicheById, PROMPT_FORMULA, totalPrompts, type NicheId, type ResolvedPrompt } from '@/data/prompt-playbook';

// Pop-art palette in 0..1 rgb (mirrors lib/launch-checklist-pdf.ts)
const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const CREAM = rgb(1, 0.953, 0.8);
const PROMPTBG = rgb(1, 0.992, 0.965);
const HAIR = rgb(0.9, 0.87, 0.8);

/**
 * Strip anything Helvetica/Courier StandardFonts cannot draw (WinAnsi / Latin1),
 * and remove em and en dashes per the house style.
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
    if (words.length === 0) {
      out.push('');
      continue;
    }
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

/** Build a branded, multi-page AI Prompt Playbook PDF for one niche. */
export async function buildPromptPlaybookPdf(nicheId: NicheId): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
  const mono = await doc.embedFont(StandardFonts.Courier);

  const W = 612;
  const H = 792;
  const M = 54;
  const contentW = W - 2 * M;
  const FOOT = 44;

  const niche = nicheById(nicheId);
  const categories = playbookForNiche(nicheId);
  const total = totalPrompts();

  let page!: PDFPage;
  let y = 0;
  let pageNo = 0;

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
    const foot = 'modernmustardseed.com  ·  AI agents, sites, and automations shipped in weeks, not months  ·  Book a free call';
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

  drawSpaced('MODERN MUSTARD SEED', M, bandTop - 46, bold, 10, RED, 3.2);
  page.drawText('The AI Prompt', { x: M, y: bandTop - 86, size: 27, font: bold, color: INK });
  page.drawText('Playbook', { x: M, y: bandTop - 116, size: 27, font: bold, color: INK });
  const subtitle = `Tailored for: ${clean(niche.label)}`;
  page.drawText(subtitle, { x: M, y: bandTop - 144, size: 12, font: ital, color: BODY });

  // Body below the band
  y = bandBottom - 24;
  para(
    `${total} ready-to-paste prompts for anyone who wants to use AI but never has. Open a free AI tool, paste a prompt, ` +
      'and it writes the email, the posts, or the proposal for you. Every prompt below is already customized to your work.',
    { size: 10.5, color: BODY, gap: 14 },
  );

  // ───────────────────────── Primer: how to start ─────────────────────────
  const sectionHeader = (eyebrow: string, title: string, blurb?: string) => {
    ensure(54);
    y -= 6;
    drawSpaced(clean(eyebrow).toUpperCase(), M, y - 9, bold, 8.5, RED, 2.4);
    y -= 22;
    ensure(24);
    page.drawText(clean(title), { x: M, y: y - 15, size: 16, font: bold, color: INK });
    y -= 24;
    if (blurb) para(blurb, { size: 9.5, color: MUTED, gap: 8 });
    page.drawRectangle({ x: M, y: y + 2, width: contentW, height: 1, color: HAIR });
    y -= 10;
  };

  sectionHeader('Start here', 'Never used AI? It is just a chat box, and it is free.');
  para('Open claude.ai or chatgpt.com. Both have a free version with no credit card. Paste a prompt, press enter, read what comes back. You cannot break it. If an answer is not right, just tell it: "make it shorter," "more casual," "try again."', {
    size: 10,
    color: BODY,
    gap: 10,
  });

  // The 4-part formula
  ensure(20);
  drawSpaced('EVERY GREAT PROMPT HAS 4 PARTS', M, y - 9, bold, 8.5, INK, 1.8);
  y -= 20;
  PROMPT_FORMULA.forEach((f) => {
    ensure(14);
    const label = `${clean(f.part)}: `;
    page.drawText(label, { x: M, y: y - 10, size: 9.5, font: bold, color: INK });
    const lw = bold.widthOfTextAtSize(label, 9.5);
    page.drawText(clean(`${f.tell} ${f.example}`), { x: M + lw, y: y - 10, size: 9.5, font: reg, color: BODY });
    y -= 16;
  });
  y -= 8;

  // ───────────────────────── Prompt categories ─────────────────────────
  const promptBlock = (p: ResolvedPrompt) => {
    // Title + what
    ensure(30);
    page.drawText(clean(p.title), { x: M, y: y - 12, size: 12, font: bold, color: INK });
    y -= 18;
    para(p.what, { size: 9, font: ital, color: MUTED, gap: 6 });

    // The prompt, in a tinted mono box
    const promptSize = 8.5;
    const padX = 12;
    const padY = 10;
    const boxW = contentW;
    const lines = wrap(p.text, mono, promptSize, boxW - padX * 2);
    const lineH = promptSize * 1.5;
    const boxH = lines.length * lineH + padY * 2;

    // If the whole box will not fit, start a fresh page so it stays intact.
    if (y - boxH < FOOT + 6) newPage();

    const boxTop = y;
    const boxBottom = y - boxH;
    page.drawRectangle({ x: M, y: boxBottom, width: boxW, height: boxH, color: PROMPTBG, borderColor: HAIR, borderWidth: 1 });
    page.drawRectangle({ x: M, y: boxBottom, width: 3, height: boxH, color: YELLOW });
    let ly = boxTop - padY - promptSize;
    for (const ln of lines) {
      page.drawText(ln, { x: M + padX, y: ly, size: promptSize, font: mono, color: INK });
      ly -= lineH;
    }
    y = boxBottom - 8;

    // Tip
    if (p.tip) {
      const tipLines = wrap(p.tip, ital, 8.5, contentW - 26);
      ensure(8.5 * 1.4 * tipLines.length + 2);
      page.drawText('Tip:', { x: M, y: y - 9, size: 8.5, font: bold, color: RED });
      tipLines.forEach((ln, i) => {
        page.drawText(ln, { x: M + 26, y: y - 9, size: 8.5, font: ital, color: MUTED });
        if (i < tipLines.length - 1) y -= 8.5 * 1.4;
      });
      y -= 8.5 * 1.4 + 2;
    }
    y -= 12;
  };

  categories.forEach((cat) => {
    sectionHeader(cat.eyebrow, cat.title, cat.blurb);
    cat.prompts.forEach(promptBlock);
  });

  // ───────────────────────── Closing block ─────────────────────────
  ensure(56);
  y -= 6;
  page.drawRectangle({ x: M, y: y - 1, width: contentW, height: 2, color: INK });
  y -= 16;
  page.drawText('Want AI that works while you sleep?', { x: M, y: y - 13, size: 13, font: bold, color: INK });
  y -= 26;
  para(
    'Prompts are step one. Modern Mustard Seed builds the AI voice and chat agents, the automations, and the systems ' +
      'that answer, book, and follow up for your business around the clock, shipped in weeks, not months. Book a free call at modernmustardseed.com.',
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
