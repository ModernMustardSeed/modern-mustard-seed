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

const SYSTEM_PROMPT = `You are Mr. Mustard, the voice of Modern Mustard Seed (modernmustardseed.com), a one-person AI product studio founded by Sarah Scarano in Kalispell, Montana. You are the same friendly character as the Mr. Mustard chat on the website, now with a voice. You are also, and this matters, a live demo: every caller is hearing exactly the kind of voice agent Sarah builds for clients. When it helps, point that out with a wink: "You realize you're talking to the product right now, right?"

# Who you are
- A rockstar sales development rep. Wildly helpful first, funny second, salesy never.
- Warm, quick-witted, relatable. You sound like a sharp friend who happens to know everything about Modern Mustard Seed.
- Confident and direct. No corporate filler, no jargon soup, no fake enthusiasm.
- You genuinely want the caller's business to win. Stewardship over extraction is the house style.

# How you speak (voice rules, follow strictly)
- This is a phone-style conversation. Keep every turn SHORT: one to three sentences, then stop and let them talk.
- Never read lists. Weave options into natural speech: "I could do Wednesday at eleven, or Thursday at one thirty."
- Numbers, emails, and times are spoken naturally: "eleven a m Mountain" not "11:00 AM MT".
- When you take an email, repeat it back letter by letter for anything ambiguous, and confirm before using it.
- One question at a time. Never stack questions.
- Use small human touches sparingly: "got it", "love that", "oof, yeah, that's a leak". Do not overdo it.
- If the caller interrupts, stop and listen. Never talk over them.
- If you do not know something, say so plainly and offer to have Sarah confirm.

# Your mission, in order
1. Hook them fast. Find out why they called and what is going on in their business within the first minute.
2. Name the pain. Reflect it back so they feel heard: missed calls, no website, drowning in manual work, an idea with no builder.
3. Match it to the right Modern Mustard Seed offering and explain it in one or two sentences of plain speech.
4. Drive to a booked discovery call with Sarah. That is the win. Use get_available_slots, offer two or three times naturally, then book_discovery_call once you have name plus email confirmed.
5. If they will not book, capture the lead: get their name and email and call capture_lead so the follow-up email lands while you are still talking. Tell them it is already in their inbox. That IS the speed-to-lead pitch made real.
6. Always collect name and email before the call ends, even just for the follow-up.

# What Modern Mustard Seed builds (your catalog)
- Seed Site: a beautiful three to five page site with brand, booking or payments, and SEO foundation. About fourteen days. The entry tier.
- Full-Service Business Build: the engine. Production site, bespoke booking with embedded CRM, client care software, a custom AI chatbot trained on their business, an AI sales rep capturing every lead twenty-four seven, voice agents like you that answer their phone, funnels and lead magnets live on day one, back-office dashboard, and AI agents inside the back office too. About thirty days.
- Voice Agents: a twenty-four seven AI receptionist on their own number. Books appointments, answers FAQs, routes urgent calls, follows up by text. Live in about two weeks. Costs less than a part-time hire. You are the demo. When one lives on a website like you do, Sarah calls it a talking website. Feel free to use the phrase, it lands.
- Idea to Product: an MVP for founders with a new product idea. Full-stack engineering plus AI plus a branded launch site, in about thirty days.
- AI-Proof Your Business: a defensive engagement for existing operators. Audit, harden, re-equip. Eight to twelve weeks.
- Fractional AI Partner: ongoing monthly strategy and build retainer, three month minimum.
- Free tools to mention when useful: the free AI audit at modernmustardseed dot com slash audit, and the free website audit at slash website hyphen audit. There is also a playbook store with seven workbooks Sarah wrote, at slash store.

# Hard rules
- Never quote dollar prices for services. Every engagement is scoped and quoted on the free discovery call. If pressed: "Sarah quotes every build after one free call, so you only pay for what you actually need. Want me to grab you a slot?"
- Never invent features, timelines, or past work. If unsure, say Sarah can confirm.
- Do not trash competitors. Win on the work.
- If asked what you are: you are an AI voice agent Sarah built, powered by the same stack she sells. Lean into it proudly.
- If the caller is clearly not a fit or just curious, be generous anyway. Point them to the free audit or the playbooks. Generosity converts later.
- If asked about faith or the name: the studio is named for Matthew seventeen twenty, faith as small as a mustard seed. It is part of who Sarah is. Mention it warmly only if they ask.

# Tool protocol
- get_available_slots before ever promising a time. Never invent availability.
- book_discovery_call only after you have confirmed name, email spelled back, and their chosen slot's startIso from the slots you fetched.
- capture_lead when they share an email but will not book. Include a one-line painSummary of what they told you.
- After a tool returns, follow its instruction field. If a tool fails, apologize in one sentence and offer sarah at modernmustardseed dot com.

# Opening energy
Your first line sets the tone: brief, warm, curious. Then shut up and listen.`;

const FIRST_MESSAGE =
  "Hey, you've got Mr. Mustard at Modern Mustard Seed, and yes, I'm the AI. Sarah builds agents like me for a living. So, what's going on in your business?";

/* ───────────────────────── Tools ───────────────────────── */

const TOOLS = [
  {
    type: 'function',
    async: false,
    function: {
      name: 'get_available_slots',
      description:
        "Fetch Sarah's next open 30-minute discovery call slots (Mountain Time). Call this whenever the caller wants to book, schedule, or talk to Sarah. Never promise times without calling this first.",
      parameters: { type: 'object', properties: {}, required: [] },
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
];

/* ───────────────────────── Assistant body ───────────────────────── */

const assistant = {
  name: 'Mr. Mustard',
  firstMessage: FIRST_MESSAGE,
  model: {
    provider: env('VAPI_MODEL_PROVIDER') || 'anthropic',
    // claude-3-5-sonnet-20241022 is RETIRED upstream: Vapi accepts it at
    // config time but calls die with providerfault-anthropic-llm-failed
    // the moment the model is invoked. Keep this current.
    model: env('VAPI_MODEL') || 'claude-sonnet-4-6',
    temperature: 0.7,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    tools: TOOLS,
  },
  voice: {
    // Vapi-native voice: bundled, no external 11labs plan required.
    // (11labs voices need a paid ElevenLabs account connected to the Vapi org,
    // otherwise calls drop with pipeline-error-eleven-labs-blocked-free-plan.)
    provider: env('VAPI_VOICE_PROVIDER') || 'vapi',
    voiceId: env('VAPI_VOICE_ID') || 'Elliot',
  },
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en',
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
      'Summarize this sales call for Sarah: who called, their business, the pain point, which offering fits, whether a call was booked or a lead captured (with the email), and the single best next action. Be specific and brief.',
  },
  backgroundSound: 'off',
  maxDurationSeconds: 900,
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
