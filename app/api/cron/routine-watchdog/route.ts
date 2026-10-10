import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { addDays, mountainDate, prettyDate, prettyMountainTime } from '@/lib/posting/time';
import { expectedRuns, missingRuns } from '@/lib/routines';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const STATE_KEY = 'routine-watchdog:emailed';

/**
 * DAILY, 15:47 UTC (9:47 AM Mountain in summer, 8:47 AM in winter). The office
 * runs on one laptop, so a routine that never fires leaves no trace at all: no
 * report, no error, just a quiet morning. This reads every run that should have
 * finished by now (all of yesterday's, plus today's past their timeout) against
 * routine_runs, and when any has no `ok` row, Sarah gets one email listing every
 * miss. Clean mornings send nothing. One email per Mountain day at most.
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
  const expected = expectedRuns(now);
  const { data: runs, error } = await sb
    .from('routine_runs')
    .select('routine, run_date, status')
    .gte('run_date', addDays(today, -1))
    .lte('run_date', today);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const misses = missingRuns(expected, runs ?? []);
  if (!misses.length) return NextResponse.json({ ok: true, expected: expected.length, missing: 0 });

  const { data: state } = await sb.from('app_state').select('value').eq('key', STATE_KEY).maybeSingle();
  if ((state?.value as { date?: string } | null)?.date === today) {
    return NextResponse.json({ ok: true, expected: expected.length, missing: misses.length, emailed: 'already today' });
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const why = (s: string | null) =>
    s === null ? 'never checked in' : s === 'running' ? 'started and never finished' : s === 'missing_report' ? 'ran and wrote no report' : s === 'timeout' ? 'timed out and was killed' : s === 'skipped' ? 'skipped' : 'ended in an error';
  const line = (m: (typeof misses)[number]) => `${m.routine} (${m.agent}), ${prettyDate(m.run_date)}: ${why(m.status)}. Due by ${prettyMountainTime(m.due_at)}.`;
  const neverRan = misses.every((m) => m.status === null);
  const n = misses.length;

  const sent = await sendViaResend({
    from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: 'sarah@modernmustardseed.com',
    subject: `${n} office routine${n === 1 ? '' : 's'} did not report`,
    html: `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;">${misses.map((m) => `<p style="margin:0 0 10px;">${esc(line(m))}</p>`).join('')}<p style="margin:16px 0 0;opacity:.7;font-size:13px;">${neverRan ? 'Nothing checked in at all, which usually means the laptop was off or asleep, or the Task Scheduler tasks stopped. ' : ''}Logs are in dev/mms/routines/logs/scheduler.log. Run one by hand with run.ps1 -Name &lt;routine&gt; -Force.</p></div>`,
    text: `${misses.map(line).join('\n')}\n\nLogs: dev/mms/routines/logs/scheduler.log. Run one by hand with run.ps1 -Name <routine> -Force.`,
  });
  if (!sent.ok) return NextResponse.json({ ok: false, missing: n, error: sent.error }, { status: 502 });

  await sb.from('app_state').upsert({ key: STATE_KEY, value: { date: today, missing: misses.map((m) => `${m.routine}|${m.run_date}`) }, updated_at: now.toISOString() });
  return NextResponse.json({ ok: true, expected: expected.length, missing: n, emailed: true });
}
