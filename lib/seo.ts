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
  ogImage: '/brand/mms-share-studio-2.jpg',
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

/**
 * Search titles for pages whose on-page headline runs past what Google shows
 * (about 60 characters). The page keeps its full headline; only the <title>
 * and social title use these. Keyed by path, so keep them in step with routes.
 */
const SEARCH_TITLES: Record<string, string> = {
  '/claude': 'Claude Setup: Claude Code, Custom Skills and AI Agents',
  '/for/restaurants': 'Restaurant Agentic Systems: Phone Ordering and Missed Calls',
  '/for/contractors': 'Websites and Owner Portals for Home Builders and Contractors',
  '/for/weddings': 'Wedding Websites and Guest Apps for Venues and Planners',
  '/for/realtors': 'Agentic Tools for Realtors and Real Estate Agents',
  '/for/service-businesses': 'Agentic Systems and Voice Agents for Service Businesses',
  '/for/dtc-brands': 'Agentic Systems for DTC and Apparel Brands',
  '/for/solopreneurs': 'Agentic Systems for Solopreneurs and Creators',
  '/for/coaches-consultants': 'Agentic Systems for Coaches and Consultants',
  '/nationwide': 'Nationwide Agentic Systems and Website Studio',
  '/best': "Buyer's Guides: Best Options for Small Businesses",
  '/alternatives': 'Smith.ai, Ruby, GoHighLevel and Wix Alternatives Compared',
  '/partners': 'Partner Program: Earn 25% of Every Invoice You Refer',
  '/partners/sales-rep': 'Remote Sales Rep, Commission Only: AI Voice Agents',
  '/white-label': 'White Label AI Agents and Websites for Agencies',
  '/blog/cloudflare-and-the-agent-economy': 'Cloudflare and the Agent Economy: The Web, Rewired',
  '/blog/inside-the-ai-office-we-built': 'Inside the Agentic Office: What 17 Agents Taught Us',
  '/blog/ai-receptionist-vs-answering-service': 'Agentic Receptionist vs Answering Service vs Voicemail',
  '/blog/agentic-ai-vs-traditional-ai': 'Agentic Systems vs Traditional AI: What Changes',
  '/blog/the-panel-and-the-golden-set': 'The Panel and the Golden Set: Senior-Level Model Work',
  '/blog/60-second-ai-audit': 'The 60-Second Agentic Audit for Any Business',
  '/blog/productize-or-die': 'Productize or Die: How One-Person Agentic Studios Win',
  '/work/built-right-in-montana': "Built Right in Montana: A Custom Home Builder's Site",
  '/work/fiat-lux-design': 'Fiat Lux Design: An Agentic Interior Staging Studio',
  '/work/the-claw-concierge': 'The Claw Concierge: A White-Glove Agentic Concierge',
  '/work/make-me-studio': "Make Me Studio: A Creator's Generative Studio",
  '/compare/freelancer-vs-studio': 'Hiring a Freelancer vs an AI Product Studio',
  '/compare/web-agency-vs-product-studio': 'Web Agency vs AI Product Studio: Which to Hire?',
  '/compare/wix-squarespace-vs-custom-website': 'Wix or Squarespace vs a Custom Website (2026)',
  '/compare/gohighlevel-vs-custom-build': 'GoHighLevel vs a Custom Build for Local Business (2026)',
  '/compare/ai-receptionist-vs-answering-service': 'AI Receptionist vs Answering Service: 2026 Comparison',
  '/compare/bubble-no-code-vs-custom-app': 'Bubble and No-Code vs a Custom App for Founders',
  '/best/ways-to-answer-calls-on-the-job': 'Best Ways to Answer Calls on the Job (2026)',
  '/best/ways-for-non-technical-founders-to-build-a-product': 'How a Non-Technical Founder Gets a Product Built (2026)',
  '/best/ways-to-get-recommended-by-chatgpt-and-google-ai': 'How to Get Recommended by ChatGPT and Google AI (2026)',
  '/alternatives/smith-ai-alternatives': 'Smith.ai Alternatives in 2026: 5 Options Compared',
  '/alternatives/gohighlevel-alternatives': 'GoHighLevel Alternatives in 2026: 4 Options Compared',
  '/alternatives/wix-alternatives-for-service-businesses': 'Wix Alternatives for Service Businesses in 2026',
  '/alternatives/squarespace-alternatives-for-small-business': 'Squarespace Alternatives for Small Business in 2026',
};

/** Google shows about 65 title characters; the brand suffix goes on only when it fits. */
const TITLE_MAX = 65;
/** Google cuts snippets near 160 characters. */
const DESCRIPTION_MAX = 155;

/** Whole sentences up to the cap; a word-boundary cut only when the first sentence alone is too long. */
export function capDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  let out = '';
  for (const sentence of clean.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? []) {
    const next = `${out} ${sentence.trim()}`.trim();
    if (next.length > max) break;
    out = next;
  }
  if (out.length >= 80) return out;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '')}…`;
}

export function searchTitle(title: string | undefined, path: string): string {
  if (!title) return `${SITE.name} | ${SITE.tagline}`;
  const base = SEARCH_TITLES[path.replace(/\/$/, '') || '/'] ?? title;
  const withBrand = `${base} | ${SITE.name}`;
  return withBrand.length <= TITLE_MAX ? withBrand : base;
}

export function buildMetadata({ title, description, path = '/', image, noindex, article }: SeoArgs = {}): Metadata {
  const fullTitle = searchTitle(title, path);
  const desc = capDescription(description ?? SITE.description);
  const url = canonicalUrl(path);
  const ogImage = image ?? SITE.ogImage;

  return {
    title: fullTitle,
    description: desc,
    metadataBase: new URL(SITE.url),
    alternates: { canonical: url, types: { 'application/rss+xml': `${SITE.url}/feed.xml` } },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    verification: {
      other: {
        'msvalidate.01': 'DEDD2DDDDB7C501DC147D6EB1396FDE9',
        'p:domain_verify': 'f04410208073048516ae8a80f541f90a',
      },
    },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: image ? SITE.name : 'Modern Mustard Seed: We build websites, AI voice agents and custom software. Sarah and Anthony in the studio with the mustard seed crew.', type: /\.jpe?g(?:\?|$)/i.test(ogImage) ? 'image/jpeg' : 'image/png' }],
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
