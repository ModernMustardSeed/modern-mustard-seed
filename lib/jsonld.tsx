import { SITE } from './seo';

export const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE.url}/#organization`,
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/og-image.png`,
  description: SITE.description,
  founder: {
    '@type': 'Person',
    name: SITE.founder,
    email: SITE.email,
    url: SITE.url,
    sameAs: [
      'https://x.com/sarahmscarano',
      'https://linkedin.com/in/sarahscarano',
      'https://github.com/ModernMustardSeed',
      'https://instagram.com/modernmustardseed',
      'https://tiktok.com/@modernmustardseed',
    ],
  },
  sameAs: [
    'https://x.com/sarahmscarano',
    'https://linkedin.com/in/sarahscarano',
    'https://github.com/ModernMustardSeed',
    'https://instagram.com/modernmustardseed',
    'https://tiktok.com/@modernmustardseed',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: SITE.email,
    contactType: 'sales',
    availableLanguage: 'English',
  },
};

export function blogPostingJsonLd(args: {
  title: string;
  description: string;
  slug: string;
  date: string;
  author?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: args.title,
    description: args.description,
    datePublished: args.date,
    author: { '@type': 'Person', name: args.author ?? SITE.founder },
    publisher: { '@id': `${SITE.url}/#organization` },
    mainEntityOfPage: `${SITE.url}/blog/${args.slug}`,
    image: `${SITE.url}/og-image.png`,
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
    provider: { '@id': `${SITE.url}/#organization` },
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

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
