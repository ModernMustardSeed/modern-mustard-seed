/**
 * Stripe Checkout for THE LAUNCH FILM.
 *
 * Prices come from data/launch-film.ts as inline price_data, the way /pay
 * mints its sessions, so there is no Stripe price id to create and nothing
 * that can drift from the page. The webhook (kind: "launch-film") records the
 * order, files the lead and mails both sides.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getLaunchFilmTier, LAUNCH_FILM } from '@/data/launch-film';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tier = getLaunchFilmTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Checkout is closed for a moment. Email sarah@modernmustardseed.com and she will open it by hand today.' },
      { status: 503 }
    );
  }

  const metadata = {
    kind: 'launch-film',
    slug: tier.slug,
    item_name: `${LAUNCH_FILM.name.toUpperCase()} ${tier.name}`,
  };

  const priceData = {
    currency: 'usd',
    unit_amount: tier.priceCents,
    product_data: {
      name: `${tier.name} by Modern Mustard Seed`,
      description: tier.pitch,
    },
    ...(tier.mode === 'subscription' ? { recurring: { interval: 'month' as const } } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier.mode,
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData, quantity: 1 }],
      success_url: `${SITE.url}/launch-film/greenlit?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/launch-film#book`,
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
              ? 'One new film per month on your release cadence, no rollover, month to month. Every film is hand-finished before it ships.'
              : `Hand-finished and ${tier.slug === 'launch-campaign' ? LAUNCH_FILM.campaignDelivery : LAUNCH_FILM.delivery}. Full rights, every format, and the source rig are yours.`,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('launch-film checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
