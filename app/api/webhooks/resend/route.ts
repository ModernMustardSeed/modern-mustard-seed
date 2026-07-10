import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { addSuppression, markDeliveryByProviderId } from '@/lib/email-log';

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

  return NextResponse.json({ ok: true });
}
