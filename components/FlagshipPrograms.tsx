import Link from 'next/link';

/**
 * Homepage lead-gen block. The free Website Audit is the hero here, the top of
 * the client funnel (audit -> discovery -> build). The two $497 programs (Idea
 * to Spec, The Terminal) are a small CTA that points into the store.
 */
const AUDIT_DIMENSIONS = ['Brand', 'Trust', 'SEO', 'GEO', 'AI Features', 'Conversion', 'Design'];

export default function FlagshipPrograms() {
  return (
    <section className="relative w-full px-6 md:px-10 py-20 md:py-28 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-60 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto">
        {/* Free Website Audit, the hero of this section */}
        <div className="pop-card-yellow overflow-hidden">
          <div className="relative z-10 p-8 md:p-14 text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold block mb-5">
              Start here . Free . 60 seconds
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.02]">
              Get your free{' '}
              <span className="text-white" style={{ WebkitTextStroke: '2px #161616' }}>
                Website Audit
              </span>
            </h2>
            <p className="text-[#161616]/80 font-body font-medium text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
              Drop your URL and get a letter grade across brand, trust, SEO, GEO, AI features,
              conversion, and design. Plus a prioritized to-do list you can act on today.
            </p>

            {/* Dimension chips */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
              {AUDIT_DIMENSIONS.map((d) => (
                <span
                  key={d}
                  className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full px-3.5 py-1.5"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Primary + secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/website-audit"
                className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
              >
                Audit my website
              </Link>
              <Link
                href="/book"
                className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a free call
              </Link>
            </div>
          </div>
        </div>

        {/* Small CTA: learn-to-build-it-yourself programs live in the store */}
        <p className="text-center text-[#161616]/70 font-body text-sm mt-8">
          Rather build it yourself? Our flagship programs,{' '}
          <span className="font-bold text-[#161616]">Idea to Spec</span> and{' '}
          <span className="font-bold text-[#161616]">The Terminal</span> ($497 each), live in the{' '}
          <Link href="/store" className="text-[#E0301E] font-bold underline underline-offset-4 hover:text-[#161616]">
            store
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
