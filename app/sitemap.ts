import type { MetadataRoute } from 'next';
import { listContent } from '@/lib/content';
import { SITE } from '@/lib/seo';
import { industries } from '@/data/industries';
import { products, bundles } from '@/data/products';

const STATIC_PATHS = [
  '',
  '/sidekick',
  '/pictures',
  '/press',
  '/hatchery',
  '/mustard-launch',
  '/mustard-mode',
  '/mustard-mode/start-here',
  '/the-terminal',
  '/idea-to-spec',
  '/partners',
  '/playbook',
  '/book',
  '/build-queue',
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
  '/launch-checklist',
  '/prompt-playbook',
  '/ai-proof',
  '/for',
  '/for/restaurants',
  '/about',
  '/contact',
  '/store',
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
      path === '' || path === '/build-queue'
        ? 1.0
        : path === '/sidekick' || path === '/pictures' || path === '/press' || path === '/hatchery' || path === '/mustard-launch' || path === '/mustard-mode' || path === '/the-terminal' || path === '/idea-to-spec'
          ? 0.95
          : path === '/work' || path === '/audit' || path === '/launch-checklist' || path === '/prompt-playbook'
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

  return [...staticUrls, ...blog, ...studies, ...playbooks, ...industryPages, ...storeItems];
}
