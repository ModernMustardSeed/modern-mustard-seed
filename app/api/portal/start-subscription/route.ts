import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/** Client starts their monthly plan from the portal (subscription Checkout). */
export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: p } = await supabase
    .from('proposals')
    .select('id, client_name, client_company, site_url, monthly_total, subscription_status')
    .ilike('client_email', session.email)
    .in('status', ['accepted', 'sent'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const amount = Math.round(Number(p?.monthly_total) || 0);
  if (!p || amount < 1) return NextResponse.json({ error: 'No monthly plan on your engagement.' }, { status: 400 });
  if (p.subscription_status === 'active') return NextResponse.json({ error: 'Your plan is already active.' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });

  const label = (p.client_company as string) || (p.client_name as string) || 'your engagement';
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Monthly plan — ${label}` },
            unit_amount: amount * 100,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/portal?plan=started`,
      cancel_url: `${SITE.url}/portal?plan=cancelled`,
      customer_email: session.email,
      metadata: { kind: 'subscription', proposal_id: p.id as string, item_name: `Monthly plan — ${label}` },
      subscription_data: { metadata: { kind: 'subscription', proposal_id: p.id as string } },
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });
    await supabase.from('proposals').update({ subscription_url: checkout.url, subscription_session_id: checkout.id, subscription_status: 'link_sent' }).eq('id', p.id);
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}
