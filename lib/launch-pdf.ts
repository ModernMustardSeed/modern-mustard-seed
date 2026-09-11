import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { GoliveGroup } from '@/lib/golive';
import { adminItems, clientItems, type LaunchFacts } from '@/data/launch-standard';

/**
 * THE TWO LAUNCH DOCUMENTS, BUILT FROM ONE CHECKLIST.
 *
 *   ownerManualPdf   goes to the client. Their office, screen by screen, then
 *                    the Google Business Profile step by step. Written to be
 *                    read once on a phone and then kept in a truck.
 *   adminLaunchPdf   goes to Sarah. Our half with the reasons, their half so
 *                    she knows what to chase, and the decisions still open.
 *
 * Both render from standardLaunchGroups, so the day a step changes it changes in
 * both documents and in the portal at once. Two hand-written documents drift on
 * the first edit; that is the whole reason this file takes data rather than
 * prose.
 *
 * Palettes differ on purpose. The owner's manual wears the CLIENT'S brand,
 * because it is their document and it sits next to their website. The admin
 * sheet wears ours.
 */

export type Palette = { ink: string; accent: string; soft: string; band: string };

export const MMS_PALETTE: Palette = { ink: '#161616', accent: '#C4160B', soft: '#5E5B4E', band: '#FFF3CC' };

const hex = (h: string) => {
  const s = h.replace('#', '');
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  );
};

/**
 * Helvetica in pdf-lib is WinAnsi only, so anything outside Latin-1 draws as a
 * blank or throws. House style also bans em dashes. Both handled in one pass.
 */
function clean(input: string): string {
  return String(input ?? '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/→/g, '->')
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

type Kit = {
  doc: PDFDocument;
  reg: PDFFont;
  bold: PDFFont;
  ital: PDFFont;
  pal: Palette;
  footer: string;
  W: number;
  H: number;
  M: number;
  contentW: number;
};

/** One page engine, shared by both documents. */
function engine(kit: Kit) {
  const { reg, bold, pal, footer, W, H, M, contentW } = kit;
  const INK = hex(pal.ink);
  const ACCENT = hex(pal.accent);
  const SOFT = hex(pal.soft);
  const HAIR = rgb(0.88, 0.86, 0.82);
  const FOOT = 46;

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
    const fy = M - 20;
    page.drawRectangle({ x: M, y: fy + 16, width: contentW, height: 1, color: HAIR });
    page.drawText(clean(footer), { x: M, y: fy, size: 8, font: reg, color: SOFT });
    const num = String(pageNo);
    page.drawText(num, { x: W - M - bold.widthOfTextAtSize(num, 8), y: fy, size: 8, font: bold, color: SOFT });
  };

  const newPage = () => {
    if (page) drawFooter();
    page = kit.doc.addPage([W, H]);
    pageNo += 1;
    y = H - M;
  };

  const ensure = (h: number) => {
    if (y - h < FOOT + 6) newPage();
  };

  const para = (
    text: string,
    o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number; lh?: number } = {},
  ) => {
    const { size = 10, font = reg, color = SOFT, gap = 5, indent = 0, lh = 1.42 } = o;
    for (const ln of wrap(text, font, size, contentW - indent)) {
      ensure(size * lh);
      page.drawText(ln, { x: M + indent, y: y - size, size, font, color });
      y -= size * lh;
    }
    y -= gap;
  };

  const eyebrow = (text: string) => {
    ensure(26);
    drawSpaced(text.toUpperCase(), M, y - 9, bold, 8.5, ACCENT, 2.6);
    y -= 22;
  };

  const heading = (text: string, size = 17) => {
    ensure(size + 16);
    page.drawText(clean(text), { x: M, y: y - size, size, font: bold, color: INK });
    y -= size + 10;
  };

  const rule = (gap = 12) => {
    ensure(gap + 2);
    page.drawRectangle({ x: M, y: y - 2, width: contentW, height: 1, color: HAIR });
    y -= gap;
  };

  /** A checklist row: an empty box, the step, and the reason under it. */
  const step = (what: string, how?: string | null, link?: string | null, owner?: string) => {
    const boxW = 11;
    const gutter = boxW + 9;
    const lines = wrap(what, bold, 10.5, contentW - gutter);
    ensure(lines.length * 15 + (how ? 26 : 8));

    page.drawRectangle({
      x: M,
      y: y - 11,
      width: boxW,
      height: boxW,
      borderColor: INK,
      borderWidth: 1.3,
      color: rgb(1, 1, 1),
    });
    lines.forEach((ln, i) => {
      page.drawText(ln, { x: M + gutter, y: y - 10 - i * 14, size: 10.5, font: bold, color: INK });
    });
    y -= lines.length * 14 + 3;

    if (owner) {
      page.drawText(clean(owner), { x: M + gutter, y: y - 8, size: 7.6, font: bold, color: ACCENT });
      y -= 12;
    }
    if (how) para(how, { indent: gutter, size: 9.4, gap: 3 });
    if (link) {
      ensure(13);
      page.drawText(clean(link), { x: M + gutter, y: y - 9, size: 8.6, font: kit.ital, color: ACCENT });
      y -= 15;
    }
    y -= 6;
  };

  return {
    get page() {
      return page;
    },
    get y() {
      return y;
    },
    set y(v: number) {
      y = v;
    },
    newPage,
    ensure,
    para,
    eyebrow,
    heading,
    rule,
    step,
    drawSpaced,
    drawFooter,
    INK,
    ACCENT,
    SOFT,
    HAIR,
  };
}

async function kitFor(pal: Palette, footer: string): Promise<Kit> {
  const doc = await PDFDocument.create();
  return {
    doc,
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    ital: await doc.embedFont(StandardFonts.HelveticaOblique),
    pal,
    footer,
    W: 612,
    H: 792,
    M: 54,
    contentW: 612 - 108,
  };
}

function cover(kit: Kit, e: ReturnType<typeof engine>, o: { eyebrow: string; title: string[]; lede: string; meta: string[] }) {
  const { W, H, M, contentW, bold, reg, pal } = kit;
  e.newPage();
  const bandH = 176;
  kit.doc.getPages()[0].drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: hex(pal.band) });
  e.page.drawRectangle({ x: 0, y: H - bandH - 3, width: W, height: 3, color: e.INK });

  e.drawSpaced(o.eyebrow.toUpperCase(), M, H - 48, bold, 9.5, e.ACCENT, 3.2);
  o.title.forEach((line, i) => {
    e.page.drawText(clean(line), { x: M, y: H - 88 - i * 30, size: 26, font: bold, color: e.INK });
  });
  e.y = H - bandH - 34;
  e.para(o.lede, { size: 11.5, color: e.INK, gap: 12 });
  for (const m of o.meta) {
    e.page.drawText(clean(m), { x: M, y: e.y - 9, size: 9.5, font: reg, color: e.SOFT });
    e.y -= 15;
  }
  e.page.drawRectangle({ x: M, y: e.y - 6, width: contentW, height: 1.5, color: e.INK });
  e.y -= 26;
}

/* ============================================================ THE CLIENT'S == */

export type OfficeTab = { name: string; what: string; when?: string };

export async function ownerManualPdf(opts: {
  facts: LaunchFacts;
  groups: GoliveGroup[];
  palette: Palette;
  /** The back office, tab by tab. Omit for a client who did not get one. */
  officeTabs?: OfficeTab[];
  /** How they get in. Never the password itself: that goes in a text, not a PDF. */
  officeLogin?: { url: string; user: string; note: string };
}): Promise<Uint8Array> {
  const { facts, groups, palette, officeTabs, officeLogin } = opts;
  const kit = await kitFor(palette, `${clean(facts.business)}  ·  ${clean(facts.phone)}  ·  Built by Modern Mustard Seed`);
  const e = engine(kit);

  cover(kit, e, {
    eyebrow: facts.business,
    title: ['Your website,', 'your office,', 'and Google.'],
    lede:
      'Everything you own now, what each part is for, and the one hour of work only you can do. ' +
      'Read it once. Keep it in the truck.',
    meta: [
      `The website   ${facts.siteUrl}`,
      officeLogin ? `Your office   ${officeLogin.url}` : '',
      `Your number   ${facts.phone}`,
    ].filter(Boolean),
  });

  /* ---------------------------------------------------------- what you own */
  e.eyebrow('Part one');
  e.heading('What you own');
  e.para(
    'Two things, at two addresses. The website is public and it is what a customer finds. The office ' +
      'is private and it is where the work lands. They are the same website: the office is a door on it ' +
      'that only you have a key to.',
    { size: 10.5 },
  );
  e.para(`THE WEBSITE   ${facts.siteUrl}`, { size: 10, font: kit.bold, color: e.INK, gap: 2 });
  e.para(
    'Sixteen pages. Anybody can read it, Google can read it, and it is the same on a phone as it is on ' +
      'a laptop. You never have to touch it.',
    { size: 9.8 },
  );
  if (officeLogin) {
    e.para(`YOUR OFFICE   ${officeLogin.url}`, { size: 10, font: kit.bold, color: e.INK, gap: 2 });
    e.para(
      `Ask for a name and a password. Your name is ${officeLogin.user}; the password came to you in a ` +
        `text, not in this document, because a password written into a PDF is a password on somebody's ` +
        `desk forever. ${officeLogin.note}`,
      { size: 9.8 },
    );
    e.para(
      'Open it on your phone, then add it to your home screen. It opens like an app after that and you ' +
        'will not have to type the password again on that phone.',
      { size: 9.8 },
    );
  }
  e.rule(16);

  /* ------------------------------------------------------------- the rule */
  e.eyebrow('The one rule');
  e.heading('Nothing gets emailed anywhere.');
  e.para(
    'You do not have a business email yet, so we did not build the site to send you one. Every request ' +
      'from the website lands in the office and waits there with a number on the tab until you open it. ' +
      'That list is the only place a new customer is. Open it in the morning and again in the evening ' +
      'and you will never miss one.',
    { size: 10.5 },
  );
  e.para(
    'The day you want an email address, tell us and we will point it there as well. Nothing about the ' +
      'site has to change.',
    { size: 10 },
  );
  e.rule(16);

  /* ------------------------------------------------------------ the office */
  if (officeTabs?.length) {
    e.eyebrow('Part two');
    e.heading('The office, tab by tab');
    for (const t of officeTabs) {
      e.ensure(40);
      e.page.drawText(clean(t.name), { x: kit.M, y: e.y - 12, size: 12, font: kit.bold, color: e.INK });
      e.y -= 20;
      e.para(t.what, { size: 9.8, indent: 0, gap: t.when ? 1 : 8 });
      if (t.when) e.para(t.when, { size: 9.2, font: kit.ital, color: e.ACCENT, gap: 10 });
    }
    e.rule(16);
  }

  /* --------------------------------------------------------------- google */
  const theirs = clientItems(groups);
  e.newPage();
  e.eyebrow('Part three');
  e.heading('The hour only you can do');
  e.para(
    'Most people who need you will never open your website. They will type "lawn care near me" into ' +
      'Google, look at three boxes at the top of the screen, and press call on one of them. Those boxes ' +
      'are Google Business Profiles. Getting yours up is worth more than everything else in this ' +
      'document put together.',
    { size: 10.5 },
  );
  e.para(
    'Google verifies the person who owns the business, on video, holding their own tools. That is why ' +
      'we cannot do this part for you, and why nobody you hire can either. It takes about an hour, and ' +
      'the verification usually clears within a few days.',
    { size: 10.5, gap: 14 },
  );

  for (const g of theirs) {
    e.ensure(50);
    e.heading(g.group.replace(/^\d+\s*[·.]\s*/, ''), 13);
    if (g.note) e.para(g.note, { size: 9.4, font: kit.ital, gap: 10 });
    for (const i of g.items) e.step(i.what, i.how, i.label ? `${i.label}  ${i.href ?? ''}` : i.href, undefined);
    e.rule(10);
  }

  /* ----------------------------------------------------------------- help */
  e.ensure(120);
  e.eyebrow('When something is wrong');
  e.heading('Call us. That is what we are for.');
  e.para(
    'If the website says something that is not true any more, if the office does something you do not ' +
      'expect, or if you want a page changed, tell us and we change it. Changes to what we built are ' +
      'included. There is no form, no ticket and no charge.',
    { size: 10.5 },
  );
  e.para('Modern Mustard Seed   modernmustardseed.com', { size: 10, font: kit.bold, color: e.INK, gap: 2 });
  e.para('sarah@modernmustardseed.com', { size: 10 });
  e.drawFooter();
  return kit.doc.save();
}

/* ============================================================= THE STUDIO'S == */

export async function adminLaunchPdf(opts: {
  facts: LaunchFacts;
  groups: GoliveGroup[];
  /** Anything still waiting on a decision, stated plainly. */
  open?: { what: string; why: string }[];
  runbookUrl?: string;
}): Promise<Uint8Array> {
  const { facts, groups, open = [], runbookUrl } = opts;
  const kit = await kitFor(MMS_PALETTE, 'Modern Mustard Seed  ·  Launch runbook  ·  Internal');
  const e = engine(kit);

  const ours = adminItems(groups);
  const theirs = clientItems(groups);
  const oursN = ours.flatMap((g) => g.items).length;
  const theirsN = theirs.flatMap((g) => g.items).length;

  cover(kit, e, {
    eyebrow: 'Launch runbook',
    title: [facts.business, `${facts.city}, ${facts.state}`],
    lede:
      `The standard launch for a business with no Google Business Profile. ${oursN} steps are ours and ` +
      `${theirsN} are the client's. Their half is live in their portal and ticks against these same rows.`,
    meta: [
      `Site        ${facts.siteUrl}`,
      facts.officeUrl ? `Office      ${facts.officeUrl}` : '',
      `Phone       ${facts.phone}`,
      runbookUrl ? `Runbook     ${runbookUrl}` : '',
    ].filter(Boolean),
  });

  if (open.length) {
    e.eyebrow('Blocked on you');
    e.heading('Decisions before this can finish');
    for (const o of open) e.step(o.what, o.why, null, 'NEEDS A CALL');
    e.rule(16);
  }

  e.eyebrow('Ours');
  e.heading('What the studio does');
  for (const g of ours) {
    e.ensure(46);
    e.heading(g.group.replace(/^\d+\s*[·.]\s*/, ''), 13);
    if (g.note) e.para(g.note, { size: 9.4, font: kit.ital, gap: 9 });
    for (const i of g.items) {
      e.step(i.what, i.how, i.label ? `${i.label}  ${i.href ?? ''}` : i.href, i.who === 'You' ? 'SARAH' : 'STUDIO');
    }
    e.rule(10);
  }

  e.newPage();
  e.eyebrow('Theirs');
  e.heading('What only the owner can do');
  e.para(
    'Chase these, do not do them. Google verifies the business owner on video, so an agency doing it ' +
      'is a suspended profile. This is the same list they see in the portal, so a tick here is a tick ' +
      'there.',
    { size: 10 },
  );
  for (const g of theirs) {
    e.ensure(46);
    e.heading(g.group.replace(/^\d+\s*[·.]\s*/, ''), 13);
    for (const i of g.items) e.step(i.what, i.how, null, 'CLIENT');
    e.rule(10);
  }

  e.drawFooter();
  return kit.doc.save();
}
