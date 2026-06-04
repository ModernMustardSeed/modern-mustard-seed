import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Public: start Stripe checkout for the 50% deposit on a proposal. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const { token } = await params;
  const { data: p } = await supabase.from('proposals').select('*').eq('share_token', token).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (p.deposit_status === 'paid') return NextResponse.json({ error: 'Deposit already paid.' }, { status: 400 });

  const amount = Math.round(Number(p.deposit_amount) || Math.round((Number(p.one_time_total) || 0) * 0.5));
  if (!amount || amount < 1) {
    return NextResponse.json({ error: 'No deposit amount set on this proposal.' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Payments not configured.' }, { status: 503 });

  const label = (p.client_company as string) || (p.client_name as string) || 'your engagement';
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Deposit to begin — ${label}` },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/proposal/${token}?paid=1`,
      cancel_url: `${SITE.url}/proposal/${token}`,
      ...(p.client_email ? { customer_email: p.client_email as string } : {}),
      metadata: { kind: 'deposit', proposal_id: p.id as string, item_name: `Deposit — ${label}` },
      payment_intent_data: { metadata: { kind: 'deposit', proposal_id: p.id as string } },
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });

    await supabase
      .from('proposals')
      .update({
        deposit_amount: amount,
        deposit_url: checkout.url,
        deposit_session_id: checkout.id,
        deposit_status: 'link_sent',
      })
      .eq('id', p.id);

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('proposal pay error', msg);
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}
