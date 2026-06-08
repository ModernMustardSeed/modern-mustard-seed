// Generates the Modern Mustard Seed discovery + scope call script PDF.
// Run from the project root:  node scripts/generate-call-script.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INK = rgb(0.086, 0.086, 0.086);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);
const RED = rgb(0.878, 0.188, 0.118);

const C = [
  { cover: true },

  { h1: '1. Before the call (2 min)' },
  { p: 'Walk in informed. It signals competence and saves everyone time.' },
  { b: 'Run their website audit. Have the score and top three fixes open.' },
  { b: 'Skim their site, socials, and Google profile. Note one specific, genuine observation.' },
  { b: 'Decide your hunch on a path (no site, closed builder, drowning in manual work, needs an agent, has an idea, prefers monthly).' },

  { h1: '2. Open and frame (3 min)' },
  { b: '"Thanks for making time. Before we start, here is how I work: I listen first, I do not pitch. By the end we will both know if this is a fit, and if it is, I will send a clear proposal with scope and price. Sound good?"' },
  { b: 'One genuine observation about their business or site.' },
  { b: '"Tell me about the business in your own words."' },

  { h1: '3. The business' },
  { b: 'What do you do, and who do you do it for?' },
  { b: 'How do customers find and buy from you today?' },
  { b: 'What is working well right now that we should not touch?' },
  { b: 'Roughly, where is the business: just starting, steady, or scaling?' },

  { h1: '4. The problem and why now' },
  { b: 'What made you reach out now? What changed?' },
  { b: 'What is the one thing that, if it were handled, would matter most?' },
  { b: 'What is this problem costing you, in time, money, or missed customers?' },
  { b: 'What have you already tried? What happened?' },

  { h1: '5. The outcome' },
  { b: 'Imagine this is solved. What is different? Walk me through a day.' },
  { b: 'How will we know it worked? What is the number or signal?' },
  { b: 'Who else feels the win: you, your team, your customers?' },

  { h1: '6. Scope (the core)' },
  { p: 'Get specific. Separate must-haves from nice-to-haves out loud.' },
  { b: 'Walk me through exactly what you picture. Page by page, or step by step.' },
  { b: 'What absolutely must be there for version one? What can wait?' },
  { b: 'Show me two or three examples you love, and what you love about each.' },
  { b: 'What would make you say "this is exactly it"?' },
  { b: 'Anything that is explicitly out of scope, or off the table?' },

  { h1: '7. Access, tools, and data' },
  { b: 'Do you have a website now? On what platform? Who controls it?' },
  { b: 'Who owns the domain and the domain login?' },
  { b: 'What tools do you use today (CRM, calendar, email, payments, booking)?' },
  { b: 'Where does your customer or product data live?' },
  { b: 'For an agent or automation: phone number, hours, calendar, where leads should land.' },

  { h1: '8. Brand and audience' },
  { b: 'Do you have a logo, colors, and fonts? Can you send them?' },
  { b: 'Who exactly is your customer? How do they talk?' },
  { b: 'Three words for how the brand should feel.' },
  { b: 'Who do you admire in your space, and who do you want to look nothing like?' },

  { h1: '9. Timeline, budget, decision' },
  { b: 'Is there a date this needs to be live by? What is driving it?' },
  { b: 'Have you set aside a budget range for this? (Give a range back to calibrate.)' },
  { b: 'Who else is part of this decision? What do they need to see?' },
  { b: 'What would make this a no for you?' },

  { h1: '10. Framing money (say it plainly)' },
  { p: 'No hedging. Anchor, then offer the model that fits.' },
  { b: 'One-time build: "Most projects like this run between X and Y, set by final scope. 50 percent to start, 50 percent on delivery."' },
  { b: 'Monthly / subscription: "If you would rather not pay a large fee upfront, we can run it as a monthly engagement: I build, iterate, and operate it month to month."' },
  { b: 'Hybrid: "A smaller setup fee, then a monthly to keep building and running it."' },
  { b: 'Software and compute (AI, voice, hosting) is billed at cost and moves with usage. I will estimate it.' },
  { b: 'Watch their reaction to the anchor. Note it. Do not discount on the call.' },

  { h1: '11. Close' },
  { b: '"Here is what happens next: I will put together a proposal with the scope, the price, and the timeline, and send it within [X] days. You can read it, sign, and pay the deposit online, and we start."' },
  { b: 'Confirm the best email for the proposal and portal.' },
  { b: 'Set one clear next date: "I will have it to you by [day]. Can you review by [day]?"' },
  { b: 'Thank them. Mean it.' },

  { h1: '12. After the call (5 min)' },
  { b: 'Save the audit to the client in admin (keeps it on file).' },
  { b: 'Build the proposal from the audit. Pick the path that fits, set scope and price.' },
  { b: 'Create the client and project, set a launch target.' },
  { b: 'Send for signature. Watch the follow-up radar.' },

  { h1: 'Quick scope checklist' },
  { p: 'Before you end the call, make sure you can answer all of these. If not, ask.' },
  { b: 'What exactly are we building (v1), and what is out of scope?' },
  { b: 'What does success look like, in a number or signal?' },
  { b: 'Hard deadline, and what is driving it?' },
  { b: 'Budget range and preferred model (one-time, monthly, hybrid)?' },
  { b: 'Who owns the domain, accounts, and data, and can grant access?' },
  { b: 'Brand assets: do they exist, who sends them?' },
  { b: 'Who decides, and what do they need to see?' },
];

const doc = await PDFDocument.create();
const reg = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

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
const h1 = (text) => {
  newPage();
  page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: YELLOW });
  page.drawRectangle({ x: 0, y: H - 67, width: W, height: 3, color: INK });
  page.drawText(text, { x: M, y: H - 42, size: 19, font: bold, color: INK });
  y = H - 64 - 34;
};

for (const block of C) {
  if (block.cover) {
    newPage();
    page.drawRectangle({ x: 0, y: H - 130, width: W, height: 130, color: YELLOW });
    page.drawRectangle({ x: 0, y: H - 134, width: W, height: 4, color: INK });
    page.drawText('MODERN MUSTARD SEED', { x: M, y: H - 72, size: 13, font: bold, color: INK });
    page.drawText('Discovery + Scope Call Script', { x: M, y: H - 104, size: 23, font: bold, color: INK });
    y = H - 185;
    para('A guide for client calls. Use it to cover everything, hear the real problem, and walk away with the right scope. Read the questions in your own voice. Listen more than you talk.', { size: 12, color: INK, gap: 10 });
    para('Founder-led. Direct. No hedging.', { size: 11, font: ital, color: MUTED });
    continue;
  }
  if (block.h1) h1(block.h1);
  else if (block.p) para(block.p);
  else if (block.b) bullet(block.b);
}

const bytes = await doc.save();
const out = path.join(os.homedir(), 'Downloads', 'Modern-Mustard-Seed-Discovery-Call-Script.pdf');
writeFileSync(out, bytes);
console.log('Wrote', out, '(' + bytes.length + ' bytes)');
