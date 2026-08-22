'use client';

/**
 * A POLL THAT SLEEPS WHEN NOBODY IS LOOKING.
 *
 * The admin is a wall of live panels, and every one of them used to hold a bare
 * `setInterval` that kept hitting the database for as long as the tab existed.
 * A single Command Center tab left open in a background window overnight is
 * thousands of queries and gigabytes of egress against a database that has real
 * work to do. On 2026-08-21 that steady background load, stacked on the cron
 * sweep, took production Postgres down and emptied every screen in the admin.
 *
 * So polling now has one rule: a hidden tab does not poll. The timer keeps
 * running, it just declines to do the work while `document.hidden` is true, and
 * the moment the tab comes back it refreshes immediately so what Sarah sees is
 * never stale. Nothing about the live feel of a visible panel changes.
 *
 * `enabled: false` removes the timer entirely, which is how a panel with no run
 * in flight stops asking whether the run it does not have has finished.
 */

import { useEffect, useRef } from 'react';

export type PollOptions = {
  /** Set false to stop polling entirely (no timer, no listener). Default true. */
  enabled?: boolean;
  /** Run once on mount, before the first interval elapses. Default false. */
  leading?: boolean;
};

export function usePoll(fn: () => void | Promise<void>, everyMs: number, opts: PollOptions = {}): void {
  const { enabled = true, leading = false } = opts;

  // The callback lives in a ref so callers do not have to memoise it to avoid
  // tearing the timer down and rebuilding it on every render.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || everyMs <= 0) return;

    const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const run = () => {
      try {
        void fnRef.current();
      } catch {
        // A throwing poll must not kill the interval; the panel shows its own error.
      }
    };

    if (leading && !hidden()) run();

    let timer = window.setInterval(() => {
      if (hidden()) return;
      run();
    }, everyMs);

    // Coming back to the tab is the one moment stale data is most visible, so
    // refresh right then and restart the interval from that point rather than
    // firing again a few milliseconds later on the old schedule.
    const onVisible = () => {
      if (hidden()) return;
      run();
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (hidden()) return;
        run();
      }, everyMs);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, everyMs, leading]);
}
