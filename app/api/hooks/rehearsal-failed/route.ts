import { NextResponse } from 'next/server';
import { sendViaResend } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';

/**
 * THE REHEARSAL'S PANIC BUTTON (loop audit, break under #9, 2026-08-20).
 *
 * The nightly funnel rehearsal exists to prove the funnel works, and until
 * now a red run reached Sarah only as a GitHub Actions email she may or may
 * not have enabled. The workflow's failure step now knocks here, and this
 * pages through the same transport as the checkout-health watchdog.
 * Bearer CRON_SECRET, fails closed.
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { runUrl?: string; detail?: string };
  const sent = await sendViaResend({
    from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
    to: OWNER_NOTIFY_TO,
    subject: 'URGENT: the nightly funnel rehearsal FAILED',
    text:
      `The 6am rehearsal that proves the /demos funnel works came back red. A customer could be finding the break right now.\n\n` +
      (body.runUrl ? `Run: ${body.runUrl}\n` : '') +
      (body.detail ? `Detail: ${String(body.detail).slice(0, 500)}\n` : '') +
      `\nCheck the Actions log, then the build worker and the demo station.`,
  });
  return NextResponse.json({ ok: sent.ok });
}
