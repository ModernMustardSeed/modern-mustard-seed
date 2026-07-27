import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { ref?: string };

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const priceId = process.env.STRIPE_PRICE_SEED_TO_SYSTEM;
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message: 'Founding checkout opens when the cohort dates are set. Join the free class and Sarah will keep you posted.',
      },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Secure checkout is not configured yet.' },
      { status: 503 }
    );
  }

  const ref = body.ref?.trim().slice(0, 64);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE.url}/seed-to-system/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/seed-to-system`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      metadata: {
        kind: 'seed-to-system',
        cohort: 'founding',
        ...(ref ? { ref } : {}),
      },
      payment_intent_data: {
        metadata: {
          kind: 'seed-to-system',
          cohort: 'founding',
          ...(ref ? { ref } : {}),
        },
      },
      custom_text: {
        submit: {
          message: 'Your Stripe receipt arrives immediately. Sarah will follow with the founding cohort intake and calendar.',
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'no_checkout_url' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.error('seed-to-system checkout error:', message);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout could not open. Please try again.' },
      { status: 500 }
    );
  }
}
