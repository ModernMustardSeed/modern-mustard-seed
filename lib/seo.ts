import type { Metadata } from 'next';

export const SITE = {
  name: 'Modern Mustard Seed',
  url: 'https://modernmustardseed.com',
  tagline: 'Idea to Shipped Product in 30 Days',
  description:
    'AI product studio shipping production apps, brands, and launches in 30 days. Four builds a quarter. Waitlist gated.',
  twitter: '@sarahmscarano',
  founder: 'Sarah Scarano',
  email: 'sarah@modernmustardseed.com',
  ogImage: '/opengraph-image',
};

type SeoArgs = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
};

export function buildMetadata({ title, description, path = '/', image, noindex }: SeoArgs = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE.name}` : `${SITE.name} | ${SITE.tagline}`;
  const desc = description ?? SITE.description;
  const url = `${SITE.url}${path}`;
  const ogImage = image ?? SITE.ogImage;

  return {
    title: fullTitle,
    description: desc,
    metadataBase: new URL(SITE.url),
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE.name }],
      locale: 'en_US',
      type: 'website',
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
