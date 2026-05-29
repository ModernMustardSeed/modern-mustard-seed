/**
 * Issue a fresh signed download URL for a buyer's PDF.
 *
 * Authorization is the Stripe session_id from the checkout success_url
 * (`?session_id=cs_...`). We confirm the session is `paid`, then mint a fresh
 * 24h Supabase signed URL on demand. This means the success page download
 * link always works (even after browser refresh) and the email link always
 * works for 24h after issue.
 *
 * Returns:
 *  { downloads: [{ name, url }] }  on success
 *  { error: '...' }                 on failure (400/404/500)
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getProductBySlug, getBundleBySlug, products as ALL_PRODUCTS } from '@/data/products';
import { getSignedDownloadUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'not_paid' }, { status: 402 });
  }

  const slug = session.metadata?.slug;
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

  const product = getProductBySlug(slug);
  const bundle = getBundleBySlug(slug);
  const item = product ?? bundle;
  if (!item) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const pdfFiles: { name: string; fileName: string }[] = product
    ? [{ name: product.name, fileName: product.pdfFileName }]
    : (bundle?.productSlugs || [])
        .map((s) => ALL_PRODUCTS.find((p) => p.slug === s))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({ name: p.name, fileName: p.pdfFileName }));

  const downloads = await Promise.all(
    pdfFiles.map(async ({ name: n, fileName }) => ({
      name: n,
      url: (await getSignedDownloadUrl(fileName)) || '',
    }))
  );

  return NextResponse.json({
    itemName: item.name,
    customerEmail: session.customer_details?.email ?? session.customer_email,
    downloads,
  });
}
