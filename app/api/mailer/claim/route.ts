/**
 * The card becomes a subscription.
 *
 * This is deliberately the same shape as /api/demo-order/checkout and it mints
 * the same `kind: 'demo-order'` metadata, so the existing webhook branch does
 * the whole job: flips the order to paid, marks the lead won, opens the front
 * office, and sends both emails. A second fulfilment path would be a second
 * place for money to get stuck.
 *
 * The one difference is where a buyer lands afterwards. A mailed order has no
 * hub demo, so it carries `mail_code` and comes home to /y/<code>/thanks.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import { lookupMailCode } from '@/lib/mailer/lookup';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { code?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const found = await lookupMailCode(body.code || '');
  if (!found) return NextResponse.json({ error: 'unknown_code' }, { status: 404 });

  // NEVER double-bill. A card sits on a desk for weeks and gets scanned twice.
  if (found.existingOrder) {
    return NextResponse.json(
      {
        error: 'already_ordered',
        message:
          'You already have an order with us. Check your email for the confirmation, or call (406) 312-1223 and we will sort it out on the spot.',
        url: found.existingOrder.stripe_session_id
          ? `${SITE.url}/y/${found.code}/thanks?session_id=${found.existingOrder.stripe_session_id}`
          : null,
      },
      { status: 409 }
    );
  }

  const supabase = getSupabase();
  const stripe = getStripe();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const { lead } = found;
  // The card prints one price and one offer. It sells exactly that: the
  // Talking Website. Anything else would be a different promise than the paper.
  const setupCents = DEMO_BUNDLE.setupCents;
  const monthlyCents = DEMO_BUNDLE.monthlyCents;

  const { data: piece } = await supabase
    .from('mail_pieces')
    .select('id')
    .eq('mail_code', found.code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // A buyer may type an email that is better than the one we scraped.
  const typedEmail = (body.email || '').trim().slice(0, 254);
  const email = /.+@.+\..+/.test(typedEmail) ? typedEmail : lead.email || null;

  const { data: order, error: insErr } = await supabase
    .from('demo_orders')
    .insert({
      outbound_lead_id: lead.id,
      hub_demo_id: null,
      mail_code: found.code,
      mail_piece_id: piece?.id ?? null,
      business_name: lead.business_name,
      products: ['bundle'],
      setup_cents: setupCents,
      monthly_cents: monthlyCents,
      email,
      name: lead.contact_name || null,
      phone: lead.phone || null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insErr || !order) {
    console.error('mailer claim: demo_orders insert failed:', insErr?.message);
    return NextResponse.json({ error: 'order_failed' }, { status: 500 });
  }

  const metadata = {
    kind: 'demo-order',
    demo_order_id: order.id,
    mail_code: found.code,
    item_name: `${DEMO_BUNDLE.name} — ${lead.business_name}`,
    products: 'bundle',
    source: 'mailer',
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${DEMO_BUNDLE.name} — monthly` },
            unit_amount: monthlyCents,
            recurring: { interval: 'month' as const },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${DEMO_BUNDLE.name} — one-time setup & customization` },
            unit_amount: setupCents,
          },
          quantity: 1,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      success_url: `${SITE.url}/y/${found.code}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/y/${found.code}`,
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `Month to month, cancel anytime. ${formatUsd(setupCents)} one-time setup covers customizing the site you just looked at and building your voice agent on it. Live on your domain within 7 days. No trials, no surprise bills.`,
        },
      },
    });
    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });

    await supabase.from('demo_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    await supabase
      .from('outbound_leads')
      .update({ checkout_sent_at: new Date().toISOString(), checkout_url: session.url })
      .eq('id', lead.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('mailer claim stripe error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or call (406) 312-1223.' },
      { status: 500 }
    );
  }
}
