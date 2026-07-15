'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { FOUNDING } from '@/data/hatchery';

/* ─────────────────────────  COUNTDOWN  ───────────────────────── */

function parts(ms: number) {
  const clamp = Math.max(0, ms);
  return {
    d: Math.floor(clamp / 86400000),
    h: Math.floor((clamp / 3600000) % 24),
    m: Math.floor((clamp / 60000) % 60),
    s: Math.floor((clamp / 1000) % 60),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Candlelit countdown to the Founding Eggs close. Mounts client-side to avoid
 *  a hydration clock mismatch. */
export function Countdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = parts(now === null ? target - Date.now() : target - now);
  const cells: [string, number][] = [
    ['Days', p.d],
    ['Hrs', p.h],
    ['Min', p.m],
    ['Sec', p.s],
  ];

  return (
    <div className="inline-flex items-end gap-2 md:gap-3" aria-label="Time left to claim a Founding Egg">
      {cells.map(([label, val], i) => (
        <div key={label} className="flex items-end gap-2 md:gap-3">
          <div className="text-center">
            <div className="font-mono text-2xl md:text-4xl font-bold tabular-nums text-[#FBF6EA] bg-[#161616]/70 border border-[#F5B700]/45 rounded-lg px-2.5 md:px-3.5 py-1.5 md:py-2 min-w-[2.6ch]">
              {now === null ? '--' : pad(val)}
            </div>
            <div className="mt-1.5 text-[9px] uppercase tracking-[0.28em] font-mono text-[#FBF6EA]/60">{label}</div>
          </div>
          {i < cells.length - 1 && <span className="font-mono text-2xl md:text-4xl text-[#F5B700]/70 pb-6">:</span>}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────  CLAIM A FOUNDING EGG  ───────────────────────── */

type Seats = { cap: number; claimed: number; remaining: number; soldOut: boolean };

export function ClaimEgg({ variant = 'gold' }: { variant?: 'gold' | 'ink' }) {
  const [seats, setSeats] = useState<Seats | null>(null);
  const [business, setBusiness] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/hatchery/seats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: Seats) => { if (alive) setSeats(d); })
      .catch(() => { if (alive) setSeats({ cap: FOUNDING.cap, claimed: 0, remaining: FOUNDING.cap, soldOut: false }); });
    return () => { alive = false; };
  }, []);

  const claim = async () => {
    if (loading || seats?.soldOut) return;
    setLoading(true);
    setError(null);
    trackEvent('hatchery_claim_egg', { business: business ? 'named' : 'blank' });
    try {
      const res = await fetch('/api/hatchery/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'hatchery-founding-egg', business }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      setError(data.message || 'Checkout hiccuped. Try again in a moment.');
    } catch {
      setError('Checkout hiccuped. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const remaining = seats?.remaining ?? FOUNDING.cap;
  const soldOut = seats?.soldOut ?? false;
  const btnBase =
    variant === 'ink'
      ? 'bg-[#161616] text-[#FBF6EA] border-[#161616] shadow-[5px_5px_0_0_#F5B700]'
      : 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[5px_5px_0_0_#161616]';

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: FOUNDING.cap }).map((_, i) => (
            <span
              key={i}
              className={`text-lg leading-none transition-opacity ${i < (seats?.claimed ?? 0) ? 'opacity-30 grayscale' : 'opacity-100'}`}
            >
              🥚
            </span>
          ))}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6b6152]">
          {seats === null ? 'checking the nest…' : soldOut ? 'All five claimed' : `${remaining} of ${FOUNDING.cap} eggs left`}
        </span>
      </div>

      {!soldOut && (
        <input
          type="text"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          placeholder="Your shop's name (optional)"
          className="w-full mb-3 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3 font-body text-[#161616] placeholder-[#6b6152]/70 focus:outline-none focus:ring-2 focus:ring-[#E8A542]"
        />
      )}

      <button
        type="button"
        onClick={claim}
        disabled={loading || soldOut}
        className={`w-full rounded-full border-2 px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed ${btnBase}`}
      >
        {soldOut ? 'All Founding Eggs claimed' : loading ? 'Opening checkout…' : `Claim a Founding Egg — $${FOUNDING.priceUsd}`}
      </button>

      <p className="mt-3 text-[13px] text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1rem' }}>
        Regularly ${FOUNDING.regularUsd}. Ignite-or-refund: if fewer than {FOUNDING.igniteFloor} are claimed by {FOUNDING.closesLabel}, every payment is refunded in full, automatically.
      </p>
      {error && <p className="mt-2 text-xs font-mono text-[#B54423]">{error}</p>}
      {soldOut && (
        <p className="mt-2 text-sm text-[#6b6152]">
          Email <a className="text-[#B54423] font-bold underline underline-offset-2" href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a> to hold a seat in the next hatch.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────  FREE FIRST GLIMPSE  ───────────────────────── */

export function FirstGlimpse() {
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMsg(null);
    trackEvent('hatchery_first_glimpse', {});
    try {
      const res = await fetch('/api/hatchery/first-glimpse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, business }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('done');
        setMsg(data.message || 'Your First Glimpse is on its way.');
      } else {
        setState('error');
        setMsg(data.error === 'invalid_email' ? 'That email looks off. Mind checking it?' : 'Something hiccuped. Try again.');
      }
    } catch {
      setState('error');
      setMsg('Something hiccuped. Try again.');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl border-2 border-[#161616] bg-[#F5EDD9] p-6 md:p-7 text-center shadow-[5px_5px_0_0_#E8A542]">
        <div className="text-3xl mb-2" aria-hidden="true">🥚</div>
        <p className="font-display text-2xl font-bold text-[#161616]">A heartbeat is on its way.</p>
        <p className="mt-2 text-[#6b6152]" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.1rem' }}>
          {msg} We hand-make each First Glimpse, so give it a day. Then, if you love it, one of five Founding Eggs is yours to claim.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-[#161616] bg-[#F5EDD9] p-6 md:p-7 shadow-[5px_5px_0_0_#E8A542]">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#B54423] font-mono font-bold">Free · one per shop</p>
      <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold text-[#161616] leading-tight">
        See your mascot before it hatches.
      </h3>
      <p className="mt-2 text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.1rem' }}>
        Tell us your shop and we will hand-make a candlelit First Glimpse: a first sketch of the someone your business could have. No card, no catch.
      </p>
      <div className="mt-5 grid gap-3">
        <input
          type="text"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          placeholder="Your shop's name"
          className="w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3 font-body text-[#161616] placeholder-[#6b6152]/70 focus:outline-none focus:ring-2 focus:ring-[#E8A542]"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourshop.com"
          className="w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3 font-body text-[#161616] placeholder-[#6b6152]/70 focus:outline-none focus:ring-2 focus:ring-[#E8A542]"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="w-full rounded-full border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] px-8 py-3.5 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[4px_4px_0_0_#E8A542] transition-all hover:-translate-y-0.5 disabled:opacity-60"
        >
          {state === 'sending' ? 'Lighting the candle…' : 'Send my First Glimpse'}
        </button>
      </div>
      {msg && state === 'error' && <p className="mt-2 text-xs font-mono text-[#B54423]">{msg}</p>}
    </form>
  );
}
