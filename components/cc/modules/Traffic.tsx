'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, CardHead, Empty, ErrorNote, Label, Skeleton, Stat, cx } from '@/components/cc/ui';
import type { Traffic as TrafficData, TrafficRow } from '@/lib/cc-traffic';

/**
 * TRAFFIC. Who came, what they read, where they came from, and how many of
 * them reached out. Counted by the website itself, so there is no outside
 * script on their pages and no cookie banner in front of their customers.
 *
 * The one number an owner should leave with is the last one: visitors who
 * became leads. Everything above it explains that number.
 */

const SPANS: Array<{ days: number; label: string }> = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

function change(now: number, before: number | undefined): string | undefined {
  if (before === undefined) return undefined;
  if (!before) return now ? 'None in the period before' : undefined;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return 'Level with the period before';
  return `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct)}% on the period before`;
}

function Rows({ rows, empty }: { rows: TrafficRow[]; empty: string }) {
  if (!rows.length) return <p className="text-[13px] text-[var(--cc-muted)]">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13.5px] text-[var(--cc-ink)]">{r.label}</span>
            <span className="shrink-0 text-[12.5px] tabular-nums text-[var(--cc-muted)]">
              {r.count} <span aria-hidden="true">·</span> {r.share}%
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--cc-line)]" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--cc-accent)]" style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);

export default function Traffic() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<TrafficData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async (span: number) => {
    setState('loading');
    try {
      const r = await fetch(`/api/cc/traffic?days=${span}`, { cache: 'no-store' });
      const j = (await r.json()) as { traffic: TrafficData | null };
      if (!r.ok || !j.traffic) {
        setState('error');
        return;
      }
      setData(j.traffic);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const picker = (
    <div className="inline-flex rounded-lg border border-[var(--cc-line)] bg-[var(--cc-card)] p-0.5" role="group" aria-label="Period">
      {SPANS.map((s) => (
        <button
          key={s.days}
          type="button"
          onClick={() => setDays(s.days)}
          aria-pressed={days === s.days}
          className={cx(
            'rounded-md px-3 py-1.5 text-[12.5px] font-medium transition',
            days === s.days ? 'bg-[var(--cc-accent)] text-white' : 'text-[var(--cc-muted)] hover:text-[var(--cc-ink)]',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  if (state === 'error') return <ErrorNote onRetry={() => void load(days)}>The visits could not be counted just now.</ErrorNote>;
  if (state === 'loading' || !data) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{picker}</div>
        <Skeleton rows={4} />
      </div>
    );
  }

  const busiest = data.hours.reduce((a, b) => (b.count > a.count ? b : a), data.hours[0]);
  const maxHour = Math.max(1, ...data.hours.map((h) => h.count));
  const rate = data.leads !== null && data.visits ? Math.round((data.leads / data.visits) * 1000) / 10 : null;
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.count));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--cc-muted)]">Counted by your own website. No outside tracker, no cookie banner.</p>
        {picker}
      </div>

      {!data.visits ? (
        <Empty title="No visits in this period" note="Pick a longer period above. The count starts the day the website went up." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat value={data.visits} label="Visits" tone="live" hint={change(data.visits, data.previous?.visits)} />
            <Stat value={data.views} label="Pages opened" hint={change(data.views, data.previous?.views)} />
            <Stat value={data.pagesPerVisit} label="Pages per visit" hint="More than three means they are reading, not bouncing" />
            <Stat
              value={data.leads === null ? 'Not read' : data.leads}
              label="Reached out"
              tone={data.leads ? 'live' : 'plain'}
              hint={rate === null ? undefined : `${rate}% of visits became a lead`}
            />
          </div>

          <Card>
            <CardHead title="Visits by day" hint="One person on one day counts once, however many pages they open." />
            <div className="flex items-end gap-[3px] h-24" role="img" aria-label="Visits by day">
              {data.byDay.map((d) => (
                <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${d.count}`}>
                  <div
                    className={cx('rounded-[3px]', d.count ? 'bg-[var(--cc-accent)]' : 'bg-[var(--cc-line)]')}
                    style={{ height: d.count ? `${Math.max(6, (d.count / maxDay) * 100)}%` : '4px' }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <Label>{data.byDay.length} days ago</Label>
              <Label>Today</Label>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHead title="What they read" hint="Your most opened pages." />
              <Rows rows={data.pages} empty="No pages opened yet." />
            </Card>
            <Card>
              <CardHead title="How they found you" hint="Where each visit started." />
              <Rows rows={data.sources} empty="No visits yet." />
            </Card>
            <Card>
              <CardHead title="Where they are" hint="By the town their connection reports. Rural Montana often reads as Billings." />
              <Rows rows={data.places} empty="No visits yet." />
            </Card>
            <Card>
              <CardHead
                title="When they look"
                hint="Mountain time."
                right={busiest && busiest.count ? <Badge tone="live">Busiest at {hourLabel(busiest.hour)}</Badge> : undefined}
              />
              <div className="flex items-end gap-[2px] h-16" role="img" aria-label="Pages opened by hour of the day">
                {data.hours.map((h) => (
                  <div key={h.hour} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${hourLabel(h.hour)}: ${h.count}`}>
                    <div
                      className={cx('rounded-[2px]', h.count ? 'bg-[var(--cc-accent)]' : 'bg-[var(--cc-line)]')}
                      style={{ height: h.count ? `${Math.max(8, (h.count / maxHour) * 100)}%` : '3px' }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                <Label>Midnight</Label>
                <Label>Noon</Label>
                <Label>11 PM</Label>
              </div>
              <div className="mt-5 border-t border-[var(--cc-line)] pt-4">
                <Label>On what</Label>
                <div className="mt-2">
                  <Rows rows={data.devices} empty="No visits yet." />
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHead title="From your signs and ads" hint="Scans of the codes you made in Website, in this period." />
            <p className="text-[26px] font-semibold leading-none tabular-nums text-[var(--cc-ink)]">{data.scans === null ? 'Not read' : data.scans}</p>
            <p className="mt-2 text-[13px] text-[var(--cc-muted)]">
              Search results from Google join this screen after your domain points at the new site, because Google only reports on the address
              people search for.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
