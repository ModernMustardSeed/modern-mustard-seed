import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { listSettings } from '@/lib/posting/settings';
import { publishDue, retryFailed, upgradeWords } from '@/lib/posting/publish';
import { planClient, emptyDaysAhead } from '@/lib/posting/planner';
import { sendQueueNudge, sendStallNote, sendWeeklySummary } from '@/lib/posting/notify';
import { mountainDate, mountainHour, mountainWeekday, addDays } from '@/lib/posting/time';
import type { PostRow } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * THE HOURLY TICK. Five jobs, each bounded and idempotent:
 *   1. Give every new submission a day (so a post typed at 4 PM is on the
 *      calendar by 5, not tomorrow evening).
 *   2. Publish whatever has come due.
 *   3. Swap the mechanical edit for Claude's on posts still ahead of their hour.
 *   4. Retry yesterday's failures once an hour, in case a reconnect fixed them.
 *   5. Safety nets: shout at 1 PM if a post was due and did not go, the Friday
 *      nudge when next week is empty, the Monday summary at 9 AM.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });

  const now = new Date();
  const today = mountainDate(now);
  const hour = mountainHour(now);
  const weekday = mountainWeekday(now);
  const clients = await listSettings(sb);
  const notes: Record<string, string[]> = {};
  const say = (email: string, s: string) => (notes[email] = [...(notes[email] ?? []), s]);

  for (const s of clients) {
    if (!s.active) continue;
    const planned = await planClient(sb, s);
    if (planned.length) say(s.client_email, `planned ${planned.length}`);
  }

  const published = await publishDue(sb, now);
  const retried = await retryFailed(sb, now);

  const { data: waiting } = await sb.from('posting_posts').select('*').eq('status', 'scheduled').eq('written_by', 'template').gt('publish_at', now.toISOString()).limit(20);
  for (const row of waiting ?? []) await upgradeWords(sb, row as PostRow);

  for (const s of clients) {
    if (!s.active) continue;
    if (hour === 13) {
      const { data: todays } = await sb.from('posting_posts').select('status').eq('client_email', s.client_email).eq('scheduled_for', today).maybeSingle();
      if (todays && ['failed', 'scheduled', 'writing', 'publishing'].includes(String(todays.status))) {
        await sendStallNote(s, `Today's post is "${todays.status}" at 1 PM.`);
        say(s.client_email, 'stall note sent');
      }
    }
    if (weekday === 5 && hour === 9) {
      const empty = await emptyDaysAhead(sb, s, 7);
      if (empty >= 4) {
        await sendQueueNudge(s, empty);
        say(s.client_email, `nudge sent, ${empty} empty days`);
      }
    }
    if (s.weekly_summary && weekday === 1 && hour === 9) {
      const { data: week } = await sb.from('posting_posts').select('*').eq('client_email', s.client_email).gte('scheduled_for', addDays(today, -7)).lt('scheduled_for', today).order('scheduled_for');
      const { count: leads } = await sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).gte('created_at', new Date(now.getTime() - 7 * 86_400_000).toISOString());
      if ((week ?? []).length) await sendWeeklySummary(s, week as PostRow[], leads ?? 0);
    }
  }

  return NextResponse.json({ ok: true, published, retried, upgraded: (waiting ?? []).length, notes });
}
