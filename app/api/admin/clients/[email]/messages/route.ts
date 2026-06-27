import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** The full correspondence thread for one client, matched by email address
 *  (from_addr or to_addr). Reading it clears the unread flag on their replies. */
export async function GET(_req: Request, { params }: { params: Promise<{ email: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = decodeURIComponent((await params).email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ messages: [] });

  const { data } = await sb
    .from('messages')
    .select('id,direction,channel,from_addr,to_addr,subject,snippet,body,read,occurred_at')
    .or(`from_addr.eq.${email},to_addr.eq.${email}`)
    .order('occurred_at', { ascending: true });

  await sb
    .from('messages')
    .update({ read: true })
    .eq('from_addr', email)
    .eq('direction', 'inbound')
    .eq('read', false);

  return NextResponse.json({ messages: data ?? [] });
}
