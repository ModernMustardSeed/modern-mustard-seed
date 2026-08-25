import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { displayPhone } from '@/lib/tap-text';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * EVERY TEXT CONVERSATION, NEWEST FIRST.
 *
 * The list that answers "did anybody text us back". Grouped by handset, because
 * a conversation is a person and not a row.
 *
 * The grouping is done here rather than in SQL: Supabase's REST layer has no
 * DISTINCT ON, and a view would be a migration that has to be applied before
 * this page renders at all. Five hundred recent rows collapse to a few dozen
 * threads in memory, which is cheap and cannot half-deploy.
 */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ threads: [], unread: 0 });

  const unreadOnly = new URL(req.url).searchParams.get('unread') === '1';

  const { data, error } = await sb
    .from('messages')
    .select('id,phone,direction,snippet,body,read,occurred_at,status,error_code,outbound_lead_id,prospect_id')
    .eq('channel', 'sms')
    .not('phone', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Thread = {
    phone: string;
    display: string;
    last: string;
    lastAt: string;
    lastDirection: 'inbound' | 'outbound';
    unread: number;
    outboundLeadId: string | null;
    prospectId: string | null;
    businessName: string | null;
    failed: boolean;
  };

  const byPhone = new Map<string, Thread>();
  for (const m of data ?? []) {
    const phone = m.phone as string;
    let t = byPhone.get(phone);
    if (!t) {
      // Rows arrive newest first, so the first one seen for a number is its last
      // message. Everything after only adds counts.
      t = {
        phone,
        display: displayPhone(phone),
        last: (m.snippet as string) || (m.body as string) || '',
        lastAt: m.occurred_at as string,
        lastDirection: m.direction as 'inbound' | 'outbound',
        unread: 0,
        outboundLeadId: (m.outbound_lead_id as string | null) ?? null,
        prospectId: (m.prospect_id as string | null) ?? null,
        businessName: null,
        failed: false,
      };
      byPhone.set(phone, t);
    }
    if (m.direction === 'inbound' && !m.read) t.unread += 1;
    if (m.direction === 'outbound' && /^(failed|undelivered)$/.test((m.status as string) || '')) t.failed = true;
    if (!t.outboundLeadId && m.outbound_lead_id) t.outboundLeadId = m.outbound_lead_id as string;
    if (!t.prospectId && m.prospect_id) t.prospectId = m.prospect_id as string;
  }

  // Name the businesses in one round trip rather than one per thread.
  const leadIds = [...byPhone.values()].map((t) => t.outboundLeadId).filter((v): v is string => Boolean(v));
  if (leadIds.length) {
    const { data: leads } = await sb.from('outbound_leads').select('id,business_name').in('id', leadIds);
    const names = new Map((leads ?? []).map((l) => [l.id as string, l.business_name as string]));
    for (const t of byPhone.values()) if (t.outboundLeadId) t.businessName = names.get(t.outboundLeadId) ?? null;
  }

  let threads = [...byPhone.values()];
  if (unreadOnly) threads = threads.filter((t) => t.unread > 0);
  // Unanswered first, then most recent. Somebody waiting on a reply outranks a
  // conversation that is already finished.
  threads.sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.lastAt.localeCompare(a.lastAt));

  return NextResponse.json({
    threads,
    unread: threads.reduce((n, t) => n + t.unread, 0),
  });
}
