import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setClientSessionCookie } from '@/lib/client-auth';
import { grantEntitlement, isProgramSlug, type ProgramSlug } from '@/lib/entitlements';
import { programBundle } from '@/data/programs';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The success landing for a program purchase. Verifies the paid Stripe session
 * server-side, grants entitlement immediately (so access never waits on the
 * async webhook), signs the buyer in passwordlessly, and drops them in their HQ.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const origin = url.origin;

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.redirect(`${origin}/store`);
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.redirect(`${origin}/store`);

  let email: string | null = null;
  let slug: string | undefined;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return NextResponse.redirect(`${origin}/store`);
    email = session.customer_details?.email || session.customer_email || null;
    slug = session.metadata?.slug;
  } catch {
    return NextResponse.redirect(`${origin}/store`);
  }

  if (!email || !slug) return NextResponse.redirect(`${origin}/store`);

  const grantSlugs: ProgramSlug[] = slug === programBundle.slug
    ? programBundle.programSlugs
    : isProgramSlug(slug)
      ? [slug]
      : [];
  if (grantSlugs.length === 0) return NextResponse.redirect(`${origin}/store`);

  await Promise.all(grantSlugs.map((s) => grantEntitlement(email!, s, 'purchase')));
  await setClientSessionCookie(email);

  return NextResponse.redirect(`${origin}/${grantSlugs[0]}/hq`);
}
