/**
 * Stripe Checkout for the $497 flagship programs (The Terminal, Idea to Spec)
 * and the Zero to One bundle. Price ids come from env, never code:
 *   STRIPE_PRICE_THE_TERMINAL, STRIPE_PRICE_IDEA_TO_SPEC, STRIPE_PRICE_ZERO_TO_ONE
 *
 * Secure delivery (entitlement webhook + gated HQ + watermarked PDF) is the
 * next phase. This route creates the hosted checkout and tags the session with
 * the program slug so the webhook can grant entitlement once that lands.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getProgramBySlug, programBundle } from '@/data/programs';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { slug?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const slug = (body.slug || '').trim();
  const program = getProgramBySlug(slug);
  const bundle = slug === programBundle.slug ? programBundle : undefined;
  const item = program ?? bundle;
  if (!item) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const priceEnv = program ? program.stripePriceEnv : programBundle.stripePriceEnv;
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return NextResponse.json(
      { error: 'not_configured', message: `Set ${priceEnv} in the environment to enable this checkout.` },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  // After pay, /api/programs/enter verifies the session, grants access, signs
  // them in, and drops them in their HQ. Cancel returns to the sales page.
  const cancelLanding = program ? `/${program.slug}` : '/store';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE.url}/api/programs/enter?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}${cancelLanding}`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata: {
        kind: 'program',
        slug,
        item_name: item.name,
        ...(body.ref ? { ref: body.ref.trim().slice(0, 64) } : {}),
      },
      payment_intent_data: {
        metadata: { kind: 'program', slug, item_name: item.name },
      },
      custom_text: {
        submit: {
          message: 'Lifetime access and free updates. Your live tool stays current as it grows.',
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('program checkout error:', msg);
    return NextResponse.json({ error: 'stripe_error', message: msg }, { status: 500 });
  }
}
