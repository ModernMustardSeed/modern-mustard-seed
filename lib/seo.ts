import type { Metadata } from 'next';

export const SITE = {
  name: 'Modern Mustard Seed',
  url: 'https://modernmustardseed.com',
  tagline: 'A Design and AI Studio',
  description:
    'A boutique design and AI studio in Kalispell, Montana. Design-led websites and brand, custom software, voice agents, and retained advisory for Northwest Montana and clients nationwide. By inquiry.',
  twitter: '@modmustardseed',
  founder: 'Sarah Scarano',
  email: 'sarah@modernmustardseed.com',
  ogImage: '/opengraph-image',
  /**
   * Local identity. SINGLE SOURCE for every NAP (name, address, phone) signal.
   * Local search and AI answers both key off a consistent NAP, so never retype
   * the phone or the city in a schema block: derive it from here.
   */
  phone: '(406) 312-1223',
  phoneE164: '+14063121223',
  city: 'Kalispell',
  region: 'MT',
  regionName: 'Montana',
  postalCode: '59901',
  country: 'US',
  latitude: 48.1958,
  longitude: -114.3129,
};

type SeoArgs = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  article?: { published: string; modified?: string; author?: string };
};

export function buildMetadata({ title, description, path = '/', image, noindex, article }: SeoArgs = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE.name}` : `${SITE.name} | ${SITE.tagline}`;
  const desc = description ?? SITE.description;
  const url = canonicalUrl(path);
  const ogImage = image ?? SITE.ogImage;

  return {
    title: fullTitle,
    description: desc,
    metadataBase: new URL(SITE.url),
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    verification: {
      other: {
        'msvalidate.01': 'DEDD2DDDDB7C501DC147D6EB1396FDE9',
      },
    },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE.name, type: 'image/png' }],
      locale: 'en_US',
      type: article ? 'article' : 'website',
      ...(article ? { publishedTime: article.published, modifiedTime: article.modified ?? article.published, authors: [article.author ?? `${SITE.url}/about`] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: SITE.twitter,
      creator: SITE.twitter,
      title: fullTitle,
      description: desc,
      images: [ogImage],
    },
  };
}

/** Canonicals describe the page, never its campaign, fragment or trailing slash. */
export function canonicalUrl(path = '/') {
  const url = new URL(path, `${SITE.url}/`);
  if (url.origin !== SITE.url) throw new Error('Canonical must use the MMS origin');
  return `${SITE.url}${url.pathname.replace(/\/+$/, '')}`;
}
