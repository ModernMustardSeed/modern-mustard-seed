import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { OPERATOR, getBootcampTier } from '@/data/bootcamp';

/**
 * What the welcome page shows after Stripe: the tier, the name, the email and
 * the amount, read from the Checkout Session itself so the page never trusts
 * the query string for anything but the id. Only bootcamp sessions answer.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!id.startsWith('cs_')) return NextResponse.json({ error: 'invalid_session' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    const kind = session.metadata?.kind;
    if (kind !== 'bootcamp' && kind !== 'operator') return NextResponse.json({ error: 'not_bootcamp' }, { status: 404 });

    const slug = kind === 'operator' ? OPERATOR.slug : session.metadata?.slug ?? '';
    const tier = kind === 'operator' || getBootcampTier(slug) ? slug : null;
    if (!tier) return NextResponse.json({ error: 'unknown_tier' }, { status: 404 });

    return NextResponse.json({
      tier,
      name: session.customer_details?.name ?? null,
      email: session.customer_details?.email ?? session.customer_email ?? null,
      amountCents: session.amount_total ?? 0,
    });
  } catch (err) {
    console.error('bootcamp session lookup failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
}
