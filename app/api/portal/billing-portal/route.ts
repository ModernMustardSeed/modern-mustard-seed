import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/** Open the Stripe billing portal so a client can manage their plan (card, cancel). */
export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: p } = await supabase
    .from('proposals')
    .select('stripe_customer_id')
    .ilike('client_email', session.email)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const customer = p?.stripe_customer_id as string | undefined;
  if (!customer) return NextResponse.json({ error: 'No active plan to manage yet.' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${SITE.url}/portal`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('billing portal error', msg);
    return NextResponse.json({ error: 'Could not open billing portal.' }, { status: 500 });
  }
}
