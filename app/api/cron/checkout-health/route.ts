/**
 * Money-path watchdog endpoint. All logic lives in lib/checkout-health.ts; this
 * is the bearer check and the status mapping.
 *
 * Cadence comes from GitHub Actions every ~15 min (MMS Vercel is Hobby, so its
 * crons are daily-only), see .github/workflows/checkout-health.yml.
 *   - 500 = a paid funnel is really broken, or Stripe has been unverifiable for
 *     several runs. The run also goes red in the Actions tab, and Sarah is paged.
 *   - 200 with `inconclusive > 0` = Stripe throttled us this run. Nothing is
 *     known to be broken; the streak is what escalates if it keeps up.
 * `?selftest=1` (bearer-only) fires a synthetic failure to verify alerting.
 */

import { NextResponse } from 'next/server';
import { runCheckoutHealth } from '@/lib/checkout-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const selftest = new URL(req.url).searchParams.get('selftest') === '1';
  const report = await runCheckoutHealth({ selftest });

  return NextResponse.json(
    {
      ok: report.ok,
      failed: report.failed,
      inconclusive: report.inconclusive,
      transient_streak: report.transientStreak,
      escalated: report.escalated,
      checks: report.checks,
    },
    { status: report.down ? 500 : 200 },
  );
}
