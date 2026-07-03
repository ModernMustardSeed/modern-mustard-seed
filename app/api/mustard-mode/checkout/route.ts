/**
 * Stripe Checkout for MUSTARD MODE levels.
 *   Player  $197 one-time   STRIPE_PRICE_MUSTARD_PLAYER
 *   Builder $397 one-time   STRIPE_PRICE_MUSTARD_BUILDER
 *   Cabinet $97/mo sub      STRIPE_PRICE_MUSTARD_CABINET
 *
 * Success lands on /api/mustard-mode/enter which verifies, grants entitlement,
 * signs the buyer in, and opens their HQ. The webhook is the durable backstop.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getMustardLevel } from '@/data/mustard-mode/offer';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { slug?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const slug = (body.slug || '').trim();
  const level = getMustardLevel(slug);
  if (!level || !level.stripePriceEnv || !level.mode) {
    return NextResponse.json({ error: 'unknown_item' }, { status: 404 });
  }

  const priceId = process.env[level.stripePriceEnv];
  if (!priceId) {
    console.error('mustard checkout not configured:', level.stripePriceEnv, 'missing');
    return NextResponse.json(
      { error: 'not_configured', message: 'Checkout is not live yet. Email sarah@modernmustardseed.com and we will open the door by hand.' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'mustard-mode',
    slug,
    item_name: `MUSTARD MODE ${level.name}`,
    ...(body.ref ? { ref: body.ref.trim().slice(0, 64) } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: level.mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE.url}/api/mustard-mode/enter?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/mustard-mode`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      ...(level.mode === 'payment'
        ? { payment_intent_data: { metadata } }
        : { subscription_data: { metadata } }),
      custom_text: {
        submit: {
          message:
            level.mode === 'subscription'
              ? 'Cancel anytime. Your coach and every drop stay live while you play.'
              : 'Lifetime access and free updates. Your coach stays current as the method grows.',
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('mustard-mode checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
