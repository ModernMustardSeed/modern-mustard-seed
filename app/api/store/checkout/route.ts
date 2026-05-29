/**
 * Create a Stripe Checkout Session for a store item (product or bundle).
 *
 * Client posts { slug } → server resolves to the matching Stripe Price ID,
 * creates a one-time-payment Checkout Session, and returns the hosted-checkout
 * URL. Client redirects.
 *
 * Buyer is dropped into the leads table after Stripe confirms payment (see
 * /api/store/webhook), so funnel intelligence (chatbot, audit, sequence)
 * recognizes them by email immediately.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getProductBySlug, getBundleBySlug } from '@/data/products';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const slug = (body.slug || '').trim();
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

  const product = getProductBySlug(slug);
  const bundle = getBundleBySlug(slug);
  const item = product ?? bundle;
  if (!item) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const priceId = item.stripePriceId;
  if (!priceId) {
    return NextResponse.json(
      { error: 'not_configured', message: 'This item is not yet wired to Stripe.' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE.url}/store/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/store/${slug}`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata: {
        slug,
        item_name: item.name,
        item_type: product ? 'product' : 'bundle',
      },
      payment_intent_data: {
        metadata: {
          slug,
          item_name: item.name,
        },
      },
      custom_text: {
        submit: {
          message: `Instant PDF delivery to your email after payment. Lifetime access. Free updates. Your $${item.priceUsd} credits toward any Modern Mustard Seed engagement.`,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'no_url' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('Stripe checkout error:', msg);
    return NextResponse.json({ error: 'stripe_error', message: msg }, { status: 500 });
  }
}
