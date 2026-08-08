import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { hundredfoldDrip } from '@/lib/hundredfold-drip';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * THE HUNDREDFOLD DRIP, daily on weekdays.
 *
 * Two sequences in one pass: roadmap takers who did not come back, and people
 * who finished Mr. Mustard's interview and did not join. Both are written from
 * the document the engine already produced for that person, and both refuse to
 * send when there is nothing personal to say (lib/hundredfold-drip.ts).
 *
 * ⚠️ FAILS CLOSED on auth, deliberately. This route sends real mail to real
 * prospects in Sarah's name, so an open caller here is a stranger writing to
 * our warm list. Missing CRON_SECRET means 401, not "run anyway"
 * (mms-cron-secret: Vercel only attaches the bearer if the var exists, and it
 * does exist in production).
 *
 * ?dry=1 with the bearer reports what WOULD send and sends nothing.
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
    const report = await hundredfoldDrip(sb, { dryRun });
    return NextResponse.json({ ok: true, dryRun, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('hundredfold drip failed', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
