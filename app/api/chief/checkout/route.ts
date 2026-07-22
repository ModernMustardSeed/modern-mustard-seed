/**
 * Stripe Checkout for hiring The Chief. Amounts come from data/chief.ts (cents),
 * never from env price IDs, so the page and the charge cannot diverge.
 *   CHIEF            $497 setup + $597/mo   (500 min hard cap)
 *   CHIEF EXECUTIVE  $997 setup + $997/mo   (1,200 min hard cap)
 *   THE CABINET      $1,997 setup + $1,997/mo (3,000 min hard cap)
 *
 * Subscription mode with the one-time setup fee on the first invoice. No trials
 * (the demo call was the trial). Fulfillment is hand-trained by Sarah within 7
 * days; the webhook records the order, grants the entitlement, and magic-links
 * the buyer into their Chief command center.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getChiefTier } from '@/data/chief';
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

  const tier = getChiefTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  // Affiliate attribution: read the first-party mms_ref cookie so a referred
  // subscription pays the partner a recurring share on every invoice.
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  const ref = (cookieRef ? decodeURIComponent(cookieRef[1]) : '').trim().slice(0, 64) || undefined;

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'chief',
    slug: tier.slug,
    item_name: tier.name,
    ...(body.business ? { business: body.business.trim().slice(0, 80) } : {}),
    ...(ref ? { ref } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      // Inline price_data built from data/chief.ts. The setup fee is a
      // non-recurring line, so it rides invoice #1 only (same shape as sidekick).
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tier.monthlyCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `${tier.name} (${tier.minutesCap.toLocaleString()} assistant-minutes/mo)`,
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
              name: `${tier.name} setup (one time)`,
              description: 'Hand-trained by Sarah within 7 days. Your Chief, loaded with your world.',
            },
          },
        },
      ],
      success_url: `${SITE.url}/chief/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/chief#pricing`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `Month to month, cancel anytime. ${tier.minutesCap.toLocaleString()} assistant-minutes a month, then text and message-taking. Never a surprise bill. Sarah hand-trains your Chief within 7 days.`,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('chief checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
