import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { runBootcampDrip } from '@/lib/bootcamp/drip';
import { ran } from '@/lib/cc-ran';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * THE BOOTCAMP DRIP, hourly at :33.
 *
 * Hourly because the steps are one-hour reminders with six-hour windows
 * (lib/bootcamp/drip.ts): a daily run would miss "we start in an hour" by
 * most of a day. The window, not the schedule, is what stops a letter going
 * twice; the cron just has to show up.
 *
 * FAILS CLOSED on auth, deliberately. This route sends real mail in Sarah's
 * name to people who paid, so a missing CRON_SECRET is a 401, never "run
 * anyway". ?dry=1 with the bearer reports what would send and sends nothing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const dryRun = new URL(req.url).searchParams.get('dry') === '1';

  try {
    const report = await runBootcampDrip(sb, { dryRun });
    if (!dryRun) await ran(sb, 'bootcamp-drip', { scanned: report.scanned, sent: report.sent, skipped: report.skipped });
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('bootcamp drip failed', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
