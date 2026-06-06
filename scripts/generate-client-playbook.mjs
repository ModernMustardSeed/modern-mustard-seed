// Generates the client-facing "What You Get" playbook PDF (a sales asset).
// Run from the project root:  node scripts/generate-client-playbook.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INK = rgb(0.086, 0.086, 0.086);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const RED = rgb(0.878, 0.188, 0.118);
const WHITE = rgb(1, 1, 1);

const C = [
  { cover: true },

  { h1: 'Welcome' },
  { p: 'Thank you for considering Modern Mustard Seed. This is a quick look at exactly what working together feels like: how we move from your idea to live software, how you stay in the loop the whole way, and what you can expect from us after launch.' },
  { p: 'We are a founder-led studio. You work directly with Sarah, not a queue. The promise is simple: real software, shipped, with no jargon and no surprises.' },

  { h1: 'How we work together' },
  { p: 'Five calm steps, start to finish.' },
  { h2: '1. Free website audit' },
  { b: 'We grade your current site and show you exactly what is costing you customers. No charge, no strings.' },
  { h2: '2. Your proposal' },
  { b: 'You get a clear proposal: the scope, the deliverables, and the price, broken into plain buckets. You can read it, ask questions, and sign online when you are ready.' },
  { h2: '3. Sign and start' },
  { b: 'You sign on a secure page and pay the deposit. That is the green light. Your project and your private portal are created instantly.' },
  { h2: '4. We build' },
  { b: 'You watch progress in your portal in real time: milestones, percent complete, and the current step. You are never left wondering where things stand.' },
  { h2: '5. Launch' },
  { b: 'We ship. You pay the remaining balance, and your work goes live. We stay available for what comes next.' },

  { h1: 'Your client portal' },
  { p: 'The moment you sign, you get a private portal. It is your home base for the whole project, and it stays yours.' },
  { b: 'Live progress: a clear ring and a milestone timeline that marks exactly where we are now.' },
  { b: 'Billing in one place: see your deposit and balance, and pay securely whenever you are ready.' },
  { b: 'Your signed proposal, downloadable as a PDF anytime.' },
  { b: 'Your files and deliverables, ready to grab.' },
  { b: 'Upcoming calls and one-tap booking.' },
  { b: 'An AI guide that answers your questions any hour of the day.' },
  { b: 'A simple way to leave a review when you are happy.' },

  { h1: 'Transparent pricing' },
  { p: 'No hidden costs and no guesswork. Every proposal splits cleanly into three buckets so you always know what you are paying and when.' },
  { b: 'To start: a deposit that begins the work.' },
  { b: 'On delivery: the balance, paid when your work is live.' },
  { b: 'Monthly (only if it applies): software or compute to keep things running, sized to what you actually use.' },
  { p: 'You see all of it before you sign. Nothing gets added behind your back.' },

  { h1: 'What we build' },
  { p: 'If it runs on software, we can build it. Common work:' },
  { b: 'Custom web apps and internal tools tailored to how you actually work.' },
  { b: 'AI tools and automation that take the busywork off your plate.' },
  { b: 'Marketing sites that load fast, rank, and convert.' },
  { b: 'Honest website audits with a clear plan to fix what is broken.' },
  { p: 'Not sure where to start? That is what the free audit and a quick call are for.' },

  { h1: 'After launch' },
  { p: 'Shipping is not the end of the relationship.' },
  { b: 'Your portal stays live, with your files, your signed proposal, and your project history.' },
  { b: 'We are one message away for changes, questions, and the next build.' },
  { b: 'If you loved the work, leaving a quick review helps the next small business find us. It means a great deal.' },

  { h1: 'Refer and earn' },
  { p: 'If you know other founders or small businesses who need this, you can earn by sending them our way.' },
  { b: '50 percent on every product sale you refer, and 10 percent of any build.' },
  { b: 'You get a simple dashboard, your own link, and free access to our products so you can speak to them honestly.' },
  { b: 'Apply anytime at modernmustardseed.com/partners.' },

  { h1: 'Getting started' },
  { p: 'Two easy ways in:' },
  { b: 'Run your free website audit at modernmustardseed.com/audit.' },
  { b: 'Or book a call and we will map it out together.' },
  { p: 'Reach Sarah directly at sarah@modernmustardseed.com. We are genuinely glad you are here, and we are rooting for you.' },
];

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);
const logo = await doc.embedPng(readFileSync('public/brand/logo-lockup.png'));

const W = 612, H = 792, M = 56, contentW = W - 2 * M;
let page, y;
const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
const ensure = (h) => { if (y - h < M) newPage(); };
const wrap = (text, font, size, maxW) => {
  const out = [];
  for (const raw of String(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
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
  const size = 10.5, lines = wrap(text, reg, size, contentW - 16);
  ensure(size * 1.45 * lines.length + 2);
  page.drawText('-', { x: M, y: y - size, size, font: bold, color: YELLOW });
  lines.forEach((ln, i) => {
    page.drawText(ln, { x: M + 14, y: y - size, size, font: reg, color: BODY });
    if (i < lines.length - 1) y -= size * 1.45;
  });
  y -= size * 1.45 + 3;
};
const h2 = (text) => { y -= 6; ensure(16); page.drawText(text, { x: M, y: y - 12, size: 13, font: bold, color: INK }); y -= 22; };
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
    // Comic frame.
    page.drawRectangle({ x: 12, y: 12, width: W - 24, height: H - 24, color: WHITE, borderColor: INK, borderWidth: 6 });
    const center = (text, font, size, yy, color) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (W - w) / 2, y: yy, size, font, color });
    };
    // Logo lockup (mascot + wordmark), centered near the top.
    const logoH = 158;
    const logoW = logo.width * (logoH / logo.height);
    page.drawImage(logo, { x: (W - logoW) / 2, y: H - 80 - logoH, width: logoW, height: logoH });
    // Eyebrow + title with a yellow marker swipe behind it.
    center('MODERN MUSTARD SEED', bold, 12, H - 80 - logoH - 34, RED);
    const titleY = H - 80 - logoH - 82;
    const titleW = bold.widthOfTextAtSize('What You Get', 34);
    page.drawRectangle({ x: (W - titleW) / 2 - 14, y: titleY - 6, width: titleW + 28, height: 40, color: YELLOW });
    center('What You Get', bold, 34, titleY, INK);
    y = titleY - 56;
    para('A founder-led studio that turns your idea into real, shipped software. Here is exactly what working together looks like, from the first free audit to launch and beyond.', { size: 12, color: INK, gap: 12, indent: 24 });
    y -= 4;
    para('You bring the seed. We build the tree.', { size: 12, font: ital, color: MUTED, indent: 24 });
    continue;
  }
  if (block.h1) h1(block.h1);
  else if (block.h2) h2(block.h2);
  else if (block.p) para(block.p);
  else if (block.b) bullet(block.b);
}

const bytes = await doc.save();
const hosted = path.join('public', 'downloads', 'modern-mustard-seed-playbook.pdf');
const local = path.join(os.homedir(), 'Downloads', 'Modern-Mustard-Seed-What-You-Get.pdf');
writeFileSync(hosted, bytes);
writeFileSync(local, bytes);
console.log('Wrote', hosted, 'and', local, '(' + bytes.length + ' bytes)');
