'use client';

/**
 * The arcade-level offer grid + FAQ. Levels 1-3 check out through
 * /api/mustard-mode/checkout; Level 0 scrolls back up to the free-play hero.
 */

import { useState } from 'react';
import { track } from '@vercel/analytics';
import { mustardLevels, mustardFaq, MUSTARD } from '@/data/mustard-mode/offer';
import Reveal from './Reveal';

export default function OfferGrid() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const paid = mustardLevels.filter((l) => l.level > 0);
  const free = mustardLevels.find((l) => l.level === 0)!;

  const checkout = async (slug: string) => {
    setBusy(slug);
    setErr(null);
    track('mustard_checkout_click', { slug });
    try {
      const ref = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null;
      const res = await fetch('/api/mustard-mode/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...(ref ? { ref } : {}) }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(data.message || 'Checkout is warming up. Try again in a minute or email sarah@modernmustardseed.com.');
    } catch {
      setErr('Checkout is warming up. Try again in a minute or email sarah@modernmustardseed.com.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="levels" className="bg-[#f6efe0] py-20 md:py-28 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal variant="eyebrow">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#8f1d22] uppercase">Choose your level // Lifetime access on 01 and 02</p>
        </Reveal>
        <Reveal variant="slam" delay={120}>
          <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#14110c] mt-3 leading-[1.02]">
            Insert coin.
          </h2>
        </Reveal>

        {/* Two paid levels since the Cabinet was retired, so the pair centers
            instead of leaving a hole in a three-up grid. */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-5 mt-12 items-stretch max-w-3xl mx-auto">
          {paid.map((l, li) => {
            const hot = l.featured;
            return (
              <Reveal key={l.slug} variant="drop" delay={160 + li * 140} className="h-full">
              <div
                className={`relative flex flex-col h-full border-2 border-[#14110c] p-7 ${
                  hot
                    ? 'bg-[#14110c] text-white shadow-[8px_8px_0_0_#f5b700] md:scale-[1.04]'
                    : 'bg-white text-[#14110c] shadow-[6px_6px_0_0_#14110c]'
                }`}
              >
                {hot && (
                  <span className="absolute -top-4 -right-3 rotate-6 bg-[#f5b700] border-2 border-[#14110c] font-mono font-bold text-[10px] px-2.5 py-1.5 text-[#14110c]">
                    MOST PICKED
                  </span>
                )}
                <span className={`font-mono font-bold text-[11px] tracking-[0.14em] ${hot ? 'text-[#ffc933]' : 'text-[#8f1d22]'}`}>{l.chip}</span>
                <h3 className="font-display font-extrabold text-2xl mt-2">{l.name}</h3>
                <div className="font-mono font-bold text-4xl mt-2">
                  <span className={hot ? 'text-[#f5b700]' : ''}>${l.priceUsd}</span>
                  {l.cadence === 'monthly' && <span className="text-base opacity-70">/mo</span>}
                </div>
                <p className={`font-sans text-sm mt-2 ${hot ? 'text-white/70' : 'text-[#14110c]/70'}`}>{l.pitch}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {l.includes.map((inc) => (
                    <li key={inc} className={`font-sans text-[13px] leading-snug flex gap-2 ${hot ? 'text-white/80' : 'text-[#14110c]/80'}`}>
                      <span className="text-[#f5b700] font-mono text-[10px] mt-1">■</span>
                      {inc}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => void checkout(l.slug)}
                  disabled={busy !== null}
                  className={`mt-7 font-sans font-bold border-2 border-[#14110c] px-6 py-3 transition-all disabled:opacity-50 ${
                    hot
                      ? 'bg-[#f5b700] text-[#14110c] shadow-[4px_4px_0_0_#ffc933] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#ffc933]'
                      : 'bg-[#f6efe0] text-[#14110c] shadow-[4px_4px_0_0_#14110c] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#14110c]'
                  }`}
                >
                  {busy === l.slug ? 'Opening checkout…' : l.cta}
                </button>
              </div>
              </Reveal>
            );
          })}
        </div>

        {err && <p className="font-mono text-[12px] text-[#8f1d22] mt-4">{err}</p>}

        {/* Level 0 bar */}
        <div className="mt-8 border-2 border-[#14110c] bg-white shadow-[5px_5px_0_0_#14110c] px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <p className="font-mono font-bold text-[12px] text-[#14110c]">
            <span className="text-[#8f1d22]">{free.chip}</span> FREE PLAY. {free.pitch}
          </p>
          <a
            href="#top"
            onClick={() => track('mustard_freeplay_scroll')}
            className="font-mono font-bold text-[12px] text-[#8f1d22] underline underline-offset-4 shrink-0"
          >
            PLAY YOUR FREE CREDIT ↑
          </a>
        </div>

        {/* Guarantee */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="border-2 border-[#14110c] bg-[#FFFDF6] p-6">
            <p className="font-mono font-bold text-[11px] tracking-wider text-[#8f1d22] uppercase">The guarantee, printed in mono</p>
            <p className="font-sans text-sm text-[#14110c]/80 mt-2 leading-relaxed">{MUSTARD.guarantee}</p>
          </div>
          <div className="border-2 border-[#14110c] bg-[#FFFDF6] p-6">
            <p className="font-mono font-bold text-[11px] tracking-wider text-[#8f1d22] uppercase">Price check</p>
            <p className="font-sans text-sm text-[#14110c]/80 mt-2 leading-relaxed">{MUSTARD.priceFraming}</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl">
          <h3 className="font-display italic font-extrabold text-3xl text-[#14110c]">Player questions</h3>
          <div className="mt-6 border-2 border-[#14110c] bg-white divide-y-2 divide-[#14110c]">
            {mustardFaq.map((f) => (
              <details
                key={f.q}
                className="group"
                onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('mustard_faq_open', { q: f.q.slice(0, 40) }); }}
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-sans font-bold text-sm text-[#14110c] hover:bg-[#f6efe0]">
                  {f.q}
                  <span className="font-mono text-[#f5b700] text-lg group-open:rotate-45 transition-transform" style={{ textShadow: '1px 1px 0 #14110c' }}>+</span>
                </summary>
                <p className="px-5 pb-5 font-sans text-sm text-[#14110c]/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
