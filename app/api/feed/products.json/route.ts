/**
 * Product feed for ChatGPT Shopping (OpenAI Merchant API) and any other JSON
 * shopping integrations (Perplexity, Linkup, generic LLM crawlers).
 *
 * Format: simple normalized JSON. Fields are aligned with the OpenAI Shopping
 * draft spec (product_id, title, description, price.amount, price.currency,
 * availability, brand, url, image_url, category).
 *
 * Submission instructions for OpenAI Shopping:
 *   1. Apply at https://chatgpt.com/shopping/merchants
 *   2. Submit this feed URL as the source.
 *   3. Verify the merchant domain.
 *
 * For Perplexity:
 *   Apply to their partner program. Until then, this feed plus the per-page
 *   Product JSON-LD is enough to get crawled organically.
 */

import { NextResponse } from 'next/server';
import { products, bundles } from '@/data/products';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET() {
  const feed = {
    merchant: {
      name: SITE.name,
      url: SITE.url,
      contact_email: SITE.email,
    },
    generated_at: new Date().toISOString(),
    currency: 'USD',
    products: [
      ...products.map((p) => ({
        product_id: p.slug,
        title: p.name,
        description: p.whatsInside,
        url: `${SITE.url}/store/${p.slug}`,
        image_url: `${SITE.url}/opengraph-image`,
        brand: SITE.name,
        author: 'Sarah Scarano',
        category: p.category,
        product_type: 'digital_download',
        format: 'pdf',
        page_count: p.pages,
        price: {
          amount: p.priceUsd.toFixed(2),
          currency: 'USD',
        },
        availability: 'in_stock',
        delivery: 'instant_download',
        tags: p.recommendFor,
      })),
      ...bundles.map((b) => ({
        product_id: b.slug,
        title: b.name,
        description: b.pitch,
        url: `${SITE.url}/store/${b.slug}`,
        image_url: `${SITE.url}/opengraph-image`,
        brand: SITE.name,
        author: 'Sarah Scarano',
        category: 'Bundle',
        product_type: 'digital_download_bundle',
        format: 'pdf',
        page_count: b.productSlugs
          .map((s) => products.find((p) => p.slug === s)?.pages ?? 0)
          .reduce((sum, n) => sum + n, 0),
        price: {
          amount: b.priceUsd.toFixed(2),
          currency: 'USD',
          regular_price: b.individualTotal.toFixed(2),
          savings: b.savings.toFixed(2),
        },
        availability: 'in_stock',
        delivery: 'instant_download',
        bundle_items: b.productSlugs,
      })),
    ],
  };

  return NextResponse.json(feed, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
