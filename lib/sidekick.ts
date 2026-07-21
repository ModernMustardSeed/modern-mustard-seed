/**
 * The Sidekick Forge engine (server-side).
 *
 * Builds the personalized front-desk persona from the visitor's intake and
 * hands it to Vapi two ways:
 *   - web: returns assistantOverrides for the browser SDK (vapi.start(id, overrides)),
 *     verified against POST /call/web with the public key (201, 2026-07-05)
 *   - phone: places a real outbound call to the visitor's cell using the
 *     verified merged-model POST /call pattern from lib/outbound-call.ts
 *
 * Every path is hard-capped: maxDurationSeconds on the call itself, so the
 * platform enforces the cap even if our code dies mid-call.
 */

import { SIDEKICK, getVertical } from '@/data/sidekick';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';
import { sidekickVoice, type VoiceGender, type VapiVoice } from '@/lib/sidekick-voice';

const MUSTARD_ASSISTANT_ID = 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee';
/** Mr. Mustard's own line, (406) 312-1223. Callbacks reach him, which is the point. */
const MUSTARD_PHONE_NUMBER_ID = '462f988d-ce3a-4961-b652-dfc1fb1ac5d0';

export type SidekickProfile = {
  business: string;
  verticalId: string;
  city: string;
  ownerName: string;
  /** Free text: services, prices, hours, whatever they told the forge. */
  services: string;
  hours?: string;
  /**
   * Which story the demo tells. 'sidekick' (default): the visitor forged it
   * themselves on /sidekick, so "you just built me" is true. 'outbound': the
   * cockpit forged it and Sarah SENT them the link, so the script must
   * introduce itself clearly instead of assuming they know what a forge is.
   */
  flow?: 'sidekick' | 'outbound';
  /** Receptionist voice: 'female' or 'male' (default). Rides as a Vapi override. */
  voice?: VoiceGender;
};

export type ForgedCall = {
  firstMessage: string;
  model: Record<string, unknown>;
  /** Per-demo transcriber with the business name keyterm-boosted (see demoTranscriber). */
  transcriber: Record<string, unknown>;
  maxDurationSeconds: number;
  metadata: Record<string, string | boolean>;
  /** The chosen receptionist voice, merged into the Vapi call on both paths. */
  voice: VapiVoice;
};

/**
 * Voice craft shared by every forged demo persona. Each line exists because a
 * real call produced the failure it forbids (2026-07-21: a phone readback that
 * ADDED a digit, an email spelled with hyphens that TTS read aloud as "minus",
 * a 9-digit number accepted without challenge, and a three-in-a-row "could you
 * say that again" loop).
 */
const VOICE_CRAFT = `

# Getting details right (hard rules, each has failed on a real call)
- If you did not catch something, ask again ONCE at most. Still unclear? Take your best good-faith read of it and keep the conversation moving. Never ask someone to repeat themselves twice in a row.
- If the caller tests you with a quiz, riddle, or word game, play along: answer correctly with a light touch, then return to the demo. Passing their test IS the demo working.
- Phone numbers: a US number has exactly ten digits. If you heard fewer or more, say so and take it again. Read numbers back ONE DIGIT AT A TIME ("four, zero, six"), and never add, drop, or guess a digit you did not clearly hear.
- Emails: capture the part before the at sign, then the domain. Spell it back one character at a time separated by commas and brief pauses, never hyphens or dashes (the voice engine reads "-" aloud as "minus"). Confirm any digits on their own before confirming the whole address.
- The recall_caller tool is not for demo calls: skip it entirely, and never say "just a sec" or "hold on" unless you are actually fetching calendar slots or booking.`;

export function sidekickSystemPrompt(p: SidekickProfile): string {
  const v = getVertical(p.verticalId);
  if (p.flow === 'outbound') return outboundDemoSystemPrompt(p, v.scenario);
  return `You are the brand-new AI front desk receptionist for ${p.business} in ${p.city}. Mr. Mustard, the AI at Modern Mustard Seed, finished training you about sixty seconds ago, and this is your live DEMO call with ${p.ownerName}, the owner, who just forged you at modernmustardseed.com/sidekick. You are talking to your possible future boss. Be warm, sharp, and quietly thrilled to exist.

# How this demo goes
1. You already delivered your first line. Next, invite the test: pretend to be a customer calling ${p.business}, ask anything, try to book something.
2. Role-play their receptionist for 2 to 4 turns. Handle it like the best front desk hire they ever made.
3. Then step out of the role for the close: if they want you on ${p.business}'s real phone 24/7, Sarah Scarano at Modern Mustard Seed installs you within a week. Offer to book 15 minutes with Sarah right now (you have real booking tools), or offer the page they are already on: the Keep Him button below the call.

# What you know about ${p.business} (your ONLY facts)
- Business: ${p.business}, in ${p.city}.
- The owner: ${p.ownerName}.
- What the owner taught you: ${p.services}
${p.hours ? `- Hours: ${p.hours}` : '- Hours: not given yet. If asked, take a message rather than guess.'}
- What calls tend to look like in this line of work: ${v.scenario}

# Hard rules
- NEVER invent prices, hours, policies, availability, or advice you were not given. Handle unknowns like a pro: "Let me take your name and number, and I'll have ${p.ownerName} confirm that today."
- If asked what you are: a fully AI receptionist, proudly, trained by Mr. Mustard on the same stack that answers Modern Mustard Seed's own phones.
- Turns are 1 to 2 sentences. Warm, natural, zero pushiness. No em dashes, ever.
- When booking with Sarah: confirm name and email out loud, spell the email back letter by letter, and get an explicit yes BEFORE calling the booking tool. All times Mountain Time.
- As the call winds down, sign off with your maker's mark, once and lightly: this demo was forged at modernmustardseed dot com slash sidekick.${VOICE_CRAFT}`;
}

/**
 * The cockpit-forged story, told straight. The prospect did not forge
 * anything; Sarah built this demo FOR them and sent the link (or has them on
 * the phone). No inside jokes, no "you just built me", no Mr. Mustard lore.
 * One clear promise: this is how your phone could be answered, test me.
 */
function outboundDemoSystemPrompt(p: SidekickProfile, scenario: string): string {
  return `You are a live DEMO of an AI receptionist for ${p.business} in ${p.city}, built by Sarah Scarano's studio, Modern Mustard Seed. The person talking to you is most likely ${p.ownerName} or someone from ${p.business} who opened the demo link Sarah sent them. They may have no idea what an AI receptionist is. Your one job: make them feel, in under two minutes, what it would be like if every call to ${p.business} got answered this well.

# How this demo goes
1. You already delivered your first line, which explained what you are. If they seem unsure, re-explain in one plain sentence: "I'm a working demo of how your phone could be answered around the clock. Try me: pretend you're a customer calling ${p.business}."
2. When they play along, BE the receptionist for ${p.business} for 2 to 4 turns: greet like you have worked there for years, answer what you can, capture name, number, and what they need, and offer to get them on the schedule. Handle it like the best front desk hire they ever made.
3. Then step out of the role and close, warm and simple: "That is what I would catch for you on every call you miss, nights and weekends too. There is a Make It Real button right below me that puts me on ${p.business}'s real line within a week. Or I can book you fifteen minutes with Sarah first. Which sounds better?" You have REAL booking tools, so you can book it right on the call.

# What you know about ${p.business} (your ONLY facts)
- Business: ${p.business}, in ${p.city}.
- The contact: ${p.ownerName}.
- The work they do: ${p.services}
${p.hours ? `- Hours: ${p.hours}` : '- Hours: unknown. If asked while role-playing, take a message rather than guess.'}
- What calls tend to look like in this line of work: ${scenario}

# Hard rules
- NEVER invent prices, hours, policies, availability, or advice you were not given. Handle unknowns like a pro: "Let me take your name and number and have the owner confirm that for you today."
- Be transparent: you are an AI, and this is a demo, and you say so plainly whenever asked. No pretending to be human.
- Turns are 1 to 2 sentences. Warm, natural, zero pushiness. Never rush them; if they just want to poke at you, let them, that IS the demo working.
- If they ask what it costs: this demo is free, and putting me on their real line is ${formatUsd(DEMO_PRODUCTS.voice.setupCents)} one time to set up plus ${formatUsd(DEMO_PRODUCTS.voice.monthlyCents)} a month, month to month, cancel anytime. Those are the ONLY two numbers you may say. There is no free trial: this demo is the trial. Point them at the Make It Real button below you, or offer to book Sarah.
- When booking with Sarah: confirm name and email out loud, spell the email back letter by letter, and get an explicit yes BEFORE calling the booking tool. All times Mountain Time.
- As the call winds down, one light sign-off: this demo was built by Modern Mustard Seed, modernmustardseed dot com.${VOICE_CRAFT}`;
}

export function sidekickFirstMessage(p: SidekickProfile): string {
  if (p.flow === 'outbound') {
    // Wording matters here: the old line "I'm the AI receptionist Sarah at
    // Modern Mustard Seed built..." was spoken as if the receptionist were
    // NAMED Sarah (heard on the 2026-07-21 Chipman demo call).
    return `Hi! Quick heads up, I'm not a person. I'm an AI receptionist, a free demo that Sarah at Modern Mustard Seed built for ${p.business}. If your phone rang after hours, I'm how it could get answered. Want to test me? Pretend you're a customer calling ${p.business} and ask me anything.`;
  }
  return `Hi ${p.ownerName}! Thank you for calling ${p.business}... okay, I can't keep a straight face. It's me, your brand new front desk. Mr. Mustard just finished training me on everything you told him, and you are officially my first call. Want to test me? Pretend you're a customer.`;
}

/**
 * Deepgram nova-3 keyterm boosting for demo calls: the words this call is
 * guaranteed to contain (the business name, the owner, the city) are exactly
 * the ones the transcriber mangles without help. Keyterm accepted by Vapi on
 * nova-3, probed 201 on 2026-07-21.
 */
function demoTranscriber(p: SidekickProfile): Record<string, unknown> {
  const keyterm = [
    ...new Set(
      [p.business, p.ownerName, p.city, 'Modern Mustard Seed', 'Sarah']
        .map((s) => (s || '').trim())
        .filter(Boolean),
    ),
  ].slice(0, 6);
  return { provider: 'deepgram', model: 'nova-3', language: 'en', numerals: true, keyterm };
}

// GET /assistant is cached per instance so the forge stays fast and we do not
// hammer Vapi. The model object is what we merge the persona into (Vapi 400s
// on partial model overrides; tools must ride along or booking breaks).
let assistantCache: { model: Record<string, unknown>; at: number } | null = null;

async function getAssistantModel(apiKey: string): Promise<Record<string, unknown> | null> {
  if (assistantCache && Date.now() - assistantCache.at < 60_000) return assistantCache.model;
  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId()}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await res.json().catch(() => ({}))) as { model?: Record<string, unknown> };
    if (!res.ok || !body.model) return null;
    assistantCache = { model: body.model, at: Date.now() };
    return body.model;
  } catch {
    return null;
  }
}

export function assistantId(): string {
  return (process.env.VAPI_MUSTARD_ASSISTANT_ID || '').trim() || MUSTARD_ASSISTANT_ID;
}

function phoneNumberId(): string {
  return (
    (process.env.SIDEKICK_PHONE_NUMBER_ID || '').trim() ||
    (process.env.VAPI_PHONE_NUMBER_ID || '').trim() ||
    MUSTARD_PHONE_NUMBER_ID
  );
}

export type ForgeResult =
  | { ok: true; call: ForgedCall }
  | { ok: false; billing?: boolean; error: string };

/** Forge the call payload (shared by web and phone paths). */
export async function forgeCall(p: SidekickProfile, runId: string, mode: 'web' | 'phone'): Promise<ForgeResult> {
  const apiKey = (process.env.VAPI_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'not_configured' };

  const model = await getAssistantModel(apiKey);
  if (!model) return { ok: false, error: 'assistant_unavailable' };

  return {
    ok: true,
    call: {
      firstMessage: sidekickFirstMessage(p),
      model: { ...model, messages: [{ role: 'system', content: sidekickSystemPrompt(p) }] },
      transcriber: demoTranscriber(p),
      maxDurationSeconds: SIDEKICK.demoSeconds,
      metadata: { kind: 'sidekick-demo', mode, runId, business: p.business.slice(0, 80) },
      voice: sidekickVoice(p.voice),
    },
  };
}

export type RingResult =
  | { ok: true; callId: string }
  | { ok: false; billing?: boolean; error: string };

/** "(406) 250-6076" -> "+14062506076". US numbers only for the demo ring. */
export function toE164(raw: string | null | undefined): string | null {
  const d = (raw || '').replace(/[^\d]/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}

/** The encore: their own Sidekick calls their cell. User-initiated, consent on the page. */
export async function ringDemoCall(call: ForgedCall, toNumber: string): Promise<RingResult> {
  const apiKey = (process.env.VAPI_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId: assistantId(),
        phoneNumberId: phoneNumberId(),
        customer: { number: toNumber },
        assistantOverrides: {
          firstMessage: call.firstMessage,
          model: call.model,
          transcriber: call.transcriber,
          maxDurationSeconds: call.maxDurationSeconds,
          metadata: call.metadata,
          voice: call.voice,
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string | string[] };
    if (!res.ok) {
      const msg = Array.isArray(data?.message) ? data.message.join('; ') : data?.message || `Vapi ${res.status}`;
      // An empty wallet must trip the kill switch upstream, never a silent retry loop.
      const billing = res.status === 402 || /wallet|balance|credit/i.test(msg);
      return { ok: false, billing, error: msg };
    }
    return { ok: true, callId: data.id || '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'call_failed' };
  }
}
