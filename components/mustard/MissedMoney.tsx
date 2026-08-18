'use client';

import { useMemo, useState } from 'react';

/**
 * THE ARITHMETIC, ON THE PAGE, WITH THE ASSUMPTIONS SHOWING.
 *
 * Sarah, 2026-08-18: "maybe add small calculator on page too so they can see
 * the math?"
 *
 * ⚠️ THIS IS NOT THE LEAD MAGNET. components/MissedCallCalculator.tsx does the
 * same sum on /voice-agents and then asks for an email to show the result. Here
 * that would be a second form competing with the one thing this page exists to
 * do, so this one asks for nothing, gates nothing, and just answers.
 *
 * The formula is deliberately identical to that component (4.33 weeks a month,
 * close rate applied to recovered calls) so the two pages can never quote a
 * different number for the same inputs. If one changes, change both.
 *
 * The defaults are conservative on purpose. Ten missed calls a week and a 35%
 * close rate are numbers a skeptical contractor will accept without argument,
 * and the point lands harder when the inputs are modest than when they are
 * flattering.
 */

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );

type Props = {
  /** The bundle's monthly price, passed in so it derives from lib/demo-order. */
  monthlyPrice: string;
};

export default function MissedMoney({ monthlyPrice }: Props) {
  const [missedPerWeek, setMissed] = useState(10);
  const [avgValue, setAvgValue] = useState(500);
  const [closeRate, setCloseRate] = useState(35);

  const { monthly, annual } = useMemo(() => {
    const recovered = missedPerWeek * 4.33 * (closeRate / 100);
    const monthly = recovered * avgValue;
    return { monthly, annual: monthly * 12 };
  }, [missedPerWeek, avgValue, closeRate]);

  const rows: { label: string; value: number; min: number; max: number; step: number; set: (n: number) => void; fmt: (n: number) => string }[] = [
    { label: 'Calls you miss in a week', value: missedPerWeek, min: 1, max: 60, step: 1, set: setMissed, fmt: (n) => String(n) },
    { label: 'What an average job is worth', value: avgValue, min: 100, max: 5000, step: 50, set: setAvgValue, fmt: usd },
    { label: 'How many of those you would close', value: closeRate, min: 5, max: 90, step: 5, set: setCloseRate, fmt: (n) => `${n}%` },
  ];

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[6px_6px_0_0_#161616] sm:p-8">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">Do the math yourself</p>
      <h3 className="mt-3 font-display text-[1.7rem] sm:text-[2.1rem] font-extrabold leading-tight tracking-tight">
        What the missed ones are <span className="italic">costing</span>
      </h3>

      <div className="mt-6 space-y-5">
        {rows.map((r) => (
          <label key={r.label} className="block">
            <span className="flex items-baseline justify-between gap-4">
              <span className="text-[14.5px] font-semibold text-[#161616]/75">{r.label}</span>
              <span className="font-mono text-[16px] font-bold tabular-nums text-[#161616]">{r.fmt(r.value)}</span>
            </span>
            <input
              type="range"
              min={r.min}
              max={r.max}
              step={r.step}
              value={r.value}
              onChange={(e) => r.set(Number(e.target.value))}
              className="mt-2 w-full accent-[#F5B700]"
            />
          </label>
        ))}
      </div>

      <div className="mt-7 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-5 py-5 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#161616]/60">
          Walking out the door
        </p>
        <p className="mt-1 font-display text-[2.6rem] sm:text-[3.2rem] font-extrabold leading-none tracking-tight tabular-nums">
          {usd(monthly)}
        </p>
        <p className="mt-1 text-[14px] font-semibold text-[#161616]/75">a month, or {usd(annual)} a year</p>
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-[#161616]/60">
        Your numbers, not ours. Move the sliders until they look like your week. He costs {monthlyPrice} a month and
        answers every one of those calls.
      </p>
    </div>
  );
}
