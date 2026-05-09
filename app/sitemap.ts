import type { MetadataRoute } from 'next';
import { listContent } from '@/lib/content';
import { SITE } from '@/lib/seo';

const STATIC_PATHS = [
  '',
  '/services',
  '/work-with-us',
  '/case-studies',
  '/blog',
  '/playbooks',
  '/audit',
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
    priority: path === '' ? 1.0 : path === '/work-with-us' || path === '/audit' ? 0.9 : 0.7,
  }));

  const blog = listContent('blog').map((p) => ({
    url: `${SITE.url}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const studies = listContent('case-studies').map((s) => ({
    url: `${SITE.url}/case-studies/${s.slug}`,
    lastModified: new Date(s.date),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const playbooks = listContent('playbooks').map((pb) => ({
    url: `${SITE.url}/playbooks/${pb.slug}`,
    lastModified: new Date(pb.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...blog, ...studies, ...playbooks];
}
