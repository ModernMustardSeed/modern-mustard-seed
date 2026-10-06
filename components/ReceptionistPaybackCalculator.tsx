'use client';

import { useId, useState } from 'react';

/**
 * Payback calculator for /ai-receptionist-cost. Every field starts empty: the
 * visitor's own numbers go in, nothing is guessed for them. Plain math, no
 * dependencies.
 */

const WEEKS_PER_MONTH = 52 / 12;

function num(v: string): number | null {
  const n = Number(v.replace(/[$,%\s]/g, ''));
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ReceptionistPaybackCalculator() {
  const id = useId();
  const [missed, setMissed] = useState('');
  const [jobValue, setJobValue] = useState('');
  const [closeRate, setCloseRate] = useState('');
  const [cost, setCost] = useState('');

  const m = num(missed);
  const j = num(jobValue);
  const c = num(closeRate);
  const k = num(cost);
  const ready = m !== null && j !== null && c !== null && k !== null && c <= 100;

  const recovered = ready ? m * WEEKS_PER_MONTH * (c / 100) * j : 0;
  const paybackDays = ready && recovered > 0 ? (k / recovered) * 30 : null;

  const field = 'w-full rounded-xl border-2 border-[#0b3b44] bg-white px-4 py-3 font-body text-base text-[#0b3b44] focus:outline-none focus:ring-4 focus:ring-[#f5b700]/60';
  const label = 'block text-[11px] uppercase tracking-[0.25em] font-mono font-bold text-[#0a7c78] mb-2';

  return (
    <div className="pop-card p-6 md:p-9">
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-5" onSubmit={(e) => e.preventDefault()} aria-describedby={`${id}-out`}>
        <div>
          <label htmlFor={`${id}-missed`} className={label}>Missed calls a week</label>
          <input id={`${id}-missed`} inputMode="decimal" className={field} placeholder="Your number" value={missed} onChange={(e) => setMissed(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-job`} className={label}>Average job value ($)</label>
          <input id={`${id}-job`} inputMode="decimal" className={field} placeholder="Your number" value={jobValue} onChange={(e) => setJobValue(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-close`} className={label}>Calls that become jobs (%)</label>
          <input id={`${id}-close`} inputMode="decimal" className={field} placeholder="Your number" value={closeRate} onChange={(e) => setCloseRate(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-cost`} className={label}>Receptionist cost a month ($)</label>
          <input id={`${id}-cost`} inputMode="decimal" className={field} placeholder="From the table above" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
      </form>

      <div id={`${id}-out`} aria-live="polite" className="mt-7 rounded-2xl bg-[#0b3b44] text-[#fbf5ea] p-6">
        {!ready ? (
          <p className="font-body text-sm md:text-base leading-7">
            Enter all four numbers to see what answered calls are worth and how fast the receptionist pays for itself.
            {c !== null && c > 100 ? ' The close rate must be 100 or less.' : ''}
          </p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#f5b700]">Recovered revenue a month</dt>
              <dd className="font-display text-3xl font-black mt-1">{money(recovered)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#f5b700]">Payback</dt>
              <dd className="font-display text-3xl font-black mt-1">
                {paybackDays === null ? 'No payback at these numbers' : paybackDays < 1 ? 'Under a day' : `${Math.ceil(paybackDays)} days`}
              </dd>
            </div>
          </dl>
        )}
      </div>
      <p className="mt-4 text-xs text-[#0b3b44]/70 font-body leading-6">
        Assumes each missed call would have been answered and that a month has {WEEKS_PER_MONTH.toFixed(2)} weeks. Your own records give the truest inputs.
      </p>
    </div>
  );
}
