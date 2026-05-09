import Link from 'next/link';
import { services } from '@/data/services';

type Props = {
  limit?: number;
  showHeader?: boolean;
};

export default function Services({ limit = 3, showHeader = true }: Props) {
  const items = limit ? services.slice(0, limit) : services;

  return (
    <section id="services" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      {showHeader && (
        <>
          <div className="flex justify-center mb-20">
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
          </div>

          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              What We Build
            </span>
            <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
              <span className="text-gradient-mustard">Creativity</span> x{' '}
              <span className="text-white/80">Strategy</span> x{' '}
              <span className="text-gradient-mustard">Faith</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg font-body font-light leading-relaxed">
              Every engagement is a seed planted. Built with excellence, shipped with conviction, designed to grow beyond what anyone expected.
            </p>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.03] rounded-2xl overflow-hidden mb-12">
        {items.map((service) => (
          <div
            key={service.title}
            className="group p-8 md:p-10 bg-neutral-950/60 hover:bg-neutral-950/40 transition-all duration-500 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 rounded-full blur-[80px] bg-mustard-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative z-10">
              <div className="text-3xl mb-6">{service.icon}</div>

              <h3 className="font-sans text-lg font-bold text-white/90 group-hover:text-white tracking-wide mb-4 transition-colors">
                {service.title}
              </h3>

              <p className="text-white/50 text-sm md:text-base font-body font-light leading-7 mb-6">
                {service.short}
              </p>

              <div className="space-y-2">
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono block mb-2">
                  Key Outcomes
                </span>
                {service.outcomes.map((outcome) => (
                  <div key={outcome} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-mustard-500/50 group-hover:bg-mustard-500/80 transition-colors" />
                    <span className="text-xs text-white/50 group-hover:text-mustard-300/70 font-mono tracking-wide transition-colors">
                      {outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href="/services"
          className="group inline-flex items-center gap-3 border border-mustard-500/20 hover:border-mustard-500/40 px-8 py-4 rounded-full transition-all duration-500 hover:bg-mustard-500/5"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white/40 group-hover:text-mustard-400 transition-colors">
            See All Services
          </span>
          <svg className="w-4 h-4 text-mustard-400/40 group-hover:text-mustard-400 group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
