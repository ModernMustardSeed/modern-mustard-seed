import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';
import { balanceInvoiceEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

function labelFor(p: { client_company?: string | null; client_name?: string | null }): string {
  return p.client_company || p.client_name || 'your engagement';
}

/** Generate the balance (final 50%) checkout link and email it to the client. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data: p } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const oneTime = Number(p.one_time_total) || 0;
  const deposit = Math.round(Number(p.deposit_amount) || Math.round(oneTime * 0.5));
  const amount = Math.max(0, oneTime - deposit);
  if (amount < 1) return NextResponse.json({ error: 'No balance to invoice.' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });

  const label = labelFor(p);
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
      success_url: `${SITE.url}/?balance=paid`,
      cancel_url: `${SITE.url}/?balance=cancelled`,
      ...(p.client_email ? { customer_email: p.client_email as string } : {}),
      metadata: { kind: 'balance', proposal_id: id, item_name: `Balance — ${label}` },
      payment_intent_data: { metadata: { kind: 'balance', proposal_id: id } },
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });

    await supabase.from('proposals').update({ balance_status: 'link_sent' }).eq('id', id);

    let emailed = false;
    if (p.client_email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: p.client_email as string,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `Final balance for ${label}`,
          html: balanceInvoiceEmail({ toName: (p.client_name as string) || undefined, label, amountUsd: amount, payUrl: checkout.url }),
        });
        emailed = true;
      } catch (err) {
        console.error('balance email failed', err);
      }
    }
    return NextResponse.json({ url: checkout.url, amount, emailed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('admin balance error', msg);
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}
