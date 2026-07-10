import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';
import { subscriptionInvoiceEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

function labelFor(p: { client_company?: string | null; client_name?: string | null; site_url?: string | null }): string {
  return p.client_company || p.client_name || p.site_url || 'your engagement';
}

/** Create a Stripe subscription Checkout link for a proposal's monthly total and email it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { amount?: number; setup?: number };

  const { data: p } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const amount = Math.round(body.amount ?? (Number(p.monthly_total) || 0));
  if (!amount || amount < 1) {
    return NextResponse.json({ error: 'This proposal has no monthly amount. Add a monthly service first.' }, { status: 400 });
  }
  // Optional one-time setup fee, billed on the first invoice (the hybrid model).
  const setup = Math.max(0, Math.round(body.setup ?? 0));

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });

  const label = labelFor(p);
  const lineItems: Array<Record<string, unknown>> = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `Monthly plan — ${label}` },
        unit_amount: amount * 100,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    },
  ];
  if (setup > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: `Setup to begin — ${label}` },
        unit_amount: setup * 100,
      },
      quantity: 1,
    });
  }
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      line_items: lineItems as any,
      success_url: `${SITE.url}/portal?plan=started`,
      cancel_url: `${SITE.url}/portal?plan=cancelled`,
      ...(p.client_email ? { customer_email: p.client_email as string } : {}),
      metadata: { kind: 'subscription', proposal_id: id, item_name: `Monthly plan — ${label}` },
      subscription_data: { metadata: { kind: 'subscription', proposal_id: id } },
    });

    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });

    await supabase
      .from('proposals')
      .update({ subscription_url: checkout.url, subscription_session_id: checkout.id, subscription_status: 'link_sent' })
      .eq('id', id);

    let emailed = false;
    if (p.client_email && process.env.RESEND_API_KEY) {
      try {
        const resend = resendClient();
        const { error } = await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: p.client_email as string,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `Your monthly plan, ${label}`,
          html: subscriptionInvoiceEmail({ toName: (p.client_name as string) || undefined, label, amountUsd: amount, payUrl: checkout.url }),
        });
        if (error) throw error;
        emailed = true;
      } catch (err) {
        console.error('subscription email failed', err);
      }
    }

    return NextResponse.json({ url: checkout.url, amount, emailed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('subscription create error', msg);
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}
