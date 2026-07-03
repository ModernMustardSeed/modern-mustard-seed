import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { MUSTARD, mustardLevels, mustardFaq } from '@/data/mustard-mode/offer';
import MultiplierHero from '@/components/mustard-mode/MultiplierHero';
import OfferGrid from '@/components/mustard-mode/OfferGrid';
import { MethodSection, TrackRail, ProofSection, Ticker } from '@/components/mustard-mode/LandingSections';

export const metadata = buildMetadata({
  title: MUSTARD.metaTitle,
  description: MUSTARD.metaDescription,
  path: '/mustard-mode',
});

export default function MustardModePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        name: 'MUSTARD MODE',
        description: MUSTARD.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT14H',
        },
        offers: mustardLevels
          .filter((l) => l.level > 0)
          .map((l) => ({
            '@type': 'Offer',
            name: `MUSTARD MODE ${l.name}`,
            price: l.priceUsd,
            priceCurrency: 'USD',
            url: `${SITE.url}/mustard-mode#levels`,
            availability: 'https://schema.org/InStock',
          })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: mustardFaq.map((f) => ({
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

      <MultiplierHero />
      <Ticker />
      <MethodSection />
      <TrackRail />
      <ProofSection />
      <Ticker reverse />
      <OfferGrid />

      {/* Closer */}
      <section className="bg-[#080C16] border-t-2 border-[#161616] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">[ MUSTARD MODE: ON ]</p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-white mt-4 leading-[1.02]">
            The seed is small.<br />The tree is not.
          </h2>
          <a
            href="#levels"
            className="inline-block mt-8 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[5px_5px_0_0_#FFDD55] px-8 py-4 hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#FFDD55] transition-all"
          >
            Choose your level
          </a>
          <p className="font-sans text-sm text-white/50 mt-6">
            Already playing? <Link href="/mustard-mode/hq" className="text-[#FFDD55] underline underline-offset-4">Open your HQ</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
