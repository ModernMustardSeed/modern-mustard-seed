import { buildMetadata, SITE } from '@/lib/seo';
import { SIDEKICK, sidekickTiers, sidekickFaq, sidekickUsd } from '@/data/sidekick';
import ForgeExperience from '@/components/sidekick/ForgeExperience';
import { HowItWorks, Boundaries, Faq, MeetTheTrainer, CrossSell, GiveHimAHome } from '@/components/sidekick/SidekickSections';

export const metadata = buildMetadata({
  title: SIDEKICK.metaTitle,
  description: SIDEKICK.metaDescription,
  path: '/voice-agents/forge',
  // Route-level card. buildMetadata sets openGraph.images, which overrides
  // the file-based opengraph-image convention, so it must be named here.
  image: '/voice-agents/forge/opengraph-image',
  // PARKED 2026-08-12 (Sarah). The site already has /voice-agents and /demos, so
  // the forge landing is unlisted from every nav, the sitemap, and llms.txt, and
  // noindexed. It still answers at its URL on purpose: the Meta campaign lands
  // here with UTMs, Stripe checkout returns here, and the Sidekick drip links
  // here. The /forge/demo/<runId> and /forge/welcome subroutes are unaffected.
  // Drop this flag and restore the nav rows to bring the department back.
  noindex: true,
});

export default function SidekickPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Voice Agent by Modern Mustard Seed',
        serviceType: 'voice agent for small businesses',
        description: SIDEKICK.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: sidekickTiers.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          price: sidekickUsd(t.monthlyCents),
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: sidekickUsd(t.monthlyCents),
            priceCurrency: 'USD',
            billingIncrement: 1,
            unitText: 'MONTH',
          },
          url: `${SITE.url}/voice-agents/forge#keep`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'Hear your own voice agent, free',
        step: [
          { '@type': 'HowToStep', name: 'Tell Mr. Mustard about your business', text: 'Business name, what you do, what customers ask. One short form.' },
          { '@type': 'HowToStep', name: 'Watch the forge train your Voice Agent', text: 'Greeting drills, booking reps, composure tests, personalized to your business.' },
          { '@type': 'HowToStep', name: 'Talk to him live', text: 'He answers in your browser as your front desk, or calls your cell. Keep him and he answers your real phone 24/7 within a week.' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: sidekickFaq.map((f) => ({
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

      {/* ─── HERO + THE FORGE ─── */}
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold mb-4">[ The Voice Agent Forge ]</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[0.98]">
              Your missed calls just met<br className="hidden md:block" /> their worst enemy.
            </h1>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-5 leading-relaxed">
              {SIDEKICK.promise}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#161616]/70 mt-5">
              Free · No card · He talks to you live
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ForgeExperience />
          </div>
        </div>
      </section>

      <HowItWorks />
      <MeetTheTrainer />
      <GiveHimAHome />
      <Boundaries />
      <Faq />
      <CrossSell />

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#F5B700] border-t-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            Every call he answers is money<br className="hidden md:block" /> you stopped losing.
          </h2>
          <p className="font-body text-[#161616]/75 mt-4 max-w-xl mx-auto">
            The average missed call is a customer who dialed the next name on the list. Forge your Voice Agent, hear him take one, and do the math yourself.
          </p>
          <a
            href="#top"
            className="inline-block mt-8 rounded-full bg-[#161616] border-2 border-[#161616] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
          >
            Forge mine, free
          </a>
        </div>
      </section>
    </div>
  );
}
