import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { LAUNCH, LAUNCH_PHASES, launchFaq, launchTiers } from '@/data/mustard-launch';
import LaunchConsole from '@/components/mustard-launch/LaunchConsole';
import { HowItWorks, PhaseRail, LadderSection, ProofSection, FaqSection, FinalCta } from '@/components/mustard-launch/LaunchSections';

export const metadata = buildMetadata({
  title: LAUNCH.metaTitle,
  description: LAUNCH.metaDescription,
  path: '/mustard-launch',
});

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      '@id': `${SITE.url}/mustard-launch#service`,
      name: 'Mustard Launch',
      serviceType: 'AI launch coaching for new businesses',
      provider: { '@id': `${SITE.url}#organization` },
      description: LAUNCH.metaDescription,
      url: `${SITE.url}/mustard-launch`,
      offers: launchTiers
        .filter((t) => t.priceUsd > 0)
        .map((t) => ({
          '@type': 'Offer',
          name: `Mustard Launch ${t.name}`,
          price: String(t.priceUsd),
          priceCurrency: 'USD',
          category: t.cadence === 'monthly' ? 'Subscription' : 'One-time',
        })),
    },
    {
      '@type': 'HowTo',
      name: 'How to launch your business with Mustard Launch',
      description: 'The six-phase launch sequence Mr. Mustard runs, from naming to your first customers.',
      step: LAUNCH_PHASES.map((p, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: p.title,
        text: p.blurb,
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: launchFaq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Mustard Launch', item: `${SITE.url}/mustard-launch` },
      ],
    },
  ],
};

export default function MustardLaunchPage() {
  return (
    <main className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="halftone-bg absolute inset-0 opacity-70" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-grid place-items-center w-9 h-9 rounded-[50%_50%_50%_6px] bg-[#F5B700] border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] -rotate-6 text-[#161616] text-sm font-bold">▲</span>
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase text-[#E0301E]">Mustard Launch · from Modern Mustard Seed</span>
          </div>
          <h1 className="font-display font-extrabold text-5xl sm:text-7xl leading-[0.92] max-w-4xl">
            Your AI launch coach, from <span className="italic text-[#161616]">idea</span> to <span className="text-[#F5B700] [text-shadow:3px_3px_0_#161616]">open</span>.
          </h1>
          <p className="font-sans text-lg text-[#161616]/75 mt-5 max-w-2xl">
            Tell Mr. Mustard what you are starting. He builds your whole launch (brand, offer, money, presence, first customers) and counts you down to open. Your Blueprint is free.
          </p>
          <div className="flex flex-wrap gap-4 mt-7">
            <Link href="#console" className="inline-flex items-center gap-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-6 py-3.5 font-sans font-bold text-[#161616] shadow-[5px_5px_0_0_#161616] transition-transform hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616]">
              ▲ Ignite my launch
            </Link>
            <Link href="#ladder" className="inline-flex items-center gap-2 rounded-lg border-2 border-[#161616] bg-white px-6 py-3.5 font-sans font-bold text-[#161616] shadow-[5px_5px_0_0_#161616] transition-transform hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616]">
              See what you get
            </Link>
          </div>
        </div>
      </section>

      {/* The console (signature moment + free tool) */}
      <section id="console" className="max-w-6xl mx-auto px-5 sm:px-8 pb-4 scroll-mt-16">
        <LaunchConsole />
      </section>

      <HowItWorks />
      <PhaseRail />
      <LadderSection />
      <ProofSection />
      <FaqSection />
      <FinalCta />
    </main>
  );
}
