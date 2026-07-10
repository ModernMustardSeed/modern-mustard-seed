import { NextResponse } from 'next/server';
import { requireOutboundAdmin, outboundRepScope } from '@/lib/outbound-server';
import { denverToday, denverWeekStart } from '@/lib/outbound';
import type { DailyRepStat } from '@/lib/outbound';

export const runtime = 'nodejs';

/** Today's and this week's dials/conversations/demos per rep (America/Denver). */
export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const today = denverToday();
  const weekStart = denverWeekStart();

  const [{ reps }, { data: rows, error: statErr }] = await Promise.all([
    outboundRepScope(guard.supabase),
    guard.supabase.from('outbound_daily_rep_stats').select('*').gte('day', weekStart),
  ]);
  if (statErr) return NextResponse.json({ error: statErr.message }, { status: 500 });

  const zero = { dials: 0, conversations: 0, demos_booked: 0 };
  const todayByRep: Record<string, typeof zero> = {};
  const weekByRep: Record<string, typeof zero> = {};
  for (const row of (rows ?? []) as DailyRepStat[]) {
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

  return NextResponse.json({ reps: reps ?? [], today: todayByRep, week: weekByRep, day: today, weekStart });
}
