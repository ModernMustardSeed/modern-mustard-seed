'use client';

import { useEffect, useRef, useState } from 'react';
import { sidekickTiers, sidekickUsd } from '@/data/sidekick';

/**
 * The trade page's interactive moment: the visitor's own missed-call math.
 * Monthly leak = missed calls/week x 4.3 weeks x close rate x average ticket.
 * Pure client state, no network, no deps. Sample defaults come from the
 * trade preset and are labeled as editable assumptions, never as claims.
 *
 * The price is DERIVED from sidekickTiers, never typed here. This page once
 * carried a hardcoded $197 while Stripe charged $297 (fixed 2026-07-20); a
 * quoted price that does not come from the tier table is a revenue bug.
 */
const ENTRY_MONTHLY = sidekickUsd(sidekickTiers[0].monthlyCents);
export default function MissedCallMath({
  avgTicket,
  ticketWord,
}: {
  avgTicket: number;
  ticketWord: string;
}) {
  const [missed, setMissed] = useState(7);
  const [closeRate, setCloseRate] = useState(30);
  const [ticket, setTicket] = useState(avgTicket);

  const leak = Math.round(missed * 4.3 * (closeRate / 100) * ticket);

  // Count-up that respects reduced motion and re-runs when the number changes.
  const [shown, setShown] = useState(leak);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(leak);
      return;
    }
    const from = shown;
    const start = performance.now();
    const dur = 500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (leak - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leak]);

  const sliderCls =
    'w-full accent-[#F5B700] h-2 cursor-pointer';
  const labelCls = 'font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-[#8f6600]';

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] overflow-hidden">
      <div className="grid md:grid-cols-2">
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <span className={labelCls}>Calls Missed Per Week</span>
              <span className="font-mono font-bold text-[#161616]">{missed}</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              value={missed}
              onChange={(e) => setMissed(Number(e.target.value))}
              className={sliderCls}
              aria-label="Calls missed per week"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <span className={labelCls}>Close Rate</span>
              <span className="font-mono font-bold text-[#161616]">{closeRate}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={90}
              step={5}
              value={closeRate}
              onChange={(e) => setCloseRate(Number(e.target.value))}
              className={sliderCls}
              aria-label="Close rate percent"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <span className={labelCls}>Average {ticketWord.charAt(0).toUpperCase() + ticketWord.slice(1)}</span>
              <span className="font-mono font-bold text-[#161616]">${ticket.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={50}
              max={Math.max(40000, avgTicket * 2)}
              step={50}
              value={ticket}
              onChange={(e) => setTicket(Number(e.target.value))}
              className={sliderCls}
              aria-label={`Average ${ticketWord} value`}
            />
            <p className="mt-2 font-body text-xs text-[#5c554a]">
              Starts at a sample industry figure. Drag it to your real number.
            </p>
          </div>
        </div>
        <div className="bg-[#161616] p-6 md:p-8 flex flex-col justify-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#F5B700]">
            Walking Out The Door Every Month
          </p>
          <p className="mt-3 font-display font-extrabold text-5xl md:text-6xl text-[#FBF6EA] tabular-nums">
            ${shown.toLocaleString()}
          </p>
          <p className="mt-4 font-body text-sm text-[#FBF6EA]/75 leading-relaxed">
            Your numbers, your math: {missed} missed calls a week, a {closeRate}% close rate, and a $
            {ticket.toLocaleString()} average {ticketWord}. The receptionist answers every one of those calls for
            ${ENTRY_MONTHLY} a month.
          </p>
        </div>
      </div>
    </div>
  );
}
