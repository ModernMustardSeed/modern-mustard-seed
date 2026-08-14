import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { addSuppression, markDeliveryByProviderId } from '@/lib/email-log';
import { getSupabase } from '@/lib/supabase';
import { cancelPendingFor } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resend delivery webhook. This is what makes "delivered" honest: the send path
 * only ever records status='sent' (provider accepted); THIS endpoint upgrades a
 * message to 'delivered' when the recipient server actually takes it, or flags
 * it 'bounced' / 'complained' and mirrors the address into our suppression list
 * so we stop trying to send to it.
 *
 * Configure in Resend: Webhooks → add endpoint https://modernmustardseed.com/api/webhooks/resend,
 * subscribe to all email.* events, and set RESEND_WEBHOOK_SECRET (whsec_...).
 * Signed with Svix; we verify manually (no extra dependency). If the secret is
 * unset we accept unverified (setup window) but log a warning.
 */
const TYPE_TO_STATUS: Record<string, string> = {
  'email.scheduled': 'queued',
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.opened': 'opened',
};

function verifySvix(secret: string, id: string, ts: string, body: string, header: string): boolean {
  try {
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = crypto
      .createHmac('sha256', key)
      .update(`${id}.${ts}.${body}`)
      .digest('base64');
    // The svix-signature header is a space-separated list of "v1,<sig>".
    for (const part of header.split(' ')) {
      const sig = part.includes(',') ? part.split(',')[1] : part;
      if (
        sig &&
        sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
      ) {
        return true;
      }
    }
  } catch {
    /* fall through to false */
  }
  return false;
}

export async function POST(req: Request) {
  const body = await req.text();
  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (secret) {
    const id = req.headers.get('svix-id') || '';
    const ts = req.headers.get('svix-timestamp') || '';
    const sig = req.headers.get('svix-signature') || '';
    if (!verifySvix(secret, id, ts, body, sig)) {
      return NextResponse.json({ error: 'bad signature' }, { status: 401 });
    }
  } else {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET unset — accepting unverified event');
  }

  let evt: { type?: string; data?: Record<string, unknown> };
  try {
    evt = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const type = evt.type || '';
  const status = TYPE_TO_STATUS[type];
  const data = (evt.data || {}) as {
    email_id?: string;
    to?: string | string[];
    bounce?: { type?: string; subType?: string; message?: string };
  };
  const providerId = data.email_id;
  if (!status || !providerId) return NextResponse.json({ ok: true, ignored: type || 'unknown' });

  const bounce = data.bounce;
  const detail =
    type === 'email.bounced'
      ? [bounce?.type, bounce?.subType, bounce?.message].filter(Boolean).join(' · ') || 'bounced'
      : type === 'email.complained'
        ? 'marked as spam'
        : null;

  await markDeliveryByProviderId(providerId, status, detail);

  // Feed the local suppression mirror on permanent bounces + complaints — but
  // only when there is a single recipient, so a group send can never falsely
  // block an innocent co-recipient (Resend reports events at the email level).
  const tos = Array.isArray(data.to) ? data.to : data.to ? [data.to] : [];
  const shouldSuppress =
    tos.length === 1 &&
    (type === 'email.complained' ||
      (type === 'email.bounced' && (bounce?.type ? bounce.type !== 'Transient' : true)));
  if (shouldSuppress) {
    await addSuppression(tos[0], type === 'email.complained' ? 'complained' : 'bounced', detail, providerId);
  }

  // Feed the outbound governor. Its bounce and complaint rates, and therefore
  // the adaptive allowance and the automatic throttle, are read off acq_sends,
  // so an event that is not carried across here is a warning nobody acts on.
  await recordAcqDelivery(providerId, type, detail);

  return NextResponse.json({ ok: true });
}

/**
 * Carry a provider event onto the acquisition send row, and onto the prospect
 * when it is terminal.
 *
 * Idempotent and never regressing: Resend retries, and a late "delivered" must
 * not overwrite a real "bounced". Best effort throughout, because this is
 * bookkeeping and the suppression write above is the part that protects people.
 */
async function recordAcqDelivery(providerId: string, type: string, detail: string | null): Promise<void> {
  const TERMINAL: Record<string, string> = {
    'email.bounced': 'bounced',
    'email.complained': 'complaint',
    'email.delivery_delayed': 'deferred',
    'email.delivered': 'delivered',
  };
  const status = TERMINAL[type];
  if (!status) return;

  try {
    const db = getSupabase();
    if (!db) return;
    const stamp = new Date().toISOString();
    const patch: Record<string, unknown> = { status, status_detail: detail };
    if (status === 'delivered') patch.delivered_at = stamp;
    if (status === 'bounced') patch.bounced_at = stamp;
    if (status === 'complaint') patch.complained_at = stamp;

    let q = db.from('acq_sends').update(patch).eq('provider_message_id', providerId);
    // A drop is authoritative. Anything softer must not overwrite one.
    if (status === 'delivered' || status === 'deferred') q = q.not('status', 'in', '(bounced,complaint,unsubscribed)');
    const { data } = await q.select('lead_id');

    const leadId = ((data ?? [])[0] as { lead_id: string | null } | undefined)?.lead_id;
    if (leadId && (status === 'bounced' || status === 'complaint')) {
      await db
        .from('outbound_leads')
        .update({
          bounced: status === 'bounced',
          acq_eligible: false,
          acq_ineligible_reason: status === 'bounced' ? 'Hard bounced.' : 'Marked our mail as spam.',
          reservoir_state: 'suppressed',
          ...(status === 'complaint' ? { unsubscribed_at: stamp, suppression_reason: 'spam complaint' } : {}),
        })
        .eq('id', leadId);
      await cancelPendingFor(db, leadId, undefined, status === 'bounced' ? 'Hard bounced.' : 'Spam complaint.');
      await recordEvent(db, {
        leadId,
        type: status === 'bounced' ? 'email_bounced' : 'suppressed',
        label: status === 'bounced' ? `Hard bounce: ${detail ?? ''}`.trim() : 'Marked our email as spam',
        detail: { providerId, detail },
      });
    }
  } catch (err) {
    console.error('acq delivery bookkeeping failed', err);
  }
}
