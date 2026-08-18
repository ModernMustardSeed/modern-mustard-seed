/**
 * MR. MUSTARD CALLS THE PROSPECT.
 *
 * He is not a second agent. This places a call as the SAME live Mr. Mustard who
 * answers (406) 312-1223, with two things bolted on for the length of one call:
 *
 *   1. A BRIEFING appended to his system prompt. It has to be appended, not
 *      substituted: Vapi only fills a `{{variable}}` the prompt already names,
 *      and his 22k-character prompt never names one, so `variableValues` does
 *      nothing. Replacing `model.messages` outright (the cold-call path in
 *      lib/outbound-call.ts) would throw his whole persona away. So we GET the
 *      assistant, keep the entire model object so his seven tools survive, and
 *      append.
 *
 *   2. THE ACQUISITION TOOLBELT, appended to model.tools. These exist only on
 *      acquisition calls, which is why they are added here instead of pushed
 *      onto the live assistant. A bad push to him breaks the studio phone line
 *      AND every forged demo in flight at once.
 *
 * The call is only ever placed against a live, unrevoked consent record.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';
import { OFFER, TRADE_ROLEPLAY_NOTE, TRADE_SCENARIOS } from '@/lib/acq/types';
import type { AcqProspect, Trade } from '@/lib/acq/types';
import { shortBusiness } from '@/lib/acq/campaign';
import { CALLBACK_NUMBER_ID } from '@/lib/vapi-lines';

const VAPI_BASE = 'https://api.vapi.ai';

/**
 * Vercel's write-only "Sensitive" variables read back as the literal string
 * `[SENSITIVE]`, which is truthy. Left unfiltered it sails through every `||`
 * and gets sent to Vapi as a real assistant id or a real key, which fails in a
 * way that looks like a telephony outage rather than a config mistake.
 */
const real = (...values: (string | undefined)[]): string => {
  for (const v of values) {
    const t = (v ?? '').trim();
    if (t && !/^\[SENSITIVE\]$/i.test(t)) return t;
  }
  return '';
};

/**
 * The outbound line, defined once in lib/vapi-lines.ts along with the reason it
 * is the studio number and not a second one. Short version: the ten-a-day
 * outbound cap on Vapi numbers is per ACCOUNT, so a separate callback number
 * adds no capacity and only costs identity.
 *
 * ⚠️ He reads this number out loud on every call he places, from the prompt in
 * scripts/setup-vapi-mustard.mjs. Change the line, change that prompt in the
 * same commit, or he tells people a number that does not reach him.
 */
const FROM_NUMBER_ID = CALLBACK_NUMBER_ID;

const ASSISTANT_ID = real(
  process.env.VAPI_MUSTARD_ASSISTANT_ID,
  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
  process.env.VAPI_ASSISTANT_ID,
);

/** One call per number per window, whatever the queue thinks. */
const DEDUPE_MINUTES = 20;

const apiKey = () => real(process.env.VAPI_API_KEY, process.env.VAPI_PRIVATE_KEY);

/* ─────────────────────────── the acquisition tools ──────────────────────── */

/**
 * Tools appended for this call only. They inherit the assistant's own `server`
 * block (url + secret), which is why none is declared here: declaring one would
 * mean carrying a webhook secret through application code.
 */
export function acquisitionTools() {
  return [
    {
      type: 'function' as const,
      messages: [{ type: 'request-start', content: 'Give me one second. Building yours now.' }],
      function: {
        name: 'forge_prospect_agent',
        description:
          "Build THIS prospect's own personalized voice agent demo, for the business already on the call. Use it when the owner says yes to 'want me to build the {business} version so you can test it whenever you want'. Free, no card. Use the email already in your briefing if there is one, confirmed by saying it back as words, and only take a fresh one (anchored, 'b as in boy') if they say it is wrong. Call it once per call.",
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Their email. Use the one from your briefing when there is one; only spell out a new one if they corrected you.' },
            contact_name: { type: 'string', description: 'The owner or manager name, if they gave it.' },
            trade: { type: 'string', description: 'Their trade in their own words (heating and air, plumbing, roofing).' },
            services: { type: 'string', description: 'The services they named on the call, comma separated.' },
            service_area: { type: 'string', description: 'The area they said they serve.' },
            hours: { type: 'string', description: 'What they said about their hours and after-hours coverage.' },
            pain: { type: 'string', description: 'The call they said they would most hate to miss, in their words.' },
            preferences: { type: 'string', description: 'Anything they asked their agent to do differently.' },
          },
          required: ['email'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'email_prospect_demo',
        description:
          "Email the prospect the personalized demo you forged, with the activation link and Sarah's calendar. Only after forge_prospect_agent succeeded. If the build is still running, say so instead of calling this twice.",
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Confirmed email address to send it to.' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'send_checkout_link',
        description:
          `Send the activation link so they can buy the Voice Agent (${OFFER.line}, month to month). Use it the moment they say they want it. Never send it unasked.`,
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Confirmed email address.' },
            note: { type: 'string', description: 'One sentence of context for the email, in your voice.' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'log_call_outcome',
        description:
          'Record what you learned, near the end of the call, ALWAYS. This is how Sarah sees the pipeline. Call it once, right before you say goodbye.',
        parameters: {
          type: 'object',
          properties: {
            pain_point: { type: 'string', description: 'The call they most hate to miss, in their words.' },
            company_size: { type: 'string', description: 'Trucks, technicians or people, if mentioned.' },
            current_phone_workflow: { type: 'string', description: 'Who answers the phone now and when.' },
            missed_call_problem: { type: 'string', description: 'What they said about missed calls.' },
            after_hours_need: { type: 'string', description: 'What they said about nights and weekends.' },
            objection: { type: 'string', description: 'Their main hesitation, if any.' },
            requested_features: { type: 'array', items: { type: 'string' }, description: 'Anything they asked for.' },
            buying_intent: { type: 'string', enum: ['high', 'medium', 'low', 'none'], description: 'Your honest read.' },
            price_reaction: { type: 'string', description: 'What they said when price came up.' },
            next_step: { type: 'string', description: 'What happens next, agreed on the call.' },
            competitor: { type: 'string', description: 'Any competitor or other vendor they mentioned.' },
            close_probability: { type: 'number', description: 'Your honest 0-100 read on closing this.' },
            roleplay_scenario: { type: 'string', description: 'The scenario you role-played, in a few words.' },
            needs_human: { type: 'string', description: 'Fill this ONLY when Sarah personally needs to handle something: custom pricing, an integration question you could not answer, a multi location operator, or they asked for a human.' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'stop_contacting',
        description:
          'They asked not to be contacted again. Call this immediately, confirm warmly that you have taken them off the list, and end the call. Never argue, never pitch after this.',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'What they said, briefly.' },
          },
          required: [],
        },
      },
    },
  ];
}

/* ───────────────────────────── the briefing ─────────────────────────────── */

export function tradeOf(lead: Pick<AcqProspect, 'trade' | 'business_name' | 'niche'>): Trade {
  if (lead.trade && lead.trade !== 'other') return lead.trade;
  const n = String(lead.business_name || '').toLowerCase();
  if (/roof|shingle|gutter/.test(n)) return 'roofing';
  if (/plumb|drain|sewer|rooter|septic/.test(n)) return 'plumbing';
  if (/hvac|heat|cool|air|furnace|ac\b|climate/.test(n)) return 'hvac';
  return 'other';
}

/**
 * WHAT HE KNOWS BEFORE THE PHONE RINGS.
 *
 * Two hard rules encoded here. Only facts we ACTUALLY hold go in ("I see you do
 * emergency plumbing in North Dallas" beats "what does your business do", but
 * only when it is true). And the call is a demonstration, not a presentation:
 * the whole thing exists to produce the moment where he becomes their
 * receptionist and they hear it.
 */
export function buildBriefing(lead: AcqProspect, consentAt: string | null): string {
  const trade = tradeOf(lead);
  const business = shortBusiness(lead.business_name);
  const known: string[] = [];
  if (lead.city || lead.state) known.push(`They are in ${[lead.city, lead.state].filter(Boolean).join(', ')}.`);
  if (lead.website) known.push(`Their website is ${lead.website}.`);
  if (lead.review_count && lead.review_count > 20) {
    known.push(`They have ${lead.review_count} public reviews${lead.rating ? ` at ${lead.rating} stars` : ''}, so the phone rings.`);
  }
  if (lead.service_area) known.push(`They say they serve ${lead.service_area}.`);
  if (lead.emergency_service) known.push('They advertise emergency service.');
  if (lead.open_24_7) known.push('They advertise 24/7 availability, which is exactly the promise nobody can staff.');
  if (lead.hours && Object.keys(lead.hours).length) {
    known.push(`Posted hours: ${Object.entries(lead.hours).map(([d, h]) => `${d} ${h}`).join('; ')}.`);
  }

  /**
   * ⚠️ THE ADDRESS WE ALREADY HAVE.
   *
   * Almost everyone on this call arrived by clicking a button in an email
   * Sarah sent them, which means their address is already on the lead row and
   * has already proved it can receive mail. Asking that person to spell it out
   * loud is the single worst thing he can do: spelled letters are the one thing
   * a phone line reliably destroys, it burns a minute of a three minute call,
   * and it can only make a known-good address worse.
   *
   * So when we have it, he confirms it as WORDS and never spells. He only takes
   * a fresh address if they say this one is wrong, which is rare and is exactly
   * when the spelling rules in his prompt should kick in.
   */
  /**
   * THE NUMBER HE IS DIALLING. He is on it, so asking for it is absurd, and
   * asking a business owner to recite their own number back is worse than
   * absurd on a three minute call. What he actually needs to know is whether
   * this is the line the agent should ANSWER, which is a different question and
   * a genuinely useful one: plenty of owners give a cell for the callback and
   * want the shop line covered.
   */
  const dialing = String(lead.phone || '').trim();
  const phoneBlock = dialing
    ? `

THE NUMBER YOU ARE CALLING: ${dialing}
You are on it right now, so never ask them for a phone number and never ask them
to read it back. The only phone question worth asking is which line the agent
should ANSWER for them: "is this the number you'd want me answering, or is the
business on a different line?" Ask it once, late, when the conversation is
already about building them one.`
    : '';

  const knownEmail = String(lead.email || '').trim();
  const emailBlock = knownEmail
    ? `

YOU ALREADY HAVE THEIR EMAIL: ${knownEmail}
It came from the campaign they replied to, so it is known good. DO NOT ask them
to spell it and DO NOT ask for it again. If you need to confirm it, say it back
ONCE as ordinary words, not letters ("I have you at ${knownEmail}, still the
best one?"), and move on. Only take a new address if they tell you this one is
wrong, and only then do you spell anything.`
    : `

YOU DO NOT HAVE THEIR EMAIL. If you need one, follow the email rules in your
instructions exactly: hear it as words first, spell only when words will not do,
and spell anchored ("b as in boy").`;

  const scenarios = TRADE_SCENARIOS[trade].slice(0, 3).map((s) => `"${s}"`).join(', ');
  const first = String(lead.contact_name || '').trim().split(/\s+/)[0] || '';

  return `

================= ACQUISITION CALL BRIEFING (this call only) =================

YOU ARE THE DEMONSTRATION. You are not trying to explain AI. Let them EXPERIENCE
the outcome. Talk less, demonstrate more. Your goal is not to pressure anybody.
Your goal is to make it obvious what their business could do with you answering
the phone.

WHY THE PHONE IS RINGING: this person got an email from Sarah asking whether they
wanted Mr. Mustard to call them, and they clicked yes and gave their number${
    consentAt ? ` at ${consentAt}` : ''
  }. They ASKED for this call, seconds ago. It is not a cold call. Say so early
and plainly, because it is the thing that makes it land.${phoneBlock}${emailBlock}

WHO THEY ARE:
- Business: ${lead.business_name}${business !== lead.business_name ? ` (say it as "${business}")` : ''}
- Trade: ${trade}
${first ? `- Their name: ${first}. Use it.` : '- We do NOT have their name. Ask for it, warmly, once.'}
${known.length ? known.map((k) => `- ${k}`).join('\n') : '- We know almost nothing else about them. Do NOT pretend otherwise.'}

⚠️ NEVER imply we know something about their business that is not in this list.
Faking familiarity is the fastest way to lose a contractor.

DISCLOSE WHAT YOU ARE, IN THE FIRST BREATH. Something like: "Hey${first ? ` ${first}` : ''},
this is Mr. Mustard from Modern Mustard Seed. I'm the AI receptionist you just
asked to call you. I'm an AI, not a human." Natural, not a punchline, then hand
the turn back.

THE CALL, IN FIVE MOVES. One question at a time. Three to seven minutes unless
they want to keep going.

1. ORIENT. Say who you are and why you are calling. Then: "Sarah figured it made
   more sense to let you talk to me than send you a giant AI sales pitch." Then
   name their business and ask for a real world test.

2. FIND THE PAIN. Ask something close to: "What kind of customer call would you
   most hate to miss?" For ${trade} that is usually ${scenarios}. Let them answer.
   Do not list options at them unless they stall.

3. ROLEPLAY. This is the product. Say: "Perfect. Pretend you're the customer. For
   the next minute, I work for ${business}." Then BECOME their receptionist.
   Answer as a named human at their company, not as Mr. Mustard: "Thanks for
   calling ${business}, this is Alex. How can I help you tonight?" Qualify the way
   an excellent front desk does: name, callback number, address, what is wrong,
   how urgent, when they want somebody out. Do not over-question. You are trying
   to produce one feeling: "oh wow, this could actually answer my customers."
   ${TRADE_ROLEPLAY_NOTE[trade]}
   These are demonstration behaviors, not professional technical advice. Never
   make an unsafe technical promise and never diagnose their trade for them.

4. BREAK CHARACTER. "Okay${first ? ` ${first}` : ''}, I'm Mr. Mustard again." Then
   summarize what just happened in outcome terms: if that had been a real
   customer, you would have captured the lead, categorized it urgent, collected
   what the technician needs, and either booked it or sent it straight to the team.

5. OFFER TO BUILD THEIRS. "Want me to actually build the ${business} version so
   you can test it whenever you want?" It is FREE, no card, no commitment. If yes:
   confirm the email you already have by saying it back as words (or take one
   properly if you have none), then call forge_prospect_agent once,
   then email_prospect_demo.

PRICE, only if they ask, and answer plainly without overselling:
${OFFER.line}, month to month, cancel anytime. Their existing phone number does
not have to change, it forwards. Live within a week, installed by hand.
If they say "I want it": "Perfect. I'll send the activation link right now." Then
call send_checkout_link.
If they want a human: offer Sarah, check real availability with
get_available_slots, offer two or three real times, and book it with
book_discovery_call. NEVER invent availability.

NEVER claim a capability the product does not have. If you do not know, say so.

ENDING: before you say goodbye, ALWAYS call log_call_outcome. If they ask not to
be contacted, call stop_contacting immediately, confirm it warmly, and end.

=============================================================================
`;
}

/** The first thing they hear. Two sentences, then the floor is theirs. */
export function firstMessage(lead: AcqProspect): string {
  const first = String(lead.contact_name || '').trim().split(/\s+/)[0];
  const business = shortBusiness(lead.business_name);
  return (
    `Hey${first ? ` ${first}` : ' there'}, this is Mr. Mustard from Modern Mustard Seed. ` +
    `I'm the AI receptionist you just asked to call you, so I'm an AI, not a human. ` +
    `Sarah figured it'd make more sense to let you talk to me than read a pitch. Got three minutes to put me through a real ${business} test?`
  );
}

/* ──────────────────────────── placing the call ──────────────────────────── */

export type PlaceCallResult =
  | { ok: true; vapiCallId: string; acqCallId: string }
  | {
      ok: false;
      /**
       * `daily-limit` is separated from the general `vapi-error` on purpose. A
       * number bought inside Vapi caps outbound calls per UTC day, and when it
       * trips, the caller-facing copy and the retry schedule both have to
       * change: nothing will succeed again until the day rolls over, so
       * promising a call "in a minute" is a lie and retrying in a minute is
       * pointless load. Found 2026-08-18 when a real visitor hit it.
       */
      reason: 'not-configured' | 'no-consent' | 'duplicate' | 'vapi-error' | 'bad-phone' | 'db' | 'daily-limit';
      detail?: string;
    };

type VapiModel = { messages?: { role: string; content: string }[]; tools?: unknown[] } & Record<string, unknown>;

/**
 * Fetch the live assistant and return a model object that is HIS, plus our
 * briefing and our tools. Keeping the whole object is what preserves his seven
 * existing tools, his temperature, and his provider.
 */
export async function modelWithBriefing(briefing: string): Promise<VapiModel | null> {
  const key = apiKey();
  if (!key || !ASSISTANT_ID) return null;
  try {
    const res = await fetch(`${VAPI_BASE}/assistant/${ASSISTANT_ID}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const assistant = (await res.json()) as { model?: VapiModel };
    const model = assistant.model;
    if (!model) return null;

    const messages = Array.isArray(model.messages) ? [...model.messages] : [];
    const sysIdx = messages.findIndex((m) => m.role === 'system');
    if (sysIdx >= 0) {
      messages[sysIdx] = { ...messages[sysIdx], content: `${messages[sysIdx].content}${briefing}` };
    } else {
      messages.unshift({ role: 'system', content: briefing });
    }

    const tools = [...(Array.isArray(model.tools) ? model.tools : []), ...acquisitionTools()];
    return { ...model, messages, tools };
  } catch {
    return null;
  }
}

async function recentlyCalled(db: SupabaseClient, phoneE164: string): Promise<boolean> {
  const { data } = await db.from('app_state').select('value').eq('key', `acqcall:${phoneE164}`).maybeSingle();
  const at = (data?.value as { at?: string } | null)?.at;
  if (!at) return false;
  return Date.now() - new Date(at).getTime() < DEDUPE_MINUTES * 60 * 1000;
}

/**
 * Place the demo call. Never throws: a telephony hiccup must not fail the form
 * submit that triggered it, and the consent record is already written by then.
 */
export async function placeDemoCall(args: {
  lead: AcqProspect;
  phoneE164: string;
  consentId: string | null;
  consentAt: string | null;
  campaignId: string | null;
  attempt?: number;
}): Promise<PlaceCallResult> {
  const db = getSupabase();
  if (!db) return { ok: false, reason: 'db' };
  const key = apiKey();
  if (!key || !ASSISTANT_ID || !FROM_NUMBER_ID) return { ok: false, reason: 'not-configured' };
  if (!/^\+1\d{10}$/.test(args.phoneE164)) return { ok: false, reason: 'bad-phone' };

  if (await recentlyCalled(db, args.phoneE164)) return { ok: false, reason: 'duplicate' };

  const { data: callRow, error: callErr } = await db
    .from('acq_calls')
    .insert({
      lead_id: args.lead.id,
      campaign_id: args.campaignId,
      consent_id: args.consentId,
      status: 'queued',
      attempt: args.attempt ?? 1,
      to_phone: args.phoneE164,
    })
    .select('id')
    .single();
  if (callErr || !callRow) return { ok: false, reason: 'db', detail: callErr?.message };

  const model = await modelWithBriefing(buildBriefing(args.lead, args.consentAt));
  if (!model) {
    await db.from('acq_calls').update({ status: 'failed', ended_reason: 'assistant-unreadable' }).eq('id', callRow.id);
    return { ok: false, reason: 'not-configured', detail: 'Could not read the Mr. Mustard assistant from Vapi.' };
  }

  try {
    const res = await fetch(`${VAPI_BASE}/call`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumberId: FROM_NUMBER_ID,
        customer: { number: args.phoneE164, name: args.lead.contact_name || args.lead.business_name },
        assistantId: ASSISTANT_ID,
        assistantOverrides: {
          firstMessage: firstMessage(args.lead),
          model,
          metadata: {
            acq: true,
            leadId: args.lead.id,
            acqCallId: callRow.id,
            campaignId: args.campaignId,
            trade: tradeOf(args.lead),
            business: args.lead.business_name,
            email: args.lead.email,
          },
        },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      // Vapi answers this one with a 400 and a sentence, not a code, so the
      // sentence is what we match. Both spellings seen in the wild: the human
      // message on the POST, and `vapi-number-outbound-daily-limit` on the call
      // record afterwards.
      const dailyLimit = /daily outbound call limit|outbound-daily-limit/i.test(detail);
      await db
        .from('acq_calls')
        .update({ status: 'failed', ended_reason: dailyLimit ? 'vapi-number-outbound-daily-limit' : `vapi-${res.status}` })
        .eq('id', callRow.id);
      await recordEvent(db, {
        leadId: args.lead.id,
        campaignId: args.campaignId,
        type: 'call_failed',
        label: dailyLimit
          ? 'The studio line hit its daily outbound cap, so this callback could not be placed'
          : 'Mr. Mustard could not place the call',
        detail: { status: res.status, detail },
      });
      return { ok: false, reason: dailyLimit ? 'daily-limit' : 'vapi-error', detail };
    }
    const call = (await res.json()) as { id?: string };
    const vapiCallId = call?.id || '';

    await db.from('acq_calls').update({ vapi_call_id: vapiCallId, status: 'ringing' }).eq('id', callRow.id);
    await db.from('app_state').upsert({
      key: `acqcall:${args.phoneE164}`,
      value: { at: new Date().toISOString(), vapiCallId },
      updated_at: new Date().toISOString(),
    });
    await db
      .from('outbound_leads')
      .update({
        call_stage: 'ringing',
        call_attempts: (args.lead.call_attempts ?? 0) + 1,
        last_call_at: new Date().toISOString(),
        acq_stage: 'consented',
      })
      .eq('id', args.lead.id);
    await recordEvent(db, {
      leadId: args.lead.id,
      campaignId: args.campaignId,
      type: 'call_queued',
      label: `Mr. Mustard is calling ${args.phoneE164}`,
      detail: { vapiCallId, attempt: args.attempt ?? 1 },
    });

    return { ok: true, vapiCallId, acqCallId: callRow.id as string };
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    await db.from('acq_calls').update({ status: 'failed', ended_reason: 'exception' }).eq('id', callRow.id);
    return { ok: false, reason: 'vapi-error', detail };
  }
}
