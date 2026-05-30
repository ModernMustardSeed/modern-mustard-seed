import Link from 'next/link';
import { programs, programBundle } from '@/data/programs';

/**
 * Homepage feature block. The two $497 front doors (Idea to Spec, The Terminal)
 * framed as "spec it, then build it," plus the free Website Audit CTA that was
 * previously only surfaced inside emails.
 */
export default function FlagshipPrograms() {
  const ordered = ['idea-to-spec', 'the-terminal']
    .map((s) => programs.find((p) => p.slug === s)!)
    .filter(Boolean);

  return (
    <section className="relative w-full px-6 md:px-10 py-20 md:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80 font-mono font-bold block mb-4">Learn to build it yourself</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-cream-50 tracking-tight leading-tight">
            Spec it. Then build it.
          </h2>
          <p className="text-white/55 font-body mt-4 max-w-2xl mx-auto">
            Two flagship programs, the front half and the back half of taking something from nothing to shipped. Yours for life, kept current as the tools grow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {ordered.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="group relative rounded-2xl border border-white/[0.08] p-7 overflow-hidden hover:border-gold-light/30 transition-all"
              style={{ background: `linear-gradient(155deg, ${p.accent}55 0%, rgba(8,12,22,0.6) 70%)` }}
            >
              <div className="relative z-10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/85 font-mono font-bold">{p.name} . ${p.priceUsd}</span>
                <h3 className="font-display text-2xl md:text-3xl font-semibold text-cream-50 mt-3 leading-tight">{p.tagline}</h3>
                <p className="text-white/60 font-body text-sm mt-3 leading-relaxed">{p.promise}</p>
                <span className="inline-flex items-center gap-2 mt-5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-gold-light group-hover:gap-3 transition-all">
                  Explore {p.name} <span aria-hidden>&rarr;</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-white/45 font-body text-sm mt-6">
          Want both? <Link href="/the-terminal" className="text-gold-light hover:text-gold-bright underline underline-offset-4">The Zero to One Bundle</Link> pairs them at one price.
        </p>

        {/* Website Audit CTA (previously email-only) */}
        <div className="mt-12 rounded-2xl border border-gold-light/20 bg-midnight-700/40 p-7 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="text-center md:text-left">
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/85 font-mono font-bold block mb-2">Free . 60 seconds</span>
            <h3 className="font-display text-2xl font-semibold text-cream-50">Get your free Website Audit</h3>
            <p className="text-white/55 font-body text-sm mt-2 max-w-xl">
              Drop your URL and get a letter grade across brand, trust, SEO, GEO, AI features, conversion, and design, plus a prioritized to-do list.
            </p>
          </div>
          <Link
            href="/website-audit"
            className="flex-shrink-0 px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.45)] transition-all"
          >
            Audit my website
          </Link>
        </div>
      </div>
    </section>
  );
}
