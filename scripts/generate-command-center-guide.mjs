/**
 * THE COMMAND CENTER GUIDE, the one a client actually reads.
 *
 *   node scripts/generate-command-center-guide.mjs "Built Right in Montana"
 *
 * Written for the person who opens the board on a Tuesday morning between two
 * job sites, not for the person who bought it. So it is short, it is in the
 * order the first week actually happens, and every page answers a question
 * somebody has already asked out loud: who sees my passwords, what happens if
 * I say nothing this week, what does it cost to change something.
 *
 * It says what the software does not do, in as many words, because the fastest
 * way to lose a client's trust in a tool is to let them discover a limit on
 * their own. The Houzz sheet, the hand-posted Google update and the captcha on
 * a Buildertrend form are all in here for that reason.
 *
 * Mirrors the words in lib/posting/guide.ts. If the product changes, both move.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const business = process.argv[2] ?? 'your business';
const out = process.argv[3] ?? path.join('public', 'downloads', 'command-center-guide.pdf');

const INK = rgb(0.086, 0.086, 0.086);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const WHITE = rgb(1, 1, 1);

const C = [
  { cover: true },

  { h1: 'What this is' },
  { p: `Your Command Center is one screen for the parts of ${business} that happen at a desk: the people who reached out, your email, your contact book, what goes out on your feeds, and what your website did this week.` },
  { p: 'It is not a CRM you have to feed. Almost everything on it fills itself in. The parts that need you are the parts a person has to decide, and those are the only parts it asks about.' },
  { p: 'Three of you can sit at it. It asks who is at the desk so a note carries a name and a lead can be yours instead of nobody’s.' },

  { h1: 'The first week' },
  { p: 'Five things, once. The board shows them at the top until they are done, then it stops mentioning them.' },
  { h2: '1. Say who is at the desk' },
  { b: 'One tap. It signs your notes and lets a lead be held by a name.' },
  { h2: '2. Connect where you post' },
  { b: 'Facebook, Instagram, LinkedIn, X and Google. A connected feed posts itself at the hour that feed rewards. Connecting takes a minute and we can do it with you on a call.' },
  { h2: '3. Connect your mailbox' },
  { b: 'Your email gets read twice an hour, sorted, and answered in draft where a reply is needed. Nothing sends without your click.' },
  { h2: '4. Put one thing on the calendar' },
  { b: 'Type a line about a job. Read the version for each feed. Press the button. That is the whole job on your side.' },
  { h2: '5. Name one list' },
  { b: 'Tag the realtors in your book, save it as a list, and a message to all of them is two clicks from then on.' },

  { h1: 'Saying something' },
  { p: 'Type it the way you would say it at the tailgate. One line is enough.' },
  { p: 'Press Shape it and you get one version per feed, on the same screen, before anything is scheduled:' },
  { b: 'Facebook gets short paragraphs and a plain invitation, but only if your words invited something.' },
  { b: 'Instagram gets line breaks and five to eight real local hashtags.' },
  { b: 'LinkedIn gets a professional frame and at most two hashtags.' },
  { b: 'X gets your single strongest thought, under the limit, with no hashtags and no link, because X buries both.' },
  { b: 'Google Business Profile gets one paragraph a searcher can use. This is the one that shows next to your map pin.' },
  { b: 'Houzz gets a project note about the work itself.' },
  { p: 'Under each one is a line saying what the edit changed and why that shape suits that feed. Change any word you like. What you press the button on is exactly what goes out.' },
  { p: 'Each feed posts at its own hour, not all at once, because the hour is most of why a post is seen.' },

  { h1: 'Dropping things in' },
  { p: 'Drop anything, at the top of every screen, takes what you already have instead of asking you to retype it.' },
  { b: 'A photo of a napkin with names and numbers on it.' },
  { b: 'A screenshot of a text message.' },
  { b: 'A spreadsheet from whoever kept your list before.' },
  { b: 'A business card, or a paragraph pasted in.' },
  { p: 'It reads what is there and shows you every person it found, with a flag on anything it could not read cleanly. You fix what is wrong and press the button. Nothing is saved until you do, and anyone already in your book is filled in rather than added twice.' },

  { h1: 'What we never do' },
  { b: 'We never post something you did not write. We edit; we do not invent. No filler, no stock quotes, no content calendar of our own.' },
  { b: 'We never add a fact, a price, a timeline, a name or a promise your words did not carry.' },
  { b: 'We never have your passwords. Every connection is a key the platform issues and you can revoke, on the same screen as the button that made it.' },
  { b: 'We never send an email or a text on your behalf without your click.' },

  { h1: 'What it does not do' },
  { p: 'The honest list, so nothing surprises you later.' },
  { b: 'Houzz has no door for software at all. Those posts go on a sheet and take a minute by hand.' },
  { b: 'Google is waiting on Google to approve posting for our account. Until they do, your Google updates are posted by hand from inside your profile, by us, on the same schedule.' },
  { b: 'A feed you have not connected still gets its version written. It waits for a person rather than going out.' },
  { b: 'If your CRM form runs a captcha, leads cannot be pushed into it automatically. Every lead is still safe here and in your email.' },
  { b: 'Say nothing for a week and nothing posts. We will nudge you on a Friday if the week ahead is empty, and we will never fill the silence with filler.' },

  { h1: 'Questions people ask' },
  { h2: 'Who sees my Facebook password?' },
  { b: 'Nobody. We hold a key the platform issued for posting, which you can revoke any day, and it stops working the moment you do.' },
  { h2: 'Can I approve every post first?' },
  { b: 'Yes. Say the word and every day holds until you tap Approve.' },
  { h2: 'What if I want something changed?' },
  { b: 'Tell us. Changes to what we built are included, always, and there is no change order to sign.' },
  { h2: 'Can somebody else in the office use it?' },
  { b: 'Yes. One sign-in, several people, and the board asks who is sitting at it.' },
  { h2: 'What happens to my contacts if we part ways?' },
  { b: 'They are yours. Download the whole book as a spreadsheet any time, from the Contacts screen.' },

  { h1: 'Getting in' },
  { p: 'Go to modernmustardseed.com/cc and put in your email address. You get a six digit code and a button. On a phone, tap the button and you are in. On a laptop, type the code.' },
  { p: 'The same sign-in opens your project portal, so you are never asked twice.' },
  { p: 'Stuck on anything at all: sarah@modernmustardseed.com. You will hear back the same day.' },
];

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
const logo = await doc.embedPng(readFileSync('public/brand/logo-lockup.png'));

const W = 612;
const H = 792;
const M = 56;
const contentW = W - 2 * M;
let page;
let y;
const newPage = () => {
  page = doc.addPage([W, H]);
  y = H - M;
};
const ensure = (h) => {
  if (y - h < M) newPage();
};
const wrap = (text, font, size, maxW) => {
  const outLines = [];
  for (const raw of String(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxW && line) {
        outLines.push(line);
        line = w;
      } else line = t;
    }
    outLines.push(line);
  }
  return outLines;
};
const para = (text, { size = 10.5, font = reg, color = BODY, gap = 7, indent = 0, lh = 1.45 } = {}) => {
  for (const ln of wrap(text, font, size, contentW - indent)) {
    ensure(size * lh);
    page.drawText(ln, { x: M + indent, y: y - size, size, font, color });
    y -= size * lh;
  }
  y -= gap;
};
const bullet = (text) => {
  const size = 10.5;
  const lines = wrap(text, reg, size, contentW - 16);
  ensure(size * 1.45 * lines.length + 2);
  page.drawText('-', { x: M, y: y - size, size, font: bold, color: YELLOW });
  lines.forEach((ln, i) => {
    page.drawText(ln, { x: M + 14, y: y - size, size, font: reg, color: BODY });
    if (i < lines.length - 1) y -= size * 1.45;
  });
  y -= size * 1.45 + 3;
};
const h2 = (text) => {
  y -= 6;
  ensure(16);
  page.drawText(text, { x: M, y: y - 12, size: 13, font: bold, color: INK });
  y -= 22;
};
const h1 = (text) => {
  newPage();
  page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: YELLOW });
  page.drawRectangle({ x: 0, y: H - 67, width: W, height: 3, color: INK });
  page.drawText(text, { x: M, y: H - 42, size: 20, font: bold, color: INK });
  y = H - 64 - 34;
};

for (const block of C) {
  if (block.cover) {
    newPage();
    page.drawRectangle({ x: 12, y: 12, width: W - 24, height: H - 24, color: WHITE, borderColor: INK, borderWidth: 6 });
    const center = (text, font, size, yy, color) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (W - w) / 2, y: yy, size, font, color });
    };
    const logoH = 150;
    const logoW = logo.width * (logoH / logo.height);
    page.drawImage(logo, { x: (W - logoW) / 2, y: H - 80 - logoH, width: logoW, height: logoH });
    const titleY = H - 80 - logoH - 74;
    const titleW = bold.widthOfTextAtSize('Your Command Center', 30);
    page.drawRectangle({ x: (W - titleW) / 2 - 14, y: titleY - 6, width: titleW + 28, height: 38, color: YELLOW });
    center('Your Command Center', bold, 30, titleY, INK);
    center(business.toUpperCase(), bold, 12, titleY - 34, MUTED);
    y = titleY - 76;
    para('One screen for the people who reached out, your email, your book, and what goes out on your feeds. Here is the whole of it, in the order the first week actually happens.', { size: 12, color: INK, gap: 12, indent: 24 });
    y -= 4;
    para('You say it. We shape it. It goes out at the hour each feed rewards.', { size: 12, font: ital, color: MUTED, indent: 24 });
    continue;
  }
  if (block.h1) h1(block.h1);
  else if (block.h2) h2(block.h2);
  else if (block.p) para(block.p);
  else if (block.b) bullet(block.b);
}

const bytes = await doc.save();
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, bytes);
console.log('Wrote', out, `(${bytes.length} bytes, ${doc.getPageCount()} pages)`);
