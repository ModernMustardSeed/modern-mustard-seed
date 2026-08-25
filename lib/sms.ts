/**
 * SEND A TEXT.
 *
 * One sender, used by anything in the app that needs SMS, so credentials and
 * compliance live in one place rather than being re-derived per feature.
 *
 * ── IT GOES THROUGH THE MESSAGING SERVICE, NOT A RAW NUMBER ──────────────────
 * TWILIO_MESSAGING_SERVICE_SID carries the registered A2P 10DLC campaign and
 * the carrier-level opt-out list. Sending from a bare `From` number bypasses
 * both: it gets filtered by US carriers, and a STOP reply would not actually
 * stop anything. If the service SID is missing we refuse to send rather than
 * fall back to a number, because the fallback is the non-compliant path.
 *
 * ── IT ASKS THE DO-NOT-TEXT LIST FIRST ──────────────────────────────────────
 * Every send checks lib/sms-thread's opt-out gate, which fails CLOSED: an
 * unreachable database refuses the send. A text we did not send is recoverable;
 * a text to somebody who replied STOP is a carrier complaint, and enough of
 * those kill the campaign for every number on the account.
 *
 * ── AND EVERY SEND LANDS ON THE THREAD ───────────────────────────────────────
 * The message row is written here rather than by each caller, with the Twilio
 * SID on it, so the delivery webhook has a row to upgrade and the cockpit shows
 * the same conversation the customer sees. A send that is not on the thread is
 * how "I already texted them" becomes unanswerable.
 *
 * ── AND IT NEVER THROWS ──────────────────────────────────────────────────────
 * Every caller here is a notification path running behind something that
 * already succeeded: a call was answered, an appointment was booked. A texting
 * failure must not roll back the thing it was describing.
 */

/**
 * THE PHONE NORMALIZER LIVES IN ONE PLACE.
 *
 * lib/acq/consent.ts already owned this, with the rule that matters written on
 * it: "a malformed number is a stranger's phone, so refuse it." That is exactly
 * as true for a text as for a dial, so this imports it rather than shipping a
 * second one. A first draft here defined its own, slightly looser version that
 * accepted international numbers, and the two would have disagreed the first
 * time anybody typed a number with a country code.
 */
export { toE164 } from '@/lib/acq/consent';
import { toE164 } from '@/lib/acq/consent';
import { isOptedOut, recordSms } from '@/lib/sms-thread';
import { SITE } from '@/lib/seo';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';
const real = (v?: string | null) => (v && !/^\[SENSITIVE\]$/i.test(v) ? v : null);

export type SmsResult = { ok: true; sid: string } | { ok: false; error: string; configured: boolean };

export function smsConfigured(): boolean {
  return Boolean(real(process.env.TWILIO_ACCOUNT_SID) && real(process.env.TWILIO_AUTH_TOKEN) && real(process.env.TWILIO_MESSAGING_SERVICE_SID));
}

/**
 * A text is not an email. 160 characters is one segment; every segment after
 * that costs again and reads worse on a lock screen. This trims on a word
 * boundary so a truncated message never ends mid-word.
 */
export function trimForSms(body: string, max = 300): string {
  const s = body.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export type SendSmsOptions = {
  /** Skip the opt-out gate. Only ever true for a HELP/STOP confirmation, which
   *  the carriers require us to answer even to somebody who opted out. */
  transactional?: boolean;
  /** Which of our numbers this goes through, for the thread. */
  viaNumber?: string | null;
};

export async function sendSms(to: string, body: string, opts: SendSmsOptions = {}): Promise<SmsResult> {
  const sid = real(process.env.TWILIO_ACCOUNT_SID);
  const token = real(process.env.TWILIO_AUTH_TOKEN);
  const service = real(process.env.TWILIO_MESSAGING_SERVICE_SID);

  if (!sid || !token || !service) {
    // `configured: false` so a caller can tell "we are not set up for SMS"
    // from "we tried and it failed", and log the two differently.
    return { ok: false, error: 'SMS is not configured (account, token, or messaging service missing).', configured: false };
  }

  const number = toE164(to);
  if (!number) return { ok: false, error: `Not a number we can text: ${to}`, configured: true };

  if (!opts.transactional && (await isOptedOut(null, number))) {
    return { ok: false, error: `${number} is on the do-not-text list.`, configured: true };
  }

  const text = trimForSms(body);
  const form = new URLSearchParams({ To: number, MessagingServiceSid: service, Body: text });

  // Without this Twilio never tells us what the carrier did, and a filtered
  // message is indistinguishable from a delivered one. Only set on a real
  // public origin: pointed at localhost the callback silently never fires, and
  // pointed at a preview URL it reports into the wrong database.
  const origin = SITE.url;
  if (/^https:\/\//.test(origin) && !/localhost|127\.0\.0\.1/.test(origin)) {
    form.set('StatusCallback', `${origin}/api/hooks/sms/status`);
  }

  try {
    const res = await fetch(`${TWILIO_BASE}/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!res.ok || !json.sid) {
      return { ok: false, error: `Twilio ${res.status}${json.code ? ` (${json.code})` : ''}: ${json.message ?? 'no message id returned'}`, configured: true };
    }

    // The thread write must never fail the send. The text is already gone; a
    // logging error that reported failure would have a caller send it twice.
    try {
      await recordSms(null, {
        phoneE164: number,
        direction: 'outbound',
        body: text,
        viaNumber: opts.viaNumber ?? null,
        providerSid: json.sid,
        status: 'queued',
      });
    } catch (err) {
      console.error('[sms] sent but not threaded', { sid: json.sid, err: (err as Error)?.message });
    }

    return { ok: true, sid: json.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'The text failed to send.', configured: true };
  }
}
