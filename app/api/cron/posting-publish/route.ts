import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { listSettings } from '@/lib/posting/settings';
import { publishDue, retryFailed, upgradeWords } from '@/lib/posting/publish';
import { planClient } from '@/lib/posting/planner';
import { sendStallNote, sendWeeklySummary } from '@/lib/posting/notify';
import { accountViews } from '@/lib/posting/accounts';
import { mountainDate, mountainHour, mountainWeekday, addDays } from '@/lib/posting/time';
import type { PostRow } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * THE HOURLY TICK. Four jobs, each bounded and idempotent:
 *   1. Publish whatever has come due.
 *   2. Swap template words for Claude's on posts still ahead of their hour.
 *   3. Retry yesterday's failures once an hour, in case a reconnect fixed them.
 *   4. Safety nets: plan if the evening cron missed, shout if a client has
 *      nothing out by 1 PM, and send the Monday summary at 9 AM.
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
  const published = await publishDue(sb, now);
  const retried = await retryFailed(sb, now);

  // Better words for what is still waiting.
  const { data: waiting } = await sb.from('posting_posts').select('*').eq('status', 'scheduled').eq('written_by', 'template').gt('publish_at', now.toISOString()).limit(20);
  for (const row of waiting ?? []) await upgradeWords(sb, row as PostRow);

  const today = mountainDate(now);
  const hour = mountainHour(now);
  const clients = await listSettings(sb);
  const notes: Record<string, string> = {};
  for (const s of clients) {
    if (!s.active) continue;
    // Net 1: the evening plan missed, or a client was added today. Never let tomorrow be empty.
    const { count } = await sb.from('posting_posts').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).eq('scheduled_for', addDays(today, 1));
    if (!count) {
      await planClient(sb, s);
      notes[s.client_email] = 'planned tomorrow from the hourly net';
    }
    // Net 2: nothing out by 1 PM on a client with a connected account is a stall, and Sarah hears about it once.
    if (hour === 13) {
      const { data: todays } = await sb.from('posting_posts').select('status, publish_at').eq('client_email', s.client_email).eq('scheduled_for', today).maybeSingle();
      const accounts = await accountViews(sb, s.client_email);
      const anyApi = accounts.some((a) => a.connected);
      const out = todays && ['published', 'partial'].includes(String(todays.status));
      if (!out && anyApi) {
        const reason = !todays ? 'No post row exists for today.' : `Today's row is "${todays.status}".`;
        await sendStallNote(s, reason);
        notes[s.client_email] = `${notes[s.client_email] ?? ''} stall note sent`.trim();
      }
    }
    // Net 3: Monday 9 AM, last week in one email to the client.
    if (s.weekly_summary && mountainWeekday(now) === 1 && hour === 9) {
      const { data: week } = await sb.from('posting_posts').select('*').eq('client_email', s.client_email).gte('scheduled_for', addDays(today, -7)).lt('scheduled_for', today).order('scheduled_for');
      const { count: leads } = await sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).gte('created_at', new Date(now.getTime() - 7 * 86_400_000).toISOString());
      if ((week ?? []).length) await sendWeeklySummary(s, week as PostRow[], leads ?? 0);
    }
  }

  return NextResponse.json({ ok: true, published, retried, upgraded: (waiting ?? []).length, notes });
}
