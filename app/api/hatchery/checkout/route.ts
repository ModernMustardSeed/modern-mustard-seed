/**
 * Stripe Checkout to hatch a mascot ($497 one-time, flat and evergreen).
 *
 * Uses inline price_data so it ships without any Stripe dashboard setup. No seat
 * cap, no countdown, no price that climbs: the trust lever is approval, not
 * scarcity (you approve the direction before any art is made). Fulfillment is
 * hand-run; the webhook records the order and tells Sarah to birth the mascot.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getHatcheryTier, HATCH, HATCHERY } from '@/data/hatchery';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { tier?: string; business?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Only The Hatch is buyable up front (care plans open post-birth).
  const tier = getHatcheryTier((body.tier || 'hatchery-hatch').trim());
  if (!tier || tier.slug !== 'hatchery-hatch') {
    return NextResponse.json({ error: 'unknown_item' }, { status: 404 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const business = (body.business || '').trim().slice(0, 80);
  const metadata = {
    kind: 'hatchery',
    slug: tier.slug,
    item_name: `The Mustard Hatchery — ${tier.name}`,
    ...(business ? { business } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: HATCH.priceUsd * 100,
            product_data: {
              name: `${HATCHERY.wordmark} — ${tier.name}`,
              description: 'Your business’s official mascot, fully hatched and unveiled on a public Birth Day. One-time, $497.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/hatchery/claimed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/hatchery#claim`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      ...(body.email ? { customer_email: body.email.trim().slice(0, 120) } : {}),
      metadata,
      payment_intent_data: { metadata },
      custom_text: {
        submit: {
          message: 'You approve the direction before any art is made. Nothing is drawn until you love it.',
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('hatchery checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 },
    );
  }
}
