import { SITE } from './seo';

const PERSON_ID = `${SITE.url}/#sarah`;
const ORG_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;
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
  alternateName: 'MMS',
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
  contactPoint: {
    '@type': 'ContactPoint',
    email: SITE.email,
    contactType: 'sales',
    availableLanguage: 'English',
    areaServed: 'Worldwide',
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
  '@graph': [orgJsonLd, personJsonLd, websiteJsonLd],
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
    provider: { '@id': ORG_ID },
    areaServed: 'Worldwide',
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
