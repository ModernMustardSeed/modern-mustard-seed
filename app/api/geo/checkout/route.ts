/**
 * Stripe Checkout for GEO DESK.
 *   THE FIX PACK   $297 one-time (instant: pack generates on payment)
 *   THE FULL DESK  $497 one-time (pack + 90 days of monthly re-grades)
 *   THE WATCH      $97/mo, WATCH PRO $197/mo (hard-capped monitoring)
 *   INSTALLED      $997 one-time, DARK until GEO_INSTALLED_OPEN=1
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getGeoTier } from '@/data/geo';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > 200) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (!u.hostname.includes('.')) return null;
    const normalized = u.toString();
    // Reject rather than truncate: a sliced URL would generate a wrong pack.
    if (normalized.length > 190) return null;
    return normalized;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { tier?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tier = getGeoTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  if (tier.dark && process.env.GEO_INSTALLED_OPEN !== '1') {
    return NextResponse.json(
      { error: 'not_open', message: 'White-glove install slots are not open right now. Email sarah@modernmustardseed.com to get on the list.' },
      { status: 409 }
    );
  }

  const url = normalizeUrl(body.url || '');
  if (!url) {
    return NextResponse.json(
      { error: 'no_url', message: 'The desk needs your website address first. Run the free audit above, or type your URL.' },
      { status: 400 }
    );
  }

  const priceId = process.env[tier.stripePriceEnv];
  if (!priceId) {
    console.error('geo checkout not configured:', tier.stripePriceEnv);
    return NextResponse.json(
      { error: 'not_configured', message: 'The desk is warming up. Email sarah@modernmustardseed.com and she will handle it by hand today.' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'geo',
    slug: tier.slug,
    item_name: `GEO DESK ${tier.name}`,
    url: url.slice(0, 190),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier.mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        tier.mode === 'payment' && tier.slug !== 'geo-installed'
          ? `${SITE.url}/geo/pack?session_id={CHECKOUT_SESSION_ID}`
          : `${SITE.url}/website-audit?geo=welcome`,
      cancel_url: `${SITE.url}/website-audit#geo-desk`,
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
              ? 'Month to month, cancel anytime. One full re-grade per site per month, delivered by email. We sell installed signals and honest reports, never ranking promises.'
              : tier.slug === 'geo-installed'
                ? 'Sarah emails within one business day to schedule the install. Before/after graded report included.'
                : 'Your pack generates the moment you pay and opens instantly, personalized from your live site. We sell installed signals and honest reports, never ranking promises.',
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('geo checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
