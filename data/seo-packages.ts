/**
 * SEO + GBP PACKAGES. Productized local visibility offers.
 *
 * Price lives here in cents, and nowhere else. Checkout builds inline
 * price_data from these values (same pattern as sidekick.ts).
 *
 * Two tiers:
 * - Basic SEO Setup: one-time foundation work ($97)
 * - Deluxe GBP + SEO: setup + ongoing optimization ($297 setup + $97/mo)
 */

export const SEO_PACKAGES = {
  name: 'Local Visibility Suite',
  tagline: 'Get found by Google, Bing, and every AI assistant that answers "who does this near me."',
  metaTitle: 'SEO + Google Business Profile Packages for Local Businesses',
  metaDescription:
    'Done-for-you SEO setup and Google Business Profile optimization. Get found on Google, Bing, Yandex, and AI assistants like ChatGPT and Perplexity. From Modern Mustard Seed.',
} as const;

export type SeoTier = {
  slug: 'seo-basic' | 'seo-deluxe';
  name: string;
  chip: string;
  setupCents: number;
  monthlyCents: number;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

/** Display helper, cents to dollars. */
export function seoUsd(cents: number): number {
  return Math.round(cents / 100);
}

export const seoTiers: SeoTier[] = [
  {
    slug: 'seo-basic',
    name: 'BASIC SEO SETUP',
    chip: '[ FOUNDATION ]',
    setupCents: 9700,
    monthlyCents: 0,
    pitch: 'The one-time foundation that gets you indexed everywhere that matters.',
    includes: [
      'Google Business Profile claimed and optimized',
      'Google Search Console setup and sitemap submitted',
      'Bing Webmaster Tools + IndexNow configured',
      'Yandex Webmaster submitted',
      'NAP (Name, Address, Phone) consistency audit',
      'Basic local schema markup added to your site',
      'One round of revisions on profile copy',
      'Delivered within 7 days',
    ],
    cta: 'Get the foundation',
  },
  {
    slug: 'seo-deluxe',
    name: 'DELUXE GBP + SEO',
    chip: '[ FULL SERVICE ]',
    setupCents: 29700,
    monthlyCents: 9700,
    pitch: 'Setup plus ongoing optimization. We manage your entire local presence.',
    includes: [
      'Everything in BASIC SEO SETUP',
      'Full GBP optimization: photos, posts, Q&A, services',
      'Monthly GBP posts (4 per month)',
      'Review response drafts for your approval',
      'Local citation building (10 directories)',
      'Monthly ranking report',
      'Ongoing schema and technical SEO monitoring',
      'Priority support, same-day edits',
      'Monthly 15-minute strategy call',
    ],
    cta: 'Get the full service',
    featured: true,
  },
];

export function getSeoTier(slug: string): SeoTier | undefined {
  return seoTiers.find((t) => t.slug === slug);
}

/**
 * SEO/GBP DELIVERABLES CHECKLIST.
 * Used in both client portal (read-only status) and admin (mark complete).
 */
export type SeoTask = {
  id: string;
  label: string;
  description: string;
  tier: 'basic' | 'deluxe' | 'both';
  /** External link template. {domain} replaced with client domain. */
  adminLink?: string;
};

export const seoTasks: SeoTask[] = [
  // Basic tier tasks
  {
    id: 'gbp-claimed',
    label: 'Google Business Profile claimed',
    description: 'Business ownership verified on Google',
    tier: 'both',
    adminLink: 'https://business.google.com/',
  },
  {
    id: 'gbp-optimized',
    label: 'GBP profile optimized',
    description: 'Hours, services, description, and categories completed',
    tier: 'both',
    adminLink: 'https://business.google.com/',
  },
  {
    id: 'gsc-setup',
    label: 'Google Search Console setup',
    description: 'Site verified and sitemap submitted',
    tier: 'both',
    adminLink: 'https://search.google.com/search-console',
  },
  {
    id: 'bing-setup',
    label: 'Bing Webmaster Tools setup',
    description: 'Site verified and IndexNow configured',
    tier: 'both',
    adminLink: 'https://www.bing.com/webmasters',
  },
  {
    id: 'yandex-setup',
    label: 'Yandex Webmaster submitted',
    description: 'Site added to Yandex index',
    tier: 'both',
    adminLink: 'https://webmaster.yandex.com/',
  },
  {
    id: 'nap-audit',
    label: 'NAP consistency audit',
    description: 'Name, address, phone verified across web',
    tier: 'both',
  },
  {
    id: 'schema-basic',
    label: 'Local schema markup added',
    description: 'LocalBusiness JSON-LD on site',
    tier: 'both',
  },
  // Deluxe-only tasks
  {
    id: 'gbp-photos',
    label: 'GBP photos uploaded',
    description: 'Cover, logo, and business photos added',
    tier: 'deluxe',
    adminLink: 'https://business.google.com/',
  },
  {
    id: 'gbp-posts-initial',
    label: 'Initial GBP posts published',
    description: 'First batch of Google posts live',
    tier: 'deluxe',
    adminLink: 'https://business.google.com/',
  },
  {
    id: 'citations-submitted',
    label: 'Local citations submitted',
    description: '10 directory listings created',
    tier: 'deluxe',
  },
  {
    id: 'review-templates',
    label: 'Review response templates ready',
    description: 'Draft responses for common reviews',
    tier: 'deluxe',
  },
];

export function getTasksForTier(tier: 'basic' | 'deluxe'): SeoTask[] {
  if (tier === 'basic') {
    return seoTasks.filter((t) => t.tier === 'both' || t.tier === 'basic');
  }
  return seoTasks;
}

export const seoFaq = [
  {
    q: 'What is the difference between Basic and Deluxe?',
    a: 'Basic is a one-time setup that gets you indexed on Google, Bing, and Yandex. Deluxe adds ongoing optimization: monthly GBP posts, citation building, review management, and a monthly strategy call.',
  },
  {
    q: 'How long does the setup take?',
    a: 'Basic SEO Setup is delivered within 7 days. Deluxe starts the same way, then continues month to month.',
  },
  {
    q: 'Do I need a website first?',
    a: 'A website helps, but we can set up your Google Business Profile without one. If you need a site, we build those too.',
  },
  {
    q: 'Will this help me rank higher on Google?',
    a: 'We set up the foundation that Google needs to understand your business. Ranking depends on many factors, but most local businesses see improvement within 30 to 90 days of proper setup.',
  },
  {
    q: 'What about AI search like ChatGPT?',
    a: 'AI assistants pull from the same sources Google does. A well-optimized GBP and proper schema markup help you show up when someone asks "who does [your service] near me."',
  },
  {
    q: 'Can I cancel the monthly plan?',
    a: 'Yes. Deluxe is month to month, cancel anytime. Your profiles and all the work we did stay yours.',
  },
] as const;
