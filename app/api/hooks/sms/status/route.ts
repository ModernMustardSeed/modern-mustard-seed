import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { toE164, optOut } from '@/lib/sms-thread';
import { verifyTwilio, twilioRequestUrl, twilioParams } from '@/lib/twilio-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELIVERY STATUS. What the carrier actually did with a text we sent.
 *
 * The send path can only ever record 'queued'. Twilio accepting a message says
 * nothing about whether a handset got it, and this endpoint is what makes the
 * thread honest. Same argument the Resend webhook makes for email
 * (app/api/webhooks/resend/route.ts): an un-upgraded 'sent' is a claim nobody
 * checked.
 *
 * It matters more for SMS than for email, because the specific failure this
 * business already lived through is CARRIER FILTERING. An unregistered A2P
 * message is accepted by Twilio, billed, and then dropped by the carrier as
 * 'undelivered' with error 30032. Without this endpoint that is invisible: the
 * cockpit says sent, the customer got nothing, and the only symptom is a silence
 * that reads like disinterest. Every text this system sends before the campaign
 * is approved will land here with a code, and that is exactly the evidence
 * needed to tell "they are ignoring us" from "it never arrived."
 *
 * Wire it as the statusCallback on the send (lib/sms.ts sets it automatically)
 * or on the Messaging Service. scripts/sms-webhook-setup.mjs sets both.
 */

/** Twilio's MessageStatus values, mapped onto what `messages.status` already uses. */
const STATUS: Record<string, string> = {
  accepted: 'queued',
  scheduled: 'queued',
  queued: 'queued',
  sending: 'sent',
  sent: 'sent',
  delivered: 'delivered',
  read: 'delivered',
  receiving: 'received',
  received: 'received',
  undelivered: 'undelivered',
  failed: 'failed',
  canceled: 'failed',
};

/**
 * Twilio does not guarantee callback order. A late 'sent' arriving after
 * 'delivered' would walk the thread backwards and make a delivered text look
 * stuck, so a status only ever moves forward.
 */
const RANK: Record<string, number> = { queued: 1, sent: 2, received: 3, delivered: 4, undelivered: 4, failed: 4 };

/**
 * Carrier codes that mean "stop texting this number" rather than "try later".
 * Each is a permanent condition of the destination, so re-sending spends
 * reputation on a number that will never take a message.
 *
 *  21610  they opted out at the carrier, before it ever reached us
 *  21614  not a mobile number, it is a landline
 *  30003  handset unreachable, permanently
 *  30005  unknown destination
 *  30006  landline or unreachable carrier
 *
 * 30032 is deliberately NOT here. It means our A2P campaign is unregistered,
 * which is a fault on OUR side; suppressing the recipient for it would quietly
 * burn the whole list while the paperwork is pending.
 */
const PERMANENT = new Set(['21610', '21614', '30003', '30005', '30006']);

export async function POST(req: Request) {
  const params = twilioParams(await req.text());

  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  if (token && !verifyTwilio(token, twilioRequestUrl(req), params, req.headers.get('x-twilio-signature') || '')) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 403 });
  }

  const sid = params.MessageSid || params.SmsSid || '';
  const reported = (params.MessageStatus || params.SmsStatus || '').toLowerCase();
  const code = params.ErrorCode || '';
  const status = STATUS[reported] ?? reported;
  if (!sid || !status) return NextResponse.json({ ok: true });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true });

  try {
    const { data: existing } = await sb
      .from('messages')
      .select('id,status,phone')
      .eq('provider_sid', sid)
      .maybeSingle();

    // A callback for a message we never wrote is not an error. It happens for
    // anything sent straight from the Twilio console or by another service on
    // the same account, and there is nothing here to update.
    if (!existing) return NextResponse.json({ ok: true });
    if ((RANK[status] ?? 0) < (RANK[(existing.status as string) ?? ''] ?? 0)) return NextResponse.json({ ok: true });

    await sb
      .from('messages')
      .update({ status, error_code: code || null })
      .eq('id', existing.id);

    if (code && PERMANENT.has(code)) {
      const phone = toE164(existing.phone as string | null);
      if (phone) {
        await optOut(sb, {
          phoneE164: phone,
          reason: `carrier-${code}`,
          source: 'status-callback',
          viaNumber: params.From ?? null,
          messageId: existing.id as string,
        });
      }
    }

    if (code) console.warn('[sms-status]', { sid, status, code });
  } catch (err) {
    console.error('[sms-status] failed', { sid, err: (err as Error)?.message });
  }

  return NextResponse.json({ ok: true });
}
