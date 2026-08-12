import type { MetadataRoute } from 'next';
import { listContent } from '@/lib/content';
import { SITE } from '@/lib/seo';
import { industries } from '@/data/industries';
import { products, bundles } from '@/data/products';
import { liveTradePages } from '@/data/trade-pages';
import { MONTANA_CITIES } from '@/data/montana-cities';

// PARKED 2026-08-07 (Sarah): /mustard-tree, /press, and /hatchery are out of
// the sitemap and noindexed. The routes still answer directly; they are simply
// not advertised to crawlers or AI answer engines. /celebrate was unparked
// 2026-08-11 with the launch countdown. /voice-agents/forge was parked
// 2026-08-12 the same way: out of the sitemap and noindexed, still answering for
// the Meta campaign, Stripe returns, and the drip. See Navbar.tsx.
const STATIC_PATHS = [
  '',
  '/talking-website',
  '/ads',
  '/chief',
  '/command-center',
  '/websites',
  '/comic',
  '/pictures',
  '/switchboard',
  '/world',
  '/mustard-launch',
  '/mustard-mode',
  '/celebrate',
  '/mustard-mode/start-here',
  '/seed-to-system',
  '/one-person-business',
  '/the-terminal',
  '/idea-to-spec',
  '/partners',
  '/playbook',
  '/book',
  '/work',
  '/services',
  '/voice-agents',
  '/voice-agents/whitepaper',
  '/work-with-us',
  '/blog',
  '/playbooks',
  '/audit',
  '/demos',
  '/website-audit',
  '/scaling-roadmap',
  '/hundredfold',
  '/hundredfold/webinar',
  '/launch-checklist',
  '/prompt-playbook',
  '/ai-proof',
  '/for',
  '/for/restaurants',
  '/about',
  '/contact',
  '/store',
  '/sample-proposal',
  '/montana',
  '/privacy',
  '/terms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticUrls = STATIC_PATHS.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: (path === '' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    priority:
      path === '' || path === '/book'
        ? 1.0
        : path === '/talking-website' || path === '/ads' || path === '/chief' || path === '/command-center' || path === '/websites' || path === '/pictures' || path === '/switchboard' || path === '/world' || path === '/mustard-launch' || path === '/mustard-mode' || path === '/seed-to-system' || path === '/one-person-business' || path === '/the-terminal' || path === '/idea-to-spec' || path === '/scaling-roadmap' || path === '/hundredfold' || path === '/hundredfold/webinar'
          ? 0.95
          : path === '/work' || path === '/audit' || path === '/comic' || path === '/launch-checklist' || path === '/prompt-playbook'
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

  const playbooks = listContent('playbooks').map((pb) => ({
    url: `${SITE.url}/playbooks/${pb.slug}`,
    lastModified: new Date(pb.dateModified ?? pb.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const industryPages = industries.map((i) => ({
    url: `${SITE.url}/for/${i.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const storeItems = [...products, ...bundles].map((item) => ({
    url: `${SITE.url}/store/${item.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const tradePages = liveTradePages().map((t) => ({
    url: `${SITE.url}/voice-agents/${t.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  // Local fleet. High priority: these are the queries we can realistically win.
  const cityPages = MONTANA_CITIES.map((c) => ({
    url: `${SITE.url}/montana/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  return [
    ...staticUrls,
    ...blog,
    ...studies,
    ...playbooks,
    ...industryPages,
    ...storeItems,
    ...tradePages,
    ...cityPages,
  ];
}
