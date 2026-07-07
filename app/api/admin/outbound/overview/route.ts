import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { denverToday, denverWeekStart } from '@/lib/outbound';
import type { DailyRepStat, HeatReason } from '@/lib/outbound';

export const runtime = 'nodejs';

/**
 * One fetch for the dashboard AND the dial order. The queue is heat-ranked,
 * not FIFO: an unread reply outranks everything, someone reading the audit
 * email right now outranks a due callback, due callbacks and retries outrank
 * cold starts, and among cold starts the worst audit scores go first (the
 * 4/100 site is the easiest conversation in the list).
 */

type Candidate = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  niche: string;
  city: string | null;
  status: string;
  owner_rep_id: string | null;
  dnc_checked: boolean;
  next_action_at: string | null;
  next_action: string | null;
  audit_score: number | null;
  last_open_at: string | null;
  email_open_count: number;
  demo_url: string | null;
  source: string | null;
  created_at: string;
};

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const today = denverToday();
  const weekStart = denverWeekStart();
  const now = Date.now();

  const [repsRes, statsRes, candRes, unreadRes, pilotsRes, lockedRes] = await Promise.all([
    guard.supabase.from('outbound_reps').select('*').eq('active', true).order('name'),
    guard.supabase.from('outbound_daily_rep_stats').select('*').gte('day', weekStart),
    guard.supabase
      .from('outbound_leads')
      .select(
        'id, business_name, contact_name, phone, niche, city, status, owner_rep_id, dnc_checked, next_action_at, next_action, audit_score, last_open_at, email_open_count, demo_url, source, created_at',
      )
      .in('status', ['new', 'contacted', 'callback'])
      .limit(600),
    guard.supabase.from('messages').select('outbound_lead_id').eq('direction', 'inbound').eq('read', false).not('outbound_lead_id', 'is', null),
    guard.supabase
      .from('outbound_pilots')
      .select('*, lead:outbound_leads(id, business_name)')
      .eq('status', 'running')
      .order('ends_at', { ascending: true }),
    guard.supabase
      .from('outbound_leads')
      .select('id', { count: 'exact', head: true })
      .eq('dnc_checked', false)
      .in('status', ['new', 'contacted', 'callback']),
  ]);

  for (const res of [repsRes, statsRes, candRes, unreadRes, pilotsRes]) {
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const zero = { dials: 0, conversations: 0, demos_booked: 0 };
  const todayByRep: Record<string, typeof zero> = {};
  const weekByRep: Record<string, typeof zero> = {};
  for (const row of (statsRes.data ?? []) as DailyRepStat[]) {
    const w = (weekByRep[row.rep_id] ??= { ...zero });
    w.dials += row.dials;
    w.conversations += row.conversations;
    w.demos_booked += row.demos_booked;
    if (row.day === today) {
      const t = (todayByRep[row.rep_id] ??= { ...zero });
      t.dials += row.dials;
      t.conversations += row.conversations;
      t.demos_booked += row.demos_booked;
    }
  }

  const replied = new Set((unreadRes.data ?? []).map((m) => m.outbound_lead_id as string));

  const queue = ((candRes.data ?? []) as Candidate[])
    .map((l) => {
      let score = 0;
      let reason: HeatReason = 'fresh';

      if (replied.has(l.id)) {
        score += 1000;
        reason = 'replied';
      }

      if (l.last_open_at) {
        const minsAgo = (now - new Date(l.last_open_at).getTime()) / 60000;
        if (minsAgo <= 15) {
          score += 800;
          if (reason === 'fresh') reason = 'reading_now';
        } else if (minsAgo <= 48 * 60) {
          score += Math.max(120, 500 - (minsAgo / 60) * 8);
          if (reason === 'fresh') reason = 'opened_recently';
        }
      }

      const due = l.next_action_at ? new Date(l.next_action_at).getTime() <= now + 60 * 60000 : false;
      if (l.status === 'callback') {
        if (!due && score === 0) return null; // scheduled for later, stays out of the way
        if (due) {
          const overdueHrs = l.next_action_at ? Math.max(0, (now - new Date(l.next_action_at).getTime()) / 3600000) : 0;
          score += 400 + Math.min(100, overdueHrs * 4);
          if (reason === 'fresh') reason = 'callback_due';
        }
      } else if (l.status === 'contacted') {
        if (due) {
          score += 350;
          if (reason === 'fresh') reason = 'retry_due';
        } else if (score === 0) {
          return null; // contacted, nothing due, no signal: rests until the cadence wakes it
        }
      }

      if (l.audit_score != null) {
        score += Math.max(0, 100 - l.audit_score) * 2;
        if (reason === 'fresh' && l.audit_score <= 50) reason = 'worst_audit';
      }
      // Review-mined leads carry public proof that customers cannot reach
      // them, the exact wound we treat: hotter than a cold start.
      if (l.source === 'review-mining') {
        score += 180;
        if (reason === 'fresh') reason = 'review_pain';
      }
      if (l.status === 'new') score += 50;

      return { ...l, heat: Math.round(score), reason };
    })
    .filter((l): l is Candidate & { heat: number; reason: HeatReason } => l !== null)
    .sort((a, b) => b.heat - a.heat || a.created_at.localeCompare(b.created_at))
    .slice(0, 40);

  const pilots = pilotsRes.data ?? [];
  const totalRecovered = pilots.reduce((sum, p) => sum + Number(p.revenue_recovered ?? 0), 0);
  const soonCutoff = now + 3 * 86400000;
  const endingSoon = pilots.filter((p) => new Date(p.ends_at).getTime() <= soonCutoff);

  return NextResponse.json({
    reps: repsRes.data ?? [],
    today: todayByRep,
    week: weekByRep,
    queue,
    lockedUnscrubbed: lockedRes.count ?? 0,
    pilots: {
      running: pilots.length,
      totalRecovered,
      endingSoon: endingSoon.map((p) => ({ id: p.id, ends_at: p.ends_at, business_name: p.lead?.business_name ?? '' })),
    },
    day: today,
    weekStart,
  });
}
