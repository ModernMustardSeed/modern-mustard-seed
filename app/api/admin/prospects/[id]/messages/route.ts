import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** The correspondence thread for one prospect. Loading it marks inbound mail read. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const { data } = await sb
    .from('messages')
    .select('id,direction,channel,from_addr,to_addr,subject,snippet,body,read,occurred_at')
    .eq('prospect_id', id)
    .order('occurred_at', { ascending: true });
  // Reading the thread clears the unread flag on their replies.
  await sb.from('messages').update({ read: true }).eq('prospect_id', id).eq('direction', 'inbound').eq('read', false);
  return NextResponse.json({ messages: data ?? [] });
}
