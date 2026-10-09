import StorybookHome from '@/components/home/StorybookHome';
import { HOME_QUESTIONS } from '@/data/home-faq';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, parableJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Websites, AI Voice Agents & Custom Software',
  description:
    'Agentic systems, AI agents and websites that work for you, built for businesses across the United States and made to be found on Google and ChatGPT. AI voice agents that answer and book every call, and custom software. Built and managed for you end to end, at set package prices. Based in Kalispell, MT.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Agentic Systems, AI Agents & Websites That Work for You',
  description: SITE.description,
  isPartOf: { '@id': 'https://modernmustardseed.com/#website' },
  about: { '@id': 'https://modernmustardseed.com/#organization' },
  // The planting chapter and the footer card are the same verse.
  hasPart: { '@id': 'https://modernmustardseed.com/#parable' },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${SITE.url}${SITE.ogImage}`,
    width: 1200,
    height: 630,
  },
};

const offerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Websites, AI Voice Agents and Custom Software',
  description:
    'Websites and brand built to be found on Google and ChatGPT, AI voice agents that answer and book every call, custom software, agentic systems, marketing and advisory. Every engagement is a set package price agreed before work starts, and we manage it end to end after launch.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: ['Website design and development', 'AI voice agents', 'Custom software development', 'Agentic systems', 'Marketing'],
  areaServed: { '@type': 'Country', name: 'United States' },
};

// The FAQ schema reads the same questions the page shows (data/home-faq.ts).
const homeFaq = faqJsonLd(HOME_QUESTIONS);


export default function HomePage() {
  return <><JsonLd data={[homeJsonLd, offerJsonLd, parableJsonLd, homeFaq, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} /><StorybookHome /></>;
}
