import { SITE } from './seo';

const PERSON_ID = `${SITE.url}/#sarah`;
const ORG_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;
const LOCAL_ID = `${SITE.url}/#localbusiness`;
const LOGO_URL = `${SITE.url}/opengraph-image`;
const OG_IMAGE = {
  '@type': 'ImageObject',
  url: `${SITE.url}/opengraph-image`,
  width: 1200,
  height: 630,
};

export const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': PERSON_ID,
  name: SITE.founder,
  givenName: 'Sarah',
  familyName: 'Scarano',
  email: SITE.email,
  url: `${SITE.url}/about`,
  image: `${SITE.url}/opengraph-image`,
  jobTitle: 'Founder, Engineer, and AI Systems Architect',
  description:
    'Founder of Modern Mustard Seed. Self-taught full-stack engineer and AI systems architect. Ships custom apps, websites, and specialty AI tools in weeks, not months.',
  worksFor: { '@id': ORG_ID },
  knowsAbout: [
    'Artificial Intelligence',
    'Large Language Models',
    'Next.js',
    'React',
    'TypeScript',
    'Supabase',
    'Stripe',
    'AI agents',
    'Voice AI',
    'Product engineering',
    'Generative AI',
    'Full-stack development',
  ],
  sameAs: [
    'https://www.facebook.com/modernmustardseed',
    'https://x.com/modmustardseed',
    'https://www.linkedin.com/in/sarahmscarano/',
    'https://github.com/ModernMustardSeed',
    'https://instagram.com/modernmustardseed',
  ],
};

export const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE.name,
  alternateName: ['MMS', 'Modern Mustard Seed AI Studio', 'Modern Mustard Seed Studio'],
  /**
   * ENTITY DISAMBIGUATION. Added 2026-07-28.
   *
   * "Modern Mustard Seed" collides with one of the densest, oldest namespaces on
   * the web: the condiment, the mustard plant, the parable in Matthew 13:31, the
   * Miss Mustard Seed home decor brand, and several Mustard Seed restaurants and
   * charities. Google resolves us correctly because its own knowledge graph has
   * first-party signal. Bing and Copilot do not, and answer the food instead.
   *
   * disambiguatingDescription is the schema.org property built for exactly this.
   * It states the category we ARE and explicitly negates the categories we get
   * confused with, which is what an answer engine needs to pick the right entity.
   */
  disambiguatingDescription:
    'Modern Mustard Seed is an AI product studio and custom software company based in Kalispell, Montana, founded by Sarah Scarano in 2024. It builds custom apps, websites, and 24/7 AI voice agents for small businesses. It is a technology company. It is not a food producer, condiment brand, seed or garden supplier, restaurant, home decor brand, or church, and it is not affiliated with any similarly named business.',
  url: SITE.url,
  logo: {
    '@type': 'ImageObject',
    url: LOGO_URL,
    width: 1200,
    height: 630,
  },
  image: LOGO_URL,
  description: SITE.description,
  slogan: SITE.tagline,
  founder: { '@id': PERSON_ID },
  employee: { '@id': PERSON_ID },
  foundingDate: '2024',
  knowsAbout: [
    'AI product development',
    'Custom software',
    'Generative AI tools',
    'Voice AI agents',
    'Business automation',
    'Specialty AI for real estate, design, content, and legal',
  ],
  sameAs: [
    'https://x.com/modmustardseed',
    'https://www.linkedin.com/in/sarahmscarano/',
    'https://github.com/ModernMustardSeed',
    'https://instagram.com/modernmustardseed',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.city,
    addressRegion: SITE.region,
    postalCode: SITE.postalCode,
    addressCountry: SITE.country,
  },
  telephone: SITE.phoneE164,
  email: SITE.email,
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: SITE.email,
      telephone: SITE.phoneE164,
      contactType: 'sales',
      availableLanguage: 'English',
      areaServed: 'Worldwide',
    },
    {
      '@type': 'ContactPoint',
      telephone: SITE.phoneE164,
      contactType: 'customer support',
      availableLanguage: 'English',
      // The line is answered by a voice agent around the clock, which is
      // literally the product. Saying so in schema is a differentiator, not noise.
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
    },
  ],
};

/**
 * The LOCAL entity. Added 2026-07-25.
 *
 * Until now the graph described a placeless "Organization" with areaServed
 * Worldwide, so nothing tied Modern Mustard Seed to Kalispell or the Flathead
 * Valley. That is the one search territory a small studio can actually win, and
 * it is what an AI answer engine needs before it will name us in response to
 * "who builds voice agents in Montana." ProfessionalService is a
 * LocalBusiness subtype, so this carries both meanings at once.
 *
 * No streetAddress on purpose: the studio does not take walk-ins, and a fake or
 * residential street line is worse than none. Locality + region + geo is enough
 * for local relevance and is honest.
 */
export const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': LOCAL_ID,
  name: SITE.name,
  alternateName: 'Modern Mustard Seed AI Studio',
  url: SITE.url,
  logo: LOGO_URL,
  image: LOGO_URL,
  description:
    'AI studio in Kalispell, Montana building custom websites, 24/7 AI voice agents, and business automation for small businesses across the Flathead Valley and nationwide.',
  telephone: SITE.phoneE164,
  email: SITE.email,
  priceRange: '$$',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Credit Card',
  parentOrganization: { '@id': ORG_ID },
  founder: { '@id': PERSON_ID },
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.city,
    addressRegion: SITE.region,
    postalCode: SITE.postalCode,
    addressCountry: SITE.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: SITE.latitude,
    longitude: SITE.longitude,
  },
  areaServed: [
    { '@type': 'City', name: 'Kalispell' },
    { '@type': 'City', name: 'Whitefish' },
    { '@type': 'City', name: 'Columbia Falls' },
    { '@type': 'City', name: 'Bigfork' },
    { '@type': 'AdministrativeArea', name: 'Flathead Valley' },
    { '@type': 'State', name: SITE.regionName },
    { '@type': 'Country', name: 'United States' },
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
  knowsAbout: orgJsonLd.knowsAbout,
  sameAs: orgJsonLd.sameAs,
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Modern Mustard Seed services',
    itemListElement: [
      ['AI voice agents', 'A 24/7 voice agent that answers every call as your business, books jobs, and texts back missed callers.', '/voice-agents/forge'],
      ['Small business websites', 'Custom websites built from scratch with lead capture, funnels, SEO and GEO, and the command center free. The voice agent is a separate product that can be added to any site.', '/websites'],
      ['Business Command Center', 'One dashboard for calls, leads, customers, reviews, traffic, and money, with an AI that reads it back to you.', '/command-center'],
      ['Free AI demos', 'Three working demos built for your business at no cost: voice agent, website, and command center.', '/demos'],
      ['Website audits', 'A real score and a real to-do list for an existing site, covering SEO and AI answer-engine visibility.', '/website-audit'],
    ].map(([name, description, path]) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name,
        description,
        url: `${SITE.url}${path}`,
        provider: { '@id': LOCAL_ID },
      },
    })),
  },
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  publisher: { '@id': ORG_ID },
  inLanguage: 'en-US',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE.url}/blog?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export const siteGraphJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [orgJsonLd, localBusinessJsonLd, personJsonLd, websiteJsonLd],
};

export function blogPostingJsonLd(args: {
  title: string;
  description: string;
  slug: string;
  date: string;
  dateModified?: string;
  author?: string;
  wordCount?: number;
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${SITE.url}/blog/${args.slug}#article`,
    headline: args.title,
    description: args.description,
    datePublished: args.date,
    dateModified: args.dateModified ?? args.date,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: `${SITE.url}/blog/${args.slug}`,
    image: OG_IMAGE,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
    ...(args.wordCount ? { wordCount: args.wordCount } : {}),
    ...(args.keywords?.length ? { keywords: args.keywords.join(', ') } : {}),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.mdx-prose h2', '.mdx-prose p:first-of-type'],
    },
  };
}

export function howToJsonLd(args: {
  title: string;
  description: string;
  slug: string;
  date: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${SITE.url}/playbooks/${args.slug}#howto`,
    name: args.title,
    description: args.description,
    datePublished: args.date,
    dateModified: args.dateModified ?? args.date,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: `${SITE.url}/playbooks/${args.slug}`,
    image: OG_IMAGE,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
  };
}

export function caseStudyJsonLd(args: {
  title: string;
  description: string;
  slug: string;
  date: string;
  dateModified?: string;
  client?: string;
  stack?: string[];
  wordCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${SITE.url}/work/${args.slug}#article`,
    headline: args.title,
    description: args.description,
    datePublished: args.date,
    dateModified: args.dateModified ?? args.date,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: `${SITE.url}/work/${args.slug}`,
    image: OG_IMAGE,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
    ...(args.wordCount ? { wordCount: args.wordCount } : {}),
    ...(args.stack?.length ? { keywords: args.stack.join(', ') } : {}),
    ...(args.client ? { about: { '@type': 'Organization', name: args.client } } : {}),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.mdx-prose h2', '.mdx-prose p:first-of-type'],
    },
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function serviceJsonLd(svc: { name: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: svc.name,
    description: svc.description,
    // Provided by the LOCAL entity, so every service page inherits the Kalispell
    // signal instead of floating placelessly under a "Worldwide" organization.
    provider: { '@id': LOCAL_ID },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Flathead Valley' },
      { '@type': 'State', name: SITE.regionName },
      { '@type': 'Country', name: 'United States' },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.url}`,
    })),
  };
}

export function aboutPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE.url}/about#aboutpage`,
    url: `${SITE.url}/about`,
    name: `About ${SITE.name}`,
    description:
      'About Modern Mustard Seed, a small AI studio that builds custom apps, websites, AI voice and chat agents, and specialty AI tools for businesses. Faith meets function. Shipped in weeks, not months.',
    mainEntity: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en-US',
  };
}

export function productJsonLd(args: {
  slug: string;
  name: string;
  description: string;
  priceUsd: number;
  category: string;
  pages: number;
  image?: string;
}) {
  const url = `${SITE.url}/store/${args.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: args.name,
    description: args.description,
    sku: args.slug,
    brand: { '@id': ORG_ID },
    manufacturer: { '@id': ORG_ID },
    author: { '@id': PERSON_ID },
    category: args.category,
    image: args.image ?? `${SITE.url}/opengraph-image`,
    url,
    offers: {
      '@type': 'Offer',
      price: args.priceUsd.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url,
      seller: { '@id': ORG_ID },
    },
    isRelatedTo: { '@id': WEBSITE_ID },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Format', value: 'PDF' },
      { '@type': 'PropertyValue', name: 'Pages', value: String(args.pages) },
      { '@type': 'PropertyValue', name: 'Delivery', value: 'Instant download after purchase' },
    ],
  };
}

export function productHowToJsonLd(args: {
  slug: string;
  name: string;
  description: string;
  toc: string[];
}) {
  const url = `${SITE.url}/store/${args.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name: args.name,
    description: args.description,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
    step: args.toc.map((stepText, i) => {
      const [title, ...rest] = stepText.split('.');
      const text = rest.join('.').trim() || title.trim();
      return {
        '@type': 'HowToStep',
        position: i + 1,
        name: title.trim(),
        text,
      };
    }),
  };
}

export function collectionPageJsonLd(args: {
  url: string;
  name: string;
  description: string;
  itemListElement: { url: string; name: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${args.url}#collection`,
    url: args.url,
    name: args.name,
    description: args.description,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: args.itemListElement.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: item.url,
        name: item.name,
      })),
    },
  };
}

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
