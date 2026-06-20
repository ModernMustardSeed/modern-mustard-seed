import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import {
  TRAINING_INTRO,
  DAILY_GUIDE,
  MINDSET,
  SALES_ARC,
  CHANNELS,
  VOICE_DEMO_PLAY,
  WHAT_WE_SELL,
  OBJECTIONS,
  ACTIVITY,
  PRACTICE,
  personalize,
} from '@/data/sales-training';

// Pop-art palette (mirrors lib/onboarding-pdf.ts)
const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const GREEN = rgb(0.176, 0.416, 0.31);
const CREAM = rgb(1, 0.953, 0.8);
const HAIR = rgb(0.9, 0.87, 0.8);

function clean(input: string): string {
  return String(input ?? '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[●★✓✕↑↓←→]/g, '')
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

/** Branded, personalized Sales Training PDF. */
export async function buildSalesTrainingPdf(opts: { bookUrl: string }): Promise<Uint8Array> {
  const px = (t: string) => personalize(t, opts.bookUrl);
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 612;
  const H = 792;
  const M = 54;
  const contentW = W - 2 * M;
  const FOOT = 44;

  let page!: PDFPage;
  let y = 0;
  let pageNo = 0;

  const drawSpaced = (text: string, x: number, yy: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, tracking: number) => {
    let cx = x;
    for (const ch of clean(text)) {
      page.drawText(ch, { x: cx, y: yy, size, font, color });
      cx += font.widthOfTextAtSize(ch, size) + tracking;
    }
  };

  const drawFooter = () => {
    const fy = M - 18;
    page.drawRectangle({ x: M, y: fy + 16, width: contentW, height: 1, color: HAIR });
    page.drawText(clean('modernmustardseed.com  ·  Sales Training  ·  Confidential'), { x: M, y: fy, size: 8, font: reg, color: MUTED });
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
  const para = (text: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number; lh?: number } = {}) => {
    const { size = 10, font = reg, color = BODY, gap = 4, indent = 0, lh = 1.4 } = o;
    for (const ln of wrap(text, font, size, contentW - indent)) {
      ensure(size * lh);
      page.drawText(ln, { x: M + indent, y: y - size, size, font, color });
      y -= size * lh;
    }
    y -= gap;
  };
  const bullets = (items: string[], dot = YELLOW) => {
    const size = 10;
    const lh = 1.4;
    for (const b of items) {
      const lines = wrap(px(b), reg, size, contentW - 26);
      ensure(size * lh);
      page.drawCircle({ x: M + 16, y: y - size + 3, size: 2.2, color: dot });
      lines.forEach((ln) => {
        ensure(size * lh);
        page.drawText(ln, { x: M + 26, y: y - size, size, font: reg, color: BODY });
        y -= size * lh;
      });
      y -= 2;
    }
    y -= 4;
  };
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
  const subHead = (t: string) => {
    ensure(20);
    y -= 2;
    page.drawText(clean(t), { x: M, y: y - 12, size: 12, font: bold, color: INK });
    y -= 21;
  };
  const scriptCard = (label: string | null, text: string) => {
    const size = 10;
    const lines = wrap(`"${px(text)}"`, ital, size, contentW - 24);
    const labelH = label ? 13 : 0;
    const boxH = lines.length * size * 1.45 + labelH + 16;
    ensure(boxH + 6);
    const top = y;
    page.drawRectangle({ x: M, y: top - boxH, width: contentW, height: boxH, borderColor: INK, borderWidth: 1.2 });
    let ty = top - 12;
    if (label) {
      drawSpaced(clean(label).toUpperCase(), M + 12, ty - 8, bold, 7.5, RED, 1.6);
      ty -= labelH + 2;
    }
    for (const ln of lines) {
      page.drawText(ln, { x: M + 12, y: ty - size, size, font: ital, color: INK });
      ty -= size * 1.45;
    }
    y = top - boxH - 8;
  };

  // Cover
  newPage();
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: INK });
  drawSpaced('MODERN MUSTARD SEED', M, H - 80, bold, 10, YELLOW, 3.2);
  page.drawText('Sales Training', { x: M, y: H - 350, size: 44, font: bold, color: CREAM });
  for (const [i, ln] of wrap(TRAINING_INTRO.lede, reg, 13, 380).entries()) {
    page.drawText(ln, { x: M, y: H - 392 - i * 19, size: 13, font: reg, color: rgb(0.8, 0.78, 0.72) });
  }
  page.drawText(clean('How to sell, even if you have never done it.'), { x: M, y: 140, size: 11, font: bold, color: YELLOW });
  page.drawText('CALLS  /  POSTS  /  WALK-INS  /  THE LIVE VOICE AGENT DEMO', { x: M, y: 60, size: 8, font: bold, color: YELLOW });

  // Intro
  newPage();
  drawSpaced(TRAINING_INTRO.eyebrow.toUpperCase(), M, y - 9, bold, 8.5, RED, 2.4);
  y -= 24;
  page.drawText(clean(TRAINING_INTRO.title), { x: M, y: y - 22, size: 22, font: bold, color: INK });
  y -= 38;
  para(TRAINING_INTRO.body, { size: 10.5, gap: 10 });

  // Daily plan
  sectionHeader('Start here', DAILY_GUIDE.title);
  para(DAILY_GUIDE.intro, { size: 10, gap: 8 });
  for (const b of DAILY_GUIDE.blocks) {
    ensure(22);
    page.drawText(clean(b.time), { x: M, y: y - 10.5, size: 10, font: bold, color: GREEN });
    page.drawText(clean(b.title), { x: M + 60, y: y - 10.5, size: 10.5, font: bold, color: INK });
    y -= 15;
    para(b.detail, { size: 9.5, gap: 7, indent: 60 });
  }
  para(`North star: ${DAILY_GUIDE.northStar}`, { size: 9.5, font: ital, color: MUTED, gap: 4 });
  para(`Your booking link: ${opts.bookUrl}`, { size: 9, font: bold, color: GREEN, gap: 8 });

  // Mindset
  sectionHeader('Before anything else', MINDSET.title);
  for (const p of MINDSET.points) {
    subHead(p.h);
    para(p.b, { size: 9.5, gap: 8 });
  }

  // Sales arc
  sectionHeader('The fundamentals', SALES_ARC.title);
  para(SALES_ARC.intro, { size: 10, gap: 8 });
  for (const s of SALES_ARC.steps) {
    ensure(20);
    page.drawText(clean(`${s.n}. ${s.label}`), { x: M, y: y - 11, size: 11, font: bold, color: INK });
    y -= 16;
    para(s.say, { size: 9.5, gap: 7, indent: 16 });
  }

  // Channels
  sectionHeader('The three ways you sell', 'Calls, posts, and walk-ins');
  for (const c of CHANNELS) {
    subHead(c.name);
    para(c.tagline, { size: 9, font: ital, color: MUTED, gap: 3 });
    para(c.tool, { size: 9.5, color: GREEN, gap: 5 });
    bullets(c.steps);
  }

  // Voice demo play
  sectionHeader('Your secret weapon', VOICE_DEMO_PLAY.title);
  para(VOICE_DEMO_PLAY.intro, { size: 10, gap: 4 });
  para('Have modernmustardseed.com/voice-agents open on your phone before you walk in.', { size: 9.5, font: bold, color: GREEN, gap: 8 });
  for (const [i, s] of VOICE_DEMO_PLAY.steps.entries()) {
    scriptCard(`${i + 1}. ${s.label}`, s.script);
  }
  subHead('Tips');
  bullets(VOICE_DEMO_PLAY.tips, GREEN);

  // What we sell
  sectionHeader('In plain words', 'How to talk about what we sell');
  for (const w of WHAT_WE_SELL) {
    subHead(w.name);
    para(`What it is: ${w.isWhat}`, { size: 9.5, gap: 3, indent: 8 });
    para(`What it does: ${w.doesWhat}`, { size: 9.5, gap: 3, indent: 8 });
    para(`Bring it up: ${w.bringUp}`, { size: 9.5, gap: 8, indent: 8 });
  }

  // Objections
  sectionHeader('When they push back', 'What to say to the common ones');
  for (const o of OBJECTIONS) {
    ensure(20);
    page.drawText(clean(o.q), { x: M, y: y - 10.5, size: 10.5, font: bold, color: INK });
    y -= 15;
    scriptCard(null, o.a);
  }

  // Activity + practice
  sectionHeader('Make it a habit', ACTIVITY.title);
  para(ACTIVITY.intro, { size: 10, gap: 6 });
  bullets(ACTIVITY.targets);
  para(ACTIVITY.note, { size: 9.5, font: ital, color: MUTED, gap: 10 });
  subHead(PRACTICE.title);
  bullets(PRACTICE.points, GREEN);

  drawFooter();
  return doc.save();
}
