import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { runBootcampOutreach } from '@/lib/bootcamp/outreach';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * THE HOST OUTREACH, weekday mornings (vercel.json: 38 15 * * 1-5, 8:38 AM
 * Mountain). One letter per audience owner per run, twelve at most, from
 * Sarah's own address, and only while the switch on the desk says armed.
 * The engine and its rules live in lib/bootcamp/outreach.ts; this route is
 * the door the scheduler knocks on.
 *
 * FAILS CLOSED on auth, deliberately. This sends real mail in Sarah's name to
 * people she wants as partners, so a missing CRON_SECRET is a 401, never
 * "run anyway".
 *
 * ?dry=1 with the bearer reports exactly who would get which letter and
 * changes nothing: no sends, no status flips, no hand pass.
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
    const report = await runBootcampOutreach(sb, { dryRun });
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('bootcamp outreach failed', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
