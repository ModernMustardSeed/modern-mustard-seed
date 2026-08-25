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
  // Resend accepted the message and then never sent it, because the address is
  // on the account suppression list from an earlier bounce or complaint. It is
  // NOT a delivery, and counting it as one overstates reach while quietly
  // burning the same dead address every cycle.
  'email.suppressed': 'suppressed',
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
  await recordAcqDelivery(providerId, type, detail, bounce?.type ?? null);

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
async function recordAcqDelivery(
  providerId: string,
  type: string,
  detail: string | null,
  /** Resend's classification: Permanent, Transient, Undetermined, or null. */
  bounceType: string | null,
): Promise<void> {
  const TERMINAL: Record<string, string> = {
    'email.bounced': 'bounced',
    'email.complained': 'complaint',
    'email.delivery_delayed': 'deferred',
    'email.delivered': 'delivered',
    'email.suppressed': 'suppressed',
  };
  const status = TERMINAL[type];
  if (!status) return;

  // A full mailbox or a busy server is not a bad address. The suppression
  // path above has always known that; the reputation math and the lead's own
  // record did not, so one MailboxFull permanently retired a real prospect
  // and counted against the domain. Both stop here.
  const soft = status === 'bounced' && bounceType === 'Transient';

  try {
    const db = getSupabase();
    if (!db) return;
    const stamp = new Date().toISOString();
    const patch: Record<string, unknown> = { status, status_detail: detail };
    if (status === 'bounced') patch.bounce_type = bounceType ?? 'Permanent';
    if (status === 'delivered') patch.delivered_at = stamp;
    if (status === 'bounced') patch.bounced_at = stamp;
    if (status === 'complaint') patch.complained_at = stamp;
    if (status === 'suppressed') patch.unsubscribed_at = stamp;

    let q = db.from('acq_sends').update(patch).eq('provider_message_id', providerId);
    // A drop is authoritative. Anything softer must not overwrite one. A soft
    // bounce is not a drop: Resend retries them, and a later delivered is the
    // truer answer, so it is allowed to win.
    if (status === 'delivered' || status === 'deferred') {
      q = q.not('status', 'in', '(complaint,unsubscribed,suppressed)').or('status.neq.bounced,bounce_type.eq.Transient');
    }
    const { data } = await q.select('lead_id');

    const leadId = ((data ?? [])[0] as { lead_id: string | null } | undefined)?.lead_id;
    const DEAD: Record<string, { reason: string; why: string; event: 'email_bounced' | 'suppressed'; label: string }> = {
      bounced: {
        reason: 'Hard bounced.',
        why: 'Hard bounced.',
        event: 'email_bounced',
        label: `Hard bounce: ${detail ?? ''}`.trim(),
      },
      complaint: {
        reason: 'Marked our mail as spam.',
        why: 'Spam complaint.',
        event: 'suppressed',
        label: 'Marked our email as spam',
      },
      suppressed: {
        reason: 'Resend suppressed this address.',
        why: 'Resend suppressed this address.',
        event: 'suppressed',
        label: 'Resend suppressed this address, so the message never went out',
      },
    };
    const dead = soft ? null : DEAD[status];

    if (leadId && soft) {
      // Keep them in the campaign. Record what happened so a pattern of full
      // mailboxes on one address is still visible on the timeline.
      await recordEvent(db, {
        leadId,
        type: 'note',
        label: `Soft bounce, still mailable: ${detail ?? 'the mailbox was temporarily unavailable'}`,
        detail: { providerId, detail, bounceType },
      });
    }

    if (leadId && dead) {
      await db
        .from('outbound_leads')
        .update({
          bounced: status === 'bounced',
          acq_eligible: false,
          acq_ineligible_reason: dead.reason,
          reservoir_state: 'suppressed',
          ...(status === 'complaint' ? { unsubscribed_at: stamp, suppression_reason: 'spam complaint' } : {}),
        })
        .eq('id', leadId);
      await cancelPendingFor(db, leadId, undefined, dead.why);
      await recordEvent(db, {
        leadId,
        type: dead.event,
        label: dead.label,
        detail: { providerId, detail },
      });
    }
  } catch (err) {
    console.error('acq delivery bookkeeping failed', err);
  }
}
