import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { denverEndOfToday, denverToday, denverWeekStart } from '@/lib/outbound';
import type { DailyRepStat } from '@/lib/outbound';

export const runtime = 'nodejs';

/**
 * One fetch for the dashboard: reps with today/week stats, today's call queue
 * (due callbacks + fresh leads), and the running-pilots strip.
 */
export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const today = denverToday();
  const weekStart = denverWeekStart();
  const dueBy = denverEndOfToday();

  const [repsRes, statsRes, callbacksRes, freshRes, pilotsRes] = await Promise.all([
    guard.supabase.from('outbound_reps').select('*').eq('active', true).order('name'),
    guard.supabase.from('outbound_daily_rep_stats').select('*').gte('day', weekStart),
    guard.supabase
      .from('outbound_leads')
      .select('id, business_name, contact_name, phone, niche, city, status, owner_rep_id, dnc_checked, next_action_at')
      .eq('status', 'callback')
      .lte('next_action_at', dueBy)
      .order('next_action_at', { ascending: true })
      .limit(30),
    guard.supabase
      .from('outbound_leads')
      .select('id, business_name, contact_name, phone, niche, city, status, owner_rep_id, dnc_checked, next_action_at')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(30),
    guard.supabase
      .from('outbound_pilots')
      .select('*, lead:outbound_leads(id, business_name)')
      .eq('status', 'running')
      .order('ends_at', { ascending: true }),
  ]);

  for (const res of [repsRes, statsRes, callbacksRes, freshRes, pilotsRes]) {
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

  const queue = [...(callbacksRes.data ?? []), ...(freshRes.data ?? [])].slice(0, 30);

  const pilots = pilotsRes.data ?? [];
  const totalRecovered = pilots.reduce((sum, p) => sum + Number(p.revenue_recovered ?? 0), 0);
  const soonCutoff = Date.now() + 3 * 86400000;
  const endingSoon = pilots.filter((p) => new Date(p.ends_at).getTime() <= soonCutoff);

  return NextResponse.json({
    reps: repsRes.data ?? [],
    today: todayByRep,
    week: weekByRep,
    queue,
    pilots: {
      running: pilots.length,
      totalRecovered,
      endingSoon: endingSoon.map((p) => ({ id: p.id, ends_at: p.ends_at, business_name: p.lead?.business_name ?? '' })),
    },
    day: today,
    weekStart,
  });
}
