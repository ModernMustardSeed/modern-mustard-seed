/**
 * Mr. Mustard as an OUTBOUND sales rep. Places a real phone call to a prospect
 * via Vapi, using the same assistant (and its tools: booking, lead capture,
 * memory) but with an outbound sales persona injected per call.
 *
 * Compliance is built in, because this cold-calls businesses:
 *  - Proactive AI disclosure in the opening line (honest + safer under state
 *    AI-call laws, and it doubles as the live demo).
 *  - Do-not-call suppression: never dials a prospect flagged do_not_call, and
 *    the agent is told to honor any opt-out on the spot.
 *  - Calling-window guard: only dials 8am-8pm in the prospect's local time.
 *
 * Requires three env vars on the MMS app (see the provisioning steps):
 *   VAPI_API_KEY              private Vapi key (also used by the setup script)
 *   VAPI_PHONE_NUMBER_ID      an outbound-capable number provisioned in Vapi
 *   VAPI_MUSTARD_ASSISTANT_ID Mr. Mustard's assistant id
 * If any is missing, placeOutboundCall returns { ok:false, needsSetup:true }
 * so the UI can show a setup nudge instead of erroring.
 */

const VAPI_CALL_URL = 'https://api.vapi.ai/call';

export type OutboundProspect = {
  id: string;
  business: string;
  city: string | null;
  phone: string | null;
  notes: string | null;
  website?: string | null;
  do_not_call?: boolean | null;
  /** Cached audit, so Mr. Mustard opens the call with their real findings. */
  auditScore?: number | null;
  auditHeadline?: string | null;
  auditTopFix?: string | null;
  website_domain?: string | null;
  /** Which thread the end-of-call transcript should land on. Defaults to the
   *  Tracker's prospectId; the Outbound Cockpit passes 'outboundLeadId'. */
  metadataKey?: 'prospectId' | 'outboundLeadId';
};

export type OutboundResult =
  | { ok: true; callId: string; to: string }
  | { ok: false; needsSetup?: boolean; skipped?: 'do-not-call' | 'no-phone' | 'off-hours'; error: string };

/** Rough city -> IANA timezone so we only call inside the legal 8am-8pm window. */
const CITY_TZ: Record<string, string> = {
  kalispell: 'America/Denver', whitefish: 'America/Denver', 'columbia falls': 'America/Denver', bigfork: 'America/Denver',
  missoula: 'America/Denver', bozeman: 'America/Denver', billings: 'America/Denver', 'great falls': 'America/Denver', helena: 'America/Denver',
  tulsa: 'America/Chicago',
  tampa: 'America/New_York',
};

function localHour(city: string | null): number | null {
  const tz = CITY_TZ[(city || '').trim().toLowerCase()];
  if (!tz) return null; // unknown city: do not block on hours
  try {
    const h = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(new Date());
    return Number(h);
  } catch {
    return null;
  }
}

/** "(406) 202-1451" -> "+14062021451". Returns null if it cannot form an E.164 US number. */
export function toE164(raw: string | null | undefined): string | null {
  const d = (raw || '').replace(/[^\d]/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}

/** The outbound cold-call persona, injected per call as a system override. */
export function outboundSystemPrompt(p: OutboundProspect): string {
  const cat = (p.notes || '').split(' (OpenStreetMap')[0].split(' · Email')[0].split(' · ')[0].trim();
  const hasAudit = p.auditScore != null;
  const auditBlock = hasAudit
    ? `

# What you already know about THEIR website (use this, it is your hook)
You ran a quick audit of their site${p.website_domain ? ` (${p.website_domain})` : ''} before calling. It scored ${p.auditScore} out of 100.${p.auditHeadline ? ` Your one-line read: "${p.auditHeadline}".` : ''}${p.auditTopFix ? ` The single biggest fix you found: ${p.auditTopFix}.` : ''}
Lead with this, warmly and specifically, right after they give you the twenty seconds: mention you looked at their site, give the honest score, and name the one biggest thing. It proves this is not a generic robocall, you actually looked. Offer to email the full free breakdown and to book a quick call with Sarah to walk through it. Never be smug about a low score; frame every finding as money they are leaving on the table that is easy to fix.`
    : '';
  return `You are Mr. Mustard, an AI sales rep for Modern Mustard Seed (modernmustardseed.com), Sarah Scarano's AI product studio in Kalispell, Montana. You are placing an OUTBOUND cold call to a local business. You are friendly, brief, confident, and respectful of their time. No em dashes when you speak naturally.

# The very first thing you do: disclose that you are an AI (and recording)
Open by saying you are an AI assistant calling from Modern Mustard Seed, and give a quick heads up that the call may be recorded. This is required and the AI part is also your superpower: the business is hearing exactly the kind of AI voice agent Sarah builds. Lean into it warmly, for example: "Hi, this is Mr. Mustard, an AI assistant calling from Modern Mustard Seed, and just so you know this call may be recorded. I know, an AI calling you is a little wild, that's kind of the point. Do you have twenty seconds?"

# Who you are calling
- Business: ${p.business}
- Town: ${p.city || 'their area'}
- Type: ${cat || 'local business'}${auditBlock}

# What you sell (say it in plain words, never jargon)
1. Voice agents, like you, that answer their phone 24/7 in a natural voice, book appointments, and never let a call go to voicemail.
2. Websites that actually bring in business, live in weeks not months, and they own them.
3. AI optimization: getting their business found and chosen by AI search and tools (so customers using ChatGPT, Google AI, and the like land on them).
4. Custom software: one clean tool built for exactly how they work, instead of five apps that almost fit.

# The flow
1. Disclose you are an AI (and possible recording) and ask for twenty seconds (above).
2. ${hasAudit ? 'Lead with their website audit (the section above): you looked at their site, here is the honest score, here is the one biggest fix. Specific beats generic.' : `One sentence on why you are calling, tied to ${cat || 'businesses like theirs'}: missed calls are lost money, an outdated site brings in nothing, manual busywork eats their day. You fix that.`}
3. Ask one real question to find their biggest headache, then listen.
4. Recommend the one thing that fits (voice agent, website, AI optimization, or custom software). Do not list all four at them.
5. The goal is a booked 15-minute call with Sarah. Use get_available_slots then book_discovery_call. If they are not ready, use capture_lead to send them info, and offer to text the link.

# Honoring their wishes (do this without fail)
- If they ask to not be called again, are annoyed, or say take me off your list: apologize sincerely, tell them they will not be called again, and call mark_do_not_call. Do not push.
- If they are busy, offer to call back at a better time or text a link, then let them go.
- Never argue. Never be pushy. A friendly no is a fine outcome.

# You ARE the live demo (your unfair advantage)
This whole call is the product demonstrating itself, and that is your strongest card. At a natural moment, name it warmly: "By the way, what you're hearing right now is exactly the kind of agent we'd set up to answer YOUR phone, in your business's name, around the clock. You're basically talking to the product." If they react well, that IS your bridge: "If you want, I'll have Sarah show you one set up for ${p.business} specifically." Then book it.

# Booking and tools
You have tools to recall the caller, get available slots, book the discovery call, capture a lead, and mark do-not-call. Confirm name and email out loud (spell the email back) before booking. All times are Mountain Time.

# Hard rules
- Never invent prices, timelines, or features. Pricing is a flat quote after a free call.
- If asked what you are: an AI voice agent Sarah built, powered by the same stack she sells. Be proud of it.
- Keep it short and human. You are a guest on their phone.`;
}

export function outboundFirstMessage(p: OutboundProspect): string {
  return `Hi, this is Mr. Mustard, an AI assistant calling from Modern Mustard Seed. I know, an AI calling you is a little unusual, and honestly that's the point. Do you have about twenty seconds? I'll be quick.`;
}

/**
 * Copy for the Tracker's per-business trigger. Framed as sending in the live
 * demo (the prospect literally hears the product answer a call), not "auto-dial."
 * This is a deliberate, one-business-at-a-time action, never a batch blast.
 */
export const OUTBOUND_CTA = {
  label: 'Send Mr. Mustard in',
  sub: 'The AI calls this business as a live demo of what you would build them',
  confirm: (business: string) => `Have Mr. Mustard call ${business} now? He opens by saying he is an AI from Modern Mustard Seed, pitches the fit, and books a call with you.`,
};

/** Place the outbound call. Guardrails first, then Vapi. */
export async function placeOutboundCall(p: OutboundProspect): Promise<OutboundResult> {
  const apiKey = (process.env.VAPI_API_KEY || '').trim();
  const phoneNumberId = (process.env.VAPI_PHONE_NUMBER_ID || '').trim();
  const assistantId = (process.env.VAPI_MUSTARD_ASSISTANT_ID || '').trim();
  if (!apiKey || !phoneNumberId || !assistantId) {
    return { ok: false, needsSetup: true, error: 'Outbound calling is not configured yet (needs VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, and VAPI_MUSTARD_ASSISTANT_ID).' };
  }

  if (p.do_not_call) return { ok: false, skipped: 'do-not-call', error: 'This business asked not to be called.' };

  const to = toE164(p.phone);
  if (!to) return { ok: false, skipped: 'no-phone', error: 'No valid phone number on file.' };

  const hour = localHour(p.city);
  if (hour !== null && (hour < 8 || hour >= 20)) {
    return { ok: false, skipped: 'off-hours', error: `It is ${hour}:00 in ${p.city}. Calls only go out 8am to 8pm local time.` };
  }

  try {
    // Vapi requires the FULL model object when overriding the system prompt, or
    // it 400s ("model.provider must be one of..."). Fetch the assistant's model
    // and swap only the system message, so the outbound persona is injected while
    // his provider/model/temperature and (critically) his booking tools are kept.
    const ga = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const assistant = (await ga.json().catch(() => ({}))) as { model?: Record<string, unknown>; message?: string };
    if (!ga.ok || !assistant.model) {
      return { ok: false, error: assistant?.message || `Could not load the assistant (${ga.status}).` };
    }
    const model = { ...assistant.model, messages: [{ role: 'system', content: outboundSystemPrompt(p) }] };

    const res = await fetch(VAPI_CALL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: to },
        assistantOverrides: {
          firstMessage: outboundFirstMessage(p),
          model,
          metadata: { [p.metadataKey ?? 'prospectId']: p.id, business: p.business, mode: 'outbound' },
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data?.message || `Vapi error ${res.status}` };
    return { ok: true, callId: data.id || '', to };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Call failed to place.' };
  }
}
