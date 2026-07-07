import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setClientSessionCookie } from '@/lib/client-auth';
import { grantEntitlement, isLaunchSlug } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Success landing for a MUSTARD LAUNCH purchase. Verifies the paid Stripe
 * session server-side, grants entitlement immediately (access never waits on
 * the async webhook), signs the buyer in passwordlessly, and opens the Deck.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const origin = url.origin;

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.redirect(`${origin}/mustard-launch`);
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.redirect(`${origin}/mustard-launch`);

  let email: string | null = null;
  let slug: string | undefined;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) return NextResponse.redirect(`${origin}/mustard-launch`);
    email = session.customer_details?.email || session.customer_email || null;
    slug = session.metadata?.slug;
  } catch {
    return NextResponse.redirect(`${origin}/mustard-launch`);
  }

  if (!email || !slug || !isLaunchSlug(slug)) {
    return NextResponse.redirect(`${origin}/mustard-launch`);
  }

  const source = slug === 'mustard-launch-room' ? 'subscription' : 'purchase';
  await grantEntitlement(email, slug, source);
  await setClientSessionCookie(email);

  return NextResponse.redirect(`${origin}/mustard-launch/hq?welcome=1`);
}
