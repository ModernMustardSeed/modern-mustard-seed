'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, CardHead, Skeleton, cx } from '@/components/cc/ui';

/**
 * CAN WE POUR THURSDAY.
 *
 * Not a weather widget. A builder can see the sky. This answers the three
 * questions that actually move a week in the Flathead: concrete, dirt, and
 * roof, each with the reason underneath, because a red day that does not
 * explain itself gets ignored the second time.
 *
 * The first freeze is called out on its own. In Montana that date ends the
 * season for flatwork, and knowing it is coming ten days out is the
 * difference between finishing a driveway and waiting until April.
 */

type Verdict = { ok: boolean; why: string };
type Day = {
  date: string;
  label: string;
  high: number | null;
  low: number | null;
  windMph: number | null;
  precipPercent: number | null;
  sky: string;
  concrete: Verdict;
  dirt: Verdict;
  roof: Verdict;
};
type Week = { place: string; days: Day[]; firstFreeze: { date: string; low: number } | null; source: string };

const Mark = ({ v, label }: { v: Verdict; label: string }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', v.ok ? 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]' : 'border-[#FDA29B] bg-[#FFFBFA] text-[#B42318]')} title={v.why}>
    {v.ok ? '✓' : '✕'} {label}
  </span>
);

export default function BuildWeek() {
  const [week, setWeek] = useState<Week | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/cc/weather', { cache: 'no-store' });
        const j = (await r.json()) as { week?: Week | null };
        setWeek(j.week ?? null);
      } catch {
        setWeek(null);
      }
    })();
  }, []);

  if (week === undefined) {
    return (
      <Card>
        <CardHead title="The build week" />
        <Skeleton rows={3} />
      </Card>
    );
  }
  if (week === null) return null;

  return (
    <Card>
      <CardHead
        title="The build week"
        hint={`Concrete, dirt and roof for ${week.place}. Press a day for the reason.`}
        right={week.firstFreeze ? <Badge tone="warn">First freeze {new Date(`${week.firstFreeze.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, {week.firstFreeze.low}F</Badge> : undefined}
      />
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {week.days.map((d) => {
          const bad = [d.concrete, d.dirt, d.roof].filter((v) => !v.ok).length;
          return (
            <button
              key={d.date}
              onClick={() => setOpen(open === d.date ? null : d.date)}
              className={cx(
                'min-w-[150px] flex-1 rounded-xl border px-3 py-3 text-left transition',
                open === d.date ? 'border-[var(--cc-ink)]' : bad === 3 ? 'border-[#FDA29B]' : 'border-[var(--cc-line)] hover:border-[var(--cc-ink)]',
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">{d.label}</p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums">
                {d.high ?? '–'}
                <span className="text-[13px] text-[var(--cc-muted)]"> / {d.low ?? '–'}</span>
              </p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--cc-muted)]">{d.sky}</p>
              <span className="mt-2 flex flex-wrap gap-1">
                <Mark v={d.concrete} label="Pour" />
                <Mark v={d.dirt} label="Dirt" />
                <Mark v={d.roof} label="Roof" />
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="mt-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
          {week.days
            .filter((d) => d.date === open)
            .map((d) => (
              <div key={d.date} className="space-y-1.5 text-[13px]">
                <p className="font-semibold">{d.label}</p>
                <p><span className="font-semibold">Concrete:</span> {d.concrete.why}</p>
                <p><span className="font-semibold">Dirt:</span> {d.dirt.why}</p>
                <p><span className="font-semibold">Roof:</span> {d.roof.why}</p>
              </div>
            ))}
        </div>
      )}

      <p className="mt-3 text-[11.5px] text-[var(--cc-muted)]">
        Forecast from the {week.source}. The calls are ACI cold weather practice: concrete wants 40F and rising and a night above freezing after it, ground goes hard on the third freezing night, and nobody handles sheet material above 25 mph.
      </p>
    </Card>
  );
}
