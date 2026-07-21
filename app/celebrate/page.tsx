import Image from 'next/image';
import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { CELEBRATE, celebrateFaq, celebrateTiers, celebrateUsd } from '@/data/celebrate';
import ParadeBuilder from '@/components/celebrate/ParadeBuilder';
import {
  CelebrateFaqSection,
  ConfettiField,
  FinalCta,
  GoodsGallery,
  HowItWorks,
  LocalMakers,
  PricingStubs,
} from '@/components/celebrate/CelebrateSections';

export const metadata = buildMetadata({
  title: CELEBRATE.metaTitle,
  description: CELEBRATE.metaDescription,
  path: '/celebrate',
});

export default function CelebratePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Celebrate by Modern Mustard Seed',
        serviceType: 'Automated employee and client gifting fulfilled by local shops',
        description: CELEBRATE.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'Flathead Valley, Montana (waitlist nationwide)',
        offers: celebrateTiers.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          price: celebrateUsd(t.monthlyCents),
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: celebrateUsd(t.monthlyCents),
            priceCurrency: 'USD',
            billingIncrement: 1,
            unitText: 'MONTH',
          },
          url: `${SITE.url}/celebrate#pricing`,
          availability: 'https://schema.org/PreOrder',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'Put every birthday and work anniversary on autopilot',
        step: [
          {
            '@type': 'HowToStep',
            name: 'Load your people once',
            text: 'Names and dates: birthdays, work anniversaries, client milestones, holidays. Five minutes, one time.',
          },
          {
            '@type': 'HowToStep',
            name: 'Set a budget per person',
            text: 'A hard cap every send stays inside. When a cap is reached, Celebrate pauses and asks instead of charging more.',
          },
          {
            '@type': 'HowToStep',
            name: 'The parade runs itself',
            text: 'Real cakes, fresh flowers, and handwritten cards go out from local shops on the right dates, with delivery photo proof.',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: celebrateFaq.map((f) => ({
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

      {/* ─── HERO ─── */}
      <section className="relative halftone-bg border-b-2 border-[#161616] overflow-hidden">
        <ConfettiField count={30} seed={7} />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 md:pt-24 pb-14 md:pb-20">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold mb-4">
                [ Celebrate &middot; A Modern Mustard Seed Service ]
              </p>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.98]">
                Turn your calendar into a parade.
              </h1>
              <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-xl mt-5 leading-relaxed">
                {CELEBRATE.promise}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <a
                  href="#parade"
                  className="bg-[#F5B700] text-[#161616] font-bold text-base rounded-full px-8 py-4 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
                >
                  Roll your year&apos;s parade
                </a>
                <Link href="/book" className="font-bold text-[#1E50C8] underline underline-offset-4">
                  or book a corporate pilot
                </Link>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#161616]/70 mt-6">
                {CELEBRATE.foundingRoute}
              </p>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative aspect-[4/5] border-2 border-[#161616] rounded-xl overflow-hidden shadow-[6px_6px_0_0_#161616] rotate-2">
                <Image
                  src="/images/celebrate/cake.png"
                  alt="Funfetti layer cake with one slice pulled, on a mustard yellow background"
                  fill
                  priority
                  sizes="420px"
                  className="object-cover"
                />
              </div>
              <span className="absolute -bottom-3 left-6 font-mono text-[10px] uppercase tracking-[0.2em] bg-[#FFDD55] border-2 border-[#161616] rounded-lg px-2.5 py-1.5 rotate-[-2deg]">
                Baked the morning it arrives
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE PARADE BUILDER (signature + waitlist) ─── */}
      <section id="parade" className="max-w-4xl mx-auto px-5 py-14 md:py-20 scroll-mt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold text-center">
          [ The Parade of Your People ]
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-center tracking-tight mt-3">
          See your whole year of celebration.
        </h2>
        <p className="font-body text-base text-[#161616]/70 max-w-xl mx-auto text-center mt-4 mb-8">
          Add a few people you love. Watch the year compose itself. Saving your parade puts you on the
          waitlist with your dates already loaded.
        </p>
        <ParadeBuilder />
      </section>

      <GoodsGallery />
      <HowItWorks />
      <LocalMakers />
      <PricingStubs />
      <CelebrateFaqSection />
      <FinalCta />
    </div>
  );
}
