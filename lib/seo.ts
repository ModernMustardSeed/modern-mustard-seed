import type { Metadata } from 'next';

export const SITE = {
  name: 'Modern Mustard Seed',
  url: 'https://modernmustardseed.com',
  tagline: 'A Design and Agentic Systems Studio',
  description:
    'A studio for businesses across the United States: agentic systems, AI agents and voice receptionists, and websites that work for you, built to be found on Google and ChatGPT, plus custom software, and agentic systems that run the business. Based in Kalispell, Montana. By inquiry.',
  twitter: '@modmustardseed',
  founder: 'Sarah Scarano',
  email: 'sarah@modernmustardseed.com',
  ogImage: '/brand/mms-share-flathead.jpg',
  /**
   * Local identity. SINGLE SOURCE for every NAP (name, address, phone) signal.
   * Local search and AI answers both key off a consistent NAP, so never retype
   * the phone or the city in a schema block: derive it from here.
   */
  phone: '(406) 312-1223',
  phoneE164: '+14063121223',
  /** Sarah's own cell, listed beside Mr. Mustard's line wherever the site
   *  offers a way to reach the studio (Sarah, 2026-09-26). */
  sarahPhone: '(406) 250-6076',
  sarahPhoneE164: '+14062506076',
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
      images: [{ url: ogImage, width: 1200, height: 630, alt: image ? SITE.name : 'Modern Mustard Seed: Build what is next. Grow what works. A handmade Flathead Lake landscape with the Mustard family sailboat.', type: /\.jpe?g(?:\?|$)/i.test(ogImage) ? 'image/jpeg' : 'image/png' }],
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
