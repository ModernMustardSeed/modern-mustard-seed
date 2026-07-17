'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { quoteFor, usd } from '@/data/switchboard';

/**
 * The Switchboard's signature moment AND its lead magnet: paste a franchise name
 * and location count, and a LIVE Command Board comes alive. Locations light up as
 * after-hours calls are answered in real time, a feed streams the bookings, and the
 * projected recovered revenue counts up. Then capture the lead.
 *
 * The projection is transparent (missed after-hours calls x close rate x average
 * ticket) and clearly labelled an estimate. The live animation is pure delight; it
 * honors prefers-reduced-motion with a still, complete board.
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

type LiveEvent = { id: number; loc: number; booked: boolean; amt: number };

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

  // ── The live layer: locations answering calls in real time. ──
  const reduced = usePrefersReducedMotion();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [pinged, setPinged] = useState<number | null>(null);
  const [answeredToday, setAnsweredToday] = useState(0);
  const counter = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const step = () => {
      const i = counter.current++;
      const loc = (i * 23 + 7) % Math.max(1, tiles); // varies across tiles, no obvious pattern
      const booked = i % 3 === 1;
      setPinged(loc);
      setAnsweredToday((n) => n + 1);
      if (booked) {
        setEvents((prev) => [{ id: i, loc: loc + 1, booked: true, amt: ticket }, ...prev].slice(0, 4));
      } else {
        setEvents((prev) => [{ id: i, loc: loc + 1, booked: false, amt: ticket }, ...prev].slice(0, 4));
      }
      window.setTimeout(() => setPinged((p) => (p === loc ? null : p)), 620);
    };
    const t = window.setInterval(step, 1550);
    return () => window.clearInterval(t);
  }, [reduced, tiles, ticket]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMsg(null);
    // Which hero A/B variant this visitor saw, so the lead is attributable.
    const variant = (typeof document !== 'undefined' && document.cookie.match(/(?:^|;\s*)sb_variant=([AB])/)?.[1]) || '';
    trackEvent('switchboard_projection', { locations, ticket, variant });
    try {
      const res = await fetch('/api/switchboard/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, business: name, locations, ticket, recoveredMonthly, monthlyUsd: quote.monthlyUsd, variant }),
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
    <div className="rounded-2xl border-2 border-[#161616] bg-[#080C16] text-[#FBF6EA] p-5 md:p-8 shadow-[8px_8px_0_0_#F5B700] relative overflow-hidden">
      {/* faint operations grid behind the board */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#F5B700 1px, transparent 1px), linear-gradient(90deg, #F5B700 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* appliance plate + live status bar */}
      <div className="relative flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E0301E] border border-black/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#F5B700] border border-black/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#3ddc84] border border-black/40" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#FBF6EA]/50 font-bold hidden sm:inline">The Switchboard · Unit 001</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ddc84] opacity-70" />}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3ddc84]" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#3ddc84] font-bold">Live · every location answering</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#FBF6EA]/45 tabular-nums">
            {answeredToday.toLocaleString()} answered this session
          </span>
        </div>
      </div>

      {/* Inputs */}
      <div className="relative grid sm:grid-cols-3 gap-3 mb-6">
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
      <div className="relative grid md:grid-cols-[1.3fr_1fr] gap-6 items-start">
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

          {/* heatmap that lights up as calls are answered */}
          <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))' }}>
            {Array.from({ length: tiles }).map((_, i) => {
              const h = heatFor(i);
              // Neutral navy lifts for the cool tiles, solid mustard only when hot:
              // translucent gold washed over ink mixes to olive-brown (banned).
              const bg = h === 3 ? '#F5B700' : h === 2 ? '#33406B' : h === 1 ? '#1D2740' : '#121A2C';
              const isPinged = pinged === i;
              return (
                <div
                  key={i}
                  title={`Location ${i + 1}`}
                  className="aspect-square rounded-[5px] border grid place-items-center font-mono text-[9px] transition-all duration-300"
                  style={{
                    background: isPinged ? '#3ddc84' : bg,
                    color: isPinged ? '#04140b' : h === 3 ? '#161616' : 'rgba(251,246,234,.7)',
                    fontWeight: isPinged || h === 3 ? 700 : 400,
                    borderColor: isPinged ? '#3ddc84' : 'rgba(251,246,234,.10)',
                    transform: isPinged ? 'scale(1.14)' : 'scale(1)',
                    boxShadow: isPinged ? '0 0 14px 2px rgba(61,220,132,.55)' : 'none',
                  }}
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
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#FBF6EA]/40 mt-2">Every location, one glance · green = answering now</p>
        </div>

        {/* the quote + the live feed */}
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[#F5B700] bg-[#0f1626] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#F5B700] font-bold">Your Switchboard</p>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-[#FBF6EA]/70">Per location</span><span className="font-mono">{usd(quote.perLocationUsd)}/mo</span></div>
              <div className="flex justify-between"><span className="text-[#FBF6EA]/70">All {locations} locations</span><span className="font-mono text-[#F5B700] font-bold">{usd(quote.monthlyUsd)}/mo</span></div>
              <div className="flex justify-between text-[#FBF6EA]/60"><span>Per year</span><span className="font-mono">{usd(quote.annualUsd)}</span></div>
              <div className="flex justify-between text-[#FBF6EA]/60 pt-2 border-t border-[#FBF6EA]/10"><span>One-time build</span><span className="font-mono">{usd(quote.buildUsd)}</span></div>
            </div>
            <div className="mt-4 rounded-lg bg-[#1C2333] border border-[#F5B700] p-3">
              <p className="text-[13px] text-[#FBF6EA]/80 leading-snug">
                You spend <b className="text-[#F5B700]">{usd(quote.monthlyUsd)}</b> and recover an estimated <b className="text-white">{usd(recoveredMonthly)}</b> a month.
              </p>
            </div>
          </div>

          {/* live event feed */}
          <div className="rounded-xl border border-[#FBF6EA]/12 bg-[#0b1120] p-4 min-h-[132px]">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#FBF6EA]/45 mb-2.5">The floor, right now</p>
            {events.length === 0 ? (
              <p className="font-mono text-[11px] text-[#FBF6EA]/40">{reduced ? 'Every location, answered around the clock.' : 'Listening for after-hours calls…'}</p>
            ) : (
              <ul className="space-y-1.5">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-[12px] font-mono animate-[fadeup_.35s_ease]">
                    {ev.booked ? (
                      <>
                        <span className="text-[#F5B700]">✓</span>
                        <span className="text-[#FBF6EA]/85">Location {String(ev.loc).padStart(2, '0')} booked</span>
                        <span className="ml-auto text-[#3ddc84] font-bold tabular-nums">+{usd(ev.amt)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#3ddc84]">●</span>
                        <span className="text-[#FBF6EA]/70">Location {String(ev.loc).padStart(2, '0')} · call answered</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* lead capture */}
      {state === 'done' ? (
        <div className="relative mt-6 rounded-xl border-2 border-[#F5B700] bg-[#1C2333] p-5 text-center">
          <p className="font-display text-xl font-bold text-white">Your projection is on its way.</p>
          <p className="text-[#FBF6EA]/70 text-sm mt-1">{msg} Sarah will reach out to walk your team through the Command Board with your real locations.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="relative mt-6 flex flex-col sm:flex-row gap-3">
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
      {msg && state === 'error' && <p className="relative mt-2 text-xs font-mono text-[#FF8550]">{msg}</p>}

      <style>{`@keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
