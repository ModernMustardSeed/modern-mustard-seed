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
 *
 * ── THIS IS NOW A LATENCY-CRITICAL PATH ──────────────────────────────────────
 * Since lib/acq/build-ask.ts, a reply saying "yes, build it" starts the build.
 * Nothing happens until this route runs, so however long this takes to fire is
 * how long a prospect who just said yes sits waiting.
 *
 * It ran ONLY from .github/workflows/zoho-sync.yml, which asks for every 15
 * minutes and does not get it: GitHub's scheduled runs are best-effort and
 * under load they slip badly. Four consecutive real runs on 2026-09-04 landed
 * at 01:57, 06:52, 11:52 and 15:24, which is roughly every four hours, not
 * every fifteen minutes. That was acceptable when this only filed mail for
 * later reading, and is not acceptable now that it gates a build.
 *
 * So it is a Vercel cron as well (vercel.json, four times an hour on a clock
 * that actually keeps time). The Actions workflow stays as a free fallback for
 * when Vercel is having a bad day; syncMailbox takes a lock and the workflow
 * has a concurrency group, so the two overlapping is safe rather than double.
 *
 * Optional Bearer CRON_SECRET, which Vercel sends automatically when the env
 * var is set. No-ops cleanly when Zoho IMAP is unconfigured.
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
