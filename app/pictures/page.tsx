import { buildMetadata, SITE } from '@/lib/seo';
import { PICTURES, picturesTiers, picturesFaq } from '@/data/pictures';
import ScreenTestExperience from '@/components/pictures/ScreenTestExperience';
import { HowTheStudioWorks, TheReel, PicturesFaqSection, StudioCrossSell } from '@/components/pictures/PicturesSections';

export const metadata = buildMetadata({
  title: PICTURES.metaTitle,
  description: PICTURES.metaDescription,
  path: '/pictures',
});

export default function PicturesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'MUSTARD PICTURES by Modern Mustard Seed',
        serviceType: 'AI-generated commercial video production for small businesses',
        description: PICTURES.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: picturesTiers.map((t) => ({
          '@type': 'Offer',
          name: `MUSTARD PICTURES ${t.name}`,
          price: t.priceUsd,
          priceCurrency: 'USD',
          url: `${SITE.url}/pictures#roll`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'Get a commercial made for your business in days',
        step: [
          { '@type': 'HowToStep', name: 'Take the free Screen Test', text: 'Tell Mr. Mustard your story; he writes your logline, six-shot storyboard, and taglines on the spot, plus one cinematic hero frame.' },
          { '@type': 'HowToStep', name: 'Roll film', text: 'Pick a tier. The studio generates your commercial from the approved treatment: your business, your colors, no stock footage.' },
          { '@type': 'HowToStep', name: 'Opening night', text: 'Hand-reviewed cuts land in your inbox within days: widescreen, vertical, and square, with full commercial rights.' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: picturesFaq.map((f) => ({
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

      {/* ─── MARQUEE + THE SCREEN TEST ─── */}
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">{PICTURES.wordmark}</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[0.98]">
              Your business deserves<br className="hidden md:block" /> a better trailer.
            </h1>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-5 leading-relaxed">
              {PICTURES.promise}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#161616]/50 mt-5">
              Free screen test · No card · The treatment is yours to keep
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ScreenTestExperience />
          </div>
        </div>
      </section>

      <HowTheStudioWorks />
      <TheReel />
      <PicturesFaqSection />
      <StudioCrossSell />

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#F5B700] border-t-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            The big brands have commercials.<br className="hidden md:block" /> Now so do you.
          </h2>
          <p className="font-body text-[#161616]/75 mt-4 max-w-xl mx-auto">
            Sixty seconds of your time gets you a director&apos;s treatment worth keeping. Filming it costs less than one slow Friday.
          </p>
          <a
            href="#top"
            className="inline-block mt-8 rounded-full bg-[#161616] border-2 border-[#161616] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
          >
            Take my screen test
          </a>
        </div>
      </section>
    </div>
  );
}
