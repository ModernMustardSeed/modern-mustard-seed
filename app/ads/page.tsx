import { buildMetadata, SITE } from '@/lib/seo';
import { BROADCAST, broadcastTiers, broadcastFaq } from '@/data/ads';
import BroadcastHero from '@/components/ads/BroadcastHero';
import MustardNetworkTV from '@/components/ads/MustardNetworkTV';
import BroadcastPackages from '@/components/ads/BroadcastPackages';
import AdBudgetPlanner from '@/components/ads/AdBudgetPlanner';
import { TimberlineConfession, HowBroadcastWorks, BroadcastFaqSection, BroadcastFinalCta } from '@/components/ads/BroadcastSections';

export const metadata = buildMetadata({
  title: BROADCAST.metaTitle,
  description: BROADCAST.metaDescription,
  path: '/ads',
});

export default function AdsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'MUSTARD BROADCAST by Modern Mustard Seed',
        serviceType: 'Done-for-you advertising: commercial production plus managed Facebook, Instagram, and Google ads for local businesses',
        description: BROADCAST.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: broadcastTiers.map((t) => ({
          '@type': 'Offer',
          name: `MUSTARD BROADCAST ${t.name}`,
          price: t.monthlyCents / 100,
          priceCurrency: 'USD',
          description: `$${t.setupCents / 100} one-time launch production, then $${t.monthlyCents / 100}/mo. ${t.pitch}`,
          url: `${SITE.url}/ads#packages`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'Get your business on the air with managed ads',
        step: [
          { '@type': 'HowToStep', name: 'We film', text: 'Tell us about your business. Your 30-second cinematic commercial is produced within 2 business days and you approve every frame.' },
          { '@type': 'HowToStep', name: 'We launch', text: 'The campaign is built inside your own ad account. Your card pays Meta and Google directly, never marked up. Live within 7 days.' },
          { '@type': 'HowToStep', name: 'We manage', text: 'Weekly optimization and a plain-English monthly report: what ran, what it cost, what came in. You answer the phone.' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: broadcastFaq.map((f) => ({
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
      <BroadcastHero />
      <TimberlineConfession />
      <HowBroadcastWorks />
      <MustardNetworkTV />
      <BroadcastPackages />
      <AdBudgetPlanner />
      <BroadcastFaqSection />
      <BroadcastFinalCta />
    </div>
  );
}
