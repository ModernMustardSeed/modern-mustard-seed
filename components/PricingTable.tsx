import { packages } from '@/data/pricing';
import PricingCard from './PricingCard';

/**
 * Engagement cards as a horizontal snap scroller. One card at a time on
 * mobile, ~2.5 in view on desktop with the next card peeking at the edge
 * (the peek is the scroll affordance). CSS-only, no client JS.
 */
export default function PricingTable() {
  return (
    <section className="w-full py-20">
      {/* Scroll hint */}
      <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 xl:px-32 mb-5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold">
          {packages.length} engagements
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold inline-flex items-center gap-2">
          Scroll
          <span aria-hidden="true" className="text-sm leading-none">&rarr;</span>
        </span>
      </div>

      {/* Scroller */}
      <div className="mms-hscroll flex gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 md:px-16 lg:px-24 xl:px-32 scroll-px-6 md:scroll-px-16 lg:scroll-px-24 xl:scroll-px-32 pb-6 items-stretch">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="snap-start shrink-0 w-[84vw] sm:w-[420px] md:w-[440px] flex"
          >
            <PricingCard pkg={pkg} />
          </div>
        ))}
        {/* End spacer so the last card can snap fully into view */}
        <div aria-hidden="true" className="shrink-0 w-px" />
      </div>
    </section>
  );
}
