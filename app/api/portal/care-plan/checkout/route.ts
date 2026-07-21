import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { CARE_PLAN_PRICE_CENTS } from '@/lib/site-edit';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * START THE CARE PLAN. $97/mo, every edit included, none of them counted.
 *
 * This is the retention wedge on top of the $29-per-edit tier: the moment a client
 * is editing a lot, unlimited beats paying each time. A month-to-month subscription,
 * no trial, cancel anytime. Fair-use is hard-capped in the edit path (never-leak-
 * revenue), so "unlimited" can never become an uncapped bill.
 *
 * Recurring revenue is recorded per invoice by the store webhook, same as every
 * other subscription. The kind rides in BOTH session and subscription metadata so
 * the cancel webhook can find and deactivate the right project.
 */
export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: proj, error: projErr } = await sb
    .from('projects')
    .select('id, name, care_plan')
    .ilike('client_email', session.email)
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // A query error must not masquerade as "no project found" and block a paying
  // client with a misleading message. Surface it as a real failure.
  if (projErr) {
    console.error('care-plan project lookup failed', projErr.message);
    return NextResponse.json({ error: 'Could not start checkout. Please try again in a minute.' }, { status: 500 });
  }
  if (!proj) return NextResponse.json({ error: 'No project found.' }, { status: 404 });
  if (proj.care_plan) return NextResponse.json({ error: 'Your Care Plan is already active.' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Payments not configured.' }, { status: 503 });

  const business = String(proj.name ?? 'your site').replace(/:.*$/, '').trim();
  const metadata = { kind: 'care-plan', project_id: proj.id as string, client_email: session.email };
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: { name: `Care Plan — ${business}`, description: 'Every edit included. Make as many changes as you like.' },
            unit_amount: CARE_PLAN_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/portal?care=active`,
      cancel_url: `${SITE.url}/portal`,
      customer_email: session.email,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: { message: 'Month to month, cancel anytime. Every edit is included from today.' },
      },
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe returned no URL.' }, { status: 502 });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('care-plan checkout error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
