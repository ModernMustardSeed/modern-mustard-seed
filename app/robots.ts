import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/portal/'] },
      {
        userAgent: ['OAI-SearchBot', 'Googlebot', 'Bingbot', 'Applebot', 'PerplexityBot'],
        allow: '/',
        disallow: ['/api/', '/admin/', '/portal/'],
      },
      // Discovery rules above do not opt in to model training. GPTBot and
      // other training crawlers retain the pre-existing wildcard policy.
      // Sarah can set their rules independently; see the audit documentation.
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
