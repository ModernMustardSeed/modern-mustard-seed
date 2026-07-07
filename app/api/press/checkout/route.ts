/**
 * Stripe Checkout for MUSTARD PRESS.
 *   THE PIECE      $97 one-time, INSTANT (clean PDF on the success page)
 *   THE KIT       $297 one-time, hand-assembled within 2 business days
 *   THE HAND PRESS $497 one-time, HARD-CAPPED at 5 slots per ISO week
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getPressTier, PRESS } from '@/data/press';
import { getSupabase } from '@/lib/supabase';
import { handPressSlotsClaimed } from '@/lib/press-store';
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

  const tier = getPressTier((body.tier || '').trim());
  if (!tier) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  // THE PIECE is meaningless without a run to lift the watermark from.
  const runId = (body.runId || '').trim();
  if (tier.slug === 'press-piece' && !/^[0-9a-f-]{36}$/i.test(runId)) {
    return NextResponse.json(
      { error: 'no_run', message: 'Run your free proof first so there is a piece to buy. It takes about a minute.' },
      { status: 400 }
    );
  }

  // Slot gate: sold out means sold out. Fail closed if the counter is unreadable.
  if (tier.slug === 'press-handpress') {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'press_dark' }, { status: 503 });
    const used = await handPressSlotsClaimed(supabase, PRESS.weeklyHandPressSlots);
    if (used === null) return NextResponse.json({ error: 'press_dark' }, { status: 503 });
    if (used >= PRESS.weeklyHandPressSlots) {
      return NextResponse.json(
        { error: 'sold_out', message: 'This week’s five Hand Press slots are taken. New slots open Monday morning.' },
        { status: 409 }
      );
    }
  }

  const priceId = process.env[tier.stripePriceEnv];
  if (!priceId) {
    console.error('press checkout not configured:', tier.stripePriceEnv);
    return NextResponse.json(
      { error: 'not_configured', message: 'The register is warming up. Email sarah@modernmustardseed.com and she will ring you up by hand today.' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const metadata = {
    kind: 'press',
    slug: tier.slug,
    item_name: `MUSTARD PRESS ${tier.name}`,
    ...(body.business ? { business: body.business.trim().slice(0, 80) } : {}),
    ...(runId ? { run_id: runId } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE.url}/press/hot-off?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/press#roll`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      payment_intent_data: { metadata },
      custom_text: {
        submit: {
          message:
            tier.slug === 'press-piece'
              ? 'Instant: your clean print-ready PDF downloads the moment payment clears, plus a copy by email. Full commercial rights, yours forever.'
              : tier.slug === 'press-kit'
                ? 'Hand-assembled and delivered within 2 business days, one revision pass included. Full commercial rights.'
                : 'One of five weekly Hand Press slots. Sarah emails you within one business day to start the working session.',
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('press checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
