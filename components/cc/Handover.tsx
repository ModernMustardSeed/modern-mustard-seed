'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, cx } from '@/components/cc/ui';

/**
 * THE HANDOVER, counted down from rows.
 *
 * When a business leaves the agency that was posting for it, there is exactly
 * one date that matters and nobody writes it down: the day the outgoing
 * provider's last scheduled post goes out. After that the feed is ours or it
 * is nothing, and "nothing" is not noticed for three weeks.
 *
 * So this card exists to be seen once and then never again: it appears only
 * when there is a gap between their last post and ours, says the date, says
 * exactly what is missing, and takes the person to the two screens that close
 * it. When everything is covered it disappears.
 */

type Handover = {
  theirLast: string;
  theirName: string | null;
  firstGap: string | null;
  daysAway: number | null;
  mineAhead: number;
  nextOfMine: string | null;
  connected: string[];
  connectable: number;
  posting: boolean;
};

const PROVIDER: Record<string, string> = { 'web-express': 'Web Express', facebook: 'Facebook', instagram: 'Instagram' };
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default function Handover({ go }: { go: (room: string) => void }) {
  const [h, setH] = useState<Handover | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/cc/handover', { cache: 'no-store' });
        const j = (await r.json()) as { handover: Handover | null };
        setH(j.handover);
      } catch {
        setH(null);
      }
    })();
  }, []);

  if (!h || !h.firstGap) return null;

  const who = PROVIDER[h.theirName ?? ''] ?? 'whoever was posting for you';
  const urgent = (h.daysAway ?? 99) <= 10;
  const nothingConnected = h.connected.length === 0;

  return (
    <Card className={cx(urgent ? 'border-[#FDA29B]' : 'border-[#FEDF89]')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge tone="warn">{h.daysAway !== null && h.daysAway >= 0 ? `${h.daysAway} ${h.daysAway === 1 ? 'day' : 'days'} away` : 'Already here'}</Badge>
          <h3 className="mt-2 font-display text-[19px] leading-tight">Your feeds go quiet on {day(h.firstGap)}</h3>
        </div>
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed">
        The last post {who} has scheduled goes out on {day(h.theirLast)}. After that, what appears on your feeds is whatever is on the calendar here.
      </p>

      <ul className="mt-3 space-y-1.5 text-[13.5px]">
        <li>
          <span className={cx('font-semibold', h.mineAhead ? 'text-[#067647]' : 'text-[#B42318]')}>
            {h.mineAhead ? `${h.mineAhead} ${h.mineAhead === 1 ? 'post is' : 'posts are'} on your calendar` : 'Nothing is on your calendar'}
          </span>
          {h.nextOfMine ? `, the next on ${day(h.nextOfMine)}.` : '.'}
        </li>
        <li>
          <span className={cx('font-semibold', nothingConnected ? 'text-[#B42318]' : 'text-[#067647]')}>
            {nothingConnected ? 'No account is connected' : `${h.connected.length} of ${h.connectable} accounts connected`}
          </span>
          {nothingConnected ? ', so a post here would wait for a person rather than going out on its own.' : '.'}
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {nothingConnected && <Button kind="primary" onClick={() => go('accounts')}>Connect where you post</Button>}
        <Button kind={nothingConnected ? 'quiet' : 'primary'} onClick={() => go('marketing')}>Fill the calendar</Button>
      </div>

      <p className="mt-3 text-[12px] text-[var(--cc-muted)]">
        This card is counted from your own rows and disappears on its own once the days after {day(h.theirLast)} are covered.
      </p>
    </Card>
  );
}
