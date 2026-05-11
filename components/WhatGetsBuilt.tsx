import Link from 'next/link';

const features = [
  {
    slug: 'deed-ai',
    name: 'DEED AI',
    problem: 'Sellers pay $30K agent commissions for help AI now does in seconds.',
    build: 'FSBO command center: listing, pricing, offer scoring, contract automation.',
    outcome: 'Replaced a $30K agent commission with a $99 monthly tool.',
    stack: 'Next.js. Supabase. Claude API.',
  },
  {
    slug: 'ptg-deal-analyzer',
    name: 'PTG AI Deal Analyzer v3',
    problem: 'Investors spend two hours analyzing a single property.',
    build: 'Six AI intelligence layers running on RentCast data.',
    outcome: 'Cut deal evaluation from 2 hours to 90 seconds.',
    stack: 'Next.js. RentCast. Claude API.',
  },
  {
    slug: 'cross-and-covenant',
    name: 'Cross + Covenant',
    problem: 'Faith fashion is either kitschy or low-craft. A brand vacuum.',
    build: 'Headless Shopify, two-tier production, hand-numbered signature collection.',
    outcome: 'Sketch to live storefront with a full collection in under 60 days.',
    stack: 'Shopify. Printify. Apliiq. WebGL.',
  },
];

export default function WhatGetsBuilt() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-24 md:py-32">
      <div className="flex justify-center mb-16">
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          What gets built
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-5">
          Real <span className="text-gradient-mustard">Receipts</span>.
        </h2>
        <p className="text-white/55 text-base md:text-lg font-body font-light leading-relaxed">
          Three recent builds. Real problems. Real outcomes. Real stacks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {features.map((f) => (
          <Link
            key={f.slug}
            href={`/work/${f.slug}`}
            className="group glass-card p-7 md:p-8 flex flex-col hover:border-mustard-500/20 transition-all duration-500"
          >
            <h3 className="font-sans text-xl md:text-2xl font-bold text-white tracking-tight mb-5 leading-snug group-hover:text-mustard-100 transition-colors">
              {f.name}
            </h3>

            <div className="space-y-4 mb-6 flex-1">
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold block mb-1.5">
                  Problem
                </span>
                <p className="text-white/55 text-sm font-body font-light leading-6">{f.problem}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold block mb-1.5">
                  Build
                </span>
                <p className="text-white/55 text-sm font-body font-light leading-6">{f.build}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold block mb-1.5">
                  Outcome
                </span>
                <p className="text-mustard-300/85 text-sm font-body leading-6">{f.outcome}</p>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 font-mono pt-5 border-t border-white/[0.05]">
              {f.stack}
            </p>
          </Link>
        ))}
      </div>

      <p className="text-center text-white/45 text-base font-body font-light italic max-w-2xl mx-auto mb-10">
        This is how we ship in general.
      </p>

      <div className="flex justify-center">
        <Link
          href="/work"
          className="group inline-flex items-center gap-3 border border-mustard-500/20 hover:border-mustard-500/40 px-8 py-4 rounded-full transition-all duration-500 hover:bg-mustard-500/5"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white/40 group-hover:text-mustard-400 transition-colors">
            See the Full Portfolio
          </span>
          <svg
            className="w-4 h-4 text-mustard-400/40 group-hover:text-mustard-400 group-hover:translate-x-1 transition-all duration-300"
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
