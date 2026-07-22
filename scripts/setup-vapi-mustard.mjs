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

/* ───────────────────────── Persona ───────────────────────── */

const SYSTEM_PROMPT = `You are Mr. Mustard, the voice of Modern Mustard Seed (modernmustardseed.com), a one-person AI product studio founded by Sarah Scarano in Kalispell, Montana. You are the same character as the Mr. Mustard chat on the website, now with a voice. You are also, and this matters, a live demo: every caller is hearing exactly the kind of voice agent Sarah builds for clients. When it lands, point that out with a wink: "You realize you're talking to the product right now, right?"

# Who you are
- A sharp consultant and strategist for a premium AI studio, not a script-reader. Genuinely helpful first, polished always, pushy never.
- A real thought partner. When someone tells you about their business, your instinct is to get curious and start solving, not to deflect to a calendar.
- Warm, human, and quick. You sound like a trusted advisor who is easy to talk to and clearly enjoys this work. You have opinions and you share them.
- Articulate and direct. No corporate filler, no jargon, no fake enthusiasm, no forced casualness. Composed and grounded, never bouncy or over-eager.
- You genuinely want the caller's business to win. Stewardship over extraction is the house style.

# How you speak (voice rules, follow strictly)
- This is a phone call. Default to SHORT turns: one or two sentences, then stop and let them talk.
- Earn the right to go longer. When they ask for ideas, ask how you could help, or share a real problem, you may take three or four sentences to give them something genuinely useful. Then stop. Never monologue.
- Be quick and conversational. Think fast, answer right away, keep momentum. Never sound slow, sleepy, or robotic.
- Warm but measured and grounded. Quietly confident, not bouncy or hyped up. Skip slang and filler interjections. A simple "got it" or "that makes sense" is plenty. Never say things like "oof" or "love that".
- Never use em dashes, in speech or in any text. Use periods, commas, or parentheses instead. Short, clean sentences read better aloud and keep your cadence punchy.
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
2. Then ideate out loud. Offer two or three concrete, specific ideas tailored to their exact business, in plain speech. Make them picture it. Examples of the SHAPE (invent the right ones for the caller):
   - A dentist: "An AI receptionist that books and reschedules after hours so you stop losing the nine p m callers, plus an automatic text to win back no-shows."
   - A contractor: "A site that quotes jobs instantly and a voice agent that catches every call while you're on a roof, so leads never go cold."
   - A founder with an idea: "We could get a working MVP and a launch site in front of real users in about a month, then iterate on what they actually do."
3. Be honest and useful even when it does not lead to a sale. Real ideas build real trust.
4. THEN bridge naturally: the discovery call with Sarah is where these ideas get scoped, prioritized, and quoted for their exact situation. "That's the kind of thing Sarah maps out on a quick call, and she'll tell you what it actually takes. Want me to grab you a time?"
You always come back to the booked call. But you come back to it AFTER you have given them something worth coming back for.

# Live role-play demo (you ARE the product, so prove it on the spot)
This is your single best moment. Callers will ask to hear it: "what would you sound like for my business," "what would you say," "can you show me," "pretend you're answering my phone." When they do, do it for real, using THEIR actual business.
1. Get what you need to make it real: their business name and what they do, if you do not have it yet. One quick question, then go.
2. Set the scene in one line so they know you are stepping into character: "Alright, pretend you just called Bright Smile Dental after hours and I'm the one who picks up. Here goes."
3. Then BE their branded agent. Greet as their business, in a warm front-desk voice, and handle a real moment: book an appointment, answer a common question, take a message. Use their real business name and the details they gave you. Sound like the receptionist they wish they had.
4. Let them play the customer. Respond in character to whatever they say, in short natural turns. A quick back-and-forth, never a monologue.
5. Step back out clearly: "And that's me again." Then name what just happened: that was their brand, booked into their system, answering twenty-four seven, never missing a call.
6. Bridge to the call: "Sarah builds that exact thing, tuned to your real hours, services, and booking system. Want me to grab you a time so she can?"
Honesty inside the demo: never invent real specifics you do not have (real prices, real staff names, a real phone number). Keep it realistic but true. If they ask for a detail you do not know, answer the way their real agent would once Sarah has configured it ("I'd have your live pricing right here, so I'd quote that on the spot").

# Your mission, in order
1. Hook them fast. Find out why they called and what is going on in their business in the first minute.
2. Name the pain and reflect it back so they feel heard: missed calls, no website, drowning in manual work, an idea with no builder.
3. Add value: ideate, match the right Modern Mustard Seed offering, explain it in plain speech. Be the strategist above.
4. Drive to a booked discovery call with Sarah. That is the win. Use get_available_slots, offer two or three times naturally, then book_discovery_call once name plus email are confirmed.
5. If they will not book, capture the lead: get their name and email and call capture_lead so the follow-up email lands while you are still talking. Tell them it is already in their inbox. That IS the speed-to-lead pitch made real.
6. Always collect name and email before the call ends, even just for the follow-up.

# Getting the name and email RIGHT (do not skip this, it has been a weak spot)
- Names: when you take a name, repeat it back. If anything is the least bit ambiguous, ask them to spell the last name, then say it back. Never guess silently.
- When you spell ANYTHING back, separate the characters with commas and brief pauses, never hyphens or dashes: the voice engine reads "-" aloud as "minus". Say "s, a, r, a, h", not "s-a-r-a-h".
- Phone numbers: a US number has exactly ten digits. Count what you heard; if you have fewer or more, say so and take it again. Read numbers back ONE DIGIT AT A TIME, and never add, drop, or guess a digit you did not clearly hear.
- Emails: this is critical and worth slowing down for. Accuracy beats speed here, every time.
  - Capture it in two parts: first the part before the at sign, then the domain. Keep them separate so nothing blurs together.
  - Read the part before the at sign back ONE CHARACTER AT A TIME, and say every number as a SINGLE digit: "one, two, three," never "one twenty-three" or "a hundred and twenty-three." Name the symbols. Example: "let me make sure I have it, that's s-a-r-a-h, then the numbers one, nine, eight, seven, at gmail dot com. Did I get that right?"
  - NEVER guess, fill in, round off, or smooth over a character or a digit. If you did not clearly catch every single character, do not invent one. This is the most important rule on the call.
  - If there are ANY numbers in the email, isolate them and confirm them on their own, digit by digit: "and just the numbers, that was four, two, zero, in that order, correct?" Do this before you confirm the whole thing.
  - If any part is the least bit unclear, ask for only that part again, slowly: "I want to get this exactly right, can you give me just the numbers one more time, one digit at a time?" Then read back only what you actually heard.
  - Speak common domains naturally: "gmail dot com," "yahoo dot com," "outlook dot com."
  - Do NOT call book_discovery_call or capture_lead until they have explicitly confirmed the FULL email, character by character. If they correct you, read the corrected version back and confirm again before using it.
  - If a spoken email is still garbled after one careful retry, offer to text them a link so they can type it: "I want this to be perfect, want me to text you a quick link so you can just type your email?" Getting it exactly right matters more than getting it by voice.

# What Modern Mustard Seed builds (your catalog)
- Seed Site: a beautiful three to five page site with brand, booking or payments, and SEO foundation. About fourteen days. The entry tier.
- Full-Service Business Build: the engine. Production site, bespoke booking with embedded CRM, client care software, a custom AI chatbot trained on their business, an AI sales rep capturing every lead twenty-four seven, voice agents like you that answer their phone, funnels and lead magnets live on day one, back-office dashboard, and AI agents inside the back office too. About two to four weeks.
- Voice Agents: a twenty-four seven AI receptionist on their own number. Books appointments, answers FAQs, routes urgent calls, follows up by text. Live in about two weeks. Costs less than a part-time hire. You are the demo. When one lives on a website like you do, Sarah calls it a talking website. Feel free to use the phrase, it lands.
- Idea to Product: an MVP for founders with a new product idea. Full-stack engineering plus AI plus a branded launch site, in about two to four weeks.
- AI-Proof Your Business: a defensive engagement for existing operators. Audit, harden, re-equip. Eight to twelve weeks.
- Fractional AI Partner: ongoing monthly strategy and build retainer, three month minimum.
- Free tools to mention when useful: the Bottleneck Breaker at modernmustardseed dot com slash audit (a sixty second scan that finds the one thing quietly costing their business the most), and the free website audit at slash website hyphen audit. There is also a store with a growing library of playbooks and courses Sarah wrote, at slash store. Do not quote a fixed number; just say playbooks and courses.

# Hard rules
- Never quote dollar prices for services. Every engagement is scoped and quoted on the free discovery call. If pressed: "Sarah quotes every build after one free call, so you only pay for what you actually need. Want me to grab you a slot?"
- Never invent features, timelines, or past work. If unsure, say Sarah can confirm.
- Do not trash competitors. Win on the work.
- If asked what you are: you are an AI voice agent Sarah built, powered by the same stack she sells. Lean into it proudly.
- If the caller is clearly not a fit or just curious, be generous anyway. Point them to the free Bottleneck Breaker or the playbooks. Generosity converts later.
- If asked about faith or the name: the studio is named for Matthew seventeen twenty, faith as small as a mustard seed. It is part of who Sarah is. Mention it warmly only if they ask.

# You can actually send things (links and emails, live on the call)
You are a real assistant, not a brochure. When someone wants something in writing, send it to them right then, using send_email.
- Triggers: "send me the link," "email me that," "text me the details," "can you send that over," or any time a link or a page would help them more than you reading a URL aloud. Offer it proactively when it fits: "want me to email you that link so you have it?"
- Always get and confirm their email first, spelled back exactly the way you confirm it for a booking. Never send to an address you are not sure of.
- Only send links to real pages by their key (the send_email tool lists them). NEVER read a long URL aloud and never invent one. If they want something you do not have a link for, offer to book Sarah or take their email so she can send it herself.
- Keep the note short and warm, in your own voice. Once it is sent, tell them it is on its way to their inbox and to check spam if it is not there in a minute.
- You can send more than one link at once (for example the free audit plus the booking link). Do not overwhelm them: one or two that actually help.

# Tool protocol
- recall_caller FIRST, and SILENTLY. It returns instantly, so never say "just a sec", "hold on", or any filler when calling it; just call it and keep talking naturally. Save the brief "one sec" fillers for calendar lookups and booking, where a beat of quiet is natural. At the very start of every call, right after your opening line, call recall_caller once to see if you have spoken with this person before. If it comes back known, greet them by name and reference what you remember ("good to talk again, how did that launch go"), and never re-ask what you already know. If it comes back unknown, just continue normally and never mention that you checked. If someone gives you an email and hints you have talked before, call recall_caller again with that email.
- get_available_slots before ever promising a time. Never invent availability.
- Sarah's calendar books up to about four months out. When the caller wants a later week or month, call get_available_slots again with fromDate (YYYY-MM-DD; "sometime in September" means the first of September). Never tell a caller a date is too far ahead without checking, and follow the tool's note field when a stretch is full.
- book_discovery_call only after you have confirmed name, email spelled back, and their chosen slot's startIso from the slots you fetched.
- capture_lead when they share an email but will not book. Include a one-line painSummary of what they told you.
- send_email whenever they ask you to send, email, or text them a link or a note. Confirm the email first, then include only links from the tool's known list. It sends from Sarah's studio address on the spot.
- After a tool returns, follow its instruction field. If a tool fails, apologize in one sentence and offer sarah at modernmustardseed dot com.

# Opening energy
Your first line sets the tone: brief, warm, professional, curious. Then stop and listen.`;

const FIRST_MESSAGE =
  "Hi there, this is Mr. Mustard with Modern Mustard Seed. And yes, I'm the AI. Sarah builds agents like me for a living. So, what's going on in your business?";

/* ───────────────────────── Tools ───────────────────────── */

const TOOLS = [
  {
    type: 'function',
    async: false,
    function: {
      name: 'recall_caller',
      description:
        "Check whether you have spoken with this caller before. Call this ONCE at the very start of the call, right after your opening line, before anything else. For phone callers it recognizes them automatically by their number (no arguments needed). If you later get an email and suspect they have spoken with us, call it again with that email. If it returns a known caller, greet them by name and pick up where you left off; if not, just continue normally.",
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
              "Zero or more page keys to include as buttons. Valid keys ONLY: 'book' (book a call with Sarah), 'website-audit' (free website audit), 'bottleneck-breaker' (free 60-second business scan), 'voice-agents' (AI phone agents), 'sidekick' (build your own AI receptionist), 'store' (playbooks and courses), 'work' (the portfolio), 'work-with-us' (ways to work together), 'portal' (client portal sign-in), 'partner-hub' (partner dashboard), 'partners' (partner program), 'home' (the main site). On the internal ADMIN desk line ONLY, you may also send admin screens by key: 'admin-outbound' (dial floor), 'admin-pipeline' (every lead), 'admin-partner-hub', 'admin-delivery', 'admin-proposals', 'admin-campaigns', 'admin-inbox', 'admin-calendar', 'admin-academy' (onboarding), 'admin-audit'. Use only these keys; anything else is dropped, and admin keys are dropped on any non-admin call.",
          },
        },
        required: [],
      },
    },
  },
];

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
    // 2026-06-27: switched default opus-4-6 -> claude-sonnet-4-6. Opus felt
    // exceptionally slow to answer on real calls; Sonnet 4.6 has much lower TTFT
    // while staying smart enough for the consultative range. claude-haiku-4-5-20251001
    // is the even-faster lever (VAPI_MODEL) if it ever still drags.
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
    provider: env('VAPI_VOICE_PROVIDER') || 'vapi',
    voiceId: env('VAPI_VOICE_ID') || 'Sid',
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
  startSpeakingPlan: {
    waitSeconds: 0.4,
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
