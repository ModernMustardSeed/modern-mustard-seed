/**
 * Stripe Checkout for ordering straight from a forged demo.
 *
 * Subscription mode: recurring monthly line + one-time setup line on the first
 * invoice (inline price_data, no pre-created prices). Month to month, cancel
 * anytime, no trials. Sarah customizes and releases within 7 days.
 *
 * Attribution: mms_ref cookie wins (the sharing partner), else the lead's
 * owning rep's partner code, mirrored into subscription metadata so the 25%
 * recurring commission rides every invoice (existing invoice.paid handler).
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { quoteDemoOrder, formatUsd } from '@/lib/demo-order';
import { recordDemoEvent } from '@/lib/demo-events';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { hubId?: string; products?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const hubId = (body.hubId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(hubId)) {
    return NextResponse.json({ error: 'bad_hub' }, { status: 400 });
  }
  const quote = quoteDemoOrder(Array.isArray(body.products) ? body.products : []);
  if (!quote) return NextResponse.json({ error: 'no_products' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  // The embed MUST name its foreign key. outbound_reps now has two relationships
  // to outbound_leads (owner_rep_id and current_lead_id, added in migration 063),
  // so a bare `outbound_reps(name)` is ambiguous and PostgREST rejects the whole
  // query (PGRST201). We want the owning rep, via owner_rep_id.
  const { data: lead, error: leadErr } = await supabase
    .from('outbound_leads')
    .select('id,business_name,contact_name,email,phone,hub_demo_url,owner_rep_id,affiliate_id,origin,outbound_reps!owner_rep_id(name)')
    .eq('hub_demo_id', hubId)
    .maybeSingle();
  // A query error (schema/relationship change) must NEVER masquerade as "demo
  // not found" and silently kill every checkout. Surface it as a real failure.
  if (leadErr) {
    console.error('demo-order lead lookup failed:', leadErr.message);
    return NextResponse.json(
      { error: 'lookup_failed', message: 'Checkout hiccuped. Try again in a minute or call (406) 312-1223.' },
      { status: 500 }
    );
  }
  if (!lead) return NextResponse.json({ error: 'unknown_demo' }, { status: 404 });

  // NEVER double-bill: a buyer who reopens their hub link must not be able to
  // mint a second live subscription. Existing live order = send them to their
  // intake instead of a new checkout.
  const { data: live } = await supabase
    .from('demo_orders')
    .select('id, stripe_session_id, status')
    .eq('hub_demo_id', hubId)
    .in('status', ['paid', 'intake_done', 'delivered'])
    .limit(1)
    .maybeSingle();
  if (live) {
    return NextResponse.json(
      {
        error: 'already_ordered',
        message: 'You already have an order with us. Check your email for the confirmation, or call (406) 312-1223 and we will sort it out on the spot.',
        url: live.stripe_session_id ? `${SITE.url}/demo/order/${hubId}/thanks?session_id=${live.stripe_session_id}` : null,
      },
      { status: 409 }
    );
  }

  // Attribution: sharing partner's cookie first, then the minting partner
  // frozen on the lead (partner-wielded forge, 054), then the owning rep's
  // code. A malformed cookie ("%") would throw a URIError out of
  // decodeURIComponent and 500 the money path, so a bad ref degrades to no
  // ref, never to a crash.
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  let ref = '';
  if (cookieRef) {
    try {
      ref = decodeURIComponent(cookieRef[1]).trim().slice(0, 64);
    } catch {
      ref = cookieRef[1].replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    }
  }
  if (!ref && lead.affiliate_id) {
    const { data: aff } = await supabase
      .from('affiliates')
      .select('code, status')
      .eq('id', lead.affiliate_id)
      .maybeSingle();
    if (aff?.status === 'approved' && aff.code) ref = (aff.code as string).trim();
  }
  const repName = (lead as { outbound_reps?: { name?: string } | null }).outbound_reps?.name;
  if (!ref && repName) {
    const { data: tm } = await supabase
      .from('team_members')
      .select('affiliate_code')
      .eq('rep_name', repName)
      .maybeSingle();
    ref = (tm?.affiliate_code || '').trim();
  }

  // The lifecycle row first (pending), so the webhook can flip it to paid.
  const { data: order, error: insErr } = await supabase
    .from('demo_orders')
    .insert({
      outbound_lead_id: lead.id,
      hub_demo_id: hubId,
      business_name: lead.business_name,
      products: quote.products,
      setup_cents: quote.setupCents,
      monthly_cents: quote.monthlyCents,
      email: lead.email || null,
      name: lead.contact_name || null,
      phone: lead.phone || null,
      ref: ref || null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insErr || !order) {
    console.error('demo_orders insert failed:', insErr?.message);
    return NextResponse.json({ error: 'order_failed' }, { status: 500 });
  }

  const metadata = {
    kind: 'demo-order',
    demo_order_id: order.id,
    hub_demo_id: hubId,
    item_name: `${quote.label} — ${lead.business_name || 'your business'}`,
    products: quote.products.join(','),
    ...(ref ? { ref } : {}),
  };

  const lineItems: Array<Record<string, unknown>> = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `${quote.label} — monthly` },
        unit_amount: quote.monthlyCents,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    },
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `${quote.label} — one-time setup & customization` },
        unit_amount: quote.setupCents,
      },
      quantity: 1,
    },
  ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      line_items: lineItems as any,
      success_url: `${SITE.url}/demo/order/${hubId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: lead.hub_demo_url || `${SITE.url}/demo/hub/${hubId}`,
      ...(lead.email ? { customer_email: lead.email as string } : {}),
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `Month to month, cancel anytime. ${formatUsd(quote.setupCents)} one-time setup covers your customization; we release everything within 7 days. No trials, no surprise bills.`,
        },
      },
    });
    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });

    await supabase.from('demo_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    await recordDemoEvent(supabase, {
      event: 'checkout_started',
      leadId: lead.id,
      hubId,
      origin: (lead as { origin?: string | null }).origin ?? null,
      affiliateId: (lead as { affiliate_id?: string | null }).affiliate_id ?? null,
      meta: { products: quote.products.join(','), ref: ref || null },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('demo-order checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or call (406) 312-1223.' },
      { status: 500 }
    );
  }
}
