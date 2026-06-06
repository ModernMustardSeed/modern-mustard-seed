import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Client pays the remaining 50% balance from their portal. */
export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const { data: p } = await supabase
    .from('proposals')
    .select('*')
    .eq('client_email', session.email)
    .eq('deposit_status', 'paid')
    .neq('balance_status', 'paid')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: 'No balance due.' }, { status: 400 });

  const oneTime = Number(p.one_time_total) || 0;
  const deposit = Math.round(Number(p.deposit_amount) || Math.round(oneTime * 0.5));
  const amount = Math.max(0, oneTime - deposit);
  if (amount < 1) return NextResponse.json({ error: 'No balance due.' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Payments not configured.' }, { status: 503 });

  const label = (p.client_company as string) || (p.client_name as string) || 'your engagement';
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: { currency: 'usd', product_data: { name: `Final balance — ${label}` }, unit_amount: amount * 100 },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/portal?balance=paid`,
      cancel_url: `${SITE.url}/portal`,
      customer_email: session.email,
      metadata: { kind: 'balance', proposal_id: p.id as string, item_name: `Balance — ${label}` },
      payment_intent_data: { metadata: { kind: 'balance', proposal_id: p.id as string } },
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });
    await supabase.from('proposals').update({ balance_status: 'link_sent' }).eq('id', p.id);
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('portal pay-balance error', msg);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
