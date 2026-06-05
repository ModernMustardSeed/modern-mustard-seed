import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { byId, isRecurring, isHourly, formatMoney as money, TERMS, type Service } from '@/data/proposal-menu';

type Line = { id: string; price: number; qty: number; scope?: string[]; framing?: string };
export type ProposalRecord = {
  client_name?: string | null;
  client_company?: string | null;
  client_email?: string | null;
  site_url?: string | null;
  situation?: string | null;
  prose?: { intro?: string; situation?: string; recommendation?: string; close?: string } | null;
  lines?: Line[] | null;
  one_time_total?: number | null;
  monthly_total?: number | null;
  deposit_amount?: number | null;
  signed_name?: string | null;
  signed_at?: string | null;
};

// Pop-art palette in 0..1 rgb
const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const CREAM = rgb(1, 0.953, 0.8);

function linePriceLabel(s: Service, l: Line): string {
  if (s.unit === 'free') return 'Included';
  if (isHourly(s.unit)) return `${money(l.price)}/hr x ${l.qty} = ${money(l.price * l.qty)}`;
  if (isRecurring(s.unit)) return `${money(l.price)}/mo`;
  const base = money(l.price * (l.qty || 1));
  return s.unit === 'fixed_from' ? `from ${base}` : base;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of String(text).split('\n')) {
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

/** Render a branded PDF of a (signed) proposal. Returns the PDF bytes. */
export async function renderProposalPdf(p: ProposalRecord): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 612;
  const H = 792;
  const M = 54;
  const contentW = W - 2 * M;

  let page!: PDFPage;
  let y = 0;

  const newPage = (withHeader = false) => {
    page = doc.addPage([W, H]);
    y = H - M;
    if (withHeader) {
      // Mustard header band with black rule
      page.drawRectangle({ x: 0, y: H - 78, width: W, height: 78, color: YELLOW });
      page.drawRectangle({ x: 0, y: H - 81, width: W, height: 3, color: INK });
      const brand = 'MODERN MUSTARD SEED';
      const bw = bold.widthOfTextAtSize(brand, 11);
      page.drawText(brand, { x: (W - bw) / 2, y: H - 38, size: 11, font: bold, color: INK });
      const sub = 'Proposal';
      const sw = ital.widthOfTextAtSize(sub, 14);
      page.drawText(sub, { x: (W - sw) / 2, y: H - 60, size: 14, font: ital, color: INK });
      y = H - 78 - 30;
    }
  };

  const ensure = (h: number) => {
    if (y - h < M + 30) newPage(false);
  };

  const para = (
    text: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number; lh?: number } = {}
  ) => {
    const { size = 10.5, font = reg, color = BODY, gap = 6, indent = 0, lh = 1.42 } = opts;
    const lines = wrap(text, font, size, contentW - indent);
    for (const ln of lines) {
      ensure(size * lh);
      page.drawText(ln, { x: M + indent, y: y - size, size, font, color });
      y -= size * lh;
    }
    y -= gap;
  };

  const heading = (text: string) => {
    y -= 8;
    ensure(14);
    page.drawText(text.toUpperCase(), { x: M, y: y - 9, size: 9, font: bold, color: RED });
    y -= 9 + 9;
  };

  const bullet = (text: string) => {
    const size = 10;
    const lines = wrap(text, reg, size, contentW - 16);
    ensure(size * 1.4 * lines.length);
    page.drawText('•', { x: M, y: y - size, size, font: bold, color: YELLOW });
    lines.forEach((ln, i) => {
      page.drawText(ln, { x: M + 14, y: y - size, size, font: reg, color: BODY });
      if (i < lines.length - 1) y -= size * 1.4;
    });
    y -= size * 1.4 + 2;
  };

  newPage(true);

  // Prepared for
  const preparedFor = [p.client_name, p.client_company].filter(Boolean).join(', ');
  if (preparedFor) {
    page.drawText(`PREPARED FOR ${preparedFor.toUpperCase()}`, { x: M, y: y - 9, size: 9, font: bold, color: RED });
    y -= 18;
  }
  if (p.site_url) {
    page.drawText(String(p.site_url), { x: M, y: y - 9, size: 10, font: reg, color: MUTED });
    y -= 20;
  }

  // Signature stamp (if signed)
  if (p.signed_name) {
    const when = p.signed_at ? new Date(p.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const boxH = 44;
    ensure(boxH + 10);
    page.drawRectangle({ x: M, y: y - boxH, width: contentW, height: boxH, color: CREAM, borderColor: INK, borderWidth: 2 });
    page.drawText('SIGNED AND ACCEPTED', { x: M + 14, y: y - 18, size: 8, font: bold, color: RED });
    page.drawText(`${p.signed_name}${when ? `  ·  ${when}` : ''}`, { x: M + 14, y: y - 34, size: 13, font: ital, color: INK });
    y -= boxH + 14;
  }

  const prose = p.prose || {};
  if (prose.intro) para(prose.intro, { size: 11 });
  if (prose.situation || p.situation) {
    heading('Where you are');
    para(prose.situation || (p.situation as string));
  }
  if (prose.recommendation) {
    heading('What we recommend');
    para(prose.recommendation);
  }

  // Scope and pricing
  heading('Scope and pricing');
  const lines = Array.isArray(p.lines) ? p.lines : [];
  for (const l of lines) {
    const s = byId(l.id);
    if (!s) continue;
    ensure(40);
    const priceLabel = linePriceLabel(s, l);
    const priceW = bold.widthOfTextAtSize(priceLabel, 11);
    page.drawText(s.name, { x: M, y: y - 12, size: 12, font: bold, color: INK });
    page.drawText(priceLabel, { x: W - M - priceW, y: y - 12, size: 11, font: bold, color: INK });
    y -= 22;
    if (s.variable) {
      page.drawText('at cost, varies with usage', { x: M, y: y - 9, size: 8.5, font: ital, color: MUTED });
      y -= 14;
    }
    if (l.framing) para(l.framing, { size: 10, color: BODY, gap: 4 });
    for (const b of l.scope || []) bullet(b);
    y -= 6;
  }

  // Totals
  const oneTime = Number(p.one_time_total) || 0;
  const monthly = Number(p.monthly_total) || 0;
  const depositDue = Math.round(Number(p.deposit_amount) || Math.round(oneTime * 0.5));
  const balanceDue = oneTime - depositDue;
  const hasVariable = lines.some((l) => byId(l.id)?.variable);

  y -= 6;
  ensure(90);
  page.drawRectangle({ x: M, y: y - 1, width: contentW, height: 2, color: INK });
  y -= 14;
  const row = (label: string, value: string, big = false) => {
    page.drawText(label, { x: M, y: y - 12, size: big ? 12 : 11, font: reg, color: BODY });
    const vf = big ? bold : bold;
    const vw = vf.widthOfTextAtSize(value, big ? 15 : 12);
    page.drawText(value, { x: W - M - vw, y: y - 12, size: big ? 15 : 12, font: vf, color: INK });
    y -= big ? 24 : 20;
  };
  if (oneTime > 0) {
    row('Project total', money(oneTime), true);
    row('To start, 50% deposit', money(depositDue));
    row('Balance on delivery', money(balanceDue));
  }
  if (monthly > 0) row(`Monthly${hasVariable ? ', estimated' : ''}`, `${money(monthly)}/mo`);
  if (hasVariable) {
    y -= 2;
    para('Software and compute is billed at cost and moves with the compute used each month. The monthly figure is an estimate, not a fixed charge.', { size: 9, color: MUTED, gap: 4 });
  }

  // Terms
  heading('Terms');
  for (const t of TERMS) bullet(t);
  if (prose.close) {
    y -= 4;
    para(prose.close, { size: 11 });
  }

  // Footer scripture on the last page
  ensure(40);
  y -= 6;
  page.drawRectangle({ x: M, y: y - 1, width: contentW, height: 1, color: rgb(0.9, 0.87, 0.8) });
  y -= 16;
  para('"If you have faith as small as a mustard seed, nothing will be impossible for you."', { size: 11, font: ital, color: BODY, gap: 3 });
  para('Matthew 17:20  ·  Modern Mustard Seed  ·  modernmustardseed.com', { size: 8.5, font: bold, color: MUTED });

  return doc.save();
}
