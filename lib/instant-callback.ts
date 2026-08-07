import { getSupabase } from '@/lib/supabase';

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
/** Mr. Mustard's own line, so the number they see matches the one on the site. */
const FROM_NUMBER_ID = process.env.VAPI_CALLBACK_NUMBER_ID || '462f988d-ce3a-4961-b652-dfc1fb1ac5d0';
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID;

/**
 * One call per number per window. A double-submitted form must never ring
 * somebody twice, and a refresh loop must never dial them twenty times.
 */
const DEDUPE_MINUTES = 30;

export type CallbackRequest = {
  name?: string | null;
  phone: string;
  email?: string | null;
  /** What they typed. The agent opens with it, which is what makes it land. */
  need?: string | null;
  source?: string | null;
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
  return (
    `Hi${who ? ` ${who}` : ''}, this is Mr. Mustard from Modern Mustard Seed. ` +
    'You just asked us to call, so here I am. What are you trying to build?'
  );
}

/** Everything the agent should already know, so they never repeat themselves. */
function context(req: CallbackRequest): string {
  const lines = [
    `They just submitted the form on modernmustardseed.com${req.source ? ` (${req.source})` : ''} and asked for a call back right away.`,
    req.name ? `Their name: ${req.name}.` : null,
    req.email ? `Their email: ${req.email}.` : null,
    req.need ? `What they typed, word for word: "${req.need}"` : null,
    'Open by acknowledging what they wrote. Never make them repeat it.',
    'You may book them onto Sarah\'s calendar on this call. That is the goal.',
  ].filter(Boolean);
  return lines.join(' ');
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
          variableValues: {
            callerName: req.name || '',
            callerEmail: req.email || '',
            callerNeed: req.need || '',
            callbackContext: context(req),
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
