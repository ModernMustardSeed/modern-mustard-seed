'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';

/**
 * The signature moment for /websites: flip the same site between "Brochure"
 * (pretty, dead) and "Engine" (answers the phone, captures the lead, follows up).
 * Makes the whole "not a brochure, a working engine" positioning visceral in one
 * tap. Pop-art cabin styling. One browser frame, two states.
 */

type Mode = 'brochure' | 'engine';

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
  const [mode, setMode] = useState<Mode>('engine');
  const engine = mode === 'engine';

  const set = (m: Mode) => {
    setMode(m);
    track('websites_engine_toggle', { mode: m });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-start">
      {/* The browser frame */}
      <div className="lg:col-span-3">
        {/* Toggle */}
        <div className="inline-flex items-center rounded-full border-2 border-[#161616] bg-white p-1 shadow-[3px_3px_0_0_#161616] mb-5">
          {(['brochure', 'engine'] as Mode[]).map((m) => (
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
              summitroofing.co
            </span>
          </div>

          {/* the site itself */}
          <div className="relative" style={{ transition: 'filter .5s ease' }}>
            <div
              className="p-7 sm:p-9"
              style={{
                filter: engine ? 'none' : 'grayscale(0.85) opacity(0.72)',
                transition: 'filter .5s ease',
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#C4160B] font-bold">Kalispell, MT · Roofing</span>
              <p className="font-display italic font-extrabold text-2xl sm:text-3xl text-[#161616] mt-2 leading-tight">
                Summit Roofing Co
              </p>
              <p className="font-body text-[13.5px] text-[#161616]/75 mt-2 leading-relaxed max-w-sm">
                Storm-ready roofs, done right and documented to the shingle. Serving the Flathead for 18 years.
              </p>
              <span className="inline-block mt-4 rounded-full border-2 border-[#161616] bg-[#F5B700] px-5 py-2.5 text-[11px] font-sans font-extrabold uppercase tracking-[0.14em] text-[#161616]">
                Get a free estimate
              </span>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Licensed & insured', '4.9 ★ Google', 'Insurance claims'].map((t) => (
                  <span key={t} className="rounded-full border border-[#161616]/25 px-2.5 py-1 font-mono text-[10px] text-[#161616]/70">{t}</span>
                ))}
              </div>
            </div>

            {/* Engine overlays: receptionist + lead toast */}
            {engine && (
              <>
                <div className="absolute top-4 right-4 max-w-[62%] rounded-xl border-2 border-[#161616] bg-[#161616] px-3.5 py-2.5 shadow-[3px_3px_0_0_#F5B700] animate-[etIn_.45s_ease-out_both]">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#F5B700] font-bold">New lead captured</p>
                  <p className="font-sans text-[12px] font-bold text-[#FBF6EA] mt-0.5 leading-snug">Rita M. → filed to your command center</p>
                </div>
                <div className="absolute bottom-4 right-4 flex items-end gap-2 animate-[etIn_.45s_ease-out_.15s_both]">
                  <div className="max-w-[58%] rounded-2xl rounded-br-sm border-2 border-[#161616] bg-white px-3.5 py-2.5 shadow-[3px_3px_0_0_#161616]">
                    <p className="font-sans text-[12px] text-[#161616] leading-snug">Hi! Roof leaking? I can book you in tonight.</p>
                  </div>
                  <span className="h-10 w-10 shrink-0 rounded-full border-2 border-[#161616] bg-[#F5B700] grid place-items-center text-lg">🎙</span>
                </div>
              </>
            )}
          </div>
        </div>
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
              ? 'This is what we build. Same beautiful site, wired to answer, capture, and follow up on its own.'
              : 'Most small-business sites stop here. Pretty, and completely asleep.'}
          </p>
        </div>
      </div>
    </div>
  );
}
