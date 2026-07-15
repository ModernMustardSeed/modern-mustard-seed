'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { quoteFor, usd } from '@/data/switchboard';

/**
 * The Switchboard's signature moment AND its lead magnet: paste a franchise name
 * and location count, watch a live Command Board populate with a projected
 * recovered-revenue figure and the exact per-location quote, then capture the
 * lead. The projection is transparent (missed after-hours calls x close rate x
 * average ticket) and clearly labelled an estimate.
 */

const MISSED_PER_LOC_MO = 22; // conservative after-hours missed calls per location / month
const CLOSE_RATE = 0.3; // of recovered calls that become a booking
const MAX_TILES = 60;

// Deterministic heat so server and client render the same tiles (no hydration drift).
function heatFor(i: number): 0 | 1 | 2 | 3 {
  const v = (i * 37 + 11) % 100;
  if (v > 78) return 3;
  if (v > 52) return 2;
  if (v > 26) return 1;
  return 0;
}

function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    const delta = target - start;
    if (delta === 0) return;
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

export default function CommandBoard() {
  const [name, setName] = useState('');
  const [locations, setLocations] = useState(12);
  const [ticket, setTicket] = useState(320);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  const quote = useMemo(() => quoteFor(locations), [locations]);
  const recoveredMonthly = Math.round(locations * MISSED_PER_LOC_MO * CLOSE_RATE * ticket);
  const shownRecovered = useCountUp(recoveredMonthly);

  const tiles = Math.min(locations, MAX_TILES);
  const overflow = Math.max(0, locations - MAX_TILES);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMsg(null);
    trackEvent('switchboard_projection', { locations, ticket });
    try {
      const res = await fetch('/api/switchboard/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, business: name, locations, ticket, recoveredMonthly, monthlyUsd: quote.monthlyUsd }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('done');
        setMsg(data.message || 'Your projection is on its way.');
      } else {
        setState('error');
        setMsg(data.error === 'invalid_email' ? 'That email looks off. Mind checking it?' : 'Something hiccuped. Try again.');
      }
    } catch {
      setState('error');
      setMsg('Something hiccuped. Try again.');
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-[#080C16] text-[#FBF6EA] p-5 md:p-8 shadow-[8px_8px_0_0_#F5B700]">
      {/* Inputs */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5B700]/80 block mb-1.5">Your brand</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sunrise Plumbing"
            className="w-full rounded-lg border-2 border-[#FBF6EA]/25 bg-[#0f1626] px-3 py-2.5 text-[#FBF6EA] placeholder-[#FBF6EA]/35 focus:outline-none focus:border-[#F5B700]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5B700]/80 block mb-1.5">Locations</span>
          <input
            type="number"
            min={1}
            max={9999}
            value={locations}
            onChange={(e) => setLocations(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border-2 border-[#FBF6EA]/25 bg-[#0f1626] px-3 py-2.5 text-[#FBF6EA] font-mono focus:outline-none focus:border-[#F5B700]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5B700]/80 block mb-1.5">Avg. job / ticket</span>
          <input
            type="number"
            min={20}
            step={10}
            value={ticket}
            onChange={(e) => setTicket(Math.max(20, Number(e.target.value) || 20))}
            className="w-full rounded-lg border-2 border-[#FBF6EA]/25 bg-[#0f1626] px-3 py-2.5 text-[#FBF6EA] font-mono focus:outline-none focus:border-[#F5B700]"
          />
        </label>
      </div>

      {/* The board */}
      <div className="grid md:grid-cols-[1.3fr_1fr] gap-6 items-start">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F5B700] font-bold">
            Projected revenue recovered · {locations} location{locations === 1 ? '' : 's'} · per month
          </p>
          <p className="font-display font-extrabold text-white leading-none mt-2 tabular-nums" style={{ fontSize: 'clamp(2.4rem,7vw,3.8rem)' }}>
            {usd(shownRecovered)}
          </p>
          <p className="text-[#FBF6EA]/55 text-sm mt-1.5">
            {(locations * MISSED_PER_LOC_MO).toLocaleString()} after-hours calls answered a month, {Math.round(locations * MISSED_PER_LOC_MO * CLOSE_RATE).toLocaleString()} booked at {usd(ticket)} each. Estimate.
          </p>

          {/* heatmap */}
          <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))' }}>
            {Array.from({ length: tiles }).map((_, i) => {
              const h = heatFor(i);
              const bg = h === 3 ? '#F5B700' : h === 2 ? 'rgba(245,183,0,.55)' : h === 1 ? 'rgba(245,183,0,.28)' : 'rgba(245,183,0,.10)';
              return (
                <div
                  key={i}
                  title={`Location ${i + 1}`}
                  className="aspect-square rounded-[5px] border border-[#FBF6EA]/10 grid place-items-center font-mono text-[9px]"
                  style={{ background: bg, color: h === 3 ? '#161616' : 'rgba(251,246,234,.7)', fontWeight: h === 3 ? 700 : 400 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
              );
            })}
            {overflow > 0 && (
              <div className="aspect-square rounded-[5px] border border-[#FBF6EA]/10 grid place-items-center font-mono text-[9px] text-[#FBF6EA]/60">
                +{overflow}
              </div>
            )}
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#FBF6EA]/40 mt-2">Every location, one glance · gold = hot</p>
        </div>

        {/* the quote */}
        <div className="rounded-xl border border-[#F5B700]/30 bg-[#0f1626] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#F5B700] font-bold">Your Switchboard</p>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-[#FBF6EA]/70">Per location</span><span className="font-mono">{usd(quote.perLocationUsd)}/mo</span></div>
            <div className="flex justify-between"><span className="text-[#FBF6EA]/70">All {locations} locations</span><span className="font-mono text-[#F5B700] font-bold">{usd(quote.monthlyUsd)}/mo</span></div>
            <div className="flex justify-between text-[#FBF6EA]/60"><span>Per year</span><span className="font-mono">{usd(quote.annualUsd)}</span></div>
            <div className="flex justify-between text-[#FBF6EA]/60 pt-2 border-t border-[#FBF6EA]/10"><span>One-time build</span><span className="font-mono">{usd(quote.buildUsd)}</span></div>
          </div>
          <div className="mt-4 rounded-lg bg-[#F5B700]/10 border border-[#F5B700]/25 p-3">
            <p className="text-[13px] text-[#FBF6EA]/80 leading-snug">
              You spend <b className="text-[#F5B700]">{usd(quote.monthlyUsd)}</b> and recover an estimated <b className="text-white">{usd(recoveredMonthly)}</b> a month.
            </p>
          </div>
        </div>
      </div>

      {/* lead capture */}
      {state === 'done' ? (
        <div className="mt-6 rounded-xl border-2 border-[#F5B700] bg-[#F5B700]/10 p-5 text-center">
          <p className="font-display text-xl font-bold text-white">Your projection is on its way.</p>
          <p className="text-[#FBF6EA]/70 text-sm mt-1">{msg} Sarah will reach out to walk your team through the Command Board with your real locations.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbrand.com"
            className="flex-1 rounded-full border-2 border-[#FBF6EA]/25 bg-[#0f1626] px-5 py-3 text-[#FBF6EA] placeholder-[#FBF6EA]/35 focus:outline-none focus:border-[#F5B700]"
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-7 py-3 font-sans font-extrabold text-sm uppercase tracking-[0.12em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : 'Send my projection'}
          </button>
        </form>
      )}
      {msg && state === 'error' && <p className="mt-2 text-xs font-mono text-[#FF8550]">{msg}</p>}
    </div>
  );
}
