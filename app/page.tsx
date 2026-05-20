import PageBackground from '@/components/PageBackground';
import HeroIdeaToProduct from '@/components/HeroIdeaToProduct';
import ResultsMarquee from '@/components/ResultsMarquee';
import EraOfEntrepreneur from '@/components/EraOfEntrepreneur';
import StartingPoints from '@/components/StartingPoints';
import LiveStats from '@/components/LiveStats';
import BuiltByGoodPeople from '@/components/BuiltByGoodPeople';
import WhatAreYouBuilding from '@/components/WhatAreYouBuilding';
import WhatGetsBuilt from '@/components/WhatGetsBuilt';
import AiProofPromo from '@/components/AiProofPromo';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Apps, Sites, and Specialty AI Tools',
  description:
    'Custom apps, websites, and specialty AI tools for your business. Shipped in 30 days. Four builds per quarter, waitlist only.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Apps, Sites, and Specialty AI Tools',
  description:
    'Custom apps, websites, and specialty AI tools for your business. Shipped in 30 days.',
  isPartOf: { '@id': 'https://modernmustardseed.com/#website' },
  about: { '@id': 'https://modernmustardseed.com/#organization' },
};

const offerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Idea to Product in 30 Days',
  description:
    'Custom apps, websites, software, and specialty AI tools. Fixed scope, fixed timeline. Four builds per quarter.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: 'Custom software development',
  areaServed: 'Global',
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={[homeJsonLd, offerJsonLd, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} />
      <PageBackground />
      <HeroIdeaToProduct />
      <ResultsMarquee />
      <EraOfEntrepreneur />
      <StartingPoints />
      <LiveStats />
      <BuiltByGoodPeople />
      <WhatAreYouBuilding />
      <WhatGetsBuilt />
      <AiProofPromo />
      <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16">
        <NewsletterSignup />
      </section>
    </>
  );
}
