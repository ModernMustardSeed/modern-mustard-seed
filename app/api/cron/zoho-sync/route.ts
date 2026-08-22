import { NextResponse } from 'next/server';
import { syncAllMailboxes } from '@/lib/zoho-inbox';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Roll per-mailbox results into the original SyncResult shape, keeping the reason. */
function aggregate(mailboxes: Awaited<ReturnType<typeof syncAllMailboxes>>['mailboxes']) {
  const ok = mailboxes.some((r) => r.ok);
  const agg = mailboxes.reduce(
    (a, r) => ({ fetched: a.fetched + r.fetched, inserted: a.inserted + r.inserted, matched: a.matched + r.matched, threaded: a.threaded + r.threaded }),
    { fetched: 0, inserted: 0, matched: 0, threaded: 0 }
  );
  const bad = mailboxes.find((r) => !r.ok);
  return {
    ok,
    ...agg,
    error: mailboxes.length === 0 ? 'No mailboxes configured' : bad?.error,
    detail: bad?.detail,
    fix: bad?.fix,
    authFailed: bad?.authFailed,
  };
}

/**
 * Pulls new lead replies from Sarah's Zoho inbox into the correspondence log.
 * Pinged by a GitHub Actions schedule (.github/workflows/zoho-sync.yml) because
 * the MMS Vercel project is on Hobby (Vercel cron is daily-only there). Optional
 * Bearer CRON_SECRET. No-ops cleanly when Zoho IMAP is unconfigured.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { mailboxes } = await syncAllMailboxes({ sinceDays: 7 });
  const res = aggregate(mailboxes);
  return NextResponse.json({ ...res, mailboxes }, { status: res.ok ? 200 : 500 });
}
