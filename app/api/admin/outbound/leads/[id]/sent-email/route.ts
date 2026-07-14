import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { markDeliveryByProviderId } from '@/lib/email-log';
import { stripTrackingPixels } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 20;

type Params = Promise<{ id: string }>;

/**
 * Proof that an email actually went out, and what it said.
 *
 * Answers the two questions the cockpit could not answer before: "did it really
 * send?" and "what did they get?". Three sources, most authoritative first:
 *   1. Resend itself (GET /emails/:id) for `last_event`, which is the provider's
 *      own verdict. A 200 on send only means Resend ACCEPTED the mail; only a
 *      delivered/opened event means an inbox took it.
 *   2. the `emails` Sent row, which holds the exact html we handed over and the
 *      status the delivery webhook has confirmed so far;
 *   3. the thread `messages` row, which is also the authorization check (the id
 *      must belong to THIS lead before we hand back a message body).
 *
 * The live last_event is written back through markDeliveryByProviderId, so
 * opening the viewer also reconciles a message whose webhook never arrived.
 */

/** Resend's last_event vocabulary to our stored status. An open or a click is proof of delivery. */
const EVENT_STATUS: Record<string, string> = {
  scheduled: 'queued',
  queued: 'queued',
  sent: 'sent',
  delivered: 'delivered',
  delivery_delayed: 'delivery_delayed',
  opened: 'delivered',
  clicked: 'delivered',
  bounced: 'bounced',
  complained: 'complained',
  failed: 'failed',
  canceled: 'failed',
};

function cleanKey(k?: string): string {
  return (k || '').replace(/[\r\n]/g, '').trim();
}

export async function GET(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const mid = new URL(req.url).searchParams.get('mid');
  if (!mid) return NextResponse.json({ error: 'Missing message id.' }, { status: 400 });

  // Authorization + existence: this Resend id must be on THIS lead's thread.
  const { data: msg } = await guard.supabase
    .from('messages')
    .select('id,subject,to_addr,from_addr,occurred_at,status,snippet')
    .eq('outbound_lead_id', id)
    .eq('external_id', mid)
    .maybeSingle();
  if (!msg) return NextResponse.json({ error: 'No such send on this lead.' }, { status: 404 });

  const { data: stored } = await guard.supabase
    .from('emails')
    .select('subject,to_addrs,body_html,status,status_detail,delivered_at,opened_at,occurred_at')
    .eq('provider_message_id', mid)
    .maybeSingle();

  // The provider's own verdict, live. This is what makes "it sent" checkable
  // even when the webhook is not wired up or an event was missed.
  let lastEvent: string | null = null;
  let providerError: string | null = null;
  let providerHtml: string | null = null;
  const apiKey = cleanKey(process.env.RESEND_API_KEY);
  if (apiKey) {
    try {
      const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(mid)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const body = (await res.json()) as { last_event?: string; html?: string };
        lastEvent = body.last_event ?? null;
        providerHtml = body.html ?? null;
      } else {
        providerError = `Resend ${res.status}`;
      }
    } catch (e) {
      providerError = e instanceof Error ? e.message : 'Resend lookup failed.';
    }
  } else {
    providerError = 'RESEND_API_KEY missing.';
  }

  // Reconcile: a webhook that never fired should not leave a delivered message
  // looking merely 'sent'.
  if (lastEvent) {
    const mapped = EVENT_STATUS[lastEvent];
    if (mapped) await markDeliveryByProviderId(mid, mapped, lastEvent === 'bounced' ? 'bounced (provider)' : null);
    if (lastEvent === 'opened' || lastEvent === 'clicked') await markDeliveryByProviderId(mid, 'opened');
  }

  const html = stored?.body_html ?? providerHtml ?? null;
  const status = (lastEvent && EVENT_STATUS[lastEvent]) || stored?.status || msg.status || 'sent';

  return NextResponse.json({
    messageId: mid,
    subject: stored?.subject ?? msg.subject ?? '(no subject)',
    to: stored?.to_addrs ?? msg.to_addr ?? '',
    from: msg.from_addr ?? '',
    sentAt: stored?.occurred_at ?? msg.occurred_at,
    // Stripped: rendering the pixel in the admin would log a phantom open on the lead.
    html: html ? stripTrackingPixels(html) : null,
    status,
    lastEvent,
    statusDetail: stored?.status_detail ?? null,
    deliveredAt: stored?.delivered_at ?? null,
    openedAt: stored?.opened_at ?? null,
    providerError,
  });
}
