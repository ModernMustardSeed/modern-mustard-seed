import Link from 'next/link';
import { packages } from '@/data/pricing';

export default function PricingTable() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`glass-card p-8 md:p-10 flex flex-col ${
              pkg.highlighted
                ? 'border-mustard-500/40 ring-1 ring-mustard-500/20'
                : 'hover:border-mustard-500/20'
            } transition-all duration-500`}
          >
            {pkg.highlighted && (
              <div className="-mt-12 mb-6 self-start">
                <span className="px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full">
                  Where most start
                </span>
              </div>
            )}

            <div className="mb-6 pb-6 border-b border-white/[0.05]">
              <h3 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-2">
                {pkg.name}
              </h3>
              <p className="text-mustard-400/70 text-sm font-body font-light tracking-wide mb-4">
                {pkg.tagline}
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-mono font-bold">
                Timeline: {pkg.timeline}
              </p>
            </div>

            <p className="text-white/55 text-sm font-body font-light leading-7 mb-6">
              {pkg.description}
            </p>

            {pkg.ideal && (
              <p className="text-white/40 text-xs font-body italic leading-relaxed mb-6">
                Ideal for: {pkg.ideal}
              </p>
            )}

            <div className="space-y-2 mb-8">
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

            <Link
              href={pkg.ctaHref ?? '/contact'}
              className={`mt-auto w-full text-center py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold rounded-lg transition-all duration-300 ${
                pkg.highlighted
                  ? 'text-black bg-gradient-to-r from-mustard-500 to-mustard-400 hover:shadow-[0_0_30px_rgba(200,164,21,0.2)]'
                  : 'text-mustard-400 border border-mustard-500/30 hover:bg-mustard-500/10 hover:border-mustard-500/50'
              }`}
            >
              {pkg.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
