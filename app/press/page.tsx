import { buildMetadata, SITE } from '@/lib/seo';
import { PRESS, pressTiers, pressFaq } from '@/data/press';
import PressRunExperience from '@/components/press/PressRunExperience';
import { HowThePressWorks, FreshProofs, PressFaqSection, PressCrossSell } from '@/components/press/PressSections';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: PRESS.metaTitle,
  description: PRESS.metaDescription,
  path: '/press',
  // Route-level card. buildMetadata sets openGraph.images, which overrides
  // the file-based opengraph-image convention, so it must be named here.
  image: '/press/opengraph-image',
  // PARKED 2026-08-07 (Sarah). Unlisted from every nav, the sitemap, and
  // llms.txt; noindexed so it only opens for someone typing the URL. Drop this
  // flag to bring the department back. See the note in Navbar.tsx.
  noindex: true,
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
    <div id="top" className="bg-[#fbf5ea] text-[#0b3b44]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── MASTHEAD: the comic cover, then THE PRESS RUN ─── */}
      <PopPageHero
        eyebrow={<span>{PRESS.wordmark}</span>}
        title={<>That menu taped to<br className="hidden md:block" /> your counter? <em>Ouch.</em></>}
        issue={{ no: 'No.1', lines: ['The press run', 'Free proof'] }}
        sticker="Stop the press!"
        mascot={{ bubble: 'Hand me your price list!' }}
      >
        <p>
          {PRESS.promise}
        </p>
        <p className={pop.note}>
          Free proof · No card · Every price exactly as you wrote it
        </p>
      </PopPageHero>
      <section className="halftone-bg border-b-2 border-[#0b3b44]">
        <div className="max-w-5xl mx-auto px-5 pb-16 md:pb-24">
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
      <section className="py-16 md:py-24 bg-[#f5b700] border-t-2 border-[#0b3b44]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.05]">
            Your prices do the talking.<br className="hidden md:block" /> Dress them for it.
          </h2>
          <p className="font-body text-[#0b3b44]/75 mt-4 max-w-xl mx-auto">
            The proof takes a minute and costs nothing. Most owners frame it out of spite for the old laminated one.
          </p>
          <a
            href="#top"
            className="inline-block mt-8 rounded-full bg-[#0b3b44] border-2 border-[#0b3b44] px-10 py-4 font-sans font-extrabold text-[#fbf5ea] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#fbf5ea] transition-all hover:-translate-y-0.5"
          >
            Run my proof, free
          </a>
        </div>
      </section>
    </div>
  );
}
