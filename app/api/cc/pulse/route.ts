import { NextResponse } from 'next/server';
import { getCcSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { accountForSession } from '@/lib/cc-access';
import { listContacts } from '@/lib/client-contacts';
import { daysUntil } from '@/lib/domains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE NUMBERS ON THE BOARD, counted from the rows every time. Nothing here is
 * cached or estimated: a client reading "3 waiting" can open the list and
 * count three. The fourteen day bars are lead counts by day, in their own
 * time zone, oldest first.
 */
export async function GET() {
  const session = await getCcSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const account = await accountForSession(sb, session.email, session.preview);
  if (!account) return NextResponse.json({ error: 'No Command Center on this account.' }, { status: 403 });
  const email = account.clientEmail;

  const now = Date.now();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(now - 30 * 86_400_000).toISOString();
  const fortnightAgo = new Date(now - 13 * 86_400_000).toISOString();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

  const [waiting, fresh, month, series, mailNew, mailReply, asks, posts, approvals, visits, domains, contacts] = await Promise.all([
    sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', email).is('handled_at', null),
    sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', email).gte('created_at', dayAgo),
    sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', email).gte('created_at', monthAgo),
    sb.from('client_leads').select('created_at').eq('client_email', email).gte('created_at', fortnightAgo),
    sb.from('client_mail').select('id', { count: 'exact', head: true }).eq('client_email', email).eq('status', 'new'),
    sb.from('client_mail').select('id', { count: 'exact', head: true }).eq('client_email', email).eq('status', 'new').eq('needs_reply', true),
    sb.from('client_review_requests').select('id', { count: 'exact', head: true }).eq('client_email', email).gte('created_at', monthAgo),
    sb.from('posting_posts').select('id', { count: 'exact', head: true }).eq('client_email', email).gte('scheduled_for', today),
    sb.from('posting_posts').select('id', { count: 'exact', head: true }).eq('client_email', email).eq('status', 'awaiting_approval'),
    sb.from('client_visits').select('campaign_code').eq('client_email', email).gte('created_at', weekAgo),
    sb.from('client_domains').select('domain, expires_on, status').eq('client_email', email),
    listContacts(sb, email).catch(() => null),
  ]);

  // Fourteen bars, oldest first, in Mountain time so "today" means their today.
  const days: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    days.push({ day: d, count: 0 });
  }
  const index = new Map(days.map((d, i) => [d.day, i]));
  for (const row of series.data ?? []) {
    const d = new Date(String(row.created_at)).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    const i = index.get(d);
    if (i != null) days[i].count += 1;
  }

  const dueSoon = (domains.data ?? [])
    .map((d) => ({ domain: d.domain as string, days: daysUntil(d.expires_on as string | null), status: d.status as string }))
    .filter((d) => d.status === 'active' && d.days != null && d.days <= 45)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  return NextResponse.json({
    leads: { waiting: waiting.count ?? 0, today: fresh.count ?? 0, month: month.count ?? 0, days },
    inbox: { unread: mailNew.count ?? 0, needsReply: mailReply.count ?? 0 },
    reviews: { asked30: asks.count ?? 0 },
    marketing: { scheduled: posts.count ?? 0, awaitingApproval: approvals.count ?? 0 },
    scans: { week: (visits.data ?? []).length },
    domains: { dueSoon: dueSoon.length, first: dueSoon[0] ?? null, total: (domains.data ?? []).length },
    contacts: { total: contacts?.length ?? 0 },
  });
}
