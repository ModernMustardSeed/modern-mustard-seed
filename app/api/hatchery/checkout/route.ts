/**
 * Stripe Checkout for a MUSTARD HATCHERY Founding Egg ($497 one-time).
 *
 * Uses inline price_data so the presale ships without any Stripe dashboard
 * setup. Seats are hard-capped at FOUNDING.cap: we refuse here the moment the
 * five are claimed (soft gate), and the webhook consumes the seat atomically on
 * payment (hard gate). Fulfillment is presale-first and ignite-or-refund, so a
 * rare oversell between checkout and payment is refunded by hand, never the
 * buyer's problem.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getHatcheryTier, FOUNDING, HATCHERY } from '@/data/hatchery';
import { foundingSeatsClaimed } from '@/lib/hatchery-store';
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

  // Only the Founding Egg is buyable on the presale (care plans open post-birth).
  const tier = getHatcheryTier((body.tier || 'hatchery-founding-egg').trim());
  if (!tier || tier.slug !== 'hatchery-founding-egg') {
    return NextResponse.json({ error: 'unknown_item' }, { status: 404 });
  }

  // Soft cap: refuse the sixth buyer before they ever see Stripe.
  const supabase = getSupabase();
  if (supabase) {
    const claimed = await foundingSeatsClaimed(supabase, FOUNDING.cap);
    if (claimed !== null && claimed >= FOUNDING.cap) {
      return NextResponse.json(
        { error: 'sold_out', message: 'All five Founding Eggs are claimed. Email sarah@modernmustardseed.com to join the next hatch.' },
        { status: 409 },
      );
    }
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
            unit_amount: FOUNDING.priceUsd * 100,
            product_data: {
              name: `${HATCHERY.wordmark} — Founding Egg`,
              description: `One of five. Your business's official mascot, fully hatched and unveiled on a public Birth Day. Founding price ${'$'}${FOUNDING.priceUsd} (regularly ${'$'}${FOUNDING.regularUsd}).`,
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
          message: `Ignite-or-refund: if fewer than ${FOUNDING.igniteFloor} eggs are claimed by ${FOUNDING.closesLabel}, your payment is refunded in full, automatically. You approve the direction before any art is made.`,
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
