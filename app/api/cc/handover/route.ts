import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { accountViews } from '@/lib/posting/accounts';
import { getSettings } from '@/lib/posting/settings';
import { addDays, mountainDate } from '@/lib/posting/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE DAY THE FEEDS GO QUIET.
 *
 * A business leaving an agency has one date that matters and nobody writes it
 * down: the day the outgoing provider's last scheduled post goes out. Before
 * it, two people are posting. After it, either we are or nobody is. The
 * failure mode is not dramatic. The feed simply stops, and it is noticed three
 * weeks later by the owner, on a Sunday, in a bad mood.
 *
 * So this works the date out from rows rather than waiting for somebody to
 * remember it: the last thing the old provider has scheduled, the last thing
 * on our own calendar, and whether a single account is connected to post
 * through. If there is a gap between those, it is the only thing that matters
 * on this screen.
 *
 * It says nothing at all when there is no outgoing provider and nothing to
 * hand over, which is most clients most of the time.
 */
export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  const email = account.clientEmail;
  const today = mountainDate();

  const [archive, ours, accounts, settings] = await Promise.all([
    sb
      .from('client_archive_posts')
      .select('origin, status, posted_at')
      .eq('client_email', email)
      .eq('status', 'scheduled')
      .order('posted_at', { ascending: false })
      .limit(1)
      .then((r) => r, () => ({ data: [] })),
    sb
      .from('posting_posts')
      .select('scheduled_for, status')
      .eq('client_email', email)
      .gte('scheduled_for', today)
      .neq('status', 'skipped')
      .order('scheduled_for', { ascending: true })
      .limit(60)
      .then((r) => r, () => ({ data: [] })),
    accountViews(sb, email).catch(() => []),
    getSettings(sb, email).catch(() => null),
  ]);

  const theirLast = ((archive.data ?? [])[0]?.posted_at as string | undefined)?.slice(0, 10) ?? null;
  const theirName = ((archive.data ?? [])[0]?.origin as string | undefined) ?? null;
  const mine = ((ours.data ?? []) as Array<{ scheduled_for: string }>).map((r) => r.scheduled_for).sort();
  const covered = new Set(mine);

  // Where a feed can actually post itself, rather than waiting for a person.
  const byApi = accounts.filter((a) => !a.manualOnly);
  const connected = byApi.filter((a) => a.connected).map((a) => a.provider);

  // The first day after the old provider stops that nothing of ours covers.
  let firstGap: string | null = null;
  if (theirLast) {
    for (let i = 1; i <= 21; i++) {
      const day = addDays(theirLast, i);
      if (!covered.has(day)) {
        firstGap = day;
        break;
      }
    }
  }

  const daysAway = firstGap ? Math.round((Date.parse(`${firstGap}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000) : null;

  return NextResponse.json({
    handover: theirLast
      ? {
          theirLast,
          theirName,
          firstGap,
          daysAway,
          mineAhead: mine.length,
          nextOfMine: mine[0] ?? null,
          connected,
          connectable: byApi.length,
          posting: Boolean(settings?.visible && settings?.active),
        }
      : null,
  });
}
