import { getSupabase } from '@/lib/supabase';
import { CALLBACK_NUMBER_ID } from '@/lib/vapi-lines';

/**
 * INSTANT CALLBACK. The form is submitted, the phone rings in ten seconds.
 *
 * Sarah 2026-08-07: *"Instant callback on form submit. This is the biggest lever
 * on the list and it's not close. Form fires, outbound call within 10 seconds
 * while they still have the tab open. Speed-to-lead curves fall off a cliff
 * after five minutes."*
 *
 * She is right about the curve, and the reason it works is not really speed. It
 * is that the visitor is TOLD it will happen and then it happens. The form says
 * we will call in about ten seconds; ten seconds later their phone lights up.
 * That is the entire trick, and it is why the consent line on the form is not
 * paperwork, it is the feature.
 *
 * ⚠️ THE CONSENT LINE IS NOT OPTIONAL. This places a real outbound call to a
 * real person. It is legitimate because they just handed us the number and
 * asked to be contacted, and because the form said so in plain words before
 * they typed it. Any form wired to this MUST carry that sentence. Removing it
 * turns a delightful callback into a cold call.
 */

const VAPI_BASE = 'https://api.vapi.ai';
/**
 * The outbound line, shared with every other calling path through
 * lib/vapi-lines.ts. This file used to carry its own copy of the id, which is
 * exactly how the hero button would have stayed on the capped Vapi number after
 * the rest of the system moved off it.
 */
const FROM_NUMBER_ID = CALLBACK_NUMBER_ID;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID;

/**
 * One call per number per window. A double-submitted form must never ring
 * somebody twice, and a refresh loop must never dial them twenty times.
 */
const DEDUPE_MINUTES = 30;

/**
 * Which door they came through, which decides what Mr. Mustard opens with and
 * what he is trying to accomplish on the call.
 *
 * `general`  the contact form: they wrote a note, he answers it and books Sarah.
 * `voice-agent`  the hero ring box: all we have is a phone number, and the whole
 *   point of the call is that they are HEARING the thing we sell. He finds out
 *   what their business is, offers to build them their own, and gets the name
 *   and email we did not ask for on the page.
 */
export type CallbackIntent = 'general' | 'voice-agent';

export type CallbackRequest = {
  name?: string | null;
  phone: string;
  email?: string | null;
  /** What they typed. The agent opens with it, which is what makes it land. */
  need?: string | null;
  source?: string | null;
  intent?: CallbackIntent;
};

export type CallbackResult =
  | { ok: true; callId: string }
  | { ok: false; reason: 'no-phone' | 'bad-phone' | 'not-configured' | 'duplicate' | 'vapi-error'; detail?: string };

/**
 * US 10-digit to E.164. Deliberately strict: a malformed number is a wrong
 * number, and a wrong number is a stranger's phone ringing for no reason.
 */
export function toE164(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** First name only, for the greeting. "Hi Dana" beats "Hi Dana Whitfield". */
function firstName(name?: string | null): string {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/**
 * What Mr. Mustard says the instant they pick up.
 *
 * Says who it is, why the phone is ringing, and hands them the floor inside two
 * sentences. Anything longer and a person who just filled in a form is left
 * holding a monologue. It names the form because the call has to feel like the
 * thing they asked for, not a telemarketer who happened to time it well.
 */
function greeting(req: CallbackRequest): string {
  const who = firstName(req.name);
  if (req.intent === 'voice-agent') {
    // The hero box asks for a phone number and nothing else, so he cannot open
    // on what they wrote. He opens on the only fact he has: they wanted to hear
    // this, about ten seconds ago, and they are hearing it.
    return (
      `Hi${who ? ` ${who}` : ''}, this is Mr. Mustard, the A I voice agent over at Modern Mustard Seed. ` +
      'You dropped your number on our site about ten seconds ago, so here I am. ' +
      'What kind of business do you run?'
    );
  }
  return (
    `Hi${who ? ` ${who}` : ''}, this is Mr. Mustard from Modern Mustard Seed. ` +
    'You just asked us to call, so here I am. What are you trying to build?'
  );
}

/**
 * The per-call briefing, appended to Mr. Mustard's own system prompt at dial
 * time. This is the part that makes the call land, and it has to be an APPEND:
 * his persona, his prices, his booking calendar and his seven tools all live in
 * that prompt, and replacing it (the outbound-cold-call pattern in
 * lib/outbound-call.ts) would throw all of it away for a warm inbound lead.
 *
 * ⚠️ `assistantOverrides.variableValues` does NOT do this job. Vapi only
 * substitutes a variable where the prompt already says {{name}}, and his prompt
 * never has. Anything passed that way is silently dropped, which is why the
 * context below is injected as prompt text instead.
 */
function briefing(req: CallbackRequest): string {
  const known = [
    req.name ? `Name: ${req.name}.` : null,
    req.email ? `Email: ${req.email}.` : null,
    req.need ? `What they typed, word for word: "${req.need}"` : null,
  ].filter(Boolean);

  if (req.intent === 'voice-agent') {
    return `# THIS CALL: someone just asked to hear you, from the website hero
They typed their phone number into the "have Mr. Mustard call me" box on modernmustardseed.com${req.source ? ` (${req.source})` : ''} seconds ago. The page promised the phone would ring in about ten seconds, and it did. They are almost certainly still looking at that page.
${known.length ? known.join(' ') : 'All you have is the number you just dialed. They gave nothing else, because the box only asked for a number.'}

This is not a support call and it is not a cold call. It is a demo they requested, and you are the demo.

Your mission, in this order:
1. Find out what they do and how calls reach their business today. One question at a time, then be quiet and listen. Who answers when they are on a job or with a customer? What happens after hours?
2. Tell them what their own agent would handle, in their words, using what they just told you. Be specific to their trade, never generic.
3. Name what is happening, once, warmly: what they are hearing right now is what would answer their phone, in their business's name, at two in the morning.
4. Get their first name and their email and call capture_lead, so the lead survives even if the call drops. Spell the email back before you save it.
5. Close on the forge, not on a calendar. Work out WHICH single piece their answers pointed at (the phone answered, a website, or the command center), say it back to them, then build just that one with forge_demo_suite and pass only that piece in \`build\`. Free, in their inbox, and they can order it from the same page. Only reach for get_available_slots and book_discovery_call if they ask for a call themselves or want custom work scoped.

Keep it tight, four minutes or so unless they are enjoying themselves. They gave you a phone number, not an appointment. If it is a bad time, offer to call back or text the link and let them go warmly.`;
  }

  return `# THIS CALL: they just submitted the form and asked to be called back
They submitted the form on modernmustardseed.com${req.source ? ` (${req.source})` : ''} and asked for a call right away, so they are still at their desk with the tab open.
${known.join(' ')}
Open by acknowledging what they wrote. Never make them repeat it. Booking them onto Sarah's calendar on this call is the goal.`;
}

type VapiModel = Record<string, unknown> & { messages?: { role: string; content?: string }[] };

/**
 * His prompt is 22k characters and changes when Sarah runs the setup script,
 * which is not often. Fetching it on every ring adds a round trip to the one
 * moment on the site where seconds are the product, so hold it briefly.
 */
const MODEL_TTL_MS = 5 * 60 * 1000;
let modelCache: { at: number; id: string; model: VapiModel } | null = null;

/**
 * Fetch the live assistant and return its model object with the briefing
 * appended to the system message.
 *
 * Vapi rejects a partial model override ("model.provider must be one of..."),
 * so the whole object has to travel, which is also what keeps his tools,
 * provider, and temperature intact. Returns null on any problem: the call still
 * goes out, just without the briefing, and a call with a good opening line beats
 * no call at all.
 */
async function modelWithBriefing(
  apiKey: string,
  assistantId: string,
  text: string
): Promise<Record<string, unknown> | null> {
  try {
    let model =
      modelCache && modelCache.id === assistantId && Date.now() - modelCache.at < MODEL_TTL_MS
        ? modelCache.model
        : null;
    if (!model) {
      const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return null;
      const assistant = (await res.json()) as { model?: VapiModel };
      model = assistant?.model ?? null;
      if (model) modelCache = { at: Date.now(), id: assistantId, model };
    }
    if (!model) return null;
    const messages = Array.isArray(model.messages) ? model.messages : [];
    const system = messages.find((m) => m.role === 'system' && typeof m.content === 'string');
    if (!system?.content) return null;
    return {
      ...model,
      messages: [
        { role: 'system', content: `${system.content}\n\n${text}` },
        ...messages.filter((m) => m !== system),
      ],
    };
  } catch {
    return null;
  }
}

async function recentlyCalled(phone: string): Promise<boolean> {
  const db = getSupabase();
  if (!db) return false;
  const key = `callback:${phone}`;
  const { data } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  const at = (data?.value as { at?: string } | null)?.at;
  if (!at) return false;
  return Date.now() - new Date(at).getTime() < DEDUPE_MINUTES * 60 * 1000;
}

async function markCalled(phone: string, callId: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.from('app_state').upsert({
    key: `callback:${phone}`,
    value: { at: new Date().toISOString(), callId },
    updated_at: new Date().toISOString(),
  });
}

/**
 * Place the call. Never throws: a telephony hiccup must not fail the form
 * submit that triggered it. The lead is already saved by the time we get here,
 * so the worst case is a lead that gets a normal email instead of a phone call.
 */
export async function placeInstantCallback(req: CallbackRequest): Promise<CallbackResult> {
  const apiKey = process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY;
  if (!req.phone) return { ok: false, reason: 'no-phone' };
  const to = toE164(req.phone);
  if (!to) return { ok: false, reason: 'bad-phone' };
  if (!apiKey || !ASSISTANT_ID || !FROM_NUMBER_ID) return { ok: false, reason: 'not-configured' };

  if (await recentlyCalled(to)) return { ok: false, reason: 'duplicate' };

  try {
    // Best effort: his own prompt plus this call's briefing. Null means the
    // fetch failed, and the call goes out on the opening line alone.
    const model = await modelWithBriefing(apiKey, ASSISTANT_ID, briefing(req));

    const res = await fetch(`${VAPI_BASE}/call`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumberId: FROM_NUMBER_ID,
        customer: { number: to, name: req.name || undefined },
        assistantId: ASSISTANT_ID,
        // Overrides, not a new assistant: Mr. Mustard's whole persona, tools and
        // booking calendar come along, and we only bolt this caller's context on
        // top. ⚠️ Never PATCH a bare model object at Vapi (memory:
        // mms-voice-agent-mr-mustard); overrides at call time are the safe path.
        assistantOverrides: {
          firstMessage: greeting(req),
          ...(model ? { model } : {}),
          metadata: {
            mode: 'instant-callback',
            intent: req.intent || 'general',
            source: req.source || '',
          },
          variableValues: {
            callerName: req.name || '',
            callerEmail: req.email || '',
            callerNeed: req.need || '',
          },
        },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      return { ok: false, reason: 'vapi-error', detail };
    }
    const call = (await res.json()) as { id?: string };
    const callId = call?.id || '';
    await markCalled(to, callId);
    return { ok: true, callId };
  } catch (e) {
    return { ok: false, reason: 'vapi-error', detail: e instanceof Error ? e.message : 'unknown' };
  }
}
