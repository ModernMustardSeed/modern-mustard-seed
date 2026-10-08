import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { SITE } from '@/lib/seo';
import { BOOTCAMP, OPERATOR, enrollmentOpen, getBootcampTier } from '@/data/bootcamp';

/**
 * Stripe Checkout for the bootcamp: a ticket (ga, vip, platinum) or a seat in
 * The Operator Program. Inline price_data from data/bootcamp.ts, the same
 * numbers the page prints, so the charge cannot drift from the offer and no
 * dashboard price IDs are needed.
 *
 * The host's slug rides in from the mms_bc_ref cookie set by /bootcamp/r/[code]
 * and lands in metadata.host, where fulfillment credits the sale. Tickets close
 * at BOOTCAMP.dates.close (the night of Day 1); the program stays open until
 * the cohort starts.
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

const GUARANTEE_SENTENCE = BOOTCAMP.guarantee.split('. ')[0] + '.';

export async function POST(req: Request) {
  let body: { tier?: string; email?: string; business?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const slug = (body.tier || '').trim().toLowerCase();
  const ticket = getBootcampTier(slug);
  const isOperator = slug === OPERATOR.slug;
  if (!ticket && !isOperator) return NextResponse.json({ error: 'unknown_item' }, { status: 404 });

  const now = Date.now();
  if (ticket && !enrollmentOpen(now)) return NextResponse.json({ error: 'closed' }, { status: 410 });
  if (isOperator && now >= new Date(BOOTCAMP.dates.operatorStart).getTime()) {
    return NextResponse.json({ error: 'closed' }, { status: 410 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_bc_ref=([^;]+)/);
  const hostRaw = cookieRef ? decodeURIComponent(cookieRef[1]).trim().toLowerCase() : '';
  const host = SLUG_RE.test(hostRaw) ? hostRaw : undefined;

  const email = (body.email || '').trim().slice(0, 120);
  const business = (body.business || '').trim().slice(0, 80);

  const kind = isOperator ? 'operator' : 'bootcamp';
  const itemName = isOperator ? OPERATOR.name : `${BOOTCAMP.name}: ${ticket!.name}`;
  const unitAmount = isOperator ? OPERATOR.priceCents : ticket!.priceCents;
  const description = isOperator
    ? `${OPERATOR.weeks} weeks, live, a cohort of ${OPERATOR.seats}. Starts ${OPERATOR.starts}.`
    : `${ticket!.pitch} Sessions ${BOOTCAMP.sessionTime}, February 2, 4 and 9, 2027.`;

  const metadata: Record<string, string> = {
    kind,
    slug,
    item_name: itemName,
    ...(host ? { host } : {}),
    ...(business ? { business } : {}),
  };

  const submitMessage = isOperator
    ? `Eight weeks, live, ${OPERATOR.seats} seats. The price is a set package. Nothing is added later, and changes to what we teach are included.`
    : `${GUARANTEE_SENTENCE} The price is a set package. Nothing is added later.`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: { name: itemName, description: description.slice(0, 500) },
          },
        },
      ],
      custom_fields: [
        {
          key: 'business',
          label: { type: 'custom', custom: 'Business name (optional)' },
          type: 'text',
          optional: true,
        },
      ],
      success_url: `${SITE.url}/bootcamp/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isOperator ? `${SITE.url}/bootcamp/operator` : `${SITE.url}/bootcamp#tiers`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      ...(EMAIL_RE.test(email) ? { customer_email: email } : {}),
      metadata,
      payment_intent_data: { metadata },
      custom_text: { submit: { message: submitMessage } },
    });

    if (!session.url) return NextResponse.json({ error: 'no_url' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('bootcamp checkout error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'stripe_error', message: 'Checkout hiccuped. Try again in a minute or email sarah@modernmustardseed.com.' },
      { status: 500 },
    );
  }
}
