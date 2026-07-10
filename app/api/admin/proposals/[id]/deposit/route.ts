import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';
import { depositInvoiceEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

function labelFor(p: { client_company?: string | null; client_name?: string | null; site_url?: string | null }): string {
  return p.client_company || p.client_name || p.site_url || 'your engagement';
}

/** Generate a Stripe deposit payment link for an accepted proposal and email it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { amount?: number };

  const { data: p } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const amount = Math.round(body.amount ?? Math.round((Number(p.one_time_total) || 0) * 0.5));
  if (!amount || amount < 1) {
    return NextResponse.json({ error: 'Set a deposit amount first.' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });

  const label = labelFor(p);
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
      success_url: `${SITE.url}/?deposit=paid`,
      cancel_url: `${SITE.url}/?deposit=cancelled`,
      ...(p.client_email ? { customer_email: p.client_email as string } : {}),
      metadata: { kind: 'deposit', proposal_id: id, item_name: `Deposit — ${label}` },
      payment_intent_data: { metadata: { kind: 'deposit', proposal_id: id } },
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
      .eq('id', id);

    // Email the client if we have an address and Resend is configured.
    let emailed = false;
    if (p.client_email && process.env.RESEND_API_KEY) {
      try {
        const resend = resendClient();
        const { error } = await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: p.client_email as string,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `Your deposit to begin, ${label}`,
          html: depositInvoiceEmail({
            toName: (p.client_name as string) || undefined,
            label,
            amountUsd: amount,
            payUrl: checkout.url,
          }),
        });
        if (error) throw error;
        emailed = true;
      } catch (err) {
        console.error('deposit email failed', err);
      }
    }

    return NextResponse.json({ url: checkout.url, amount, emailed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('deposit create error', msg);
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}

/** Manually mark a deposit paid (when paid offline). Records revenue and wins the lead. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'mark_paid') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { data: p } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (p.deposit_status === 'paid') return NextResponse.json({ ok: true, already: true });

  const amount = Math.round((Number(p.deposit_amount) || 0) || Math.round((Number(p.one_time_total) || 0) * 0.5));
  const label = labelFor(p);

  // Record revenue. The unique session id guards against double counting if the
  // Stripe webhook also fires for the same checkout.
  try {
    await supabase.from('orders').insert({
      stripe_session_id: (p.deposit_session_id as string) || `manual_deposit_${id}`,
      product_name: `Deposit — ${label}`,
      item_type: 'deposit',
      price_paid_cents: amount * 100,
      currency: 'usd',
      email: (p.client_email as string) || 'client@unknown',
      name: (p.client_name as string) || null,
      status: 'paid',
    });
  } catch (err) {
    console.error('deposit manual order insert failed (may be duplicate)', err);
  }

  await supabase
    .from('proposals')
    .update({ deposit_status: 'paid', deposit_paid_at: new Date().toISOString(), deposit_amount: amount })
    .eq('id', id);

  // A paid deposit is a won deal. Flip the linked lead.
  if (p.lead_id) {
    try {
      await supabase.from('leads').update({ status: 'won' }).eq('id', p.lead_id);
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ ok: true });
}
