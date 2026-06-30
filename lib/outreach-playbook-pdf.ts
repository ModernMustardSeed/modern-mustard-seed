import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import {
  PLAYBOOK_INTRO,
  LANES,
  JARGON_RULE,
  SAFETY_RULES,
  SEARCH_HOWTO,
  SEARCH_PHRASES,
  GROUP_TYPES,
  GROUP_FIND,
  GROUP_SPOT,
  THREE_PLACES,
  HELPFUL_COMMENTS,
  COMMENT_RHYTHM,
  CALL_OFFER_COMMENTS,
  FIRST_COMMENT,
  PROMO_POST,
  DM_SCRIPTS,
  COMMON_QUESTIONS,
  PHONE_SCRIPT,
  SOCIAL_STRATEGY,
  ROUTINE,
  ROUTINE_NOTE,
  JOB_ENDS,
  DO_LIST,
  DONT_LIST,
  personalize,
} from '@/data/outreach-playbook';

// Pop-art palette in 0..1 rgb (mirrors lib/onboarding-pdf.ts)
const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const GREEN = rgb(0.176, 0.416, 0.31);
const CREAM = rgb(1, 0.953, 0.8);
const HAIR = rgb(0.9, 0.87, 0.8);
const LINK = rgb(0.16, 0.32, 0.62);

function clean(input: string): string {
  return String(input ?? '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[●★✓✕↑↓←]/g, '')
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

/** Branded, personalized Outreach Playbook PDF. bookUrl is woven into scripts. */
export async function buildOutreachPlaybookPdf(opts: { bookUrl: string; code: string; name?: string }): Promise<Uint8Array> {
  const { bookUrl, code, name } = opts;
  const px = (t: string) => personalize(t, bookUrl);

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
    page.drawText(clean('modernmustardseed.com  -  The Outreach Playbook  -  Partner field guide'), { x: M, y: fy, size: 8, font: reg, color: MUTED });
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

  const bullets = (items: string[], o: { color?: ReturnType<typeof rgb>; dot?: ReturnType<typeof rgb> } = {}) => {
    const { color = BODY, dot = YELLOW } = o;
    const size = 10;
    const lh = 1.4;
    for (const b of items) {
      const lines = wrap(b, reg, size, contentW - 26);
      ensure(size * lh);
      page.drawCircle({ x: M + 16, y: y - size + 3, size: 2.2, color: dot });
      lines.forEach((ln) => {
        ensure(size * lh);
        page.drawText(ln, { x: M + 26, y: y - size, size, font: reg, color });
        y -= size * lh;
      });
      y -= 2;
    }
    y -= 4;
  };

  const sectionHeader = (eyebrow: string, title: string) => {
    ensure(64);
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
    page.drawText(clean(t), { x: M, y: y - 12, size: 12.5, font: bold, color: INK });
    y -= 22;
  };

  const callout = (t: string) => {
    const size = 9.5;
    const lines = wrap(t, ital, size, contentW - 24);
    const boxH = lines.length * size * 1.45 + 16;
    ensure(boxH + 6);
    const top = y;
    page.drawRectangle({ x: M, y: top - boxH, width: contentW, height: boxH, color: CREAM });
    page.drawRectangle({ x: M, y: top - boxH, width: 3.5, height: boxH, color: YELLOW });
    let ty = top - 12;
    for (const ln of lines) {
      page.drawText(ln, { x: M + 14, y: ty - size, size, font: ital, color: BODY });
      ty -= size * 1.45;
    }
    y = top - boxH - 10;
  };

  const scriptCard = (label: string | null, text: string) => {
    const size = 10;
    const lines = wrap(`"${text}"`, ital, size, contentW - 24);
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

  // ── Cover ──
  newPage();
  const bandH = H;
  page.drawRectangle({ x: 0, y: 0, width: W, height: bandH, color: INK });
  drawSpaced('MODERN MUSTARD SEED', M, H - 80, bold, 10, YELLOW, 3.2);
  page.drawText('The Outreach', { x: M, y: H - 340, size: 46, font: bold, color: CREAM });
  page.drawText('Playbook', { x: M, y: H - 392, size: 46, font: bold, color: YELLOW });
  for (const [i, ln] of wrap('Find the right people. Start the right conversations. Get calls on the calendar. Your field guide for groups, DMs, the phone, and social.', reg, 13, 360).entries()) {
    page.drawText(ln, { x: M, y: H - 432 - i * 19, size: 13, font: reg, color: rgb(0.8, 0.78, 0.72) });
  }
  page.drawText(clean(name ? `Prepared for ${name}` : 'Partner field guide'), { x: M, y: 150, size: 11, font: bold, color: YELLOW });
  page.drawText(clean(`Your money link: ${bookUrl}`), { x: M, y: 130, size: 10, font: reg, color: rgb(0.8, 0.78, 0.72) });
  page.drawText(clean(`Partner code ${code}`), { x: M, y: 112, size: 9, font: reg, color: MUTED });
  page.drawText('WEBSITES / AI ASSISTANTS / VOICE AGENTS / CUSTOM SOFTWARE', { x: M, y: 60, size: 8, font: bold, color: YELLOW });

  // ── Your job ──
  newPage();
  drawSpaced(PLAYBOOK_INTRO.eyebrow.toUpperCase(), M, y - 9, bold, 8.5, RED, 2.4);
  y -= 24;
  page.drawText(clean(PLAYBOOK_INTRO.title), { x: M, y: y - 22, size: 22, font: bold, color: INK });
  y -= 36;
  para(PLAYBOOK_INTRO.lede, { size: 12, font: bold, color: INK, gap: 10 });
  para(PLAYBOOK_INTRO.body, { size: 10.5, gap: 10 });
  callout(`${PLAYBOOK_INTRO.moneyLine} Yours is ${bookUrl}`);

  // ── What we build ──
  sectionHeader('Know the fit', 'What we build');
  para('Four kinds of build, and builds are where you earn most. When someone describes one of these, that is your opening. Match your message to the lane.', { size: 10, gap: 8 });
  for (const lane of LANES) {
    subHead(lane.name);
    para(lane.blurb, { size: 10, gap: 4 });
    para('They sound like:', { size: 8.5, font: bold, color: RED, gap: 2 });
    bullets(lane.soundLike);
  }
  callout(JARGON_RULE);

  // ── Stay safe ──
  sectionHeader('First, stay safe', 'Five rules that protect your account');
  for (const r of SAFETY_RULES) {
    ensure(30);
    page.drawText(clean(`${r.n}.  ${r.title}`), { x: M, y: y - 11, size: 11, font: bold, color: INK });
    y -= 16;
    para(r.detail, { size: 9.5, gap: 8, indent: 16 });
  }

  // ── Find people ──
  sectionHeader('How to find people', 'Search words to look for');
  callout(SEARCH_HOWTO);
  for (const g of SEARCH_PHRASES) {
    subHead(g.lane);
    para(g.phrases.join('   -   '), { size: 9.5, color: BODY, gap: 8, indent: 4 });
  }

  // ── Groups ──
  sectionHeader('Where to be', 'Best groups to join');
  subHead('Group types to target');
  bullets(GROUP_TYPES);
  subHead('How to find them');
  para(GROUP_FIND, { size: 10, gap: 8 });
  subHead('How to spot a good group');
  bullets(GROUP_SPOT);
  subHead('The three places your words go');
  for (const p of THREE_PLACES) {
    ensure(24);
    page.drawText(clean(`${p.tag}.  ${p.title}`), { x: M, y: y - 11, size: 10.5, font: bold, color: INK });
    y -= 15;
    para(p.detail, { size: 9.5, gap: 7, indent: 16 });
  }

  // ── Comment scripts ──
  sectionHeader('Your default move', 'Scripts: helpful comments');
  callout(COMMENT_RHYTHM);
  for (const group of HELPFUL_COMMENTS) {
    subHead(group.lane);
    for (const c of group.cards) scriptCard(c.context, c.text);
  }
  subHead('Comments that offer a call');
  para('Answer the question first, then add one of these. Your booking link is filled in.', { size: 9.5, color: MUTED, gap: 8 });
  for (const group of CALL_OFFER_COMMENTS) {
    subHead(group.lane);
    for (const c of group.cards) scriptCard(null, px(c));
  }
  scriptCard('Your first comment (drop the link)', px(FIRST_COMMENT));

  // ── Posts & DMs ──
  sectionHeader('Cut, paste, reword', 'Posts & DMs');
  scriptCard('Promo post (only where allowed)', PROMO_POST);
  for (const d of DM_SCRIPTS) scriptCard(d.context, px(d.text));
  subHead('When they ask the common questions');
  for (const c of COMMON_QUESTIONS) scriptCard(c.q, c.a);

  // ── Phone script ──
  sectionHeader('When it goes to a call', 'The phone script');
  callout(PHONE_SCRIPT.intro);
  for (const [i, s] of PHONE_SCRIPT.steps.entries()) {
    subHead(`${i + 1}. ${s.label}`);
    scriptCard(null, px(s.script));
    para(px(s.note), { size: 9, font: ital, color: MUTED, gap: 8, indent: 4 });
  }
  subHead("Handling the four you'll hear most");
  for (const o of PHONE_SCRIPT.objections) {
    ensure(22);
    page.drawText(clean(o.q), { x: M, y: y - 10.5, size: 10.5, font: bold, color: INK });
    y -= 15;
    para(o.a, { size: 9.5, gap: 7, indent: 16 });
  }
  scriptCard('If you get their voicemail', PHONE_SCRIPT.voicemail);

  // ── Social strategy ──
  sectionHeader('Be everywhere, lightly', 'Your social strategy');
  callout(SOCIAL_STRATEGY.intro);
  callout(SOCIAL_STRATEGY.oneRule);
  subHead('Set up your profile');
  bullets(SOCIAL_STRATEGY.setup);
  subHead('Where to show up');
  for (const c of SOCIAL_STRATEGY.channels) {
    ensure(20);
    page.drawText(clean(c.name), { x: M, y: y - 10.5, size: 10.5, font: bold, color: INK });
    y -= 15;
    para(c.role, { size: 9.5, gap: 7, indent: 16 });
  }
  subHead('What to post: four pillars');
  for (const p of SOCIAL_STRATEGY.pillars) {
    ensure(20);
    page.drawText(clean(p.name), { x: M, y: y - 10.5, size: 10.5, font: bold, color: INK });
    y -= 15;
    para(p.detail, { size: 9.5, gap: 7, indent: 16 });
  }
  subHead('Posting cadence');
  bullets(SOCIAL_STRATEGY.cadence);
  subHead('The DM funnel');
  bullets(SOCIAL_STRATEGY.dmFunnel, { dot: LINK });

  // ── Routine + do/don't ──
  sectionHeader('Your day', 'The 45-minute routine');
  for (const r of ROUTINE) {
    ensure(22);
    page.drawText(clean(r.time), { x: M, y: y - 10.5, size: 10, font: bold, color: GREEN });
    page.drawText(clean(r.title), { x: M + 60, y: y - 10.5, size: 10.5, font: bold, color: INK });
    y -= 15;
    para(r.detail, { size: 9.5, gap: 7, indent: 60 });
  }
  para(ROUTINE_NOTE, { size: 9, font: ital, color: MUTED, gap: 10 });

  subHead('Do');
  bullets(DO_LIST, { dot: GREEN });
  subHead("Don't");
  bullets(DONT_LIST, { dot: RED });

  // ── Close ──
  sectionHeader('Your job ends at', 'The booked call');
  para(JOB_ENDS.body, { size: 10.5, gap: 12 });
  callout(`Your money link: ${bookUrl}  -  Open the door, Sarah closes, you earn on every build and product.`);
  para('"If you have faith as small as a mustard seed, nothing will be impossible for you." Matthew 17:20', { size: 9, font: ital, color: MUTED, gap: 0 });

  drawFooter();
  return doc.save();
}
