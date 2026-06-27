/* Generates "The Voice Concierge Business Playbook" — a premium MMS store
   product ($497). PDF learning guide + a separate interactive HTML companion.
   Run: node scripts/make-voice-concierge-playbook.mjs */
import PDFDocument from "pdfkit";
import fs from "fs";
import os from "os";
import path from "path";

const OUT_DIR = path.join(os.homedir(), "Downloads");
const PDF = path.join(OUT_DIR, "Voice-Concierge-Business-Playbook.pdf");
const STORE_PDF = path.join(os.homedir(), "modern-mustard-seed", "store-assets", "MMS_Voice_Concierge_Business_Playbook.pdf");
fs.mkdirSync(path.dirname(STORE_PDF), { recursive: true });

const INK = "#1a2238", GOLD = "#c8964e", GOLD_D = "#a8772f", BODY = "#23262e", GRAY = "#6b6b6b", LINE = "#e3ddcf", CREAM = "#f7f3ea";
const doc = new PDFDocument({ size: "LETTER", margins: { top: 60, left: 60, right: 60, bottom: 64 } });
const streams = [fs.createWriteStream(PDF), fs.createWriteStream(STORE_PDF)];
streams.forEach((s) => doc.pipe(s));
const LEFT = doc.page.margins.left, WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const bottom = () => doc.page.height - doc.page.margins.bottom;
const ensure = (h) => { if (doc.y + h > bottom()) doc.addPage(); };

function h1(t, sub) {
  doc.addPage();
  doc.save().rect(0, 0, doc.page.width, 128).fill(INK).restore();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10).text("THE VOICE CONCIERGE BUSINESS PLAYBOOK", LEFT, 40, { characterSpacing: 1.5 });
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(23).text(t, LEFT, 64, { width: WIDTH });
  doc.y = 156; doc.x = LEFT;
  if (sub) { doc.fillColor(GRAY).font("Helvetica-Oblique").fontSize(11).text(sub, LEFT, doc.y, { width: WIDTH }); doc.moveDown(0.8); }
}
function h2(t) { doc.moveDown(0.7); ensure(34); doc.font("Helvetica-Bold").fontSize(14).fillColor(INK).text(t, LEFT, doc.y, { width: WIDTH }); doc.moveDown(0.1); doc.save().moveTo(LEFT, doc.y).lineTo(LEFT + 34, doc.y).lineWidth(2.5).strokeColor(GOLD).stroke().restore(); doc.moveDown(0.4); }
function p(t, o = {}) { ensure(20); doc.font(o.bold ? "Helvetica-Bold" : "Helvetica").fontSize(o.size || 10.5).fillColor(o.color || BODY).text(t, LEFT, doc.y, { width: WIDTH, lineGap: 3, align: o.align || "left" }); doc.moveDown(o.gap ?? 0.45); }
function bullet(t, label) {
  ensure(16); const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(GOLD).text("›", LEFT, y);
  if (label) { doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(label + "  ", LEFT + 16, y, { continued: true }); doc.font("Helvetica").fillColor(BODY).text(t, { width: WIDTH - 16, lineGap: 3 }); }
  else doc.font("Helvetica").fontSize(10.5).fillColor(BODY).text(t, LEFT + 16, y, { width: WIDTH - 16, lineGap: 3 });
  doc.moveDown(0.25);
}
function num(n, t) { ensure(18); const y = doc.y; doc.save().circle(LEFT + 8, y + 7, 9).fill(GOLD).restore(); doc.fillColor("#fff").font("Helvetica-Bold").fontSize(9).text(String(n), LEFT + 4.5, y + 3); doc.font("Helvetica").fontSize(10.5).fillColor(BODY).text(t, LEFT + 26, y, { width: WIDTH - 26, lineGap: 3 }); doc.moveDown(0.35); }
function callout(title, body) {
  const innerW = WIDTH - 28;
  doc.font("Helvetica").fontSize(10).fillColor(BODY);
  const bh = doc.heightOfString(body, { width: innerW, lineGap: 3 });
  const h = bh + 42; ensure(h + 8); const y = doc.y;
  doc.save().roundedRect(LEFT, y, WIDTH, h, 8).fill(CREAM).restore();
  doc.save().roundedRect(LEFT, y, 5, h, 2).fill(GOLD).restore();
  doc.fillColor(GOLD_D).font("Helvetica-Bold").fontSize(9.5).text(title.toUpperCase(), LEFT + 16, y + 13, { characterSpacing: 1 });
  doc.fillColor(BODY).font("Helvetica").fontSize(10).text(body, LEFT + 16, y + 28, { width: innerW, lineGap: 3 });
  doc.y = y + h + 10; doc.x = LEFT;
}
function table(headers, rows, widths) {
  const totalW = WIDTH; const cw = widths.map((w) => w * totalW);
  ensure(24); let y = doc.y;
  doc.save().rect(LEFT, y, totalW, 22).fill(INK).restore();
  let x = LEFT; headers.forEach((hd, i) => { doc.fillColor("#fff").font("Helvetica-Bold").fontSize(8.5).text(hd, x + 7, y + 7, { width: cw[i] - 12 }); x += cw[i]; });
  y += 22;
  rows.forEach((r, ri) => {
    const cellH = Math.max(...r.map((c, i) => doc.font("Helvetica").fontSize(8.5).heightOfString(c, { width: cw[i] - 12, lineGap: 2 }))) + 12;
    if (y + cellH > bottom()) { doc.addPage(); y = doc.y; }
    if (ri % 2 === 0) doc.save().rect(LEFT, y, totalW, cellH).fill(CREAM).restore();
    x = LEFT; r.forEach((c, i) => { doc.fillColor(i === 0 ? INK : BODY).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).text(c, x + 7, y + 6, { width: cw[i] - 12, lineGap: 2 }); x += cw[i]; });
    doc.save().moveTo(LEFT, y + cellH).lineTo(LEFT + totalW, y + cellH).lineWidth(0.5).strokeColor(LINE).stroke().restore();
    y += cellH;
  });
  doc.y = y + 8; doc.x = LEFT;
}

/* ============== COVER ============== */
doc.save().rect(0, 0, doc.page.width, doc.page.height).fill(INK).restore();
doc.save().rect(0, 0, doc.page.width, 8).fill(GOLD).restore();
doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12).text("MODERN MUSTARD SEED", LEFT, 120, { characterSpacing: 2 });
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(40).text("The Voice Concierge", LEFT, 200, { width: WIDTH });
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(40).text("Business Playbook", LEFT, 246, { width: WIDTH });
doc.fillColor("#c9cfdb").font("Helvetica").fontSize(13).text("Build and sell 24/7 AI phone agents to local businesses and franchises as a $500 to $2,500 a month recurring service. The exact system, tech, pricing, and sales scripts we use.", LEFT, 320, { width: WIDTH - 40, lineGap: 4 });
doc.save().roundedRect(LEFT, 430, 250, 44, 8).fill(GOLD).restore();
doc.fillColor(INK).font("Helvetica-Bold").fontSize(13).text("A done-with-you operator's manual", LEFT + 16, 446);
doc.fillColor("#8b93a6").font("Helvetica").fontSize(10).text("by Sarah Scarano  ·  modernmustardseed.com", LEFT, 690);
doc.fillColor("#8b93a6").font("Helvetica").fontSize(9).text("Includes the interactive HTML companion: ROI + pricing calculator, build checklist, and swipe templates.", LEFT, 712, { width: WIDTH });

/* ============== 1. THE OPPORTUNITY ============== */
h1("The Opportunity", "Why a missed phone call is the most expensive problem in local business, and the cheapest to fix.");
p("Every local service business runs on the phone. The plumber, the painter, the restaurant, the clinic, the law office. And every one of them is bleeding money through the same hole: the calls they never answer.", { bold: true });
p("The numbers are brutal and consistent across verticals. Up to 62% of calls to small home-services businesses go unanswered. 85% of callers who reach voicemail do not leave a message. They simply call the next business on the list. For a home-services contractor, that is $45,000 to $120,000 a year walking out the door. For a multi-location franchise, it is millions.");
p("A 24/7 AI voice concierge closes that hole. It answers every call in the brand's voice, books the job or the order, captures the big lead, and never sleeps. The technology is finally good enough that a caller often cannot tell. And almost none of these businesses have one yet.");
callout("The one-sentence pitch", "You install an AI receptionist that answers every call 24/7, books the work, and shows the owner exactly how much revenue it recovered, for a fraction of the cost of one missed job.");
h2("Why this is a business, not a feature");
bullet("Recurring revenue. You charge $500 to $2,500 per location per month. Ten locations is a six-figure book off one logo.", "It pays monthly.");
bullet("The demo sells itself. You hand a prospect a phone number, they call it, and the objection evaporates. No deck survives a live call that just booked them a job.", "It is undeniable.");
bullet("The build is templated. After your first one, each new vertical is a re-skin and a redeploy, not a from-scratch project. This playbook hands you that template.", "It is repeatable.");
bullet("The buyers are everywhere. Every town has hundreds of these businesses, plus national franchises with hundreds of locations each.", "The market is endless.");

/* ============== 2. THE WHITE SPACE ============== */
h1("The White Space", "Where the money is, and who has already taken the easy seats.");
p("The giants took the megabrand drive-thrus. Voice AI at Wendy's, White Castle, and the national QSR chains is being built by Google, Nvidia-backed startups, and SoundHound. Do not compete there.");
p("The white space is everyone else: the phone-heavy, appointment-driven, high-ticket local businesses and the mid-size franchises that are too small to build in-house and too busy to notice they are losing money. That is your market.");
h2("The ideal customer profile");
bullet("Phone-driven. The phone is how they get work: home services, clinics, salons, auto, legal, catering-heavy restaurants.");
bullet("High ticket or high volume. One recovered call is worth $50 to $5,000, so the ROI math is trivial.");
bullet("Multi-location or franchised. One sale becomes ten. Franchise vendor programs (like Authority Brands' BuyMax) are the scale play.");
bullet("No voice AI yet. They are still sending callers to voicemail or a stretched front desk.");
callout("Where to start tomorrow", "Pick ONE vertical you can speak to, build ONE demo (this playbook shows you how), and call ten local owners plus one franchise. The demo number does the selling. You only need one yes to fund the month.");
h2("Verticals ranked by ease of sale");
table(["Vertical", "Why it sells", "Avg recovered call"], [
  ["Home services", "Emergencies, after-hours, 62% miss rate, high tickets", "$300 to $1,200"],
  ["Painting / remodel", "Estimate-driven, big projects, color visualizer wow", "$2,800 project"],
  ["Restaurants (catering)", "Phone orders + catering leads lost at the lunch rush", "$20 order / $500 catering"],
  ["Clinics / dental / vet", "Appointment no-answer = lost patient", "$200 to $900 visit"],
  ["Legal / professional", "One missed intake call is a $5,000+ case", "$1,000 to $10,000"],
], [0.24, 0.5, 0.26]);

/* ============== 3. THE SYSTEM ============== */
h1("The System", "What you actually build. One skeleton, every vertical.");
p("Every voice concierge is the same five parts wearing different clothes. Learn the skeleton once and you can ship any vertical.");
num(1, "A branded marketing site. Hero, the missed-call stat band, an interactive ROI calculator, a live in-browser voice agent, features, and pricing with a 30-day guarantee.");
num(2, "A live Vapi agent. A real web call plus a real phone number, trained on the brand's price book and call flow. This is the demo that closes.");
num(3, "An operations dashboard. The owner logs in and sees revenue recovered, jobs or estimates booked, the project pipeline, a fleet rollup, and every call with its transcript and recording.");
num(4, "One signature moment. The award-tier feature tuned to the vertical (after-hours emergency capture for plumbing, a live color visualizer for painting, a corporate promo push for restaurants).");
num(5, "A go-to-market kit. The outreach playbook: who to email, what to say, and the demo number that does the heavy lifting.");
h2("The tech stack (deliberately lean)");
bullet("Vapi for the voice agent (assistant + web SDK + a provisioned phone number).", "Voice:");
bullet("Next.js 15 + Tailwind v4 on Vercel. One repo, one deploy.", "Web:");
bullet("An in-memory seeded store for the demo (zero keys, instant). Add Supabase only when a paying client needs real persistence.", "Data:");
bullet("Anthropic Claude (via Vapi) as the brain. Deepgram nova-3 multilingual for the ears.", "Brain:");
callout("The domain remap (the only real thinking)", "Every vertical maps onto the same parts. The menu becomes the price book. The order becomes the job. The catering lead becomes the big replacement or whole-home project. The signature changes. That is it. The companion HTML includes a fill-in remap worksheet.");

/* ============== 4. THE BUILD ============== */
h1("The Build Runbook", "From empty folder to a number you can call, in one focused session.");
p("This is the exact sequence. If you build with an AI coding assistant (we use Claude Code), you can hand it this runbook and the template repo and move fast.");
num(1, "Clone the closest proven build and remap the domain. Do not start from scratch. Copy the infra (configs, the Vapi server handler, formatting helpers, the voice widget) and write only the domain: types, the price book, the seed data, the Vapi tools, the dashboard, and the landing copy.");
num(2, "Wire the Vapi tools. One route per tool: get_services, check_availability, get_customer, book the job, capture the big lead, branch info, and escalate (warm transfer). They all funnel through one shared handler that verifies the secret and validates input.");
num(3, "Build green. Install, typecheck, and production-build until clean. Then commit and deploy to Vercel. Note the live URL.");
num(4, "Create the assistant. Run the setup script with your Vapi key and the deployed URL. It registers the assistant, its tools, the system prompt, and the voice.");
num(5, "Scope a public key and provision a number. Create a public token restricted to your assistant (this prevents the number-one bug: instant call drops). Then provision a phone number and attach it to the assistant.");
num(6, "Set the environment variables and redeploy. Public key, assistant id, app URL, tools base URL, and the demo phone number.");
num(7, "Verify for real. The web call endpoint returns a 201. The landing page shows the number and the widget. A tool route returns real data. Screenshot the signature feature.");
callout("Hard-won gotchas", "Use the dated model id (claude-haiku-4-5-...). Keep the assistant name under 40 characters. Scope the public token to the assistant or the call drops. Free phone numbers are scarce, so the brand's real area code is usually taken (area code is cosmetic for a demo). All your demos share one Vapi wallet, so turn on auto-reload before any live pitch.");
h2("The credibility rule for the dashboard");
p("Make \"revenue recovered\" the missed-and-saved subset, not every booked dollar. Count emergencies and after-hours always, plus about half of daytime overflow (the industry miss rate is ~62%). Keep the annualized number believable for a single location. A branch that appears to recover more than its own revenue reads as fake and kills trust.");

/* ============== 5. VERTICAL PLAYBOOKS ============== */
h1("Vertical Playbooks", "The signature move and the pitch for each market.");
h2("Home services (plumbing, HVAC, electric)");
bullet("Signature: after-hours emergency capture. 48% of plumbing emergencies come in after hours, exactly when a human misses them. The dashboard hero shows after-hours dollars recovered.");
bullet("Pitch: \"Never miss the 2am burst pipe again.\" Have them call and say their water heater burst. Watch it triage, book, and warm-transfer.");
bullet("Buyer: the owner, or for franchises, whoever owns call-center operations and the vendor program.");
h2("Painting and remodeling");
bullet("Signature: a live color visualizer. The homeowner repaints a room or their exterior on screen, then books an estimate with their palette attached. It is the most engaging thing on any painter's site and it captures the lead.");
bullet("Pitch: \"Every call answered, every color imagined.\" The free in-home estimate is the whole game; the concierge books it before they hang up.");
h2("Restaurants (catering and phone orders)");
bullet("Signature: corporate catering capture + a promo push. Phone orders and catering leads are lost at the lunch rush; the concierge catches all of them in the brand voice.");
bullet("Pitch: aim at mid-size chains that are phone-and-catering heavy and have no voice AI yet. Start with one store, then roll up the brand.");
callout("Make one signature unforgettable", "Award-tier means one moment that makes them say \"how did you do that.\" Build that, score it honestly, and verify it on real devices. The rest can be clean and quiet. The signature is what they remember and repeat.");

/* ============== 6. PRICING ============== */
h1("Pricing and Packaging", "What to charge, and why one saved job pays for the year.");
p("Price on value, not on your cost. One recovered emergency or one booked project is worth more than a year of the service. That makes the buying decision easy and your margins healthy.");
table(["Tier", "Price", "For"], [
  ["Single location", "$549 to $599 / mo + ~$750 setup", "One business, live in about a week"],
  ["Multi-location", "$449 to $499 / mo per location", "The brand rollout, one fleet dashboard"],
  ["Franchise / enterprise", "Custom + dedicated rollout", "Every location, CRM integration, SLAs"],
], [0.3, 0.4, 0.3]);
bullet("Add a setup fee. It funds the build and filters tire-kickers. Waive it at ten-plus locations to win the rollout.");
bullet("Include a usage allotment (e.g. 1,000 answered calls per location per month), then a simple per-call rate. Bill telephony at cost.");
bullet("Offer the 30-day pilot guarantee: recover more than the fee in the first month or that month is free. It removes all risk and you will rarely pay it out.");
callout("The math that closes", "At $549 a month, the service costs about $18 a day. The average missed call in home services is worth $1,200. You are asking them to spend the price of one sandwich a day to stop losing thousand-dollar jobs. Say it exactly like that.");

/* ============== 7. SELLING IT ============== */
h1("Selling It", "The demo is the pitch. Everything else is logistics.");
p("You are not selling software. You are handing someone a phone number that answers like their best employee and never clocks out. The entire sales motion is: get them to call it.");
h2("The motion");
num(1, "Build the branded demo for a specific target (their name on it, their city, their services).");
num(2, "Reach the right person. For an independent, that is the owner. For a franchise, it is whoever owns call-center operations, marketing, or the vendor program.");
num(3, "Send the one-line pitch with the number. \"I built you a working demo. Call it and say your pipe burst.\" Honest framing: it is a demo built for them, not a live install. That candor builds trust.");
num(4, "Follow up the hour they call the number. Lead with the stat that matters: one recovered job pays for the year.");
num(5, "Close with the pilot guarantee and a setup date.");
h2("Swipe: the first email");
p("Subject: I built you a 24/7 AI receptionist. Call it: [number]", { bold: true, size: 9.5 });
p("Hi [name], you know the number that hurts: most callers who hit voicemail just call the next [trade]. I built a working 24/7 voice concierge for [business] and put it on a live demo number. Call [number] and [vertical action]. It books the job and never sleeps. It is a demo I built so you can hear it, not a live install. See the dashboard: [url]. Worth 15 minutes? And to make it easy: recover more than the fee in 30 days or that month is free. Best, [you]", { size: 9.5, color: GRAY });
callout("Run the franchise track in parallel", "One local owner who loves it becomes your reference for the corporate conversation. National franchises buy through vendor programs, so learn the name of theirs and ask to get on the approved list. That single move turns one sale into the whole brand.");

/* ============== 8. SCALE + 30-DAY PLAN ============== */
h1("Scale, and Your First 30 Days", "Productize the build, then go win your first logo.");
h2("How this compounds");
bullet("Templatize. Your second build is a re-skin of your first. Keep a clean template repo and a domain-remap worksheet (in the companion).");
bullet("White-label. Sell the dashboard and the agent under an agency brand, or under the client's brand as \"their\" system.");
bullet("Productize up. Add multilingual, a CRM sync, a daily owner briefing, and the signature feature as paid tiers.");
bullet("Go vertical-deep. Own one trade in one region, collect references, then expand by vertical or by geography.");
h2("Your first 30 days");
num(1, "Days 1 to 7: pick one vertical, build one demo, get the number live, and call it yourself ten times until it is sharp.");
num(2, "Days 8 to 14: list 20 local targets and one franchise. Personalize the demo for the top 5.");
num(3, "Days 15 to 21: send the emails and the demo number. Follow up fast. Book three calls.");
num(4, "Days 22 to 30: run the pilot guarantee on your first yes. Install, show the recovered-revenue dashboard, and ask for the referral.");
callout("The companion does the work with you", "The included HTML companion has the ROI and pricing calculator to size any prospect in seconds, the full build checklist, the domain-remap worksheet, and the swipe templates ready to copy. Open it in any browser. Use it on every deal.");
doc.moveDown(1);
p("You now have the entire system. The technology is ready, the buyers are everywhere, and the demo closes for you. Go build one, and call your first prospect this week.", { bold: true });
/* ============== 9. VAPI SETUP ============== */
h1("Appendix A: The Vapi Setup, Step by Step", "The exact technical sequence to put a real number on a real agent.");
p("Vapi is the voice platform. You create an assistant (the brain, voice, and tools), restrict a public key to it for the in-browser demo, and provision a phone number that routes calls to it. Here is the whole sequence.");
num(1, "Create the assistant. POST to api.vapi.ai/assistant with your private key. The body sets the model (use the dated id claude-haiku-4-5-..., temperature ~0.4), the system prompt (your call flow + the price book rules), the voice, the transcriber (deepgram nova-3, language multi for bilingual), and the tools (each pointing at a route on your deployed site). Capture the returned assistant id.");
num(2, "Scope a public key. POST to api.vapi.ai/token with {tag:'public', restrictions:{allowedAssistantIds:[ID]}}. Use the returned value as your site's public key. A key NOT scoped to your assistant is the number-one cause of \"the call drops instantly.\"");
num(3, "Provision a phone number. POST to api.vapi.ai/phone-number with {provider:'vapi', assistantId, numberDesiredAreaCode}. Free numbers are scarce, so the brand's real area code is usually taken. The 400 error suggests available codes. Area code is cosmetic for a demo.");
num(4, "Point the number and webhook at your assistant. The assistant's server url receives end-of-call reports so your dashboard can log every call, transcript, and recording.");
num(5, "Set environment variables and redeploy: the public key, the assistant id, the app url, the tools base url, and the demo phone number.");
num(6, "Verify. POST to api.vapi.ai/call/web with the scoped public key returns 201. Call the number from your phone. Trigger one tool and confirm real data comes back.");
callout("The gotcha list, taped to your monitor", "Dated model id. Assistant name under 40 characters. Public token scoped to the assistant. Numbers are scarce (area code is cosmetic). All your demos share one Vapi wallet, so enable auto-reload before any pitch. Working voices include Elliot, Clara, Layla, and Savannah.");

/* ============== 10. OBJECTIONS ============== */
h1("Appendix B: Objection Handling", "Six lines that turn a no into a call to the demo number.");
p("Every objection has the same answer: the demo number. Get them to call it and most objections dissolve. Use these.");
bullet("Great, this backs them up. It never sends a caller to voicemail at lunch, after hours, or when the line is busy. It only catches the calls you lose today. Call the demo: [number].", "\"We already have someone answering.\"");
bullet("Do not take my word for it. Call [number] right now and try to trip it up. Most owners cannot tell. If it is not good enough for your brand, there is no pitch.", "\"AI sounds robotic.\"");
bullet("It is about the price of a sandwich a day. The average missed call in your trade is worth [job value]. One recovered job a month pays for it many times, and the guarantee means you only keep it if it works.", "\"Too expensive.\"");
bullet("That is exactly who this protects. When your person is on another call or gone for the day, this catches what would have been lost. It makes your team look great.", "\"My front desk handles it.\"");
bullet("Then you have nothing to lose. Run the 30-day pilot. If it does not recover more than its fee, that month is free and you walk. Most owners keep it after week one.", "\"I need to think about it.\"");
bullet("Start with one location. Prove it there, see the recovered-revenue dashboard, then roll it out across the brand on your terms.", "\"We are a franchise, it is complicated.\"");

/* ============== 11. SWIPE FILE ============== */
h1("Appendix C: The Full Swipe File", "Copy, fill the brackets, send. The companion app has these with one-tap copy.");
doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Email 1 (the opener)", LEFT, doc.y); doc.moveDown(0.2);
p("Subject: I built you a 24/7 AI receptionist. Call it: [number]\n\nHi [name], you know the number that hurts: most callers who hit voicemail just call the next [trade]. I built a working 24/7 voice concierge for [business] and put it on a live demo number. Call [number] and [action]. It books the job and never sleeps. To be clear, it is a demo I built so you can hear it, not a live install. See the dashboard: [url]. Worth 15 minutes? And to make it easy, recover more than the fee in 30 days or that month is free. Best, [you].", { size: 9.5, color: GRAY });
doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Email 2 (follow-up, day 4, same thread)", LEFT, doc.y); doc.moveDown(0.2);
p("Hi [name], following up with the one stat that matters: the average missed call in [trade] is worth [job value]. One recovered job pays for the concierge for months. If it is easier than a meeting, just call [number]. Two minutes tells you more than I can.", { size: 9.5, color: GRAY });
doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("LinkedIn note", LEFT, doc.y); doc.moveDown(0.2);
p("Hi [name], I build AI phone agents for [trade]. I built a working 24/7 concierge for [business] on a live demo number: [number]. Call it and [action]. Books the job, after hours too. Quick look: [url].", { size: 9.5, color: GRAY });
doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Voicemail (~25 seconds)", LEFT, doc.y); doc.moveDown(0.2);
p("Hi, this is [you] with Modern Mustard Seed. I build AI receptionists for [trade], and I built a working one for [business]. It answers every call 24/7 and books the job. You can call it yourself at [number] and try it. I would love to show your team the dashboard. Reach me at [cell] or [email]. Thanks.", { size: 9.5, color: GRAY });
h2("Discovery questions (on the call)");
bullet("How many calls a day go to voicemail or a busy signal?");
bullet("What is a booked job or project worth on average?");
bullet("What happens to a call that comes in after hours today?");
bullet("Who owns the phone, and who would want the dashboard?");
bullet("If we recovered even ten of those a month, what is that worth to you?");

/* ============== 12. VERTICAL DEEP-DIVES ============== */
h1("Appendix D: Vertical Deep-Dives", "Where to aim first, and the angle that lands.");
h2("Home services (plumbing, HVAC, electrical, roofing)");
bullet("Target: independent owners doing $1M+, plus franchise brands (find who owns call-center operations and the vendor program).");
bullet("Angle: the 2am emergency. After-hours capture is the signature. \"Never miss the burst pipe again.\"");
bullet("Pricing: $549 to $599 single, $449 to $499 multi. One captured emergency pays for a year.");
h2("Painting and remodeling");
bullet("Target: CertaPro, Five Star, 360 Painting franchisees, and high-volume independents.");
bullet("Angle: the color visualizer. Let homeowners repaint a room live, then book the estimate with their palette. It is the wow plus the lead magnet.");
bullet("Pricing: same tiers. One whole-home project is $5,000+.");
h2("Restaurants (catering and phone orders)");
bullet("Target: mid-size, catering-and-phone-heavy chains with no voice AI. Skip the megabrands; giants already took those.");
bullet("Angle: orders and catering lost at the lunch rush. Start with one store, roll up the brand.");
h2("Clinics, dental, vet, and the professional trades");
bullet("Target: practices and firms where a missed intake call is a lost patient or a $5,000 case.");
bullet("Angle: every call answered and booked, after hours included, with the no-show-reducing reminder follow-up as an upsell.");
callout("Pick one and go deep", "Own one vertical in one region. Collect two or three references. Then expand by vertical or by geography. Depth beats spray-and-pray, and references close franchises.");

doc.moveDown(0.6);
doc.font("Helvetica-Oblique").fontSize(10).fillColor(GRAY).text("Modern Mustard Seed  ·  modernmustardseed.com  ·  Build with Claude series", LEFT, doc.y, { width: WIDTH });

doc.end();
Promise.all(streams.map((s) => new Promise((r) => s.on("finish", r)))).then(() => {
  console.log("Wrote", PDF);
  console.log("Wrote", STORE_PDF);
});
