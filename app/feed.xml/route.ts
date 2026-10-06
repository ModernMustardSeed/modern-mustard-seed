import { listContent } from '@/lib/content';
import { SITE } from '@/lib/seo';
import { comparePages } from '@/data/compare-pages';
import { bestPages } from '@/data/best-pages';
import { alternativesPages } from '@/data/alternatives-pages';

/**
 * RSS 2.0 feed at /feed.xml.
 *
 * Pinterest's "auto-publish from RSS" turns every item into a Pin, and it
 * rejects items without an image, so every item carries a media:content
 * image: the post cover when there is one, the site share image otherwise.
 * Bing and the AI crawlers also read the feed for fresh URLs.
 */
export const revalidate = 3600;

type Item = { title: string; description: string; path: string; date: string; image?: string };

const abs = (p: string) => (p.startsWith('http') ? p : `${SITE.url}${p.startsWith('/') ? '' : '/'}${p}`);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const items: Item[] = [
    ...listContent('blog').map((p) => ({
      title: p.title,
      description: p.description,
      path: `/blog/${p.slug}`,
      date: p.dateModified ?? p.date,
      image: p.cover,
    })),
    ...comparePages.map((p) => ({
      title: p.metaTitle,
      description: p.metaDescription,
      path: `/compare/${p.slug}`,
      date: p.checked,
    })),
    ...alternativesPages.map((p) => ({
      title: p.metaTitle,
      description: p.metaDescription,
      path: `/alternatives/${p.slug}`,
      date: p.checked,
    })),
    ...bestPages.map((p) => ({
      title: p.metaTitle,
      description: p.metaDescription,
      path: `/best/${p.slug}`,
      date: p.checked,
    })),
    {
      title: 'AI Receptionist Cost in 2026: Real Prices Compared',
      description:
        'Published prices from AI receptionist and answering service vendors, what a human receptionist costs, and a payback calculator.',
      path: '/ai-receptionist-cost',
      date: '2026-10-05',
    },
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const body = items
    .map((i) => {
      const url = abs(i.path);
      const img = abs(i.image ?? SITE.ogImage);
      const type = /\.png(?:\?|$)/i.test(img) ? 'image/png' : 'image/jpeg';
      return [
        '<item>',
        `<title>${esc(i.title)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<description>${esc(i.description)}</description>`,
        `<pubDate>${new Date(i.date).toUTCString()}</pubDate>`,
        `<media:content url="${esc(img)}" medium="image" type="${type}" />`,
        `<enclosure url="${esc(img)}" type="${type}" length="0" />`,
        '</item>',
      ].join('');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE.name)}</title>
<link>${SITE.url}</link>
<description>${esc(SITE.description)}</description>
<language>en-us</language>
<atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml" />
${body}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
