'use client';

import { useState } from 'react';
import Link from 'next/link';
import { launchFilmTiers, launchFilmUsd, type LaunchFilmTier } from '@/data/launch-film';
import { trackEvent } from '@/lib/analytics';

/** The three doors, each one minting a live Stripe Checkout from data/launch-film.ts. */
export default function LaunchFilmTiers() {
  return (
    <div className="grid md:grid-cols-3 gap-6 md:gap-5 items-stretch">
      {launchFilmTiers.map((tier) => (
        <TierCard key={tier.slug} tier={tier} />
      ))}
    </div>
  );
}

function TierCard({ tier }: { tier: LaunchFilmTier }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    trackEvent('launch_film_checkout_click', { tier: tier.slug });
    try {
      const res = await fetch('/api/launch-film/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setMsg(data?.message || 'Checkout hiccuped. Try again or email sarah@modernmustardseed.com.');
        setBusy(false);
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setMsg('Checkout hiccuped. Try again or email sarah@modernmustardseed.com.');
      setBusy(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 border-[#161616] p-7 shadow-[6px_6px_0_0_#161616] ${
        tier.featured ? 'bg-[#F5B700] md:-translate-y-2' : 'bg-white'
      }`}
    >
      {tier.featured && (
        <span className="absolute -top-3.5 left-6 rounded-full border-2 border-[#161616] bg-[#E0301E] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#FBF6EA]">
          The one to book
        </span>
      )}
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#161616]/60">{tier.chip}</p>
      <h3 className="font-display text-2xl font-black tracking-tight text-[#161616] mt-2">{tier.name}</h3>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-black tracking-tight text-[#161616]">{launchFilmUsd(tier.priceCents)}</span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#161616]/60">{tier.cadence === 'monthly' ? '/ month' : 'once'}</span>
      </p>
      <p className="font-body text-sm leading-relaxed text-[#161616]/75 mt-3">{tier.pitch}</p>
      <ul className="mt-5 space-y-2.5 flex-1">
        {tier.includes.map((line) => (
          <li key={line} className="flex gap-2.5 font-body text-sm leading-snug text-[#161616]">
            <span aria-hidden="true" className="mt-[3px] h-3.5 w-3.5 flex-shrink-0 rounded-sm border-2 border-[#161616] bg-[#FBF6EA]" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className="mt-7 w-full rounded-full border-2 border-[#161616] bg-[#161616] px-6 py-3.5 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait"
      >
        {busy ? 'Opening checkout' : tier.cta}
      </button>
      {msg && (
        <p role="alert" className="mt-3 font-body text-xs leading-relaxed text-[#C4160B]">
          {msg}
        </p>
      )}
      <p className="mt-3 text-center font-body text-xs text-[#161616]/60">
        Rather talk first?{' '}
        <Link href="/book" className="font-bold text-[#161616] underline underline-offset-4">
          Book a call
        </Link>
      </p>
    </div>
  );
}
