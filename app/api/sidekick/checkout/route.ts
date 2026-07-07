/**
 * Stripe Checkout for keeping your Sidekick.
 *   SIDEKICK      $297 setup + $197/mo   (250 min hard cap)
 *   SIDEKICK PRO  $497 setup + $397/mo   (600 min hard cap)
 *
 * Subscription mode with the one-time setup fee on the first invoice. No
 * trials, ever (the demo was the trial). Fulfillment is hand-installed by
 * Sarah within 7 days; the webhook records the order and fires the emails.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSidekickTier } from '@/data/sidekick';
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

  const tier = getSidekickTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const setupPrice = process.env[tier.setupPriceEnv];
  const monthlyPrice = process.env[tier.monthlyPriceEnv];
  if (!setupPrice || !monthlyPrice) {
    console.error('sidekick checkout not configured:', tier.setupPriceEnv, tier.monthlyPriceEnv);
    return NextResponse.json(
      { error: 'not_configured', message: 'Checkout is warming up. Email sarah@modernmustardseed.com and she will open the door by hand today.' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'sidekick',
    slug: tier.slug,
    item_name: tier.name,
    ...(body.business ? { business: body.business.trim().slice(0, 80) } : {}),
    ...(body.runId ? { run_id: body.runId.trim().slice(0, 64) } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: monthlyPrice, quantity: 1 },
        { price: setupPrice, quantity: 1 },
      ],
      success_url: `${SITE.url}/sidekick/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/sidekick#keep`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `Month to month, cancel anytime. ${tier.minutesCap} answered minutes a month, then message-taking mode. Never a surprise bill. Sarah installs your Sidekick by hand within 7 days, and the setup fee is credited toward any custom build over $2,500.`,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('sidekick checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
