/**
 * Stripe Checkout for AI NATIVE.
 *
 * Prices come from data/ai-native.ts as inline price_data, the way /pay and
 * /launch-film mint their sessions, so there is no Stripe price id to create
 * and nothing that can drift from the page. The webhook (kind: "ai-native")
 * records the order, files the lead and mails both sides.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAiNativeTier, AI_NATIVE } from '@/data/ai-native';
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

  const tier = getAiNativeTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Checkout is closed for a moment. Email sarah@modernmustardseed.com and she will open it by hand today.' },
      { status: 503 }
    );
  }

  const metadata = {
    kind: 'ai-native',
    slug: tier.slug,
    item_name: `${AI_NATIVE.name.toUpperCase()} ${tier.name}`,
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

  const submitMessage =
    tier.slug === 'tending'
      ? 'Two live team sessions a month, a standing line between them, month to month. Cancel the day your team stops needing it.'
      : tier.slug === 'ai-map'
        ? `Hand-written and ${AI_NATIVE.mapDelivery}. Credits in full toward AI NATIVE within ninety days.`
        : `Changes included, ${AI_NATIVE.buildDelivery}. Every account, key and admin seat is handed over in your name on the last day.`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier.mode,
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData, quantity: 1 }],
      success_url: `${SITE.url}/ai-native/kickoff?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/ai-native#book`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      ...(tier.mode === 'payment' ? { payment_intent_data: { metadata } } : { subscription_data: { metadata } }),
      custom_text: { submit: { message: submitMessage } },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('ai-native checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
