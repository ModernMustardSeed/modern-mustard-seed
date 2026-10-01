'use client';

/** Managed packages are scoped and quoted before work begins. */

import Link from 'next/link';
import Reveal from '@/components/mustard-mode/Reveal';
import { broadcastTiers, broadcastEntry } from '@/data/ads';
import { PRICE_HEADLINE } from '@/lib/public-pricing';


export default function BroadcastPackages() {
  return (
    <section id="packages" className="py-16 md:py-24 bg-[#fbf5ea] border-b-2 border-[#0b3b44]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-4">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-4">[ THE PACKAGES ]</p>
          </Reveal>
          <Reveal variant="slam">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.05]">
              Two packages. No contracts.
              <br className="hidden md:block" /> No surprises.
            </h2>
          </Reveal>
          <Reveal variant="rise" delay={100}>
            <p className="font-body text-[#0b3b44]/70 max-w-2xl mx-auto mt-4">
              A typical agency wants $2,000 to $5,000 a month, a 90-day contract, and hands you stock footage. This is not that. Your ad spend stays on your card, paid straight to the networks, never marked up.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-10">
          {broadcastTiers.map((tier, i) => (
            <Reveal key={tier.slug} variant="rise" delay={i * 120}>
              <div
                className={`relative h-full rounded-2xl border-2 border-[#0b3b44] p-6 md:p-8 flex flex-col ${
                  tier.featured ? 'bg-[#f5b700] shadow-[8px_8px_0_0_#0b3b44] md:-rotate-[0.5deg]' : 'bg-white shadow-[6px_6px_0_0_#0b3b44]'
                }`}
              >
                {tier.featured && (
                  <p className="absolute -top-3.5 left-6 rounded-full bg-[#ff6f59] border-2 border-[#0b3b44] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    The Full Engine
                  </p>
                )}
                <p className={`font-mono text-[11px] uppercase tracking-[0.3em] font-bold ${tier.featured ? 'text-[#0b3b44]/70' : 'text-[#0a7c78]'}`}>{tier.chip}</p>
                <h3 className="font-display text-3xl md:text-4xl font-black text-[#0b3b44] mt-2">{tier.name}</h3>
                <p className="font-body text-[#0b3b44]/75 mt-2">{tier.pitch}</p>

                <div className="flex items-end gap-3 mt-5 pb-5 border-b-2 border-dashed border-[#0b3b44]/25">
                  <p className="font-display text-2xl font-black text-[#0b3b44] leading-none">
                    {PRICE_HEADLINE}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#0b3b44]/60 pb-1">
                    Quoted privately, before anything runs
                  </p>
                </div>

                <ul className="space-y-2.5 mt-5 mb-8">
                  {tier.includes.map((line) => (
                    <li key={line} className="flex gap-2.5 font-body text-sm text-[#0b3b44]/85 leading-relaxed">
                      <span className={`mt-0.5 font-bold ${tier.featured ? 'text-[#0b3b44]' : 'text-[#8f6600]'}`} aria-hidden="true">▸</span>
                      {line}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/inquire?kind=marketing&package=${tier.slug}`}
                  className={`mt-auto rounded-full border-2 border-[#0b3b44] px-8 py-3.5 font-sans font-extrabold text-sm uppercase tracking-[0.16em] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${
                    tier.featured
                      ? 'bg-[#0b3b44] text-[#fbf5ea] shadow-[4px_4px_0_0_#fbf5ea]'
                      : 'bg-[#f5b700] text-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44]'
                  }`}
                >
                  Request a quote
                </Link>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0b3b44]/55 text-center mt-3">
                  Manages up to ${tier.spendCapUsd.toLocaleString()}/mo ad spend · Cancel anytime
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* The DIY rung */}
        <Reveal variant="rise" delay={200}>
          <div className="max-w-4xl mx-auto mt-8">
            <div className="rounded-2xl bg-[#fbf5ea] border-2 border-dashed border-[#0b3b44]/50 p-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8f6600] font-bold">{broadcastEntry.chip}</p>
                <h3 className="font-display text-xl font-black text-[#0b3b44] mt-1">
                  {broadcastEntry.name}
                </h3>
                <p className="font-body text-sm text-[#0b3b44]/70 mt-1">{broadcastEntry.pitch} {broadcastEntry.includes[2]}.</p>
              </div>
              <Link
                href={broadcastEntry.href}
                className="shrink-0 rounded-full bg-white border-2 border-[#0b3b44] px-6 py-3 font-sans font-bold text-[#0b3b44] text-xs uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 text-center"
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
