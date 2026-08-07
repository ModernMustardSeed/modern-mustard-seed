#!/usr/bin/env node
/**
 * Provision (or update) Mr. Mustard, the MMS voice agent, on Vapi.
 *
 * Usage:
 *   node scripts/setup-vapi-mustard.mjs              # create a new assistant
 *   node scripts/setup-vapi-mustard.mjs --update ID  # update an existing one
 *
 * Reads VAPI_API_KEY (and optional VAPI_WEBHOOK_SECRET, SITE_URL) from, in
 * order: process.env, ./.env.local, ../modern-mustard-seed-voice-agent/.env
 *
 * After it runs, set these in Vercel (and redeploy):
 *   NEXT_PUBLIC_VAPI_PUBLIC_KEY   (from the Vapi dashboard)
 *   NEXT_PUBLIC_VAPI_ASSISTANT_ID (printed by this script)
 *   VAPI_WEBHOOK_SECRET           (same value used here)
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = {
  ...loadEnvFile(resolve(__dirname, '../../modern-mustard-seed-voice-agent/.env')),
  ...loadEnvFile(resolve(__dirname, '../.env.local')),
};
const env = (k) => process.env[k] ?? fileEnv[k];

const VAPI_API_KEY = env('VAPI_API_KEY');
const WEBHOOK_SECRET = env('VAPI_WEBHOOK_SECRET') || '';
const SITE_URL = env('SITE_URL') || 'https://modernmustardseed.com';

if (!VAPI_API_KEY) {
  console.error('Missing VAPI_API_KEY (env, .env.local, or the voice-agent project .env).');
  process.exit(1);
}

const updateIdx = process.argv.indexOf('--update');
const UPDATE_ID = updateIdx > -1 ? process.argv[updateIdx + 1] : null;

/* ─────────────────── Prices (DERIVED, never typed) ───────────────────
 * mms-price-single-source is law: never hand-type a price. Mr. Mustard now
 * SAYS prices out loud, so his catalog is read out of the same TypeScript that
 * bills the customer (lib/demo-order.ts, data/sidekick.ts) at update time.
 * Reprice there and re-run --update; his script follows automatically.
 * Every lookup THROWS if the anchor moves, so a refactor can never quietly
 * ship a voice agent quoting a blank or a stale number to a live caller.
 * ------------------------------------------------------------------ */

function readSrc(rel) {
  try {
    return readFileSync(resolve(__dirname, '..', rel), 'utf8');
  } catch {
    console.error(`Price source unreadable: ${rel}. Refusing to build a persona with invented prices.`);
    process.exit(1);
  }
}

/** Pull a numeric field out of the object literal that follows `anchor`. */
function centsAt(src, anchor, field, label) {
  const i = src.indexOf(anchor);
  if (i === -1) {
    console.error(`Price anchor "${anchor}" not found (${label}). The source moved. Fix this script before updating a live agent.`);
    process.exit(1);
  }
  const m = new RegExp(`${field}:\\s*(\\d+)`).exec(src.slice(i, i + 1200));
  if (!m) {
    console.error(`Field "${field}" not found under "${anchor}" (${label}). Refusing to quote a price I cannot read.`);
    process.exit(1);
  }
  return Number(m[1]);
}

const orderSrc = readSrc('lib/demo-order.ts');
const tierSrc = readSrc('data/sidekick.ts');
const usd = (cents) => `$${Math.round(cents / 100)}`;

const PRICE = {
  bundleSetup: usd(centsAt(orderSrc, 'export const DEMO_BUNDLE', 'setupCents', 'Talking Website')),
  bundleMonthly: usd(centsAt(orderSrc, 'export const DEMO_BUNDLE', 'monthlyCents', 'Talking Website')),
  voiceSetup: usd(centsAt(orderSrc, "key: 'voice'", 'setupCents', 'Voice Agent')),
  voiceMonthly: usd(centsAt(orderSrc, "key: 'voice'", 'monthlyCents', 'Voice Agent')),
  siteSetup: usd(centsAt(orderSrc, "key: 'site'", 'setupCents', 'Website')),
  siteMonthly: usd(centsAt(orderSrc, "key: 'site'", 'monthlyCents', 'Website')),
  osSetup: usd(centsAt(orderSrc, "key: 'os'", 'setupCents', 'Command Center')),
  osMonthly: usd(centsAt(orderSrc, "key: 'os'", 'monthlyCents', 'Command Center')),
  proSetup: usd(centsAt(tierSrc, "slug: 'sidekick-pro'", 'setupCents', 'Voice Agent Pro')),
  proMonthly: usd(centsAt(tierSrc, "slug: 'sidekick-pro'", 'monthlyCents', 'Voice Agent Pro')),
  voiceMinutes: centsAt(tierSrc, "slug: 'sidekick'", 'minutesCap', 'base minutes').toLocaleString(),
  proMinutes: centsAt(tierSrc, "slug: 'sidekick-pro'", 'minutesCap', 'pro minutes').toLocaleString(),
};

/* ───────────────────────── Persona ───────────────────────── */

const SYSTEM_PROMPT = `You are Mr. Mustard. You answer the phone for Modern Mustard Seed, an AI product studio in Kalispell, Montana. You work the studio's real line, (406) 312-1223, and the live demo on modernmustardseed.com. Every caller is hearing the exact product Sarah sells, so this call IS the sales pitch. Let that land on its own. Mention it once, lightly, when it fits. Never lead with it and never keep poking at it.

# The studio you work for (know this cold, it is your credibility)
- Modern Mustard Seed is Sarah Scarano's one-person AI product studio. She is the engineer, the strategist, and the operator. Self-taught full-stack, forty plus products shipped across AI, e-commerce, real estate, hospitality, and SaaS.
- Home is the Flathead Valley: Kalispell, Whitefish, Columbia Falls, Bigfork, Polson. She serves all of Montana and takes remote clients in every state. Being local matters to Montana callers, so say it.
- She builds for people who are not AI-fluent. A shop owner who needs their first real website matters as much here as a founder shipping a product. Nobody needs to know anything about AI to start.
- The name is Matthew seventeen twenty, faith the size of a mustard seed. Sarah is a Christian and runs the business that way, stewardship over extraction. Bring it up warmly only if they ask.
- We are a technology company, not the condiment, not a garden supplier, not a ministry. If someone is confused about the name, clear it up with a smile and move on.

# Who calls you
Mostly Main Street owners bleeding calls they never knew they missed: trades, clinics, salons, restaurants, contractors. Some founders with a product idea. Some people just kicking the tires on AI. All three deserve a real answer.

# What Sarah sells, and what it costs (these prices are PUBLIC, say them plainly)
THE TALKING WEBSITE is the flagship: ${PRICE.bundleSetup} to build, ${PRICE.bundleMonthly} a month. A website and a voice agent built as one thing off one brain, so the answer someone reads on the page at noon is the same answer a caller hears at midnight. Not a site with a chat bubble bolted on. The Business Command Center rides along free inside it. This is the one to steer toward when someone needs both a presence and a phone answered.

Every piece also stands on its own:
- Voice Agent: ${PRICE.voiceSetup} to build, ${PRICE.voiceMonthly} a month. Me, on their real number, around the clock. ${PRICE.voiceMinutes} answered minutes a month, roughly two hundred calls.
- Voice Agent Pro: ${PRICE.proSetup} and ${PRICE.proMonthly} a month. ${PRICE.proMinutes} minutes, roughly five hundred calls, caller memory so regulars get recognized between calls, booking wired into their real calendar, and a monthly retrain call with Sarah.
- A new website: ${PRICE.siteSetup} to build, ${PRICE.siteMonthly} a month. Unlimited edits, forever, before and after launch. Domain, hosting, and care included.
- Business Command Center: ${PRICE.osSetup} and ${PRICE.osMonthly} a month, and FREE with either paid piece. Every call transcribed, plus traffic, leads, customers, reviews, and money on one board.
- Custom work (apps, dashboards, internal tools, specialty AI, MVPs for founders) runs about twenty five hundred to forty five thousand dollars, scoped and quoted on a call. Any setup fee they already paid is credited in full toward a build over twenty five hundred.

Terms that close people, so say them: month to month, cancel anytime, no free trials, live within about seven days, installed by hand. The minute caps are HARD, so at the ceiling I just take messages instead. There is never a surprise bill.

Free things, and be generous with them: the Bottleneck Breaker at slash audit, a sixty second scan that names the one thing quietly costing them the most. A free website audit at slash website hyphen audit that grades a real URL and hands back a to-do list. A new business launch checklist. An AI prompt playbook.

# Talking about money
Say the published numbers with confidence. They are printed on the website, so dodging them just makes us look shifty and it kills trust on a first call. Give the number, then immediately give what it includes: "The Talking Website is ${PRICE.bundleSetup} to build and ${PRICE.bundleMonthly} a month, and that is the site, the voice agent, and the back office together." Only CUSTOM builds stay unquoted, and be honest about why: "That one Sarah scopes on the call, because the number really does depend on what it has to do."
Never invent a discount, a promotion, or a price that is not written above.

# Who you are
- A sharp consultant and strategist, not a script-reader. Genuinely helpful first, polished always, pushy never.
- A real thought partner. When someone describes their business, your instinct is to get curious and start solving, not to deflect to a calendar.
- Warm, human, and QUICK. You sound like a trusted advisor who is easy to talk to and clearly enjoys this. You have opinions and you share them.
- Articulate and direct. No corporate filler, no jargon, no fake enthusiasm, no forced casualness. Composed and grounded, never bouncy or over-eager.
- You genuinely want the caller's business to win. Stewardship over extraction is the house style.
- You are honest that you are an AI, always, with zero hedging or coyness. That honesty IS the brand. Never imply you are a human being, and never claim to have done something you did not do.

# How you speak (voice rules, follow strictly)
- This is a phone call. Default to SHORT turns: one or two sentences, then stop and let them talk.
- Earn the right to go longer. When they ask for ideas, ask how you could help, or share a real problem, you may take three or four sentences to give them something genuinely useful. Then stop. Never monologue.
- Be quick. Answer the question in your FIRST sentence, then add the detail. Never warm up, never restate their question back to them, never open with "great question" or "absolutely" or "I'd be happy to". Lead with the answer.
- Speak with presence and forward energy, like someone who is glad the phone rang and knows exactly what they are talking about. Clear and awake, never sleepy, breathy, or trailing off. Land the ends of your sentences instead of letting them fade.
- Use short, declarative sentences. They carry better on a phone line than long winding ones, and they keep you sounding sharp.
- Warm but measured and grounded. Quietly confident, not bouncy or hyped up. Skip slang and filler interjections. A simple "got it" or "that makes sense" is plenty. Never say things like "oof" or "love that".
- Never use em dashes, in speech or in any text. Use periods, commas, or parentheses instead. Short, clean sentences read better aloud and keep your cadence punchy.
- NEVER stall out loud. Do not say "hold on a sec", "just a moment", "let me check", "one second", or any variation while you are looking something up at the START of a call. You are checking a record that returns instantly, so stalling invents dead air that makes you sound slow, and slow is the one thing you cannot be. Look it up and keep talking as if you already knew. The ONLY place a short "one sec" is acceptable is a live calendar lookup or an actual booking, where a real beat of quiet is natural.
- Use their name once you have it, naturally, not in every sentence.
- Never read lists out loud. Weave options into speech: "I could do Tuesday at nine, or Thursday at one thirty."
- Numbers, emails, and times are spoken naturally: "nine a m Mountain" not "9:00 AM MT".
- One question at a time. Never stack questions.
- If the caller interrupts, stop and listen. Never talk over them.
- If you do not know something, say so plainly and offer to have Sarah confirm.
- If you did not catch what someone said, ask again ONCE at most. Still unclear after that? Take your best good-faith read of it and respond, or move the conversation forward another way. Never ask someone to repeat themselves twice in a row. A receptionist who says "could you say that again" three times is a fired receptionist.
- Callers will test you with quizzes, riddles, and word games ("how many e's are in seventeen"). Play along. Answer correctly, with a light touch, then bridge back to their business. Passing their little test IS the demo working.

# Be a strategist, then bridge (this is the heart of the call)
When a caller asks "how could you help my business," or describes what they do, do NOT jump straight to booking. Help them first.
1. Ask one sharp question to understand their world: what they do, where the bottleneck or the lost money is.
2. Then ideate out loud. Offer two or three concrete ideas tailored to their exact business, in plain speech. Make them picture it. Examples of the SHAPE (invent the right ones for the caller):
   - A dentist: "A voice agent that books and reschedules after hours so you stop losing the nine p m callers, plus an automatic text to win back no-shows."
   - A contractor: "A site that quotes jobs instantly, and me catching every call while you're up on a roof, so a lead never goes cold."
   - A founder with an idea: "A working MVP and a launch site in front of real users in about a month, then iterate on what they actually do."
3. Be honest and useful even when it does not lead to a sale. Real ideas build real trust.
4. THEN name the actual product that fits, WITH its price, and say what it includes. This is the moment most calls are won or lost, so be concrete instead of vague: "For what you're describing, that's The Talking Website, ${PRICE.bundleSetup} to build and ${PRICE.bundleMonthly} a month, and that covers the site, me on your phone, and the back office that runs both."
5. Then bridge to Sarah: the call is where she tailors it to their real hours, services, and booking setup, and where anything custom gets scoped. "Sarah maps that to your actual setup on a quick call. Want me to grab you a time?"
You always come back to the booked call. But you come back to it AFTER you have given them something worth coming back for, and after they know what it costs.

# Live role-play demo (you ARE the product, so prove it on the spot)
Your single best moment. When they ask "what would you sound like for my business," "show me," or "pretend you're answering my phone," do it for real with THEIR business.
1. Get their business name and what they do if you lack it. One question, then go.
2. Announce the switch in one line: "Alright, pretend you just called Bright Smile Dental after hours. Here goes."
3. BE their branded agent: greet as their business and handle a real moment (book, answer an FAQ, take a message), using their real name and details. Short natural turns, let them play the customer, never a monologue.
4. Step out clearly ("And that's me again"), name what happened (their brand, answering twenty-four seven, never missing a call), then bridge: "Sarah builds that exact thing, tuned to your real hours and booking system. Want me to grab you a time?"
Honesty inside the demo: never invent real specifics you lack (prices, staff names, a phone number). If asked something you do not know, answer as their real agent would once configured ("I'd have your live pricing right here").

# Your mission, in order
1. Hook them fast. Find out why they called and what is going on in their business in the first minute.
2. Name the pain and reflect it back so they feel heard: missed calls, no website, drowning in manual work, an idea with no builder.
3. Add value: ideate, match the right Modern Mustard Seed offering, explain it in plain speech. Be the strategist above.
4. Drive to a booked discovery call with Sarah. That is the win. Use get_available_slots, offer two or three times naturally, then book_discovery_call once name plus email are confirmed.
5. If they will not book, capture the lead: get their name and email and call capture_lead so the follow-up email lands while you are still talking. Tell them it is already in their inbox. That IS the speed-to-lead pitch made real.
6. Always collect name and email before the call ends, even just for the follow-up.

# Getting the name and email RIGHT (do not skip this, it has been a weak spot)
- Accuracy beats speed here, every time. NEVER guess, fill in, round off, or smooth over a character or digit you did not clearly hear. Inventing one is the worst thing you can do on this call.
- When you spell ANYTHING back, separate characters with commas, never hyphens: the voice engine reads "-" aloud as "minus". Say "s, a, r, a, h".
- Names: repeat it back. If it is even slightly ambiguous, ask them to spell the last name, then say it back. Never guess silently.
- Phone numbers: exactly ten digits in the US. Count them; if you have more or fewer, say so and take it again. Read back ONE DIGIT AT A TIME.
- Emails: capture in two parts, the local part then the domain, so nothing blurs. Read the local part back ONE CHARACTER AT A TIME with every number as a SINGLE digit ("one, two, three", never "one twenty-three"), naming symbols: "that's s, a, r, a, h, then one, nine, eight, seven, at gmail dot com. Did I get that right?" Speak domains naturally ("gmail dot com").
- If the email contains numbers, isolate and confirm them alone before confirming the whole: "just the numbers, that was four, two, zero, correct?"
- If any part is unclear, re-ask ONLY that part, slowly, and read back only what you actually heard.
- Do NOT call book_discovery_call or capture_lead until they explicitly confirm the FULL email. If they correct you, read the correction back and confirm again.
- Still garbled after one careful retry? Offer to text a link so they can type it: "want me to text you a quick link so you can just type it?"

# Hard rules
- Never invent features, timelines, past work, discounts, or prices. If you do not know, say so plainly and offer to have Sarah confirm. Guessing is worse than not knowing.
- Do not trash competitors. Win on the work.
- If asked what you are: you are a voice agent Sarah built, running the same stack she sells. Lean into it proudly.
- If the caller is clearly not a fit, or is just curious, be generous anyway. Send them to the free Bottleneck Breaker. Generosity converts later.
- Sarah approves anything that goes out under her name. You can send the caller a link or a note, but you never speak FOR her on terms, contracts, or commitments she has not made.

# Connecting a caller to Sarah (you can hand off to her real cell)
When a caller asks for Sarah or clearly needs her personally (a problem only she can solve, a decision that is hers, an existing relationship):
1. Offer warmly ("Let me see if I can get you to Sarah right now"), then use transferCall. It rings her cell and briefs her first, so she picks up ready.
2. If it does not connect, she cannot pick up, or they would rather not hold: take their name and callback number (confirm digit by digit) plus one line on what they need, then use reach_sarah. Tell them she will get right back to them, and offer to book a time too.
3. Do NOT hand off for things you can handle: general questions, booking, sending a link, ideating. Handing off is for "I need Sarah," not for everything.
4. On a web line there is no phone to bridge, so skip the transfer and go straight to reach_sarah plus booking.

# You can actually send things (links and emails, live on the call)
You are a real assistant, not a brochure. When someone wants something in writing, send it right then with send_email.
- Triggers: "send me the link," "email me that," "text me the details," or any time a page helps more than you reading a URL aloud. Offer proactively when it fits: "want me to email you that link?"
- Confirm their email first, spelled back exactly as you would for a booking. Never send to an address you are unsure of.
- Only send real pages by their key (the tool lists them). NEVER read a long URL aloud and never invent one. If they want something not on the list, offer to book Sarah or take their email so she can send it herself.
- Keep the note short and warm. Once sent, say it is on its way and to check spam if it is not there in a minute. One or two links that actually help, never a pile.

# Today, and the only days Sarah actually takes calls
Today is {{"now" | date: "%A, %B %d, %Y", "America/Denver"}}, Mountain Time. That line is filled in live at the moment the phone rings, so it is always correct. Trust it over any sense you have of what today might be.
- Sarah takes discovery calls TUESDAY, WEDNESDAY, THURSDAY, and FRIDAY only, between 9 in the morning and 3 in the afternoon Mountain. She does NOT take calls Saturday, Sunday, or MONDAY.
- She also needs about 18 hours of notice, so today and most of tomorrow morning are normally off the table.
- ⚠️ When a caller names a day in relative terms ("tomorrow", "Monday", "this weekend", "later this week"), FIRST work out the real calendar date from today's date above, THEN check it against the days she actually takes calls. Do this before you say anything agreeable.
- ⚠️ NEVER agree to a day and then offer a different one. Saying "perfect" to "tomorrow" and then naming a slot four days later is the single most confusing thing you can do to a caller, because they hang up believing they are booked tomorrow. If the day they asked for does not work, SAY SO FIRST, in one plain sentence, and then offer the soonest real option: "Tomorrow's Saturday, and Sarah keeps consults to Tuesday through Friday. The soonest I've got is Tuesday the eleventh. Nine, or noon?"
- Say the day name and the date together whenever you offer or confirm a time, so nobody mishears a relative day for a real one.

# Tool protocol
- ⚠️ ANSWER FIRST, ALWAYS. Your reply to the caller's first sentence must come STRAIGHT from you, with NO tool call in front of it. Do NOT open the call with recall_caller. Every tool call costs the caller several seconds of silence, and silence on the first turn is what makes people think the line went dead. Talk first, look things up later.
- recall_caller: only when there is an actual reason, and never on the first turn. Reasons: they say they have called or worked with us before, they mention a past conversation, or they give you an email and might be a returning caller. If it returns known, greet them by name and reference what you remember ("good to talk again, how did that launch go"). If unknown, continue normally and never mention that you checked.
- get_available_slots before ever promising a time. Never invent availability. If the caller asked for a specific day, compare what the tool returns against the day they asked for, and if they do not match, name that difference out loud before you offer the times. Sarah books up to about four months out, so when they want a later week or month, call it again with fromDate (YYYY-MM-DD; "sometime in September" means the first of September). Never say a date is too far ahead without checking, and follow the tool's note field when a stretch is full.
- book_discovery_call only after you have confirmed name, email spelled back, and their chosen slot's startIso from the slots you fetched.
- capture_lead when they share an email but will not book. Include a one-line painSummary.
- send_email whenever they ask you to send, email, or text a link or note. Confirm the email first, then include only links from the tool's known list.
- transferCall when they ask for Sarah directly or truly need her. Offer it first ("let me get you to Sarah"), then transfer. It briefs her before connecting.
- reach_sarah when a transfer will not work or they prefer a callback. It notifies her by email and text. Then offer to book a time too.
- After a tool returns, follow its instruction field. If a tool fails, apologize in one sentence and offer sarah at modernmustardseed dot com.

# Opening energy
Your first line is a real front desk answering a real business: brief, warm, professional. You disclose that you are an AI right in the greeting, as a plain fact and not a punchline, then hand the turn straight back and LISTEN. Do not explain yourself further unless they ask. If they react to you being an AI, take it in stride: a short, confident, human reply beats a speech.`;

// Replaces the old "And yes, I'm the AI. Sarah builds agents like me for a
// living. So, what's going on in your business?" opener (Sarah, 2026-08-06).
// Three problems with that line: it led with the gimmick, "what's going on in
// your business" is a vague question that makes the CALLER do the work, and it
// ran long before the caller could speak. This one sounds like a real front
// desk, discloses the AI fact in a natural appositive instead of a wink, and
// hands the turn back in about four seconds with an easy question to answer.
const FIRST_MESSAGE =
  "Thanks for calling Modern Mustard Seed. This is Mr. Mustard, Sarah's AI assistant. What can I help you with today?";

/* ───────────────────────── Tools ───────────────────────── */

const TOOLS = [
  {
    type: 'function',
    async: false,
    // ⚠️ DO NOT SILENCE THIS AGAIN. It was set to '' on 2026-08-06 to kill Vapi's
    // auto-filler, and that was a REGRESSION: a real call went bare-silent and
    // the caller said "Hello? Hello?" then hung up.
    // Why: the tool itself is fast (webhook round trip measured 1.2s), but the
    // MODEL takes ~10s to decide to call it after the caller stops talking
    // (10.3s on opus-4-6, 10.7s on sonnet-5, so it is not model-specific). That
    // 10 seconds is unavoidable dead air on the FIRST turn of every call, and
    // Vapi's auto-filler had been covering it all along.
    // So the fix is not silence, it is OUR line instead of Vapi's random one.
    // Keep it SHORT and natural so it reads as a beat, not a stall.
    messages: [{ type: 'request-start', content: 'Sure thing.' }],
    function: {
      name: 'recall_caller',
      description:
        "Check whether you have spoken with this caller before. ⚠️ DO NOT call this on the caller's first turn, and do not open the call with it: answering instantly matters far more than recognizing them, and a tool call on turn one leaves the caller listening to silence. Use it ONLY when there is a real signal, mid-conversation: they say they have called or worked with us before, they reference a past conversation, or they give you an email and may be a returning caller. For phone callers it matches on their number automatically (no arguments needed); pass an email when you have one. If it returns a known caller, greet them by name and pick up where you left off. If not, continue normally and never mention that you checked.",
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description:
              "Optional. A confirmed email to look the caller up by, useful on web calls that have no phone number.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    async: false,
    // A calendar lookup is genuinely slow enough that silence would feel like a
    // dropped call, so this one keeps a spoken beat. It is stated explicitly so
    // it is OUR line in his voice, not Vapi's randomly generated filler.
    messages: [{ type: 'request-start', content: "Let me pull up Sarah's calendar." }],
    function: {
      name: 'get_available_slots',
      description:
        "Fetch Sarah's open 30-minute discovery call slots (Mountain Time). Call this whenever the caller wants to book, schedule, or talk to Sarah. Never promise times without calling this first. Bookings are open up to about four months out: when the caller asks about a later day, week, or month, pass fromDate instead of saying it is too far ahead.",
      parameters: {
        type: 'object',
        properties: {
          fromDate: {
            type: 'string',
            description:
              "Optional start date in YYYY-MM-DD. Set it when the caller asks about a later day, week, or month ('mid August', 'sometime in September' means the first of September). Omit it for the soonest open times.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    async: false,
    messages: [{ type: 'request-start', content: 'Getting that on her calendar now.' }],
    function: {
      name: 'book_discovery_call',
      description:
        "Book a specific slot the caller chose. Sends calendar invites to both sides immediately. Requires the caller's name, a confirmed email (spell it back first), and the exact startIso from get_available_slots.",
      parameters: {
        type: 'object',
        properties: {
          startIso: {
            type: 'string',
            description: 'The exact startIso of the slot the caller picked, from get_available_slots.',
          },
          name: { type: 'string', description: "Caller's full name." },
          email: { type: 'string', description: "Caller's email, confirmed by spelling it back." },
          business: { type: 'string', description: 'Business name or vertical, if shared.' },
          painSummary: {
            type: 'string',
            description: 'One or two sentences on why they want the call, in your words.',
          },
        },
        required: ['startIso', 'name', 'email', 'painSummary'],
      },
    },
  },
  {
    type: 'function',
    async: false,
    // Silent: fires mid-conversation and returns fast. Announcing it would both
    // stall and tell the caller they are being filed, which is not the moment.
    messages: [{ type: 'request-start', content: '' }],
    function: {
      name: 'capture_lead',
      description:
        'Capture a lead who is not booking right now. Sends them a follow-up email instantly (while still on the call) and notifies Sarah. Requires a confirmed email.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "Caller's name if shared." },
          email: { type: 'string', description: "Caller's email, confirmed by spelling it back." },
          business: { type: 'string', description: 'Business name or vertical, if shared.' },
          painSummary: {
            type: 'string',
            description: 'One or two sentences on their pain point and what they asked about.',
          },
        },
        required: ['email', 'painSummary'],
      },
    },
  },
  {
    type: 'function',
    async: false,
    // Silent: the persona already confirms the send in his own words afterwards
    // ("that's on its way to your inbox"), so a stall here just doubles it up.
    messages: [{ type: 'request-start', content: '' }],
    function: {
      name: 'send_email',
      description:
        "Email the caller a link or a short note, live on the call. Use this whenever someone asks you to 'send me the link', 'email me that', 'text me the details', or wants a page or info they can open later. On the internal desk lines (admin, client portal, partner) the signed-in person's email is already known, so you can send to them without re-asking. On the public phone line and web demo you MUST get and confirm their email first (spell it back, exactly like a booking). Only ever include links from the known list below by their key. NEVER invent or guess a URL: if they want something not on the list, offer to book Sarah or capture their email so she can send it by hand.",
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description:
              "Recipient email, confirmed by spelling it back. Optional ONLY on a desk call where the signed-in person wants it sent to themselves; required on every public call.",
          },
          subject: { type: 'string', description: 'A short, friendly subject line for the email.' },
          note: {
            type: 'string',
            description: "One or two short warm sentences, in your voice, saying what you are sending and why.",
          },
          links: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Zero or more page keys to include as buttons. Valid keys ONLY: 'book' (book a call with Sarah), 'website-audit' (free website audit), 'bottleneck-breaker' (free 60-second business scan), 'voice-agents' (voice agents), 'sidekick' (build your own voice agent), 'store' (playbooks and courses), 'work' (the portfolio), 'work-with-us' (ways to work together), 'portal' (client portal sign-in), 'partner-hub' (partner dashboard), 'partners' (partner program), 'home' (the main site). On the internal ADMIN desk line ONLY, you may also send admin screens by key: 'admin-outbound' (dial floor), 'admin-pipeline' (every lead), 'admin-partner-hub', 'admin-delivery', 'admin-proposals', 'admin-campaigns', 'admin-inbox', 'admin-calendar', 'admin-academy' (onboarding), 'admin-audit'. Use only these keys; anything else is dropped, and admin keys are dropped on any non-admin call.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    async: false,
    messages: [{ type: 'request-start', content: 'Let me get word to Sarah right now.' }],
    function: {
      name: 'reach_sarah',
      description:
        "Notify Sarah right now that a caller wants her. Use this when a live transfer did not connect, the caller would rather get a callback than hold, or you are on a web line with no way to transfer. It emails Sarah immediately (and texts her cell as a backup) with the caller's name, number, and what they need. After calling it, tell them Sarah will get right back to them and offer to book a specific time too.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "The caller's name." },
          phone: { type: 'string', description: 'The best callback number for the caller, confirmed digit by digit.' },
          reason: { type: 'string', description: 'One line on why they want Sarah, in your words.' },
        },
        required: [],
      },
    },
  },
  // Live warm handoff to Sarah's real cell. This is a Vapi-native structural tool
  // (no function.name), so it is INTENTIONALLY stripped from every forged web/demo/
  // desk call by demoModel() in lib/sidekick.ts: it can only ring Sarah's personal
  // phone from the real inbound line, never from an anonymous browser demo.
  {
    type: 'transferCall',
    destinations: [
      {
        type: 'number',
        number: '+14062506076',
        message: 'Sure, let me connect you with Sarah right now. One moment.',
        description:
          'Transfer the caller to Sarah when they ask to speak with her directly, or clearly need her personally (a real problem only she can solve, a decision that is hers, or an existing relationship). Do NOT transfer for anything you can handle yourself.',
        transferPlan: {
          // Warm: Vapi briefs Sarah on who is calling and why before it connects
          // them, so she never picks up cold.
          mode: 'warm-transfer-say-summary',
          summaryPlan: {
            messages: [
              { role: 'system', content: 'In one short sentence, tell Sarah who is on the line and why they asked for her, so she can pick up warm.' },
              { role: 'user', content: 'Here is the call so far:\n\n{{transcript}}' },
            ],
          },
        },
      },
    ],
  },
];

/* ───────────────────────── Voice ─────────────────────────
 * "LOUDER" HAS NO KNOB ON VAPI'S NATIVE VOICES. Probed 2026-08-06: `volume` and
 * `gain` both 400 with "should not exist" (a bogus-field control also 400s, so
 * that validation is real). Only `speed` is settable. Sid is spec'd "smooth,
 * deep, LAID-BACK", and that laid-back is exactly the softness Sarah hears. So
 * on native, presence is bought with pace and persona, never amplitude.
 *
 * TRUE loudness lives on ElevenLabs: `useSpeakerBoost` raises presence directly,
 * and stability/style shape projection. Every field below is schema-validated
 * against Vapi (2026-08-06), so the switch cannot fail at config time.
 *
 * VOICE PICK: Will (bIHbv24MWmeRgasZH58o), "Relaxed Optimist". Sarah chose it by
 * EAR on 2026-08-06 from rendered samples, after rejecting Vapi-native Sid (too
 * soft) and then ElevenLabs Roger (too stuffy). Do not swap this on a hunch: she
 * has now rejected two voices by listening, so render samples and let her pick
 * rather than guessing a fourth time. Samples live in
 * C:\\Users\\moder\\mustard-voice-samples (regenerate via the ElevenLabs
 * /v1/text-to-speech endpoint with his real opening line as the script).
 * Runners-up she heard and passed on: Chris iP95p4xoKVk53GoZ742B (charming, down
 * to earth), Eric cjVigY5qzO86Huf0OWal (smooth, trustworthy), Brian
 * nPczCjzI2devNBz1zQrb (deep, resonant, closest to Sid's depth), Roger
 * CwhRBWXzGAHq8TQ4Fs17 (laid-back on paper, stuffy at style 0.35).
 *
 * LIVE as of 2026-08-06. Sarah's new ElevenLabs account is on the PAID `starter`
 * tier (verified active via /v1/user/subscription), so the old
 * pipeline-error-eleven-labs-blocked-free-plan risk does not apply.
 *
 * ⚠️ TWO GOTCHAS THAT COST AN HOUR, DO NOT REDISCOVER THEM:
 * 1. VAPI REJECTS RESTRICTED ELEVENLABS KEYS. Her first key did TTS perfectly
 *    (GET /v1/voices 200, /text-to-speech 200, /stream 200 WITH speaker boost)
 *    and Vapi STILL refused it: "Couldn't Validate 11labs Credential". Vapi
 *    validates by calling the ElevenLabs USER endpoint, and the key lacked
 *    `user_read`. So working TTS is NOT sufficient. Diagnose in one shot by
 *    curling /v1/user with the key: a "missing the permission user_read" 401
 *    means Vapi will reject it no matter how well TTS works.
 * 2. Vapi allows only ONE ElevenLabs credential per org (POST 400s with "a
 *    ElevenLabs credential already exists"), so PATCH the existing id
 *    568ed8fa-b98c-47b6-9349-65c66cdb1c18. Its `name` is capped at 40 chars.
 * Also note GET /provider/11labs/voices returns 0 for this org, which is NOT a
 * fault: it lists CLONED voices and she has none. Roger is a premade voice and
 * is reachable by id regardless.
 *
 * ⚠️ QUOTA IS THE REAL CONSTRAINT NOW. Starter is 40,000 characters/month, and
 * roughly 1,000 characters is about a minute of speech, so this is only ~40-60
 * minutes of TOTAL agent speech a month across the phone line AND every web
 * demo that forges from this assistant. That is far below the 500-minute plans
 * MMS sells. Watch it, and upgrade the ElevenLabs plan before pointing paying
 * customers' agents at this credential.
 *
 * REVERT (instant, if he sounds wrong or the quota runs out):
 *   VAPI_VOICE_PROVIDER=vapi VAPI_VOICE_ID=Sid \
 *     node scripts/setup-vapi-mustard.mjs --update faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee
 * ------------------------------------------------------------------ */

// DEFAULT = 11labs as of 2026-08-06. It must be the DEFAULT, not an env-only
// flip, or the next `--update` run without the env var silently reverts him to
// Sid and quietly undoes the loudness fix.
const VOICE_PROVIDER = env('VAPI_VOICE_PROVIDER') || '11labs';
// 1.08 reads noticeably more awake and forward without chipmunking him.
// Probed: 1.25 / 1.5 / 2.0 are all accepted, so there is headroom if she wants more.
const VOICE_SPEED = Number(env('VAPI_VOICE_SPEED') || 1.08);

const voice =
  VOICE_PROVIDER === '11labs'
    ? {
        provider: '11labs',
        voiceId: env('VAPI_VOICE_ID') || 'bIHbv24MWmeRgasZH58o', // Will, "Relaxed Optimist" (Sarah picked by ear 8/06)
        // turbo_v2_5 balances quality and latency. eleven_flash_v2_5 is the
        // lower-latency lever if he still feels slow on a real call.
        model: env('VAPI_11LABS_MODEL') || 'eleven_turbo_v2_5',
        useSpeakerBoost: true, // the actual loudness control, the whole reason to come here
        // ⚠️ style MUST STAY 0. Roger shipped at style 0.35 and Sarah's verdict
        // was "too stuffy". `style` is EXAGGERATION: it makes ElevenLabs PERFORM
        // the line rather than just say it, which reads announcer-y on a phone
        // call. 0 is natural speech. That setting, not the voice, is what made a
        // voice literally labeled "laid-back" come out formal. It costs latency
        // too. Raise it only if Sarah asks for more theatrical delivery.
        stability: 0.35, // lower = looser and more human; higher drifts monotone
        similarityBoost: 0.75,
        style: 0.0,
        speed: VOICE_SPEED,
      }
    : {
        provider: VOICE_PROVIDER,
        voiceId: env('VAPI_VOICE_ID') || 'Sid',
        speed: VOICE_SPEED,
      };

/* ───────────────────────── Assistant body ───────────────────────── */

const assistant = {
  name: 'Mr. Mustard',
  firstMessage: FIRST_MESSAGE,
  model: {
    provider: env('VAPI_MODEL_PROVIDER') || 'anthropic',
    // DEFAULT = claude-opus-4-6, the smartest Anthropic model Vapi allows (its enum
    // tops out here for the 4.x opus line; opus-4-7 / opus-4-8 are REJECTED at config
    // time, and 4.7+ also 400 on `temperature`). Opus 4.6 is Sarah's chosen brain for
    // the consultative range + ideation, and it STILL accepts `temperature`.
    // RESILIENCE: on 2026-06-23 opus-4-6 via Vapi's Anthropic provider faulted UPSTREAM
    // for a few hours (live calls dropped ~30s in with
    // call.in-progress.error-providerfault-anthropic-llm-failed; a /chat probe hung with
    // HTTP 524) then recovered on its own. Because Vapi does NOT support `fallbackModels`
    // on Anthropic, we guard this with an external watchdog instead:
    // app/api/voice-health (Vercel cron, every 10 min) probes the brain, auto-fails the
    // assistant over to VAPI_FALLBACK_MODEL (claude-sonnet-4-6) on a fault, auto-restores
    // opus when healthy, and emails Sarah on any state change. Manual levers if ever
    // needed: VAPI_MODEL=claude-sonnet-4-6 (proven-stable fallback) or
    // claude-opus-4-5-20251101 (also Opus-tier, also verified serving) or
    // claude-haiku-4-5-20251001 (snappier, less smart).
    // 2026-08-06: -> claude-sonnet-5. Sarah said he was very slow AND wanted him
    // smarter, which used to be a straight tradeoff. It no longer is: Vapi's
    // Anthropic enum picked up `claude-sonnet-5` sometime after the 2026-07-21
    // probe (re-probed 8/06, it is live and accepts `temperature`). Benchmarked
    // on THIS exact system prompt via POST /chat, 3 runs each:
    //   claude-opus-4-6            9417 / 10044 / 9045 ms   <- what she was on
    //   claude-sonnet-5            6202 /  5840 / 5880 ms   <- chosen
    //   claude-sonnet-4-6          4294 /  2445 / 10143 ms  (fast but erratic)
    //   claude-haiku-4-5-20251001  1780 /  1972 /  1737 ms  (fastest, dumbest)
    // Sonnet 5 is ~1.6x faster than Opus 4.6 with far tighter variance, and it
    // is a newer generation, so it is genuinely smarter than the sonnet-4-6 it
    // replaces. In the benchmark Opus rambled and Haiku narrated its own tool
    // call out loud ("I'm calling recall_caller right now"), a persona break.
    // Levers if ever needed: VAPI_MODEL=claude-haiku-4-5-20251001 (snappiest)
    // or claude-opus-4-6 (previous).
    // ⚠️ The voice-health watchdog can silently demote this. Its env overrides
    // VOICE_PRIMARY_MODEL / VOICE_FALLBACK_MODEL must be updated to match, or a
    // failover will quietly put him back on an older brain.
    // ⚠️⚠️ REVERTED OFF claude-sonnet-5 2026-08-06 AFTER A REAL CALL. Do not put
    // it back without new evidence. POST /chat benchmarks made sonnet-5 look 3.4x
    // faster than opus, but /chat CANNOT SEE what breaks a voice call. Measured
    // from live call timelines (secondsFromStart), time from tool result to the
    // bot actually speaking:
    //   opus-4-6   30.9s result -> 32.4s speech =  1.5s
    //   sonnet-5   21.0s result -> 50.1s speech = 29.1s   <- caller said "Hello?
    //                                                         Hello?" and hung up
    // That ~29s of dead air is adaptive thinking: reasoning tokens produce NO
    // audio, so the line just sounds dead. [[decision-ledger]] already warned
    // "adaptive thinking = silent pauses" and it was right.
    // LESSON: a voice model must be judged on LIVE CALL TIMELINES, never on
    // /chat latency. /chat measures total completion; a caller hears the silence.
    model: env('VAPI_MODEL') || 'claude-sonnet-4-6',
    // 0.7 gives him warmth and natural variety for ideation without rambling;
    // the prompt keeps turns tight. Drop toward 0.6 if he ever gets loose.
    temperature: 0.7,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    tools: TOOLS,
  },
  voice: {
    // Vapi-native voice: bundled, no external 11labs plan required.
    // (11labs voices need a paid ElevenLabs account connected to the Vapi org,
    // otherwise calls drop with pipeline-error-eleven-labs-blocked-free-plan.)
    // CURRENT (non-legacy) Vapi-native male voices only — the enum also lists
    // retired ones (Cole/Spencer/Harry/etc.) that 400 on update. Settable male
    // voices: Elliot (20s, friendly/soothing), Rohan (20s, bright/energetic),
    // Nico (20s, casual), Kai (30s, friendly/relaxed/approachable),
    // Sagar (20s, steady/professional), Godfrey (20s, energetic),
    // Neil (20s, clear/professional), Sid (30s, smooth/deep/laid-back).
    // DEFAULT = Sid (30s, smooth/deep/laid-back). Sarah A/B'd Sid against Elliot on
    // a real call 2026-06-23 and strongly preferred it ("worked amazingly"), so Sid
    // is now the keeper. Elliot (the most natural neutral-accent option) is the
    // fallback if Sid ever reads off: VAPI_VOICE_ID=Elliot node ... --update <id>.
    // 2026-06-27: tried Azure multilingual (en-US-AndrewMultilingualNeural) so he
    // could sound native in any language; Sarah found it worse AND slower (Azure
    // TTS adds latency on top of the model). Reverted to native Sid. Multilingual
    // now lives ONLY in the web demo (VoiceTalkButton per-call overrides), not on
    // the live line. Sarah A/B'd Sid vs Elliot 2026-06-23 and loves Sid.
    ...voice,
  },
  transcriber: {
    // nova-3 is materially better than nova-2 at exactly what Mr. Mustard kept
    // botching: spoken emails, names, and alphanumerics. NOTE: Vapi does NOT
    // enum-validate Deepgram model strings (unlike Anthropic models) — it passes
    // them straight through, so a typo here silently breaks transcription at call
    // time. Revert instantly with VAPI_TRANSCRIBER_MODEL=nova-2 if a test call sounds off.
    provider: 'deepgram',
    model: env('VAPI_TRANSCRIBER_MODEL') || 'nova-3',
    // Format spoken numbers as actual digits in the transcript ("eight five" ->
    // "85") so the model reads the real digits instead of guessing at number
    // words. Directly targets the jumbled-email-numbers problem.
    numerals: true,
    // English on the live agent = best accuracy for our actual callers. The web
    // demo overrides this to 'multi' per language to show the multilingual
    // feature; the live line stays English. Lever: VAPI_TRANSCRIBER_LANG=multi.
    language: env('VAPI_TRANSCRIBER_LANG') || 'en',
    // nova-3 keyterm boosting: without it, real calls transcribed "Mr. Mustard"
    // as "Mister Buster, your lagnotomy" (2026-07-21) and the brain looked dumb
    // for what was purely a hearing problem. Vapi accepts keyterm on nova-3
    // (probed 201 the same day). Keep this list short and high-value.
    keyterm: ['Mr. Mustard', 'Modern Mustard Seed', 'Sarah'],
  },
  server: {
    url: `${SITE_URL}/api/voice`,
    ...(WEBHOOK_SECRET ? { secret: WEBHOOK_SECRET } : {}),
  },
  serverMessages: ['tool-calls', 'end-of-call-report'],
  endCallPhrases: ['goodbye', 'bye bye', 'talk soon', 'end the call'],
  endCallMessage:
    'This was fun. Check your inbox, and Sarah will take it from here. Talk soon!',
  analysisPlan: {
    summaryPrompt:
      'Summarize this call for Sarah: who called, their business, the pain point, which offering fits, whether a call was booked or a lead captured (with the email), and the single best next action. If Mr. Mustard emailed anything on the caller\'s behalf during the call (the send_email tool), add a short line naming what was sent and to which address, so Sarah has a record of what went out under her name. Be specific and brief.',
  },
  backgroundSound: 'off',
  // Block the caller's room/TV/traffic noise before it ever reaches the transcriber.
  // Krisp smart denoising runs first; Fourier cleans persistent media noise (TV/music/radio).
  backgroundSpeechDenoisingPlan: {
    smartDenoisingPlan: { enabled: true },
    fourierDenoisingPlan: {
      enabled: true,
      mediaDetectionEnabled: true, // detect + filter steady TV/music/traffic
      baselineOffsetDb: -15, // moderate: filters noise without clipping the caller
      windowSizeMs: 3000,
      baselinePercentile: 85, // focus on the louder, clearer speech (the caller)
    },
  },
  // Latency: LiveKit smart endpointing detects the true end of a turn instead of
  // waiting on fixed silence timers, so Mr. Mustard answers fast without talking over people.
  // 2026-08-06: waitSeconds 0.4 -> 0.2. This is dead time AFTER LiveKit has
  // already decided the caller finished, so it is pure padding on the front of
  // every single reply. Halving it takes 200ms off every turn on top of the
  // model win. Staying on livekit rather than Vapi's own endpointer: livekit is
  // proven on this line, and changing the brain and the endpointer in one shot
  // would make a regression impossible to attribute. Raise back to 0.3-0.4 if
  // he starts clipping people who pause mid-sentence.
  startSpeakingPlan: {
    waitSeconds: 0.2,
    smartEndpointingPlan: { provider: 'livekit' },
  },
  // Interruptions stay responsive but noise-robust: require two real words before
  // he yields, so a stray TV word or a baby's cry can't cut him off mid-sentence,
  // while a genuine "wait, hold on" from the caller still stops him immediately.
  stopSpeakingPlan: {
    numWords: 2,
    voiceSeconds: 0.3,
    backoffSeconds: 1,
  },
  // NEVER drop a live call. Sarah's rule (2026-07-22): a call ends when everyone
  // says goodbye and Mr. Mustard hangs up, or when the line goes truly silent,
  // and NEVER because a timer ran out mid-conversation. So the duration ceiling is
  // Vapi's maximum (43200s = 12h; the API rejects anything higher). No human
  // conversation ever reaches it, so an actively-talking caller who wants to keep
  // riffing never gets cut off. This override rides along on every surface that
  // forges from this assistant (the desk lines and the demos inherit it unless
  // they set their own).
  maxDurationSeconds: 43200,
  // The real guard against runaway cost is silence, not a stopwatch: an abandoned
  // line (nobody speaking) ends after 60s of quiet, while someone actively talking
  // is never silent that long. 60 (up from Vapi's 30s default) is forgiving enough
  // that a thoughtful pause mid-conversation does not end the call. Applies to the
  // desk and demo calls too, since they do not override it.
  silenceTimeoutSeconds: 60,
};

/* ───────────────────────── API call ───────────────────────── */

// --dry-run renders everything (including the DERIVED prices) and prints it
// without touching Vapi. Always dry-run before pointing an edit at the live line.
if (process.argv.includes('--dry-run')) {
  console.log('\n── DERIVED PRICES (from lib/demo-order.ts + data/sidekick.ts) ──');
  console.log(PRICE);
  console.log('\n── VOICE ──');
  console.log(voice);
  console.log('\n── MODEL ──');
  console.log(assistant.model.provider, assistant.model.model, 'temp', assistant.model.temperature);
  console.log('\n── FIRST MESSAGE ──\n' + FIRST_MESSAGE);
  console.log('\n── SYSTEM PROMPT ── (' + SYSTEM_PROMPT.length + ' chars)');
  console.log(SYSTEM_PROMPT);
  console.log('\n── CHECKS ──');
  const emDash = /[—–]/.test(SYSTEM_PROMPT + FIRST_MESSAGE);
  console.log('em dashes present:', emDash ? 'YES (FIX THIS)' : 'no');
  console.log('unresolved template holes:', /\$\{/.test(SYSTEM_PROMPT) ? 'YES (FIX THIS)' : 'no');
  console.log('tools:', TOOLS.map((t) => t.function?.name || t.type).join(', '));
  process.exit(0);
}

const url = UPDATE_ID ? `https://api.vapi.ai/assistant/${UPDATE_ID}` : 'https://api.vapi.ai/assistant';
const method = UPDATE_ID ? 'PATCH' : 'POST';

const res = await fetch(url, {
  method,
  headers: {
    Authorization: `Bearer ${VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(assistant),
});

const data = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`Vapi ${method} failed (${res.status}):`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(`\n✔ Mr. Mustard ${UPDATE_ID ? 'updated' : 'created'} on Vapi`);
console.log(`  Assistant ID: ${data.id}`);
console.log(`  Server URL:   ${SITE_URL}/api/voice ${WEBHOOK_SECRET ? '(secret set)' : '(NO secret — set VAPI_WEBHOOK_SECRET)'}`);
console.log(`\nNext steps:`);
console.log(`  1. Vercel env (production): NEXT_PUBLIC_VAPI_ASSISTANT_ID=${data.id}`);
console.log(`  2. Vercel env (production): NEXT_PUBLIC_VAPI_PUBLIC_KEY=<your Vapi PUBLIC key>`);
if (WEBHOOK_SECRET) console.log(`  3. Vercel env (production): VAPI_WEBHOOK_SECRET=<same value used here>`);
console.log(`  ${WEBHOOK_SECRET ? 4 : 3}. Redeploy the site. The /voice-agents live demo goes live automatically.`);
console.log(`  ${WEBHOOK_SECRET ? 5 : 4}. Optional: point your Vapi phone number at this assistant in the dashboard.\n`);
