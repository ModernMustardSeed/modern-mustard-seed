import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * The lead's full conversation thread, each outbound email carrying its REAL
 * delivery state. Reading it marks inbound mail read.
 *
 * `external_id` on a message is the Resend message id. The `emails` Sent store
 * is keyed by the same id and is what the delivery webhook updates, so joining
 * the two is what lets the thread say "delivered at 9:04" instead of the old
 * unfalsifiable "Sent an intro email."
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: messages, error } = await guard.supabase
    .from('messages')
    .select('id,direction,channel,from_addr,to_addr,subject,snippet,body,read,occurred_at,status,external_id')
    .eq('outbound_lead_id', id)
    .order('occurred_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = messages ?? [];
  const ids = rows.map((m) => m.external_id).filter((v): v is string => Boolean(v));

  const delivery = new Map<string, { status: string | null; detail: string | null; delivered_at: string | null; opened_at: string | null }>();
  if (ids.length) {
    const { data: sent } = await guard.supabase
      .from('emails')
      .select('provider_message_id,status,status_detail,delivered_at,opened_at')
      .in('provider_message_id', ids);
    for (const s of sent ?? []) {
      if (!s.provider_message_id) continue;
      delivery.set(s.provider_message_id, {
        status: s.status ?? null,
        detail: s.status_detail ?? null,
        delivered_at: s.delivered_at ?? null,
        opened_at: s.opened_at ?? null,
      });
    }
  }

  const withDelivery = rows.map((m) => ({
    ...m,
    delivery: m.external_id
      ? delivery.get(m.external_id) ?? { status: m.status ?? 'sent', detail: null, delivered_at: null, opened_at: null }
      : null,
  }));

  await guard.supabase.from('messages').update({ read: true }).eq('outbound_lead_id', id).eq('direction', 'inbound').eq('read', false);

  return NextResponse.json({ messages: withDelivery });
}
