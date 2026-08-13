import { NextResponse } from 'next/server';
import { runWebsiteAudit } from '@/lib/website-audit';
import { claimDailySpend, clientIp, ipAllowed } from '@/lib/spend-guard';

export const runtime = 'nodejs';
// The model call is 36-43s on a real site; 60 left nothing for a slow one.
export const maxDuration = 120;

/**
 * How many free audits the world gets per day.
 *
 * THIS IS THE MOST EXPENSIVE PUBLIC ENDPOINT IN THE APP and until 2026-08-12 it
 * had no guard of any kind: no email, no throttle, no cap. One POST buys a full
 * opus-5 report at max_tokens 8000, which is roughly a quarter of a dollar, and
 * nothing stopped a loop from placing that order a thousand times.
 *
 * 60 covers a heavy real day of a genuinely popular free tool with room to
 * spare, and bounds the worst case at something in the mid teens of dollars
 * rather than "however long the script ran".
 */
const DAILY_CAP = Number(process.env.WEBSITE_AUDIT_DAILY_CAP || 60);

/** Nobody legitimately audits four sites in an hour from one address. */
const PER_IP_HOURLY = Number(process.env.WEBSITE_AUDIT_IP_HOURLY || 3);

/** Public website-audit endpoint. The engine lives in lib/website-audit so the
 *  in-Tracker audit (admin) can share the exact same scoring. */
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Throttle BEFORE the daily claim: a hammering client should be turned away
  // for free rather than burning the shared allowance it is not entitled to.
  if (!ipAllowed('website-audit', clientIp(req), PER_IP_HOURLY)) {
    return NextResponse.json(
      { error: 'You have run several audits already. Try again in an hour, or email sarah@modernmustardseed.com.' },
      { status: 429 },
    );
  }

  if (!(await claimDailySpend('websiteaudit', DAILY_CAP))) {
    return NextResponse.json(
      { error: 'The audit is at capacity for today. Try again tomorrow, or email sarah@modernmustardseed.com.' },
      { status: 429 },
    );
  }

  const result = await runWebsiteAudit(body.url ?? '');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    url: result.url,
    report: result.report,
    signals_summary: result.signals_summary,
  });
}
