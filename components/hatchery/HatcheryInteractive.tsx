'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { HATCH } from '@/data/hatchery';

/* ─────────────────────────  HATCH A MASCOT  ───────────────────────── */

export function ClaimEgg({ variant = 'gold' }: { variant?: 'gold' | 'ink' }) {
  const [business, setBusiness] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    trackEvent('hatchery_hatch_mascot', { business: business ? 'named' : 'blank' });
    try {
      const res = await fetch('/api/hatchery/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'hatchery-hatch', business }),
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

  const btnBase =
    variant === 'ink'
      ? 'bg-[#161616] text-[#FBF6EA] border-[#161616] shadow-[5px_5px_0_0_#F5B700]'
      : 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[5px_5px_0_0_#161616]';

  return (
    <div className="w-full max-w-md">
      <input
        type="text"
        value={business}
        onChange={(e) => setBusiness(e.target.value)}
        placeholder="Your shop's name (optional)"
        className="w-full mb-3 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3 font-body text-[#161616] placeholder-[#6b6152]/70 focus:outline-none focus:ring-2 focus:ring-[#E8A542]"
      />
      <button
        type="button"
        onClick={claim}
        disabled={loading}
        className={`w-full rounded-full border-2 px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed ${btnBase}`}
      >
        {loading ? 'Opening checkout…' : `Hatch my mascot — $${HATCH.priceUsd}`}
      </button>
      <p className="mt-3 text-[13px] text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1rem' }}>
        One time, $497, and the price does not climb. You approve the direction before any art is made, so nothing is drawn until you love it.
      </p>
      {error && <p className="mt-2 text-xs font-mono text-[#B54423]">{error}</p>}
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
          {msg} We hand-make each First Glimpse, so give it a day. Then, if you love it, hatching your mascot is one click away.
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
