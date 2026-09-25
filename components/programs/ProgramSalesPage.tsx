import Link from 'next/link';
import type { Program } from '@/data/programs';
import { programBundle } from '@/data/programs';
import { SITE } from '@/lib/seo';
import BuyButton from './BuyButton';

/**
 * The flagship sales page, rendered for both The Terminal and Idea to Spec.
 * Pop-art brand aesthetic (cream ground, ink bands, hard shadows), mobile-first, with Product + Offer + FAQ JSON-LD so the
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
    <div className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: an ink band with the halftone and the program's brand accent */}
      <section className="relative isolate min-h-[88vh] flex flex-col items-center justify-center px-6 pt-36 pb-20 text-center overflow-hidden bg-[#161616] text-[#FBF6EA] border-b-2 border-[#161616]">
        <div className="absolute inset-0 z-0" style={{ background: `radial-gradient(ellipse at top, ${program.accent}55 0%, #161616 62%)` }} aria-hidden />
        <div className="absolute inset-0 z-0 halftone-ink opacity-80" aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-8 rounded-full border-2 border-[#FBF6EA] bg-[#161616] shadow-[3px_3px_0_0_#F5B700]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5B700]" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#FBF6EA] font-mono font-bold">Modern Mustard Seed</span>
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight leading-[1.02] text-[#FBF6EA]">
            {program.tagline}
          </h1>
          <p className="mt-7 text-[#FBF6EA]/85 text-lg md:text-xl font-body max-w-2xl mx-auto leading-relaxed">
            {program.promise}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <BuyButton slug={program.slug} label={`Get ${program.name} . $${program.priceUsd}`} tone="ink" />
            <span className="text-[#FBF6EA]/60 font-mono text-[11px] tracking-wider">One time . Lifetime access . 14 day guarantee</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-24 space-y-20">
        {/* Who this is for */}
        <Section eyebrow="Who this is for">
          <div className="grid sm:grid-cols-2 gap-5">
            {program.whoFor.map((w) => (
              <div key={w.title} className="pop-card p-6">
                <h3 className="font-display text-lg font-black text-[#161616] tracking-tight mb-1.5">{w.title}</h3>
                <p className="text-[#3a3733] font-body text-sm leading-relaxed">{w.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Value stack */}
        <Section eyebrow="What is inside">
          <div className="space-y-4">
            {program.valueStack.map((v, i) => (
              <div key={v.title} className="flex gap-4 pop-card p-6">
                <span className="font-display text-2xl text-[#B92417] font-black w-8 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display text-lg font-black text-[#161616] tracking-tight mb-1">{v.title}</h3>
                  <p className="text-[#3a3733] font-body text-sm leading-relaxed">{v.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 pop-card-yellow p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616] font-mono font-bold block mb-2">{program.toolName}</span>
            <p className="text-[#161616] font-body text-sm leading-relaxed">{program.toolBlurb}</p>
          </div>
        </Section>

        {/* Method */}
        <Section eyebrow="The method">
          <div className="grid sm:grid-cols-2 gap-5">
            {program.method.map((m) => (
              <div key={m.label} className="border-l-4 border-[#F5B700] pl-4 py-1">
                <h3 className="font-display italic text-xl text-[#161616] mb-1">{m.label}</h3>
                <p className="text-[#3a3733] font-body text-sm leading-relaxed">{m.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Guarantee + price */}
        <Section eyebrow="The guarantee">
          <div className="pop-card-cream halftone-bg p-8 text-center">
            <p className="font-display italic text-xl md:text-2xl text-[#161616] leading-snug mb-4">{program.guarantee}</p>
            <p className="text-[#3a3733] font-body text-sm leading-relaxed max-w-xl mx-auto">{program.priceFraming}</p>
          </div>
        </Section>

        {/* Companion / bundle */}
        <Section eyebrow="The pairing">
          <div className="pop-card p-8 text-center">
            <p className="text-[#161616] font-body font-medium mb-2">{program.companion.line}</p>
            <p className="text-[#3a3733] font-body text-sm mb-6 max-w-xl mx-auto">{programBundle.pitch}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href={program.companion.href} className="px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
                {program.companion.label}
              </Link>
              <BuyButton slug={programBundle.slug} label="Get both . The Zero to One Bundle" className="px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#FBF6EA] bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#F5B700] hover:-translate-y-0.5 transition-all disabled:opacity-50" />
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section eyebrow="Questions">
          <div className="space-y-4">
            {program.faq.map((f) => (
              <div key={f.q} className="pop-card p-6">
                <h3 className="font-display text-lg font-black text-[#161616] tracking-tight mb-1.5">{f.q}</h3>
                <p className="text-[#3a3733] font-body text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Final CTA: the mustard close band */}
      <section className="relative bg-[#F5B700] border-t-2 border-[#161616] px-6 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 stripe-ink opacity-[0.06]" aria-hidden />
        <div className="relative max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-[#161616] mb-8">{program.tagline}</h2>
          <div className="flex flex-col items-center gap-3">
            <BuyButton slug={program.slug} label={`Get ${program.name} . $${program.priceUsd}`} tone="onMustard" />
            <span className="text-[#161616]/75 font-mono text-[11px] tracking-wider">One time . Lifetime access . 14 day guarantee</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <span className="text-[10px] uppercase tracking-[0.4em] text-[#B92417] font-mono font-bold block mb-6 text-center">{eyebrow}</span>
      {children}
    </section>
  );
}
