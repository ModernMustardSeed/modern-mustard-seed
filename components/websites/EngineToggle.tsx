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

const SITE = workByKey['dd-landscaping'];
const DOMAIN = 'ddlandscaping.pro';

const BROCHURE_NOTES = [
  'Looks nice. Does nothing.',
  'A visitor leaves and you never know they came.',
  'After hours it just sits there. The lead moves on.',
];
const ENGINE_NOTES = [
  'Every visitor is captured, not just counted.',
  'Follow-up fires in seconds, day or night.',
  'Leads land in your inbox while you sleep.',
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
        <div className="inline-flex items-center rounded-full border-2 border-[#14110c] bg-white p-1 shadow-[3px_3px_0_0_#14110c] mb-5">
          {(['brochure', 'engine'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set(m)}
              aria-pressed={mode === m}
              className={`px-5 py-2 rounded-full text-[11px] font-sans font-extrabold uppercase tracking-[0.14em] transition-colors ${
                mode === m ? 'bg-[#14110c] text-[#f5b700]' : 'text-[#14110c]/60 hover:text-[#14110c]'
              }`}
            >
              {m === 'brochure' ? 'Just a brochure' : 'A working engine'}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#14110c] bg-white shadow-[8px_8px_0_0_#14110c] overflow-hidden">
          {/* browser chrome */}
          <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#14110c] bg-[#f6efe0]">
            <span className="flex gap-1.5">
              {['#b3261e', '#f5b700', '#14110c'].map((c) => (
                <span key={c} className="h-3 w-3 rounded-full border border-[#14110c]" style={{ background: c }} />
              ))}
            </span>
            <span className="ml-2 flex-1 truncate rounded-full border border-[#14110c]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#14110c]/60">
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
              <div className="absolute top-3 right-3 max-w-[62%] rounded-xl border-2 border-[#14110c] bg-[#14110c] px-3.5 py-2.5 shadow-[3px_3px_0_0_#f5b700] animate-[etIn_.45s_ease-out_both]">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#f5b700] font-bold">New lead captured</p>
                <p className="font-sans text-[12px] font-bold text-[#f6efe0] mt-0.5 leading-snug">Filed, and in your inbox</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#14110c]/10">
                <span className="rotate-[-4deg] rounded-lg border-2 border-[#14110c] bg-[#f6efe0] px-4 py-2 font-mono text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#14110c] shadow-[3px_3px_0_0_#14110c]">
                  Pretty. And asleep.
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="font-body text-[12px] text-[#14110c]/70 mt-3 text-center">
          A real site we built for {SITE.name}. Flip it to see the difference.
        </p>
        <style>{`@keyframes etIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      </div>

      {/* The read-out */}
      <div className="lg:col-span-2 lg:sticky lg:top-24">
        <div
          className="rounded-2xl border-2 border-[#14110c] p-6 md:p-7 transition-colors"
          style={{ background: engine ? '#14110c' : '#FFFFFF', boxShadow: engine ? '6px 6px 0 0 #f5b700' : '6px 6px 0 0 #14110c' }}
        >
          <span className={`font-mono font-bold text-[10px] uppercase tracking-[0.24em] block ${engine ? 'text-[#f5b700]' : 'text-[#C4160B]'}`}>
            {engine ? 'Engine mode' : 'Brochure mode'}
          </span>
          <h3 className={`font-display italic font-extrabold text-2xl mt-2 leading-tight ${engine ? 'text-[#f6efe0]' : 'text-[#14110c]'}`}>
            {engine ? 'Every visitor is money you keep.' : 'Every visitor is money you lose.'}
          </h3>
          <ul className="mt-4 space-y-2.5">
            {(engine ? ENGINE_NOTES : BROCHURE_NOTES).map((n) => (
              <li key={n} className={`flex items-start gap-2.5 font-body text-[13.5px] ${engine ? 'text-[#f6efe0]/85' : 'text-[#14110c]/80'}`}>
                <span className={`mt-px font-black ${engine ? 'text-[#f5b700]' : 'text-[#C4160B]'}`} aria-hidden>{engine ? '✓' : '✕'}</span>
                {n}
              </li>
            ))}
          </ul>
          <p className={`mt-5 font-body text-[12.5px] leading-relaxed ${engine ? 'text-[#f6efe0]/70' : 'text-[#14110c]/70'}`}>
            {engine
              ? 'This is what we build. The same beautiful site, wired to capture, follow up, and file every lead on its own.'
              : 'Most small-business sites stop here. Pretty, and completely asleep.'}
          </p>
        </div>
      </div>
    </div>
  );
}
