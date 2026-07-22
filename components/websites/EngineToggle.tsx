'use client';

import { useState } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { workByKey } from '@/data/website-work';

/**
 * The signature moment for /websites: flip a REAL site we built between "brochure"
 * (drained to gray, dead) and "engine" (full living color, answering and capturing).
 * Same beautiful site, one tap apart. Pop-art cabin framing.
 */

const SITE = workByKey['fiat-lux'];
const DOMAIN = 'fiatluxdesign.co';

const BROCHURE_NOTES = [
  'Looks nice. Does nothing.',
  'A visitor leaves and you never know they came.',
  'The phone rings after hours. Nobody answers.',
];
const ENGINE_NOTES = [
  'An AI receptionist answers every call, 24/7.',
  'Every visitor is captured and followed up in seconds.',
  'Leads land in your command center while you sleep.',
];

export default function EngineToggle() {
  const [mode, setMode] = useState<'brochure' | 'engine'>('engine');
  const engine = mode === 'engine';

  const set = (m: 'brochure' | 'engine') => {
    setMode(m);
    track('websites_engine_toggle', { mode: m });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-start">
      {/* The real site, framed */}
      <div className="lg:col-span-3">
        <div className="inline-flex items-center rounded-full border-2 border-[#161616] bg-white p-1 shadow-[3px_3px_0_0_#161616] mb-5">
          {(['brochure', 'engine'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set(m)}
              aria-pressed={mode === m}
              className={`px-5 py-2 rounded-full text-[11px] font-sans font-extrabold uppercase tracking-[0.14em] transition-colors ${
                mode === m ? 'bg-[#161616] text-[#F5B700]' : 'text-[#161616]/60 hover:text-[#161616]'
              }`}
            >
              {m === 'brochure' ? 'Just a brochure' : 'A working engine'}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] overflow-hidden">
          {/* browser chrome */}
          <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#161616] bg-[#FBF6EA]">
            <span className="flex gap-1.5">
              {['#E0301E', '#F5B700', '#8FA98F'].map((c) => (
                <span key={c} className="h-3 w-3 rounded-full border border-[#161616]" style={{ background: c }} />
              ))}
            </span>
            <span className="ml-2 flex-1 truncate rounded-full border border-[#161616]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#161616]/60">
              {DOMAIN}
            </span>
          </div>

          {/* the real screenshot, drained or alive */}
          <div className="relative">
            <Image
              src={SITE.img}
              alt={`${SITE.name}, a real ${SITE.trade.toLowerCase()} website designed and built by Modern Mustard Seed`}
              width={1600}
              height={1000}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="block w-full h-auto"
              style={{ filter: engine ? 'none' : 'grayscale(1) contrast(0.92) opacity(0.78)', transition: 'filter .55s ease' }}
            />

            {/* Engine: the site is working. */}
            {engine ? (
              <div className="absolute top-3 right-3 max-w-[62%] rounded-xl border-2 border-[#161616] bg-[#161616] px-3.5 py-2.5 shadow-[3px_3px_0_0_#F5B700] animate-[etIn_.45s_ease-out_both]">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#F5B700] font-bold">New lead captured</p>
                <p className="font-sans text-[12px] font-bold text-[#FBF6EA] mt-0.5 leading-snug">Filed to your command center</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#161616]/10">
                <span className="rotate-[-4deg] rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-4 py-2 font-mono text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#161616] shadow-[3px_3px_0_0_#161616]">
                  Pretty. And asleep.
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="font-body text-[12px] text-[#161616]/70 mt-3 text-center">
          A real site we built for {SITE.name}. Flip it to see the difference.
        </p>
        <style>{`@keyframes etIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      </div>

      {/* The read-out */}
      <div className="lg:col-span-2 lg:sticky lg:top-24">
        <div
          className="rounded-2xl border-2 border-[#161616] p-6 md:p-7 transition-colors"
          style={{ background: engine ? '#161616' : '#FFFFFF', boxShadow: engine ? '6px 6px 0 0 #F5B700' : '6px 6px 0 0 #161616' }}
        >
          <span className={`font-mono font-bold text-[10px] uppercase tracking-[0.24em] block ${engine ? 'text-[#F5B700]' : 'text-[#C4160B]'}`}>
            {engine ? 'Engine mode' : 'Brochure mode'}
          </span>
          <h3 className={`font-display italic font-extrabold text-2xl mt-2 leading-tight ${engine ? 'text-[#FBF6EA]' : 'text-[#161616]'}`}>
            {engine ? 'Every visitor is money you keep.' : 'Every visitor is money you lose.'}
          </h3>
          <ul className="mt-4 space-y-2.5">
            {(engine ? ENGINE_NOTES : BROCHURE_NOTES).map((n) => (
              <li key={n} className={`flex items-start gap-2.5 font-body text-[13.5px] ${engine ? 'text-[#FBF6EA]/85' : 'text-[#161616]/80'}`}>
                <span className={`mt-px font-black ${engine ? 'text-[#F5B700]' : 'text-[#C4160B]'}`} aria-hidden>{engine ? '✓' : '✕'}</span>
                {n}
              </li>
            ))}
          </ul>
          <p className={`mt-5 font-body text-[12.5px] leading-relaxed ${engine ? 'text-[#FBF6EA]/70' : 'text-[#161616]/70'}`}>
            {engine
              ? 'This is what we build. The same beautiful site, wired to answer, capture, and follow up on its own.'
              : 'Most small-business sites stop here. Pretty, and completely asleep.'}
          </p>
        </div>
      </div>
    </div>
  );
}
