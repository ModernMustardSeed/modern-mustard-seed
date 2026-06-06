// Generates the Modern Mustard Seed Operations Playbook PDF.
// Run from the project root:  node scripts/generate-playbook.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INK = rgb(0.086, 0.086, 0.086);
const RED = rgb(0.878, 0.188, 0.118);
const BODY = rgb(0.227, 0.216, 0.2);
const MUTED = rgb(0.54, 0.515, 0.47);
const YELLOW = rgb(0.96, 0.717, 0);

// Content model: { h1 } new section page, { h2 } heading, { p } paragraph, { b } bullet, { sp } spacer
const C = [
  { cover: true },

  { h1: '1. The big picture' },
  { p: 'Everything is one connected funnel, and every part is keyed by email. The marketing site, the admin, the client portal, and the partner portal all read the same Supabase tables, so what happens in one place shows up in the others automatically.' },
  { p: 'The path a customer travels:' },
  { b: 'Marketing site (pop-art brand) draws them in.' },
  { b: 'Free Website Audit grades their site and feeds them into the pipeline.' },
  { b: 'You build a Proposal, send it for signature.' },
  { b: 'They sign and pay the 50% deposit on a public link.' },
  { b: 'A client record + a project are created automatically (both your admin and their portal).' },
  { b: 'You deliver. They pay the balance.' },
  { b: 'Two days later they are auto-asked for a review (site + Google).' },

  { h1: '2. Admin command center' },
  { p: 'Log in at /admin (email + password). Tabs across the top:' },
  { h2: 'Overview' },
  { b: 'Revenue this month + all time, sales count, new leads, upcoming calls.' },
  { b: 'Open proposals card: count + outstanding dollar value, links to Proposals.' },
  { b: 'Follow-up radar: proposals that need a nudge (sent 3+ days unsigned, or signed 2+ days with no deposit).' },
  { b: 'Daily AI brief and your monthly targets.' },
  { h2: 'Pipeline (/admin/leads)' },
  { b: 'Every lead from audits, build-queue, and contact.' },
  { b: 'Click a lead to open the drawer: details, status, your private notes.' },
  { b: 'Activity timeline: proposal created, signed, deposit paid, balance paid, project created, all in one view.' },
  { h2: 'Audit (/admin/audit)' },
  { b: 'Run the same website audit visitors get.' },
  { b: 'Email the report to a lead as a one-off personal offer (not a drip).' },
  { b: 'Hand it off into a proposal with one click.' },
  { h2: 'Proposals (/admin/proposals)' },
  { b: 'Pick a path or add services from the menu; edit scope, price, and the software/compute line.' },
  { b: 'Draft the words with AI (it never invents prices).' },
  { b: 'Three-bucket pricing: to-start deposit, balance on delivery, monthly.' },
  { b: 'Save, set status, and Send for signature (emails the client a link).' },
  { b: 'Deposit panel: create + email the deposit link, mark paid, and Send balance invoice.' },
  { b: 'Saved list shows Sent to Signed to Paid, with Copy link and Resend on each.' },
  { h2: 'Projects (/admin/projects)' },
  { b: 'Board by status: discovery, building, review, launched, paused.' },
  { b: 'Edit progress, milestones (deliverables), and launch date.' },
  { b: 'What you set here shows in the client portal instantly.' },
  { b: 'Marking a project Launched triggers the post-delivery review ask.' },
  { h2: 'Reviews (/admin/testimonials)' },
  { b: 'Add reviews yourself, or approve ones clients submit from their portal.' },
  { b: 'Pending submissions float to the top with Approve + publish.' },
  { b: 'Published reviews appear on the homepage with Google review schema.' },
  { h2: 'Outreach and Partners' },
  { b: 'Outreach: prospect list + AI-drafted messages queued for your approval.' },
  { b: 'Partners: approve applicants and manage affiliates.' },

  { h1: '3. The money loop' },
  { p: 'Two payments, both through Stripe, both recorded to your revenue automatically.' },
  { h2: 'Deposit (to start)' },
  { b: 'Proposal accepted (signed) -> client pays the 50% deposit.' },
  { b: 'Recorded to revenue, the linked lead is marked won, and the client + project are provisioned.' },
  { b: 'You can also generate/email the deposit link manually, or mark it paid if taken offline.' },
  { h2: 'Balance (on delivery)' },
  { b: 'When the build is delivered, send the balance invoice from the proposal, or the client pays it from their portal.' },
  { b: 'Recorded to revenue and marked paid in full.' },

  { h1: '4. Proposal, signature, provisioning' },
  { p: 'When you Send for signature, the client gets an email linking to a public proposal page (/proposal/[token], no login).' },
  { b: 'They review the full proposal in the brand look.' },
  { b: 'They type their name to sign (recorded with time + IP as the audit trail).' },
  { b: 'They pay the 50% deposit right there.' },
  { b: 'A branded PDF of the signed proposal is emailed to them and to you.' },
  { b: 'Their client record + a project (deliverables seeded from the services) are created on both sides.' },
  { b: 'They get a magic link into their portal.' },

  { h1: '5. Client portal' },
  { p: 'Clients sign in passwordless at /portal/login (magic link by email). Their workspace shows:' },
  { b: 'Project HQ: progress ring, milestone timeline with the current step marked Now.' },
  { b: 'Billing card: deposit and balance state, a Pay remaining balance button, and Download signed proposal.' },
  { b: 'Files and deliverables, and any playbook downloads they bought.' },
  { b: 'Upcoming calls, and a one-tap booking link.' },
  { b: 'Leave a review (goes to you for approval first).' },
  { b: 'An AI guide that answers questions and gives a tour.' },

  { h1: '6. The reviews engine' },
  { b: 'Client leaves a review in their portal -> it lands as pending.' },
  { b: 'You approve it in admin -> it publishes on the homepage with star + review schema.' },
  { b: 'After approving, they are nudged to also post it on Google.' },
  { b: 'Share modernmustardseed.com/review anywhere (it redirects to your Google review form).' },
  { b: 'Two days after a build is paid in full or marked Launched, the client is auto-asked for a review (once, deduped).' },
  { b: 'A Review on Google link sits in the footer.' },

  { h1: '7. Partners and affiliates' },
  { p: 'A partner applies at /partners. You approve them in admin (Partners). They get a magic link to their dashboard at /partners/hq.' },
  { h2: 'Their dashboard' },
  { b: 'Their unique referral code and ready-to-copy links for every offer.' },
  { b: 'Clicks, sales, payable now, and earned all time.' },
  { b: 'Free access to every product (live tools + playbook PDFs) so they can speak to them honestly.' },
  { h2: 'How they earn' },
  { b: '50 percent on every product sale, 10 percent of any build they send.' },
  { b: 'Tracking: ?ref=CODE on any link. Last touch within 60 days wins.' },
  { b: 'A commission becomes payable once the refund window passes. Refunds claw it back automatically.' },

  { h1: '8. Emails' },
  { p: 'Every email runs through one pop-art template (mustard header with the mascot, white comic card, black ink, red accents). The set:' },
  { b: 'Audit report, proposal send, signed copy (PDF attached), deposit invoice, balance invoice.' },
  { b: 'Magic-link sign-in, program and affiliate welcome, store receipts, contact reply, booking confirmation, newsletter.' },
  { b: 'Post-delivery review request (2-day delay).' },
  { b: 'Internal notifications to you: new lead, signed, deposit/balance paid, new pending review.' },

  { h1: '9. Where things live (reference)' },
  { h2: 'Key routes' },
  { b: 'Admin: /admin (overview, leads, audit, proposals, projects, testimonials, outreach, partners).' },
  { b: 'Client: /portal and /portal/login.' },
  { b: 'Partner: /partners (apply) and /partners/hq (dashboard).' },
  { b: 'Public proposal: /proposal/[token]. Sample: /sample-proposal. Reviews: /review.' },
  { h2: 'Supabase tables' },
  { b: 'leads, clients, projects, proposals, orders, testimonials.' },
  { b: 'affiliates, commissions, affiliate_clicks, prospects, outreach_messages, entitlements.' },
  { h2: 'Environment variables that matter' },
  { b: 'ANTHROPIC_API_KEY (audits + AI drafting), RESEND_API_KEY (all email).' },
  { b: 'STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (deposits, balances, store).' },
  { b: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (all data).' },
  { b: 'GOOGLE_REVIEW_URL (optional override; the review link is also set in code).' },
  { b: 'Admin login credentials (ADMIN_EMAIL / ADMIN_PASSWORD).' },

  { h1: '10. Routine plays' },
  { h2: 'Lead to paid build' },
  { b: '1. Lead lands (audit/build-queue/contact). Open it in Pipeline.' },
  { b: '2. Run an audit if useful, then build a Proposal.' },
  { b: '3. Send for signature. Watch the follow-up radar.' },
  { b: '4. They sign + pay deposit. Client + project appear automatically.' },
  { b: '5. Build it on the Projects board (update milestones + progress).' },
  { b: '6. Mark Launched and/or send the balance invoice. They pay in full.' },
  { b: '7. The review ask goes out on its own two days later.' },
  { h2: 'Publish a review' },
  { b: 'A client submits from their portal -> approve it in admin Reviews -> it goes live with schema.' },
  { h2: 'Onboard a partner' },
  { b: 'They apply -> approve in admin -> they get free access + their links and start earning.' },
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
    page.drawRectangle({ x: 0, y: H - 120, width: W, height: 120, color: YELLOW });
    page.drawRectangle({ x: 0, y: H - 124, width: W, height: 4, color: INK });
    page.drawText('MODERN MUSTARD SEED', { x: M, y: H - 70, size: 13, font: bold, color: INK });
    page.drawText('Operations Playbook', { x: M, y: H - 100, size: 26, font: bold, color: INK });
    y = H - 180;
    para('How the whole system works: the marketing site, the admin command center, the client portal, the partner portal, payments, and the reviews engine. One connected funnel, keyed by email.', { size: 12, color: INK, gap: 10 });
    para('Built by Sarah Scarano. For Sarah Scarano.', { size: 10, font: ital, color: MUTED });
    continue;
  }
  if (block.h1) h1(block.h1);
  else if (block.h2) h2(block.h2);
  else if (block.p) para(block.p);
  else if (block.b) bullet(block.b);
  else if (block.sp) y -= 10;
}

const bytes = await doc.save();
const out = path.join(os.homedir(), 'Downloads', 'Modern-Mustard-Seed-Operations-Playbook.pdf');
writeFileSync(out, bytes);
console.log('Wrote', out, '(' + bytes.length + ' bytes)');
