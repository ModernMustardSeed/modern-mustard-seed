'use client';

// Auto-scrolling band of real metrics pulled from the case studies.
// Magnetic social proof without faking testimonials.

const RESULTS = [
  { metric: '$30K commission', arrow: '→', outcome: '$99 monthly tool', client: 'DEED AI' },
  { metric: '2 hours', arrow: '→', outcome: '90 seconds per deal', client: 'PTG AI Deal Analyzer' },
  { metric: 'Sketch', arrow: '→', outcome: 'Live storefront in 60 days', client: 'Cross + Covenant' },
  { metric: 'Empty room photo', arrow: '→', outcome: 'Staged in 60 seconds', client: 'Luxe Design' },
  { metric: '3 hours of small jobs', arrow: '→', outcome: '30 minutes of review', client: 'Wild Daisy' },
  { metric: '30% missed calls', arrow: '→', outcome: '24/7 coverage', client: 'VoiceStaff' },
  { metric: 'Idea', arrow: '→', outcome: 'Live product in 30 days', client: 'Olive Shoot' },
  { metric: 'One creative director', arrow: '→', outcome: 'Six concepts an afternoon', client: 'CXC Studio' },
];

export default function ResultsMarquee() {
  // Duplicate for seamless infinite scroll
  const items = [...RESULTS, ...RESULTS];

  return (
    <section className="w-full py-12 md:py-16 border-y border-white/[0.04] bg-night-900/20 backdrop-blur-sm overflow-hidden">
      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: scroll-left 50s linear infinite;
          gap: 56px;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
        }
      `}</style>

      <div className="text-center mb-6">
        <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium">
          What gets shipped
        </span>
      </div>

      <div className="relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #1A1140, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #1A1140, transparent)' }}
        />

        <div className="marquee-track">
          {items.map((r, i) => (
            <div key={`${r.client}-${i}`} className="flex items-center gap-4 whitespace-nowrap flex-shrink-0">
              <span className="font-sans text-base md:text-lg font-medium text-white/55">
                {r.metric}
              </span>
              <span className="text-gradient-mustard text-xl font-semibold">{r.arrow}</span>
              <span className="font-sans text-base md:text-lg font-semibold text-white">
                {r.outcome}
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/50 font-mono font-medium ml-2">
                {r.client}
              </span>
              <span className="text-white/15 text-xl mx-2">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
