import type { MetadataRoute } from 'next';
import { listContent } from '@/lib/content';
import { SITE } from '@/lib/seo';
import { industries } from '@/data/industries';
import { liveTradePages } from '@/data/trade-pages';
import { MONTANA_CITIES } from '@/data/montana-cities';

// PARKED 2026-08-07 (Sarah): /mustard-tree, /press, and /hatchery are out of
// the sitemap and noindexed. The routes still answer directly; they are simply
// not advertised to crawlers or AI answer engines. See Navbar.tsx.
//
// PARKED 2026-09-11 (Sarah, the boutique pass): the self-serve catalog and the
// lead magnets came out of the sitemap too. /demos, /store and its items,
// /playbooks, /audit, /website-audit, /scaling-roadmap, /launch-checklist,
// /prompt-playbook, /fieldguide, /hundredfold, /seed-to-system, /idea-to-spec,
// /the-terminal, /mustard-mode, /mustard-launch, /switchboard, /comic and
// /book. Every one of those routes still answers, so existing links, ads, QR
// codes, Stripe returns and drip emails keep working. They are no longer
// advertised, because a studio that publishes a price list and a shelf of
// giveaways is selling against its own positioning.
//
// /inquire is the front door now and carries the top priority beside the
// homepage.
const STATIC_PATHS = [
  '',
  '/inquire',
  '/work',
  '/services',
  '/work-with-us',
  '/the-system',
  '/talking-website',
  '/websites',
  '/ai-websites',
  '/brand',
  '/voice-agents',
  '/voice-agents/whitepaper',
  '/command-center',
  '/chief',
  '/ai-native',
  '/ads',
  '/launch-film',
  '/mustard',
  '/playbook',
  '/ai-proof',
  '/for',
  '/for/restaurants',
  '/montana',
  '/resources',
  '/blog',
  '/about',
  '/sarahscarano',
  '/world',
  '/contact',
  '/sample-proposal',
  '/privacy',
  '/terms',
  '/super-nomad',
  '/super-nomad/privacy',
  '/super-nomad/terms',
];


export default function sitemap(): MetadataRoute.Sitemap {

  const staticUrls = STATIC_PATHS.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: (path === '' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    priority:
      path === '' || path === '/inquire'
        ? 1.0
        : path === '/work' || path === '/services' || path === '/talking-website' || path === '/websites' || path === '/voice-agents' || path === '/brand'
          ? 0.95
          : path === '/work-with-us' || path === '/the-system' || path === '/command-center' || path === '/chief' || path === '/ai-native' || path === '/ads' || path === '/launch-film' || path === '/about'
            ? 0.9
            : 0.7,
  }));

  const blog = listContent('blog').map((p) => ({
    url: `${SITE.url}/blog/${p.slug}`,
    lastModified: new Date(p.dateModified ?? p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const studies = listContent('work').map((s) => ({
    url: `${SITE.url}/work/${s.slug}`,
    lastModified: new Date(s.dateModified ?? s.date),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  // Parked with the playbooks index, 2026-09-11. Still answering at their URLs.
  const playbooks: MetadataRoute.Sitemap = [];

  const industryPages = industries.map((i) => ({
    url: `${SITE.url}/for/${i.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  // Parked with the store itself, 2026-09-11. The product routes still answer
  // for anyone holding a link or returning from Stripe.
  const storeItems: MetadataRoute.Sitemap = [];

  const tradePages = liveTradePages().map((t) => ({
    url: `${SITE.url}/voice-agents/${t.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  // Local fleet. High priority: these are the queries we can realistically win.
  const cityPages = MONTANA_CITIES.map((c) => ({
    url: `${SITE.url}/montana/${c.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const entries = [
    ...staticUrls,
    ...blog,
    ...studies,
    ...playbooks,
    ...industryPages,
    ...storeItems,
    ...tradePages,
    ...cityPages,
  ];
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
