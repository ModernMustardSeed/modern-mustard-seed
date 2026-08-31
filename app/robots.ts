import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /y/* are the postcard landing pages: private pages about named
        // businesses that never asked to be on the internet. Every one of them
        // is noindex in its own metadata too; this is the belt to that's braces.
        disallow: ['/api/', '/y/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
