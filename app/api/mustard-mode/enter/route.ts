import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setClientSessionCookie } from '@/lib/client-auth';
import { grantEntitlement, isMustardSlug } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Success landing for a MUSTARD MODE purchase. Verifies the paid Stripe
 * session server-side, grants entitlement immediately (access never waits on
 * the async webhook), signs the buyer in passwordlessly, and opens their HQ.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const origin = url.origin;

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.redirect(`${origin}/mustard-mode`);
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.redirect(`${origin}/mustard-mode`);

  let email: string | null = null;
  let slug: string | undefined;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) return NextResponse.redirect(`${origin}/mustard-mode`);
    email = session.customer_details?.email || session.customer_email || null;
    slug = session.metadata?.slug;
  } catch {
    return NextResponse.redirect(`${origin}/mustard-mode`);
  }

  if (!email || !slug || !isMustardSlug(slug)) {
    return NextResponse.redirect(`${origin}/mustard-mode`);
  }

  const source = slug === 'mustard-mode-cabinet' ? 'subscription' : 'purchase';
  await grantEntitlement(email, slug, source);
  await setClientSessionCookie(email);

  return NextResponse.redirect(`${origin}/mustard-mode/hq?welcome=1`);
}
