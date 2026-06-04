'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Engagement } from '@/data/pricing';

export default function PricingCard({ pkg }: { pkg: Engagement }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`relative p-8 md:p-10 flex flex-col overflow-hidden h-full rounded-2xl border-2 border-[#161616] transition-transform duration-300 hover:-translate-y-1 ${
        pkg.highlighted
          ? 'bg-[#F5B700] shadow-[6px_6px_0_0_#161616]'
          : 'bg-white shadow-[5px_5px_0_0_#161616]'
      }`}
    >
      <div className="relative flex flex-col flex-1">
        {pkg.highlighted ? (
          <div className="mb-6 self-start">
            <span className="px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-white bg-[#161616] rounded-full">
              Where most start
            </span>
          </div>
        ) : (
          <div className="mb-6 self-start invisible">
            <span className="px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-mono font-bold">
              spacer
            </span>
          </div>
        )}

        {/* Identical top block: name, tagline, timeline */}
        <div className="mb-6 pb-6 border-b-2 border-[#161616]/15">
          <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-2">
            {pkg.name}
          </h3>
          <p className="text-[#161616]/70 text-sm font-body font-medium tracking-wide mb-4 min-h-[42px]">
            {pkg.tagline}
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#161616]/45 font-mono font-bold">
            Timeline: {pkg.timeline}
          </p>
        </div>

        {/* Short intro: first sentence of description for visual parity */}
        <p className="text-[#3a3733] text-sm font-body leading-7 mb-5 min-h-[84px]">
          {firstSentences(pkg.description, open ? 99 : 2)}
        </p>

        {/* Expanded details */}
        <div
          className={`grid transition-all duration-500 ease-out ${
            open ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0 mb-0'
          }`}
        >
          <div className="overflow-hidden">
            {pkg.ideal && (
              <p className="text-[#161616]/55 text-xs font-body italic leading-relaxed mb-5">
                Ideal for: {pkg.ideal}
              </p>
            )}
            <div className="space-y-2 mb-2">
              <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
                What you get
              </span>
              {pkg.deliverables.map((d) => (
                <div key={d} className="flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-[#E0301E] flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-[#3a3733] font-body leading-relaxed">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-6 text-left text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#E0301E] hover:text-[#161616] transition-colors inline-flex items-center gap-2"
        >
          <span>{open ? 'Hide details' : 'Read details'}</span>
          <span className={`inline-block transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>↓</span>
        </button>

        {/* CTA always at the bottom */}
        <Link
          href={pkg.ctaHref ?? '/contact'}
          className={`mt-auto w-full text-center py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-lg border-2 border-[#161616] transition-all duration-300 hover:-translate-y-0.5 ${
            pkg.highlighted
              ? 'text-white bg-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)]'
              : 'text-[#161616] bg-[#F5B700] shadow-[4px_4px_0_0_#161616]'
          }`}
        >
          {pkg.cta}
        </Link>
      </div>
    </div>
  );
}

function firstSentences(text: string, n: number): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.slice(0, n).join(' ');
}
