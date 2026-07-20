'use client';

/**
 * The two managed packages + the DIY rung. Amounts render from data/ads.ts
 * (the same cents the checkout charges). Checkout POSTs to /api/ads/checkout
 * and redirects to Stripe; the business name is collected at checkout.
 */

import { useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/mustard-mode/Reveal';
import { broadcastTiers, broadcastEntry, type BroadcastTier } from '@/data/ads';

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function BroadcastPackages() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (tier: BroadcastTier) => {
    setBusy(tier.slug);
    setError(null);
    try {
      const res = await fetch('/api/ads/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.slug }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message || 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.');
    } catch {
      setError('Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.');
    }
    setBusy(null);
  };

  return (
    <section id="packages" className="py-16 md:py-24 bg-[#FBF6EA] border-b-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-4">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">[ THE PACKAGES ]</p>
          </Reveal>
          <Reveal variant="slam">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              Two packages. No contracts.
              <br className="hidden md:block" /> No surprises.
            </h2>
          </Reveal>
          <Reveal variant="rise" delay={100}>
            <p className="font-body text-[#161616]/70 max-w-2xl mx-auto mt-4">
              A typical agency wants $2,000 to $5,000 a month, a 90-day contract, and hands you stock footage. This is not that. Your ad spend stays on your card, paid straight to the networks, never marked up.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-10">
          {broadcastTiers.map((tier, i) => (
            <Reveal key={tier.slug} variant="rise" delay={i * 120}>
              <div
                className={`relative h-full rounded-2xl border-2 border-[#161616] p-6 md:p-8 flex flex-col ${
                  tier.featured ? 'bg-[#F5B700] shadow-[8px_8px_0_0_#161616] md:-rotate-[0.5deg]' : 'bg-white shadow-[6px_6px_0_0_#161616]'
                }`}
              >
                {tier.featured && (
                  <p className="absolute -top-3.5 left-6 rounded-full bg-[#E0301E] border-2 border-[#161616] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    The Full Engine
                  </p>
                )}
                <p className={`font-mono text-[11px] uppercase tracking-[0.3em] font-bold ${tier.featured ? 'text-[#161616]/70' : 'text-[#E0301E]'}`}>{tier.chip}</p>
                <h3 className="font-display text-3xl md:text-4xl font-black text-[#161616] mt-2">{tier.name}</h3>
                <p className="font-body text-[#161616]/75 mt-2">{tier.pitch}</p>

                <div className="flex items-end gap-3 mt-5 pb-5 border-b-2 border-dashed border-[#161616]/25">
                  <p className="font-display text-5xl font-black text-[#161616] leading-none">
                    {usd(tier.monthlyCents)}
                    <span className="font-sans text-base font-bold text-[#161616]/60">/mo</span>
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#161616]/60 pb-1">
                    + {usd(tier.setupCents)} to launch
                  </p>
                </div>

                <ul className="space-y-2.5 mt-5 mb-8">
                  {tier.includes.map((line) => (
                    <li key={line} className="flex gap-2.5 font-body text-sm text-[#161616]/85 leading-relaxed">
                      <span className={`mt-0.5 font-bold ${tier.featured ? 'text-[#161616]' : 'text-[#8f6600]'}`} aria-hidden="true">▸</span>
                      {line}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => checkout(tier)}
                  disabled={busy !== null}
                  className={`mt-auto rounded-full border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-sm uppercase tracking-[0.16em] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${
                    tier.featured
                      ? 'bg-[#161616] text-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA]'
                      : 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616]'
                  }`}
                >
                  {busy === tier.slug ? 'Opening Checkout…' : tier.cta}
                </button>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/55 text-center mt-3">
                  Manages up to ${tier.spendCapUsd.toLocaleString()}/mo ad spend · Cancel anytime
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-center font-body text-sm text-[#E0301E] font-bold mt-6">
            {error}
          </p>
        )}

        {/* The DIY rung */}
        <Reveal variant="rise" delay={200}>
          <div className="max-w-4xl mx-auto mt-8">
            <div className="rounded-2xl bg-[#FBF6EA] border-2 border-dashed border-[#161616]/50 p-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8f6600] font-bold">{broadcastEntry.chip}</p>
                <h3 className="font-display text-xl font-black text-[#161616] mt-1">
                  {broadcastEntry.name} · ${broadcastEntry.priceUsd}
                </h3>
                <p className="font-body text-sm text-[#161616]/70 mt-1">{broadcastEntry.pitch} {broadcastEntry.includes[2]}.</p>
              </div>
              <Link
                href={broadcastEntry.href}
                className="shrink-0 rounded-full bg-white border-2 border-[#161616] px-6 py-3 font-sans font-bold text-[#161616] text-xs uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 text-center"
              >
                {broadcastEntry.cta}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
