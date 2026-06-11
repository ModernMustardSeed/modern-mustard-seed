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
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-5 block">
          Recent work
        </span>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight mb-4">
          Real products{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            real receipts
          </span>
        </h2>
        <p className="text-[#3a3733] text-base font-body leading-relaxed">
          A range of recent builds. Apps, dashboards, storefronts, specialty AI tools.
        </p>
      </div>

      <div className="max-w-6xl mx-auto mb-3 flex items-center justify-end">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold inline-flex items-center gap-2">
          Scroll
          <span aria-hidden="true" className="text-sm leading-none">&rarr;</span>
        </span>
      </div>
      <div className="mms-hscroll flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 max-w-6xl mx-auto mb-10 items-stretch">
        {studies.map((s) => (
          <div key={s.slug} className="snap-start shrink-0 w-[80vw] sm:w-[330px] md:w-[345px] flex">
          <TiltCard className="w-full">
            <Link
              href={`/work/${s.slug}`}
              className="group pop-card p-6 flex flex-col hover:-translate-y-1 transition-transform duration-300 h-full"
            >
              <div className="flex items-center gap-2.5 mb-4">
                {s.tag && (
                  <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                    {s.tag}
                  </span>
                )}
              </div>

              <h3 className="font-display text-lg md:text-xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                {s.title.split(':')[0]}
              </h3>

              <p className="text-[#3a3733] text-sm font-body leading-6 mb-5 flex-1">
                {s.description}
              </p>

              {s.metrics && s.metrics[0] && (
                <div className="pt-4 border-t-2 border-[#161616]/10">
                  <div className="font-display text-base font-black text-[#E0301E]">
                    {s.metrics[0].value}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/45 font-mono mt-1">
                    {s.metrics[0].label}
                  </div>
                </div>
              )}
            </Link>
          </TiltCard>
          </div>
        ))}
        <div aria-hidden="true" className="shrink-0 w-px" />
      </div>

      <div className="flex justify-center">
        <Link
          href="/work"
          className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-[#161616] hover:text-[#E0301E] transition-colors"
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
