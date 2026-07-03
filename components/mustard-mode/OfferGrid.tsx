'use client';

/**
 * The arcade-level offer grid + FAQ. Levels 1-3 check out through
 * /api/mustard-mode/checkout; Level 0 scrolls back up to the free-play hero.
 */

import { useState } from 'react';
import { track } from '@vercel/analytics';
import { mustardLevels, mustardFaq, MUSTARD } from '@/data/mustard-mode/offer';

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
    <section id="levels" className="bg-[#FBF6EA] py-20 md:py-28 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">Choose your level // Lifetime access on 01 and 02</p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02]">
          Insert coin.
        </h2>

        <div className="grid md:grid-cols-3 gap-6 md:gap-5 mt-12 items-stretch">
          {paid.map((l) => {
            const hot = l.featured;
            return (
              <div
                key={l.slug}
                className={`relative flex flex-col border-2 border-[#161616] p-7 ${
                  hot
                    ? 'bg-[#080C16] text-white shadow-[8px_8px_0_0_#F5B700] md:scale-[1.04]'
                    : 'bg-white text-[#161616] shadow-[6px_6px_0_0_#161616]'
                }`}
              >
                {hot && (
                  <span className="absolute -top-4 -right-3 rotate-6 bg-[#F5B700] border-2 border-[#161616] font-mono font-bold text-[10px] px-2.5 py-1.5 text-[#161616]">
                    MOST PICKED
                  </span>
                )}
                <span className={`font-mono font-bold text-[11px] tracking-[0.14em] ${hot ? 'text-[#FFDD55]' : 'text-[#E0301E]'}`}>{l.chip}</span>
                <h3 className="font-display font-extrabold text-2xl mt-2">{l.name}</h3>
                <div className="font-mono font-bold text-4xl mt-2">
                  <span className={hot ? 'text-[#F5B700]' : ''}>${l.priceUsd}</span>
                  {l.cadence === 'monthly' && <span className="text-base opacity-70">/mo</span>}
                </div>
                <p className={`font-sans text-sm mt-2 ${hot ? 'text-white/70' : 'text-[#161616]/70'}`}>{l.pitch}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {l.includes.map((inc) => (
                    <li key={inc} className={`font-sans text-[13px] leading-snug flex gap-2 ${hot ? 'text-white/80' : 'text-[#161616]/80'}`}>
                      <span className="text-[#F5B700] font-mono text-[10px] mt-1">■</span>
                      {inc}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => void checkout(l.slug)}
                  disabled={busy !== null}
                  className={`mt-7 font-sans font-bold border-2 border-[#161616] px-6 py-3 transition-all disabled:opacity-50 ${
                    hot
                      ? 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#FFDD55] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FFDD55]'
                      : 'bg-[#FBF6EA] text-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616]'
                  }`}
                >
                  {busy === l.slug ? 'Opening checkout…' : l.cta}
                </button>
              </div>
            );
          })}
        </div>

        {err && <p className="font-mono text-[12px] text-[#E0301E] mt-4">{err}</p>}

        {/* Level 0 bar */}
        <div className="mt-8 border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <p className="font-mono font-bold text-[12px] text-[#161616]">
            <span className="text-[#E0301E]">{free.chip}</span> FREE PLAY. {free.pitch}
          </p>
          <a
            href="#top"
            onClick={() => track('mustard_freeplay_scroll')}
            className="font-mono font-bold text-[12px] text-[#1E50C8] underline underline-offset-4 shrink-0"
          >
            PLAY YOUR FREE CREDIT ↑
          </a>
        </div>

        {/* Guarantee */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="border-2 border-[#161616] bg-[#FFFDF6] p-6">
            <p className="font-mono font-bold text-[11px] tracking-wider text-[#E0301E] uppercase">The guarantee, printed in mono</p>
            <p className="font-sans text-sm text-[#161616]/80 mt-2 leading-relaxed">{MUSTARD.guarantee}</p>
          </div>
          <div className="border-2 border-[#161616] bg-[#FFFDF6] p-6">
            <p className="font-mono font-bold text-[11px] tracking-wider text-[#E0301E] uppercase">Price check</p>
            <p className="font-sans text-sm text-[#161616]/80 mt-2 leading-relaxed">{MUSTARD.priceFraming}</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl">
          <h3 className="font-display italic font-extrabold text-3xl text-[#161616]">Player questions</h3>
          <div className="mt-6 border-2 border-[#161616] bg-white divide-y-2 divide-[#161616]">
            {mustardFaq.map((f) => (
              <details
                key={f.q}
                className="group"
                onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('mustard_faq_open', { q: f.q.slice(0, 40) }); }}
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-sans font-bold text-sm text-[#161616] hover:bg-[#FBF6EA]">
                  {f.q}
                  <span className="font-mono text-[#F5B700] text-lg group-open:rotate-45 transition-transform" style={{ textShadow: '1px 1px 0 #161616' }}>+</span>
                </summary>
                <p className="px-5 pb-5 font-sans text-sm text-[#161616]/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
