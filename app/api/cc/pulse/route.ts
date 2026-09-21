import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
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
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, who } = got.desk;
  const email = account.clientEmail;

  const now = Date.now();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(now - 30 * 86_400_000).toISOString();
  const fortnightAgo = new Date(now - 13 * 86_400_000).toISOString();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

  const [waitingRows, fresh, month, series, mailNew, mailReply, asks, posts, approvals, visits, domains, contacts] = await Promise.all([
    // The waiting rows themselves, not just their count: the board needs the
    // oldest one's age and who holds what, and both come from these rows.
    sb.from('client_leads').select('created_at, owner_key').eq('client_email', email).is('handled_at', null).order('created_at', { ascending: true }).limit(500),
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

  const waitingList = waitingRows.data ?? [];

  return NextResponse.json({
    leads: {
      waiting: waitingList.length,
      oldestWaitingAt: (waitingList[0]?.created_at as string | undefined) ?? null,
      mine: who ? waitingList.filter((l) => l.owner_key === who.key).length : 0,
      unowned: waitingList.filter((l) => !l.owner_key).length,
      today: fresh.count ?? 0,
      month: month.count ?? 0,
      days,
    },
    inbox: { unread: mailNew.count ?? 0, needsReply: mailReply.count ?? 0 },
    reviews: { asked30: asks.count ?? 0 },
    marketing: { scheduled: posts.count ?? 0, awaitingApproval: approvals.count ?? 0 },
    scans: { week: (visits.data ?? []).length },
    domains: { dueSoon: dueSoon.length, first: dueSoon[0] ?? null, total: (domains.data ?? []).length },
    contacts: { total: contacts?.length ?? 0 },
  });
}
