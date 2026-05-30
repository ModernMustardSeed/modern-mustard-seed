import Link from 'next/link';
import type { Program } from '@/data/programs';
import { programBundle } from '@/data/programs';
import { SITE } from '@/lib/seo';
import BuyButton from './BuyButton';

/**
 * The flagship sales page, rendered for both The Terminal and Idea to Spec.
 * Dark brand aesthetic, mobile-first, with Product + Offer + FAQ JSON-LD so the
 * program is indexable for AI shopping and search.
 */
export default function ProgramSalesPage({ program }: { program: Program }) {
  const url = `${SITE.url}/${program.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#product`,
        name: program.name,
        description: program.promise,
        brand: { '@type': 'Brand', name: SITE.name },
        category: 'Online course',
        offers: {
          '@type': 'Offer',
          price: program.priceUsd,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url,
          seller: { '@type': 'Organization', name: SITE.name },
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: program.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="bg-[#080c16] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative isolate min-h-[88vh] flex flex-col items-center justify-center px-6 pt-36 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: `radial-gradient(ellipse at top, ${program.accent}cc 0%, #080c16 60%)` }} aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-8 rounded-full border border-cream-100/30 bg-midnight-700/35 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-light" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-cream-100 font-mono font-medium">Modern Mustard Seed</span>
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-cream-50 drop-shadow-[0_3px_30px_rgba(8,12,22,0.75)]">
            {program.tagline}
          </h1>
          <p className="mt-7 text-cream-100/85 text-lg md:text-xl font-body font-light max-w-2xl mx-auto leading-relaxed">
            {program.promise}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <BuyButton slug={program.slug} label={`Get ${program.name} . $${program.priceUsd}`} />
            <span className="text-white/40 font-mono text-[11px] tracking-wider">One time . Lifetime access . 14 day guarantee</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-20">
        {/* Who this is for */}
        <Section eyebrow="Who this is for">
          <div className="grid sm:grid-cols-2 gap-4">
            {program.whoFor.map((w) => (
              <div key={w.title} className="glass-card p-5">
                <h3 className="font-sans text-base font-semibold text-white mb-1.5">{w.title}</h3>
                <p className="text-white/55 font-body text-sm leading-relaxed">{w.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Value stack */}
        <Section eyebrow="What is inside">
          <div className="space-y-3">
            {program.valueStack.map((v, i) => (
              <div key={v.title} className="flex gap-4 glass-card p-5">
                <span className="font-display text-2xl text-gold-light/70 font-semibold w-8 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-sans text-base font-semibold text-white mb-1">{v.title}</h3>
                  <p className="text-white/55 font-body text-sm leading-relaxed">{v.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-gold-light/20 bg-midnight-700/40 p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/85 font-mono font-bold block mb-2">{program.toolName}</span>
            <p className="text-cream-100/80 font-body text-sm leading-relaxed">{program.toolBlurb}</p>
          </div>
        </Section>

        {/* Method */}
        <Section eyebrow="The method">
          <div className="grid sm:grid-cols-2 gap-4">
            {program.method.map((m) => (
              <div key={m.label} className="border-l-2 border-gold-light/40 pl-4 py-1">
                <h3 className="font-display italic text-xl text-cream-50 mb-1">{m.label}</h3>
                <p className="text-white/55 font-body text-sm leading-relaxed">{m.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Guarantee + price */}
        <Section eyebrow="The guarantee">
          <div className="glass-card p-7 text-center">
            <p className="font-display italic text-xl md:text-2xl text-cream-50 leading-snug mb-4">{program.guarantee}</p>
            <p className="text-white/50 font-body text-sm leading-relaxed max-w-xl mx-auto">{program.priceFraming}</p>
          </div>
        </Section>

        {/* Companion / bundle */}
        <Section eyebrow="The pairing">
          <div className="glass-card p-7 text-center">
            <p className="text-white/70 font-body mb-2">{program.companion.line}</p>
            <p className="text-cream-100/90 font-body text-sm mb-5 max-w-xl mx-auto">{programBundle.pitch}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={program.companion.href} className="px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-cream-100 border border-cream-100/30 rounded-full hover:border-cream-100/55 transition-all">
                {program.companion.label}
              </Link>
              <BuyButton slug={programBundle.slug} label="Get both . The Zero to One Bundle" className="px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-cream-50 bg-brass rounded-full hover:shadow-[0_0_30px_rgba(255,107,53,0.4)] transition-all disabled:opacity-50" />
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section eyebrow="Questions">
          <div className="space-y-3">
            {program.faq.map((f) => (
              <div key={f.q} className="glass-card p-5">
                <h3 className="font-sans text-base font-semibold text-white mb-1.5">{f.q}</h3>
                <p className="text-white/55 font-body text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Final CTA */}
        <div className="text-center pt-4">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-cream-50 mb-7">{program.tagline}</h2>
          <div className="flex flex-col items-center gap-3">
            <BuyButton slug={program.slug} label={`Get ${program.name} . $${program.priceUsd}`} />
            <span className="text-white/40 font-mono text-[11px] tracking-wider">One time . Lifetime access . 14 day guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <span className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80 font-mono font-bold block mb-6 text-center">{eyebrow}</span>
      {children}
    </section>
  );
}
