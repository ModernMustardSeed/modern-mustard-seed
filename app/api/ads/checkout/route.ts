/**
 * Stripe Checkout for MUSTARD BROADCAST (/ads). Amounts come from data/ads.ts
 * in cents as inline price_data (Sidekick shape), so the page and the charge
 * cannot diverge and no env price IDs are needed.
 *   ON AIR      $497 setup + $297/mo  (Meta, manages up to $3,000/mo spend)
 *   PRIME TIME  $997 setup + $597/mo  (Meta + Google, up to $10,000/mo spend)
 *
 * Subscription mode with the one-time setup fee on the first invoice. No
 * trials, month to month, cancel anytime. The client's ad spend never touches
 * us: it stays in their own ad account on their own card.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getBroadcastTier } from '@/data/ads';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { tier?: string; business?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tier = getBroadcastTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  // Affiliate attribution: same first-party cookie as Sidekick so a referred
  // Broadcast subscription pays the partner on every invoice.
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  const ref = (cookieRef ? decodeURIComponent(cookieRef[1]) : '').trim().slice(0, 64) || undefined;

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'ads',
    slug: tier.slug,
    item_name: `MUSTARD BROADCAST ${tier.name}`,
    ...(body.business ? { business: body.business.trim().slice(0, 80) } : {}),
    ...(ref ? { ref } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tier.monthlyCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `MUSTARD BROADCAST ${tier.name} (managed ads, up to $${tier.spendCapUsd.toLocaleString()}/mo spend)`,
              description: tier.pitch,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tier.setupCents,
            product_data: {
              name: `${tier.name} launch production (one time)`,
              description: 'Your commercial produced and your campaign built in week one. You approve every frame before anything runs.',
            },
          },
        },
      ],
      custom_fields: [
        {
          key: 'business',
          label: { type: 'custom', custom: 'Business name' },
          type: 'text',
          optional: false,
        },
      ],
      success_url: `${SITE.url}/ads/live?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/ads#packages`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `Month to month, cancel anytime. Your ad spend stays in your own ad account on your own card, never marked up (this plan manages up to $${tier.spendCapUsd.toLocaleString()}/mo of spend). Your commercial lands within 2 business days and you approve every frame before anything goes live.`,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('ads checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
