import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { celebrateDrip } from '@/lib/celebrate-drip';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * THE CELEBRATE PRE-LAUNCH DRIP, daily.
 *
 * Runs every day rather than on weekdays because the schedule is anchored to
 * days to launch (lib/celebrate-drip.ts), and opening day does not care what
 * day of the week it lands on. The spacing floor inside the drip, not the cron
 * schedule, is what stops anyone hearing from us twice in three days.
 *
 * ⚠️ FAILS CLOSED on auth, deliberately. This route sends real mail in Sarah's
 * name to a warm list, so a missing CRON_SECRET is a 401, never "run anyway".
 *
 * ?dry=1 with the bearer reports exactly what would send and sends nothing.
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
    const report = await celebrateDrip(sb, { dryRun });
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('celebrate drip failed', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
