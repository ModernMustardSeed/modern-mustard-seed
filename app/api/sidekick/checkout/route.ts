/**
 * Stripe Checkout for keeping your Sidekick. Amounts come from data/sidekick.ts
 * (cents), never from env price IDs, so the page and the charge cannot diverge.
 *   SIDEKICK      $397 setup + $297/mo   (250 min hard cap)
 *   SIDEKICK PRO  $597 setup + $497/mo   (600 min hard cap)
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

  // Affiliate attribution: read the first-party mms_ref cookie (set by
  // RefCapture on any ?ref= arrival) so a referred subscription pays the
  // partner a recurring share on every invoice, not just at signup. Stored on
  // subscription metadata below so it rides every renewal.
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  const ref = (cookieRef ? decodeURIComponent(cookieRef[1]) : '').trim().slice(0, 64) || undefined;

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'sidekick',
    slug: tier.slug,
    item_name: tier.name,
    ...(body.business ? { business: body.business.trim().slice(0, 80) } : {}),
    ...(body.runId ? { run_id: body.runId.trim().slice(0, 64) } : {}),
    ...(ref ? { ref } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      // Inline price_data, built from data/sidekick.ts. Prices used to come from
      // Stripe price IDs in env while the page rendered its own hardcoded dollars,
      // so the two could silently disagree and we would advertise one number and
      // charge another. One source of truth now. The setup fee is a non-recurring
      // line, so it rides invoice #1 only (same shape as the demo-order checkout).
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tier.monthlyCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `${tier.name} (${tier.minutesCap} answered minutes/mo)`,
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
              description: 'Hand-installed by Sarah within 7 days. Credited toward any custom build over $2,500.',
            },
          },
        },
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
