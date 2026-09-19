/**
 * MR. MUSTARD FILES A FREE ONLINE PRESENCE AUDIT FROM THE PHONE.
 *
 * A business owner who calls the studio is exactly who the audit is for, and
 * until now the only way to request one was the form on /presence-audit. So he
 * offers it on the call, takes the email and the business name, and files it
 * here with the tool `request_presence_audit` (dispatched from app/api/voice,
 * behind the same x-vapi-secret check as every other tool of his).
 *
 * ONE WAY IN. The row is written by `fileAuditRequest` in lib/audit-requests.ts,
 * the same function the public form uses, so a phone request is the same
 * `audit_requests` row, the same Audit Desk entry, the same notice to Sarah and
 * the same receipt email as a typed one. Its source is `presence-audit:mr-mustard`
 * so the Audit Campaign scoreboard counts the phone as its own door.
 *
 * THE TEXT IS A BONUS, NEVER A PROMISE. He asks whether they want the link
 * texted, and on a yes, with a real caller number, it goes through lib/sms.ts,
 * the one sender in the app (messaging service only, so the A2P campaign and
 * STOP both apply). The tool tells him whether a text actually left, and he
 * only says it was texted when Twilio handed back a message id. On 2026-09-09
 * Twilio answered 401 to every send from this app, so until the auth token is
 * refreshed the honest answer is "that text didn't go through". The receipt
 * email carries the request either way, so nothing the caller needs depends on
 * the text arriving.
 *
 * Every refusal comes back as an instruction he can say out loud, never a
 * thrown error: a thrown error is dead air on a live call.
 */

import { after } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import {
  announceAuditRequest,
  fileAuditRequest,
  presenceAuditReceivedEmail,
  type FileAuditOutcome,
} from '@/lib/audit-requests';
import { sendViaResend } from '@/lib/send-email';
import { checkSpokenEmail, spokenEmailInstruction } from '@/lib/spoken-email';
import { sendSms, toE164, type SmsResult } from '@/lib/sms';
import { rememberFromTool } from '@/lib/voice-memory';
import { sendMetaEvent } from '@/lib/meta-capi';
import { PRESENCE } from '@/data/presence-audit-page';

export const PRESENCE_AUDIT_TOOL = 'request_presence_audit';

/** The page link he texts, tagged so the campaign scoreboard sees the phone as its own source. */
export const PRESENCE_AUDIT_VOICE_LINK =
  'https://modernmustardseed.com/presence-audit?utm_source=mr-mustard&utm_medium=voice&utm_campaign=presence-audit';

/**
 * Fixed copy with no caller-supplied text in it, so it can never be trimmed
 * past the link by `trimForSms` (300 characters). It is 259 characters today.
 */
export const PRESENCE_AUDIT_SMS =
  `Modern Mustard Seed: your free Online Presence Audit request is in. The full report comes to your email. See what it grades: ${PRESENCE_AUDIT_VOICE_LINK} Reply STOP to opt out.`;

const SOURCE = 'presence-audit:mr-mustard';

/** A hung Twilio call must not hold a live caller in silence. */
const SMS_WAIT_MS = 5000;

type Input = {
  email?: string;
  business?: string;
  name?: string;
  website?: string;
  town?: string;
  note?: string;
  text_link?: boolean | string;
};

type Ctx = {
  callerNumber: string | null;
  callId?: string | null;
  /** Lines only the route knows, such as a partner line credit, for Sarah's notice. */
  extraFields?: { label: string; value: string }[];
};

/**
 * A number Vapi did not substitute arrives as the literal `{{customer.number}}`,
 * and a web call has no number at all. Either way there is nobody to text.
 */
function textableNumber(raw: string | null): string | null {
  if (!raw || /\{\{|\}\}/.test(raw)) return null;
  return toE164(raw);
}

/**
 * A text goes out only on a yes. He asks "want the link texted to this number
 * too?" and passes true when they say so; anything else, including the field
 * left out, is no text. Asking rather than announcing is what keeps him honest
 * when the text then fails: he never promised one.
 */
function wantsText(v: Input['text_link']): boolean {
  if (typeof v === 'boolean') return v;
  return /^(true|yes|1)$/i.test(String(v ?? '').trim());
}

async function textTheLink(to: string): Promise<SmsResult> {
  const timeout = new Promise<SmsResult>((resolve) =>
    setTimeout(() => resolve({ ok: false, error: `no answer from Twilio in ${SMS_WAIT_MS}ms`, configured: true }), SMS_WAIT_MS),
  );
  return Promise.race([sendSms(to, PRESENCE_AUDIT_SMS), timeout]);
}

function refusal(outcome: Extract<FileAuditOutcome, { ok: false }>): string {
  switch (outcome.code) {
    case 'bad-email':
      return JSON.stringify({
        ok: false,
        instruction: 'That email did not come through as a complete address. Take it again, anchored, read it back once, then call request_presence_audit again.',
      });
    case 'no-business':
      return JSON.stringify({
        ok: false,
        instruction: 'The audit needs the business name, exactly as it is on their sign. Ask for it, then call request_presence_audit again.',
      });
    case 'bad-website':
      return JSON.stringify({
        ok: false,
        instruction: 'The website address did not look like a real address. Ask for it once more, or leave it out entirely: the audit still runs from the business name. Then call request_presence_audit again.',
      });
    case 'rate-limited':
      return JSON.stringify({
        ok: false,
        instruction: 'This number has already asked for several audits in the last hour, so the desk will not take another one automatically. Tell them plainly you will pass it to Sarah, then call reach_sarah with their name, number, email and the business name.',
      });
    default:
      return JSON.stringify({
        ok: false,
        instruction: 'The audit desk did not take it just now. Apologize in one sentence, then call reach_sarah with their name, number, email and the business name so Sarah files it by hand today.',
      });
  }
}

/**
 * A CORRECTION FIXES THE ROW, IT DOES NOT ADD ONE.
 *
 * He reads the stored address back after filing, because the one bug this
 * agent has shown over and over is saying an address right and typing it wrong.
 * When the caller corrects it, the second call arrives with a different email
 * for the same business from the same caller, which the day-long duplicate
 * check cannot see (it keys on the email). Filed as new, Sarah would find two
 * requests and could run the one that goes nowhere.
 *
 * So a request this caller filed for this business in the last half hour, not
 * yet run, has its address replaced, and the receipt goes to the fixed one.
 * The pipeline lead moves with it. Returns null when there is nothing to fix.
 */
async function correctThisCallsRequest(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  ipHash: string,
  business: string,
  email: string,
): Promise<string | null> {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: prior } = await sb
    .from('audit_requests')
    .select('id,email,name,business_name,website')
    .eq('ip_hash', ipHash)
    .eq('source', SOURCE)
    .eq('status', 'new')
    .ilike('business_name', business.replace(/[%_\\]/g, '\\$&'))
    .neq('email', email)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prior) return null;

  const { error } = await sb
    .from('audit_requests')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('id', prior.id);
  if (error) {
    console.error('request_presence_audit correction failed:', error.message);
    return JSON.stringify({
      ok: false,
      instruction: 'The correction did not save. Apologize in one sentence, then call reach_sarah with their name, number, the corrected email and the business name so Sarah fixes it by hand today.',
    });
  }

  const wrong = String(prior.email);
  after(async () => {
    await sb
      .from('leads')
      .update({ email })
      .eq('email', wrong)
      .eq('source', SOURCE)
      .gte('created_at', since);
    await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `Your audit is in, ${prior.business_name}`,
      html: presenceAuditReceivedEmail({
        name: (prior.name as string | null) ?? null,
        business_name: String(prior.business_name),
        website: (prior.website as string | null) ?? null,
      }),
    }).catch((e) => console.error('presence-audit corrected receipt failed:', e));
  });

  return JSON.stringify({
    ok: true,
    corrected: true,
    sentTo: email,
    instruction: `Fixed. The request for ${prior.business_name} now goes to ${email}, and nothing new was texted. Say that address back ANCHORED, once, and ask if it is right. When it is, tell them the report comes to that inbox ${PRESENCE.turnaround}, then go straight back to what they called about.`,
  });
}

export async function requestAuditFromCall(input: Input, ctx: Ctx): Promise<string> {
  const business = String(input.business ?? '').trim();
  if (!business) {
    return JSON.stringify({
      ok: false,
      instruction: 'You need the business name before you file the audit. Ask for it exactly as it is on their sign, then call request_presence_audit once with it.',
    });
  }

  // Same guard send_email and reach_sarah use: a shape check passes every
  // plausible mishearing, and a report sent to gmial.com is never read.
  const verdict = await checkSpokenEmail(String(input.email ?? ''));
  if (!verdict.ok) return JSON.stringify({ ok: false, instruction: spokenEmailInstruction(verdict) });

  const sb = getSupabase();
  if (!sb) {
    return JSON.stringify({
      ok: false,
      instruction: 'The audit desk is unreachable right now. Tell them you will pass it straight to Sarah, then call reach_sarah with their name, number, email and the business name.',
    });
  }

  const phone = textableNumber(ctx.callerNumber);
  // The phone door's rate-limit key is the caller, where the form's is the IP.
  const key = phone || ctx.callId || 'web-call';
  const ipHash = createHash('sha256')
    .update(`voice:${key}:${process.env.ADMIN_SESSION_SECRET ?? 'mms'}`)
    .digest('hex')
    .slice(0, 32);

  const corrected = await correctThisCallsRequest(sb, ipHash, business, verdict.address);
  if (corrected) return corrected;

  const outcome = await fileAuditRequest(sb, {
    email: verdict.address,
    business,
    name: input.name ?? null,
    website: input.website ?? null,
    town: input.town ?? null,
    note: input.note ?? null,
    source: SOURCE,
    referrer: 'Mr. Mustard voice call',
    ipHash,
  });
  if (!outcome.ok) return refusal(outcome);

  const filed = outcome.request;

  if (filed.duplicate) {
    return JSON.stringify({
      ok: true,
      duplicate: true,
      sentTo: filed.email,
      instruction: `This audit was already requested for ${filed.business} at ${filed.email} in the last day, so it is already in and nothing new was filed or texted. Tell them it is already on its way, the full report comes to that inbox ${PRESENCE.turnaround}, and go straight back to what they called about.`,
    });
  }

  const wanted = wantsText(input.text_link);
  let texted = false;
  let textNote = 'not attempted';
  if (!wanted) {
    textNote = 'the caller did not ask for a text';
  } else if (!phone) {
    textNote = 'no caller number on this call';
  } else {
    const sms = await textTheLink(phone);
    texted = sms.ok;
    textNote = sms.ok ? `yes (${sms.sid})` : `no: ${sms.error}`;
    if (!sms.ok) console.error(`request_presence_audit text to ${phone} failed:`, sms.error);
  }

  // The heads-up, the pipeline lead and the receipt run after the webhook has
  // answered, so none of it sits in front of the caller's next sentence.
  after(() =>
    announceAuditRequest(filed, {
      phone,
      fields: [
        { label: 'Taken by', value: 'Mr. Mustard, on a phone call' },
        ...(phone ? [{ label: 'Caller', value: phone }] : []),
        { label: 'Link texted', value: textNote },
        ...(ctx.extraFields ?? []),
      ],
    }),
  );

  await rememberFromTool({
    phone,
    name: input.name,
    email: filed.email,
    business: filed.business,
  });

  await sendMetaEvent({
    eventName: 'Lead',
    eventId: `voice-audit-${filed.id}`,
    email: filed.email,
    phone,
    eventSourceUrl: 'https://modernmustardseed.com/presence-audit',
    customData: { lead_source: SOURCE },
  });

  const textLine = texted
    ? 'Then tell them the link just went to the number they are calling from by text, so they can see what it grades.'
    : wanted
      ? 'The text did NOT go through. Say so in one short sentence, with no apology beyond that, and tell them the report still comes to their inbox. Never say it was texted.'
      : 'Do NOT mention a text: none was sent.';

  return JSON.stringify({
    ok: true,
    sentTo: filed.email,
    texted,
    instruction: `Filed. Say the address back ANCHORED, once, exactly as it went in ("that goes to b as in boy..."), and ask if it is right. If they correct it, call request_presence_audit again with the fixed address. When it is right, tell them the full report comes to that inbox ${PRESENCE.turnaround}, free, and nobody calls them unless they ask. ${textLine} Then go straight back to what they called about.`,
  });
}
