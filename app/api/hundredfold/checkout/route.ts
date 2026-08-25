import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { HUNDREDFOLD, GUARANTEE } from '@/lib/hundredfold';
import { upsertMember } from '@/lib/hundredfold-store';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Joining HUNDREDFOLD.
 *
 * Subscription mode with the setup fee as a one-time line, so it rides invoice
 * one only. Amounts come from lib/hundredfold.ts in cents, never from a Stripe
 * price id, so the page and the charge cannot drift apart. Same shape as the
 * Chief and Demo agent checkouts.
 *
 * No trial. The interview is free and the roadmap is free; those are the trial,
 * and they are worth more than a fortnight of unpaid access.
 *
 * The member row is created BEFORE checkout, not in the webhook. If the row only
 * appeared on payment, an interview taken on the way to the card would have
 * nowhere to attach, and that transcript is the most valuable thing in the
 * funnel.
 */
export async function POST(req: Request) {
  let body: { email?: string; name?: string; business?: string; interviewId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'We need a real email to send your Command Center to.' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const business = (body.business ?? '').trim().slice(0, 80);
  const name = (body.name ?? '').trim().slice(0, 80);

  const member = await upsertMember({
    email,
    name: name || null,
    business_name: business || null,
    status: 'offered',
  });

  // Affiliate attribution, same first-party cookie every other program reads, so
  // a referred membership pays the partner on every invoice.
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  const ref = (cookieRef ? decodeURIComponent(cookieRef[1]) : '').trim().slice(0, 64) || undefined;

  const metadata = {
    kind: 'hundredfold',
    slug: 'hundredfold',
    item_name: 'HUNDREDFOLD',
    ...(member ? { member_id: member.id } : {}),
    ...(body.interviewId ? { interview_id: body.interviewId.slice(0, 64) } : {}),
    ...(business ? { business } : {}),
    ...(ref ? { ref } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: HUNDREDFOLD.monthlyCents,
            recurring: { interval: 'month' },
            product_data: {
              name: 'HUNDREDFOLD',
              description:
                'Weekly coaching, the build queue, and your agents running. Month to month, cancel anytime.',
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: HUNDREDFOLD.setupCents,
            product_data: {
              name: 'HUNDREDFOLD start (one time)',
              description:
                'Your interview, your roadmap, your built offer, and your first system built and live.',
            },
          },
        },
      ],
      success_url: `${SITE.url}/hundredfold/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/hundredfold#join`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `${GUARANTEE.short} Month to month after that, thirty days notice, no exit fee. Everything we build stays in your accounts.`,
        },
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('hundredfold checkout failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not open checkout. Try again in a moment.' }, { status: 500 });
  }
}
