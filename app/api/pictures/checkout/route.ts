/**
 * Stripe Checkout for MUSTARD PICTURES.
 *   THE SPOT      $197 one-time      STRIPE_PRICE_PICTURES_SPOT
 *   THE PREMIERE  $497 one-time      STRIPE_PRICE_PICTURES_PREMIERE
 *   SEASON PASS   $197/mo sub        STRIPE_PRICE_PICTURES_SEASON
 *
 * Fulfillment is hand-reviewed production through the studio pipeline; the
 * webhook records the order and mails Sarah the full production brief.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getPicturesTier, PICTURES } from '@/data/pictures';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { tier?: string; business?: string; runId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tier = getPicturesTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const priceId = process.env[tier.stripePriceEnv];
  if (!priceId) {
    console.error('pictures checkout not configured:', tier.stripePriceEnv);
    return NextResponse.json(
      { error: 'not_configured', message: 'The box office is warming up. Email sarah@modernmustardseed.com and she will open it by hand today.' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'pictures',
    slug: tier.slug,
    item_name: `MUSTARD PICTURES ${tier.name}`,
    ...(body.business ? { business: body.business.trim().slice(0, 80) } : {}),
    ...(body.runId ? { run_id: body.runId.trim().slice(0, 64) } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier.mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE.url}/pictures/greenlit?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/pictures#roll`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      ...(tier.mode === 'payment' ? { payment_intent_data: { metadata } } : { subscription_data: { metadata } }),
      custom_text: {
        submit: {
          message:
            tier.mode === 'subscription'
              ? 'One new spot per month, no rollover, cancel anytime. Every spot is hand-reviewed before delivery.'
              : `Hand-reviewed and ${tier.slug === 'pictures-premiere' ? PICTURES.deliveryPromisePremiere : PICTURES.deliveryPromiseSpot}. Full commercial usage rights, the files are yours forever.`,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('pictures checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
