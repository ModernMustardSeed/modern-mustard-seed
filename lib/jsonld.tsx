import { SITE, canonicalUrl } from './seo';
import { socials } from '@/data/socials';
import { PARABLE_REFERENCE, PARABLE_TEXT } from '@/data/parable';

export const PERSON_ID = `${SITE.url}/#sarah`;
export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;
const LOCAL_ID = ORG_ID;
const OG_IMAGE = {
  '@type': 'ImageObject', url: `${SITE.url}/opengraph-image`, width: 1200, height: 630,
};
export const SERVICE_AREAS = [
  { '@type': 'City', name: SITE.city },
  { '@type': 'AdministrativeArea', name: 'Northwest Montana' },
  { '@type': 'State', name: SITE.regionName },
  { '@type': 'Country', name: 'United States' },
];

export const personJsonLd = {
  '@context': 'https://schema.org', '@type': 'Person', '@id': PERSON_ID,
  name: SITE.founder, url: `${SITE.url}/about`,
  jobTitle: 'Founder, Engineer, and AI Systems Architect',
  worksFor: { '@id': ORG_ID },
  sameAs: socials.filter((s) => s.name === 'LinkedIn').map((s) => s.url),
};

// One studio in Kalispell. Service-area pages never create additional offices.
export const orgJsonLd = {
  '@context': 'https://schema.org', '@type': ['Organization', 'LocalBusiness'], '@id': ORG_ID,
  name: SITE.name, alternateName: 'MMS', url: SITE.url,
  description: SITE.description,
  disambiguatingDescription: 'Boutique design and AI studio in Kalispell, Montana, founded by Sarah Scarano. Websites and brand, custom software, voice agents, and retained advisory, by written inquiry.',
  logo: `${SITE.url}/brand/logo-lockup.png`,
  founder: { '@id': PERSON_ID },
  telephone: SITE.phoneE164, email: SITE.email,
  address: {
    '@type': 'PostalAddress', addressLocality: SITE.city, addressRegion: SITE.region,
    postalCode: SITE.postalCode, addressCountry: SITE.country,
  },
  areaServed: SERVICE_AREAS,
  sameAs: socials.filter((s) => s.name !== 'LinkedIn').map((s) => s.url),
  knowsAbout: ['Brand identity and art direction', 'Custom website design and development',
    'AI-native websites', 'AI voice agents', 'Custom software and applications',
    'Agentic systems', 'Business automation', 'CRM and workflow systems',
    'AI strategy advisory', 'AI search optimization'],
  contactPoint: {
    '@type': 'ContactPoint', contactType: 'Enquiries answered by an AI voice agent',
    telephone: SITE.phoneE164, email: SITE.email, availableLanguage: 'English',
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00', closes: '23:59',
    },
  },
};

// Compatibility export for existing callers, with the same identity.
export const localBusinessJsonLd = orgJsonLd;

/**
 * The parable. Added 2026-08-01.
 *
 * "Why is it called Modern Mustard Seed" is the exact question the entity
 * collision (the condiment, the plant, the decor brand) makes an answer engine
 * fumble. The verse is on the homepage twice in prose; a Quotation node gives
 * a machine something citable that ties the name to Matthew 13:31-32 and back
 * to this organization instead of to a jar of mustard.
 */
export const parableJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Quotation',
  '@id': `${SITE.url}/#parable`,
  name: 'The Parable of the Mustard Seed',
  text: PARABLE_TEXT,
  citation: PARABLE_REFERENCE,
  spokenByCharacter: { '@type': 'Person', name: 'Jesus' },
  isBasedOn: {
    '@type': 'Book',
    name: 'The Gospel of Matthew',
    bookEdition: 'New International Version',
  },
  inLanguage: 'en-US',
  isPartOf: { '@id': WEBSITE_ID },
  about: { '@id': ORG_ID },
  description:
    'The passage Modern Mustard Seed is named for. The studio takes its name from this parable: every build starts seed-sized and grows into something that shelters others.',
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
    author: !args.author || args.author === SITE.founder ? { '@id': PERSON_ID } : { '@type': 'Person', name: args.author },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: `${SITE.url}/blog/${args.slug}`,
    image: OG_IMAGE,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
    ...(args.wordCount ? { wordCount: args.wordCount } : {}),
    ...(args.keywords?.length ? { keywords: args.keywords.join(', ') } : {}),
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
    '@type': 'Article',
    '@id': `${SITE.url}/playbooks/${args.slug}#article`,
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
  };
}

/**
 * Article schema for a hand-built page that lives at an arbitrary PATH.
 *
 * The three /guides pages have called this since 2026-08-03 and it was never
 * written, so the production build has been failing on a missing export.
 * `blogPostingJsonLd` and `caseStudyJsonLd` could not stand in: both take a
 * slug and hardcode their own section (/blog/, /work/), and a guide indexed
 * under the wrong URL is worse than no schema at all.
 *
 * ⚠️ `path` is a PATH, leading slash and all, exactly like `breadcrumbJsonLd`.
 */
export function articleJsonLd(args: {
  title: string;
  description: string;
  /** Site-root-relative, e.g. '/guides/local-seo-checklist'. */
  path: string;
  datePublished: string;
  dateModified?: string;
  wordCount?: number;
  keywords?: string[];
}) {
  const url = `${SITE.url}${args.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: args.title,
    description: args.description,
    datePublished: args.datePublished,
    dateModified: args.dateModified ?? args.datePublished,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: url,
    image: OG_IMAGE,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
    ...(args.wordCount ? { wordCount: args.wordCount } : {}),
    ...(args.keywords?.length ? { keywords: args.keywords.join(', ') } : {}),
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

export function serviceJsonLd(svc: { name: string; description: string; path?: string; areaServed?: object[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    ...(svc.path ? { '@id': `${canonicalUrl(svc.path)}#service`, url: canonicalUrl(svc.path), mainEntityOfPage: { '@id': `${canonicalUrl(svc.path)}#webpage` } } : {}),
    name: svc.name,
    description: svc.description,
    // Provided by the LOCAL entity, so every service page inherits the Kalispell
    // signal instead of floating placelessly under a "Worldwide" organization.
    provider: { '@id': LOCAL_ID },
    areaServed: svc.areaServed ?? SERVICE_AREAS,
  };
}

/**
 * ⚠️ `url` must be a PATH, not a full URL. This prepends SITE.url itself, so
 * passing `${SITE.url}/thing` emits "https://site.comhttps://site.com/thing"
 * and search engines cannot parse the trail. Use '' for home, '/thing' below.
 */
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: canonicalUrl(item.url),
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
      SITE.description,
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function webPageJsonLd(args: { path: string; name: string; description: string; type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' }) {
  const url = canonicalUrl(args.path);
  return {
    '@context': 'https://schema.org', '@type': args.type ?? 'WebPage', '@id': `${url}#webpage`,
    url, name: args.name, description: args.description, inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID }, about: { '@id': ORG_ID }, publisher: { '@id': ORG_ID },
  };
}
