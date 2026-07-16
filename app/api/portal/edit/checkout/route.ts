import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { PAID_EDIT_PRICE_CENTS } from '@/lib/site-edit';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * BUY ONE EDIT, once the two free ones are used.
 *
 * A one-time charge for one edit: inherently capped (one payment, one edit), no
 * trial, no subscription, no overage to leak. The instruction rides in the Stripe
 * metadata (capped so it fits) and the webhook queues the edit only after payment
 * clears. Refuses if an edit is already in flight, so a client can never pay to
 * stack a second edit on top of an unfinished one.
 */
const MAX_META = 480; // Stripe metadata values cap at 500 chars; keep headroom.

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const instruction = (body.instruction || '').trim();
  if (!instruction) return NextResponse.json({ error: 'Tell us what to change first.' }, { status: 400 });
  if (instruction.length > MAX_META) {
    return NextResponse.json({ error: `Keep a single edit under ${MAX_META} characters. For a bigger change, send it to Sarah as a note.` }, { status: 400 });
  }

  const { data: proj } = await sb
    .from('projects')
    .select('id, name, edit_status')
    .ilike('client_email', session.email)
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!proj) return NextResponse.json({ error: 'No project found.' }, { status: 404 });

  // One at a time: a ready/queued/building edit must be dealt with first.
  if (proj.edit_status) {
    return NextResponse.json({ error: 'You already have an edit in progress. Ship or discard it first.' }, { status: 400 });
  }

  // A site must exist to edit. Cheap presence check, not the html.
  const { count } = await sb
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('id', proj.id)
    .not('site_html', 'is', null);
  if ((count ?? 0) === 0) return NextResponse.json({ error: 'Your site is not built yet, so there is nothing to edit.' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Payments not configured.' }, { status: 503 });

  const business = String(proj.name ?? 'your site').replace(/:.*$/, '').trim();
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `One website edit — ${business}`, description: instruction.slice(0, 200) },
            unit_amount: PAID_EDIT_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/portal?edit=purchased`,
      cancel_url: `${SITE.url}/portal`,
      customer_email: session.email,
      metadata: { kind: 'paid-edit', project_id: proj.id as string, client_email: session.email, instruction },
      payment_intent_data: { metadata: { kind: 'paid-edit', project_id: proj.id as string } },
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('portal edit-checkout error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
