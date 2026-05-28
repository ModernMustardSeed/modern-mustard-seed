/**
 * Product feed for Google Merchant Center / Bing Merchant Center / Microsoft
 * Advertising. Powers Gemini, Google AI Overviews, and Copilot shopping
 * surfaces.
 *
 * Format: RSS 2.0 with the standard Google Merchant Center extension
 * (g:* namespaced fields). Submit the URL of this endpoint as the feed
 * source in Merchant Center.
 *
 * Submission instructions:
 *   Google Merchant Center: https://merchants.google.com → Products → Feeds
 *   Bing Merchant Center:   https://ads.microsoft.com   → Tools → Microsoft Merchant Center
 *
 * For digital goods, mark the feed type as "Online" and set the product
 * category as appropriate. We use category 5 ("Media > Books").
 */

import { NextResponse } from 'next/server';
import { products, bundles } from '@/data/products';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const revalidate = 86400;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function productItem(args: {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  priceUsd: number;
  brand: string;
  category: string;
}) {
  return `
    <item>
      <g:id>${escapeXml(args.id)}</g:id>
      <title>${escapeXml(args.title)}</title>
      <description>${escapeXml(args.description)}</description>
      <link>${escapeXml(args.link)}</link>
      <g:image_link>${escapeXml(args.imageLink)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${args.priceUsd.toFixed(2)} USD</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(args.brand)}</g:brand>
      <g:google_product_category>5</g:google_product_category>
      <g:product_type>${escapeXml(args.category)}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:adult>no</g:adult>
      <g:is_bundle>${args.category === 'Bundle' ? 'yes' : 'no'}</g:is_bundle>
    </item>`;
}

export async function GET() {
  const itemsXml = [
    ...products.map((p) =>
      productItem({
        id: p.slug,
        title: p.name,
        description: p.whatsInside,
        link: `${SITE.url}/store/${p.slug}`,
        imageLink: `${SITE.url}/opengraph-image`,
        priceUsd: p.priceUsd,
        brand: SITE.name,
        category: p.category,
      })
    ),
    ...bundles.map((b) =>
      productItem({
        id: b.slug,
        title: b.name,
        description: b.pitch,
        link: `${SITE.url}/store/${b.slug}`,
        imageLink: `${SITE.url}/opengraph-image`,
        priceUsd: b.priceUsd,
        brand: SITE.name,
        category: 'Bundle',
      })
    ),
  ].join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(SITE.name + ' Playbook Store')}</title>
    <link>${escapeXml(SITE.url + '/store')}</link>
    <description>${escapeXml('Production-tested AI workbooks and playbooks from Modern Mustard Seed.')}</description>
    ${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
