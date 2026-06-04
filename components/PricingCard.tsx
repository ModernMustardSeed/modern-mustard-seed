'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Engagement } from '@/data/pricing';
import SnowDrift from './SnowDrift';

export default function PricingCard({ pkg }: { pkg: Engagement }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`relative glass-card p-8 md:p-10 flex flex-col overflow-hidden h-full ${
        pkg.highlighted
          ? 'border-mustard-500/40 ring-1 ring-mustard-500/20'
          : 'hover:border-mustard-500/20'
      } transition-all duration-500`}
    >
      {pkg.highlighted && <SnowDrift density="medium" />}
      <div className="relative flex flex-col flex-1">
        {pkg.highlighted ? (
          <div className="mb-6 self-start">
            <span className="px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full">
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

        {/* Identical top block: name, tagline, price, timeline */}
        <div className="mb-6 pb-6 border-b border-white/[0.05]">
          <h3 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-2">
            {pkg.name}
          </h3>
          <p className="text-mustard-400/70 text-sm font-body font-light tracking-wide mb-4 min-h-[42px]">
            {pkg.tagline}
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-mono font-bold">
            Timeline: {pkg.timeline}
          </p>
        </div>

        {/* Short intro: first sentence of description for visual parity */}
        <p className="text-white/55 text-sm font-body font-light leading-7 mb-5 min-h-[84px]">
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
              <p className="text-white/40 text-xs font-body italic leading-relaxed mb-5">
                Ideal for: {pkg.ideal}
              </p>
            )}
            <div className="space-y-2 mb-2">
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
                What you get
              </span>
              {pkg.deliverables.map((d) => (
                <div key={d} className="flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-mustard-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-white/65 font-body leading-relaxed">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-6 text-left text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-mustard-400/85 hover:text-mustard-300 transition-colors inline-flex items-center gap-2"
        >
          <span>{open ? 'Hide details' : 'Read details'}</span>
          <span
            className={`inline-block transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
          >
            ↓
          </span>
        </button>

        {/* CTA always at the bottom */}
        <Link
          href={pkg.ctaHref ?? '/contact'}
          className={`mt-auto w-full text-center py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold rounded-lg transition-all duration-300 ${
            pkg.highlighted
              ? 'text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 hover:shadow-[0_0_30px_rgba(255,107,53,0.2)]'
              : 'text-mustard-400 border border-mustard-500/30 hover:bg-mustard-500/10 hover:border-mustard-500/50'
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
