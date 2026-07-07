import { buildMetadata, SITE } from '@/lib/seo';
import { PRESS, pressTiers, pressFaq } from '@/data/press';
import PressRunExperience from '@/components/press/PressRunExperience';
import { HowThePressWorks, FreshProofs, PressFaqSection, PressCrossSell } from '@/components/press/PressSections';

export const metadata = buildMetadata({
  title: PRESS.metaTitle,
  description: PRESS.metaDescription,
  path: '/press',
});

export default function PressPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'MUSTARD PRESS by Modern Mustard Seed',
        serviceType: 'Menu, price list, and rate sheet design for small businesses',
        description: PRESS.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: pressTiers.map((t) => ({
          '@type': 'Offer',
          name: `MUSTARD PRESS ${t.name}`,
          price: t.priceUsd,
          priceCurrency: 'USD',
          url: `${SITE.url}/press#roll`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'Turn a messy price list into a print-ready menu in a minute',
        step: [
          { '@type': 'HowToStep', name: 'Paste your list', text: 'Your menu, rate sheet, or price list exactly as it is; messy is fine.' },
          { '@type': 'HowToStep', name: 'Review the typeset proof', text: 'Every price parsed exactly as written into a print-quality layout, with an editable review table before anything is final.' },
          { '@type': 'HowToStep', name: 'Lift the watermark', text: 'The clean print-ready US Letter PDF is $97 and downloads instantly, with full commercial rights.' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: pressFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── MASTHEAD + THE PRESS RUN ─── */}
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">{PRESS.wordmark}</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[0.98]">
              That menu taped to<br className="hidden md:block" /> your counter? Ouch.
            </h1>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-5 leading-relaxed">
              {PRESS.promise}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#161616]/50 mt-5">
              Free proof · No card · Every price exactly as you wrote it
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <PressRunExperience />
          </div>
        </div>
      </section>

      <HowThePressWorks />
      <FreshProofs />
      <PressFaqSection />
      <PressCrossSell />

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#F5B700] border-t-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            Your prices do the talking.<br className="hidden md:block" /> Dress them for it.
          </h2>
          <p className="font-body text-[#161616]/75 mt-4 max-w-xl mx-auto">
            The proof takes a minute and costs nothing. Most owners frame it out of spite for the old laminated one.
          </p>
          <a
            href="#top"
            className="inline-block mt-8 rounded-full bg-[#161616] border-2 border-[#161616] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
          >
            Run my proof, free
          </a>
        </div>
      </section>
    </div>
  );
}
