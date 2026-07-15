/**
 * Stripe Checkout for a Switchboard franchise deal. Sarah mints this link from
 * /admin/switchboard after a walkthrough and sends it to the brand.
 *
 * Subscription mode: a per-location monthly line (quantity = locations, at the
 * volume tier price) PLUS the one-time franchise build billed on the first
 * invoice. Inline price_data so no dashboard setup. Recurring revenue is then
 * recorded per invoice by the store webhook's invoice.paid handler.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { quoteFor, BUILD_FEE_USD, SWITCHBOARD } from '@/data/switchboard';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { locations?: number; business?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const locations = Math.max(1, Math.min(9999, Math.round(Number(body.locations) || 0)));
  if (locations < 1) return NextResponse.json({ error: 'invalid_locations' }, { status: 400 });
  const business = (body.business || '').trim().slice(0, 100);
  const quote = quoteFor(locations);

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'switchboard',
    item_name: `The Switchboard, ${locations} locations`,
    locations: String(locations),
    per_location: String(quote.perLocationUsd),
    ...(business ? { business } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: quote.perLocationUsd * 100,
            recurring: { interval: 'month' },
            product_data: { name: `${SWITCHBOARD.name} concierge, per location` },
          },
          quantity: locations,
        },
        {
          price_data: {
            currency: 'usd',
            unit_amount: BUILD_FEE_USD * 100,
            product_data: { name: `${SWITCHBOARD.name} franchise build (one-time)` },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/switchboard/live?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/switchboard#board`,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      ...(body.email ? { customer_email: body.email.trim().slice(0, 120) } : {}),
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `${locations} locations at $${quote.perLocationUsd}/mo each = $${quote.monthlyUsd.toLocaleString()}/mo, plus a one-time $${BUILD_FEE_USD.toLocaleString()} build on your first invoice.`,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url, monthly: quote.monthlyUsd, perLocation: quote.perLocationUsd, build: BUILD_FEE_USD });
  } catch (err) {
    console.error('switchboard checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'stripe_error', message: 'Could not create the link. Try again or check Stripe.' }, { status: 500 });
  }
}
