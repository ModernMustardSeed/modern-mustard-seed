'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * THE CLIENT'S LAUNCH LIST, IN THEIR PORTAL.
 *
 * The same runbook Sarah works from, filtered to the steps only the owner can
 * do. Google verifies the person who owns the business, on video, holding their
 * own tools; nobody at a studio can do that for them, and pretending otherwise
 * is how a launch sits at ninety percent for a month.
 *
 * So this screen is honest about the split: their steps are the whole list, our
 * progress is one line at the bottom, and neither is a separate document that
 * can drift from the other.
 */

type Item = {
  id: string;
  what: string;
  how: string | null;
  href: string | null;
  label: string | null;
  done: boolean;
  doneAt: string | null;
};
type Group = { name: string; note?: string | null; items: Item[] };
type Launch = {
  title: string;
  siteUrl: string | null;
  updatedAt: string;
  groups: Group[];
  overall: { done: number; total: number };
};

export default function LaunchRunbook() {
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/launch', { cache: 'no-store' }).then((x) => x.json());
      setLaunch(r?.launch ?? null);
    } catch {
      setLaunch(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (item: Item) => {
      if (!launch) return;
      const next = !item.done;
      setBusy(item.id);
      setError('');
      /* Optimistic, then reconciled. Ticking a step on a phone in a driveway
         should feel instant even on two bars. */
      setLaunch((l) =>
        l
          ? {
              ...l,
              groups: l.groups.map((g) => ({
                ...g,
                items: g.items.map((i) => (i.id === item.id ? { ...i, done: next } : i)),
              })),
              overall: { ...l.overall, done: l.overall.done + (next ? 1 : -1) },
            }
          : l,
      );
      try {
        const res = await fetch('/api/portal/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, done: next }),
        }).then((x) => x.json());
        if (res?.error) throw new Error(res.error);
      } catch {
        setError('That did not save. Try it again in a moment.');
        void load();
      } finally {
        setBusy(null);
      }
    },
    [launch, load],
  );

  if (!loaded || !launch) return null;

  const mine = launch.groups.flatMap((g) => g.items);
  const mineDone = mine.filter((i) => i.done).length;
  const pct = mine.length ? Math.round((mineDone / mine.length) * 100) : 0;
  const allDone = mine.length > 0 && mineDone === mine.length;

  return (
    <section className="border-2 border-[#161616] bg-white p-6 shadow-[4px_4px_0_0_#161616] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#C4160B]">Your launch</p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {allDone ? 'You have done your part.' : 'The steps only you can do'}
          </h2>
          <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-[#161616]/70">
            Google verifies the person who owns the business, so these belong to you. We cannot do them
            on your behalf and neither can anybody else. Everything else on the launch is ours and it is
            already moving.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-4xl font-bold leading-none">
            {mineDone}
            <span className="text-[#161616]/35">/{mine.length}</span>
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#161616]/55">Yours done</p>
        </div>
      </div>

      <div className="mt-5 h-3 w-full border-2 border-[#161616] bg-[#FBF6EA]">
        <div
          className="h-full bg-[#F5B700] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Your launch steps"
        />
      </div>

      {error && (
        <p className="mt-4 border-2 border-[#C4160B] bg-[#C4160B]/10 px-4 py-3 text-[14px] font-semibold text-[#C4160B]">
          {error}
        </p>
      )}

      {launch.groups.map((g) => (
        <div key={g.name} className="mt-7">
          <h3 className="font-display text-lg font-bold">{g.name.replace(/^\d+\s*·\s*/, '')}</h3>
          {g.note && <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-[#161616]/60">{g.note}</p>}

          <ul className="mt-4 space-y-3">
            {g.items.map((i) => (
              <li
                key={i.id}
                className={`border-2 p-4 transition-colors ${
                  i.done ? 'border-[#161616]/20 bg-[#FBF6EA]' : 'border-[#161616] bg-white'
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={i.done}
                    disabled={busy === i.id}
                    onChange={() => void toggle(i)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#F5B700]"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block font-semibold leading-snug ${
                        i.done ? 'text-[#161616]/45 line-through' : 'text-[#161616]'
                      }`}
                    >
                      {i.what}
                    </span>
                    {i.how && (
                      <span className="mt-1.5 block text-[14px] leading-relaxed text-[#161616]/70">{i.how}</span>
                    )}
                    {i.href && (
                      <a
                        href={i.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-block font-mono text-[12px] text-[#1E50C8] underline underline-offset-4"
                      >
                        {i.label || i.href}
                      </a>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="mt-7 border-t-2 border-[#161616]/10 pt-4 font-mono text-[12px] text-[#161616]/55">
        Across the whole launch, ours and yours, {launch.overall.done} of {launch.overall.total} steps are
        done.
      </p>
    </section>
  );
}
