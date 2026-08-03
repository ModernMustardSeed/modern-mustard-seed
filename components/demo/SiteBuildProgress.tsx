'use client';

import { useEffect, useState } from 'react';

/**
 * THE WAIT, MADE HONEST AND WORTH SOMETHING.
 *
 * A build takes 30 to 40 minutes and on a busy floor a lead can be several deep
 * in the queue, so the old screen showed a spinner and repeated "within the hour"
 * every twenty seconds for as long as it took. Buyers close that tab.
 *
 * Two changes. First, say the true thing: are we started or waiting, how many are
 * ahead, how long it has been. There is deliberately no invented stage narration
 * ("designing your hero…"), because a fabricated progress story is worse than a
 * spinner: it is a lie the customer can catch by watching the clock.
 *
 * Second, and more useful: they already OWN two finished demos at this moment, and
 * the old screen mentioned neither. The best thing to do with the wait is spend it
 * inside the product.
 */
type Progress = {
  state: 'queued' | 'building' | 'ready' | 'failed';
  ahead?: number;
  elapsedMin?: number;
  typicalMin?: number;
  workerAlive?: boolean;
};

export default function SiteBuildProgress({ siteId }: { siteId: string }) {
  const [p, setP] = useState<Progress | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/demo/site/${siteId}/progress`, { cache: 'no-store' });
        const j = (await res.json()) as Progress;
        if (!alive) return;
        // The moment it lands, show it. This is the payoff of keeping the tab open.
        if (j.state === 'ready') { window.location.reload(); return; }
        setP(j);
      } catch { /* a failed poll is not worth showing anyone */ }
    }
    poll();
    const t = setInterval(poll, 15_000);
    return () => { alive = false; clearInterval(t); };
  }, [siteId]);

  if (!p) return null;

  const elapsed = p.elapsedMin ?? 0;
  const typical = p.typicalMin ?? 40;

  // The bar is capped just under full and never completes on its own, because a
  // bar that sits at 100% while nothing happens is the most annoying lie a
  // loading screen can tell. It reaches the end when the site does.
  const pct = p.state === 'building' ? Math.min(92, Math.round((elapsed / typical) * 92)) : 4;

  let line: string;
  if (p.workerAlive === false) {
    // Never leave someone refreshing all night against a machine that is down.
    line = 'Our build floor is between shifts. Your spot is saved and it starts the moment it is back.';
  } else if (p.state === 'queued') {
    const ahead = p.ahead ?? 0;
    line =
      ahead === 0
        ? 'Yours is next up on the bench.'
        : `There ${ahead === 1 ? 'is 1 build' : `are ${ahead} builds`} ahead of yours. Yours starts as soon as the bench clears.`;
  } else {
    line =
      elapsed < 2
        ? 'Just started. A designer is reading everything you told us.'
        : elapsed > typical
          ? `${elapsed} minutes in. This one is taking the scenic route, which usually means it is a big build.`
          : `${elapsed} minutes in, and these usually take about ${typical}.`;
  }

  return (
    <div className="mt-7">
      <div className="h-1.5 rounded-full bg-[#FBF6EA]/12 overflow-hidden">
        <div
          className="h-full bg-[#F5B700] transition-[width] duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-body text-[13.5px] text-[#FBF6EA]/70 mt-3">{line}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/35 mt-1.5">
        {p.state === 'building' ? 'On the bench now' : 'In the queue'} · this page updates itself
      </p>
    </div>
  );
}
