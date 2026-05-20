import Link from 'next/link';
import { getContent } from '@/lib/content';
import TiltCard from './TiltCard';

// Hand-curated featured work for the homepage. Order matters.
// Edit this list to control what shows on the homepage without changing dates.
const FEATURED_SLUGS = [
  'cxc-studio',
  'deed-ai',
  'ptg-deal-analyzer',
  'cross-and-covenant',
  'voicestaff',
  'olive-shoot',
];

export default function WhatGetsBuilt() {
  const studies = FEATURED_SLUGS.map((slug) => getContent('work', slug))
    .filter((c): c is NonNullable<ReturnType<typeof getContent>> => c !== null)
    .map((c) => c.meta);

  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20 md:py-28">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
          Recent work
        </span>
        <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
          Real products. <span className="text-gradient-mustard">Real receipts.</span>
        </h2>
        <p className="text-white/55 text-base font-body font-light leading-relaxed">
          A range of recent builds. Apps, dashboards, storefronts, specialty AI tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto mb-12">
        {studies.map((s) => (
          <TiltCard key={s.slug}>
            <Link
              href={`/work/${s.slug}`}
              className="group glass-card p-6 flex flex-col hover:border-mustard-500/20 transition-all duration-500 h-full"
            >
              <div className="flex items-center gap-2.5 mb-4">
                {s.tag && (
                  <span className="skill-pill text-mustard-400/70 border-mustard-500/20 text-[8px]">
                    {s.tag}
                  </span>
                )}
              </div>

              <h3 className="font-sans text-lg md:text-xl font-semibold text-white/95 tracking-tight mb-3 leading-snug">
                {s.title.split(':')[0]}
              </h3>

              <p className="text-white/50 text-sm font-body font-light leading-6 mb-5 flex-1">
                {s.description}
              </p>

              {s.metrics && s.metrics[0] && (
                <div className="pt-4 border-t border-white/[0.05]">
                  <div className="font-sans text-base font-semibold text-mustard-300/80">
                    {s.metrics[0].value}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.25em] text-white/35 font-mono mt-1">
                    {s.metrics[0].label}
                  </div>
                </div>
              )}
            </Link>
          </TiltCard>
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href="/work"
          className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-sans font-medium text-white/50 hover:text-mustard-400 transition-colors"
        >
          See all the work
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
