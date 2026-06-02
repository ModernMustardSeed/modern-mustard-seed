import Link from 'next/link';

/**
 * Homepage lead-gen block. The free Website Audit is the hero here. it is the
 * top of the client funnel (audit -> discovery -> build). The two $497 programs
 * (Idea to Spec, The Terminal) are demoted to a small CTA that points into the
 * store, where they stay fully featured.
 */
const AUDIT_DIMENSIONS = [
  'Brand',
  'Trust',
  'SEO',
  'GEO',
  'AI Features',
  'Conversion',
  'Design',
];

export default function FlagshipPrograms() {
  return (
    <section className="relative w-full px-6 md:px-10 py-20 md:py-28 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Free Website Audit, the hero of this section */}
        <div className="relative rounded-3xl border border-gold-light/25 bg-midnight-700/50 overflow-hidden campfire-glow">
          {/* warm brass wash */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 18% 15%, rgba(232,200,138,0.16) 0%, transparent 55%), radial-gradient(circle at 88% 90%, rgba(255,107,53,0.14) 0%, transparent 55%)',
            }}
          />
          <div className="relative z-10 p-8 md:p-14 text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-bold block mb-5">
              Start here . Free . 60 seconds
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-cream-50 tracking-tight leading-[1.02]">
              Get your free <span className="text-gradient-mustard">Website Audit</span>
            </h2>
            <p className="text-white/60 font-body text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
              Drop your URL and get a letter grade across brand, trust, SEO, GEO,
              AI features, conversion, and design. plus a prioritized to-do list
              you can act on today.
            </p>

            {/* Dimension chips */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
              {AUDIT_DIMENSIONS.map((d) => (
                <span
                  key={d}
                  className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] font-mono font-bold text-gold-light/80 border border-gold-light/20 rounded-full px-3.5 py-1.5"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Primary + secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/website-audit"
                className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.45)] transition-all"
              >
                Audit my website
              </Link>
              <Link
                href="/book"
                className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-gold-light border border-gold-light/30 rounded-full hover:bg-gold-light/10 hover:border-gold-light/50 transition-all"
              >
                Book a free call
              </Link>
            </div>
          </div>
        </div>

        {/* Small CTA: learn-to-build-it-yourself programs live in the store */}
        <p className="text-center text-white/50 font-body text-sm mt-8">
          Rather build it yourself? Our flagship programs,{' '}
          <span className="text-cream-100/80">Idea to Spec</span> and{' '}
          <span className="text-cream-100/80">The Terminal</span> ($497 each),
          live in the{' '}
          <Link
            href="/store"
            className="text-gold-light hover:text-gold-bright underline underline-offset-4"
          >
            store
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
