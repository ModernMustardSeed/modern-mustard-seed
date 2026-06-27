import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Correspondence feed for the admin inbox: recent inbound messages (lead
 * replies) with the business they came from, plus the unread count for the nav
 * badge. ?unread=1 limits to unread only.
 */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const unreadOnly = new URL(req.url).searchParams.get('unread') === '1';
  let q = sb
    .from('messages')
    .select('id,prospect_id,from_addr,subject,snippet,read,occurred_at')
    .eq('direction', 'inbound')
    .order('occurred_at', { ascending: false })
    .limit(100);
  if (unreadOnly) q = q.eq('read', false);
  const { data: msgs } = await q;

  // Attach the business name for each prospect.
  const ids = Array.from(new Set((msgs ?? []).map((m) => m.prospect_id).filter(Boolean)));
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await sb.from('rep_prospects').select('id,business,city').in('id', ids);
    for (const p of ps ?? []) names.set(p.id, `${p.business}${p.city ? ` (${p.city})` : ''}`);
  }
  // Prospect-less inbound mail is from a client; resolve their name by address.
  const clientAddrs = Array.from(
    new Set((msgs ?? []).filter((m) => !m.prospect_id && m.from_addr).map((m) => String(m.from_addr).toLowerCase()))
  );
  const clientNames = new Map<string, string>();
  if (clientAddrs.length) {
    const { data: cs } = await sb.from('clients').select('email,name,company').in('email', clientAddrs);
    for (const c of cs ?? []) clientNames.set(String(c.email).toLowerCase(), c.company || c.name || String(c.email));
  }
  const items = (msgs ?? []).map((m) => ({
    ...m,
    business: m.prospect_id
      ? names.get(m.prospect_id) ?? 'Unknown'
      : clientNames.get(String(m.from_addr).toLowerCase()) ?? (m.from_addr || 'Unknown'),
  }));

  const { count: unread } = await sb
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'inbound')
    .eq('read', false);

  return NextResponse.json({ items, unread: unread ?? 0 });
}
