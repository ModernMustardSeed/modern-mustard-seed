import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { LAUNCH, LAUNCH_PHASES, launchFaq, launchTiers } from '@/data/mustard-launch';
import LaunchConsole from '@/components/mustard-launch/LaunchConsole';
import { HowItWorks, PhaseRail, LadderSection, ProofSection, FaqSection, FinalCta } from '@/components/mustard-launch/LaunchSections';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: LAUNCH.metaTitle,
  description: LAUNCH.metaDescription,
  path: '/mustard-launch',
  // Route-level card. buildMetadata sets openGraph.images, which overrides
  // the file-based opengraph-image convention, so it must be named here.
  image: '/mustard-launch/opengraph-image',
});

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      '@id': `${SITE.url}/mustard-launch#service`,
      name: 'Mustard Launch',
      serviceType: 'Agentic launch coaching for new businesses',
      provider: { '@id': `${SITE.url}#organization` },
      description: LAUNCH.metaDescription,
      url: `${SITE.url}/mustard-launch`,
      offers: launchTiers
        .filter((t) => t.priceUsd > 0)
        .map((t) => ({
          '@type': 'Offer',
          name: `Mustard Launch ${t.name}`,
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
    <div className="bg-[#f6efe0] text-[#14110c]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: the comic cover */}
      <PopPageHero
        eyebrow={<span>▲ Mustard Launch · from Modern Mustard Seed</span>}
        title={<>Your agentic launch coach, from <em>idea</em> to <em>open</em>.</>}
        issue={{ no: 'No.1', lines: ['Launch coach', 'Blueprint free'] }}
        mascot={{ bubble: 'What are you starting?' }}
      >
        <p>
          Tell Mr. Mustard what you are starting. He builds your whole launch (brand, offer, money, presence, first customers) and counts you down to open. Your Blueprint is free.
        </p>
        <div className={pop.actions}>
          <Link href="#console" className={pop.cta}>
            ▲ Ignite my launch
          </Link>
          <Link href="#ladder" className={pop.ctaAlt}>
            See what you get
          </Link>
        </div>
      </PopPageHero>

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
    </div>
  );
}
