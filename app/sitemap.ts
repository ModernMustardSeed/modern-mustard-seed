import type { MetadataRoute } from 'next';
import { listContent } from '@/lib/content';
import { SITE } from '@/lib/seo';

const STATIC_PATHS = [
  '',
  '/build-queue',
  '/work',
  '/services',
  '/work-with-us',
  '/blog',
  '/playbooks',
  '/audit',
  '/ai-proof',
  '/about',
  '/contact',
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
        : path === '/work' || path === '/audit'
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

  return [...staticUrls, ...blog, ...studies, ...playbooks];
}
