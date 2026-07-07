import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/** The lead's full conversation thread. Reading it marks inbound mail read. */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: messages, error } = await guard.supabase
    .from('messages')
    .select('id,direction,channel,from_addr,to_addr,subject,snippet,body,read,occurred_at')
    .eq('outbound_lead_id', id)
    .order('occurred_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await guard.supabase.from('messages').update({ read: true }).eq('outbound_lead_id', id).eq('direction', 'inbound').eq('read', false);

  return NextResponse.json({ messages: messages ?? [] });
}
