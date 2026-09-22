import { NextResponse } from 'next/server';
import { verifyMagicToken, setClientSessionCookie, setCcSessionCookie, setCcWhoCookie } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { accountForEmail } from '@/lib/cc-access';
import { commandCenterVisible } from '@/lib/command-center/visible';

export const runtime = 'nodejs';

/**
 * Step 2 of passwordless login. The magic link lands here. If the token is
 * valid we set a 30-day session cookie and send them into the portal. If not,
 * back to the sign-in page with an error flag.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const origin = url.origin;

  // Optional landing path (e.g. a program HQ). Relative paths only, no open redirect.
  const nextParam = url.searchParams.get('next');
  const next = nextParam && /^\/[A-Za-z0-9/_-]*$/.test(nextParam) ? nextParam : '/portal';

  // Keep the destination through the error path so a fresh link still lands
  // the buyer in their HQ instead of the generic portal.
  const nextQs = next !== '/portal' ? `&next=${encodeURIComponent(next)}` : '';

  if (!token) {
    return NextResponse.redirect(`${origin}/portal/login?error=missing${nextQs}`);
  }

  const session = await verifyMagicToken(token);
  if (!session) {
    return NextResponse.redirect(`${origin}/portal/login?error=expired${nextQs}`);
  }

  await setClientSessionCookie(session.email);
  // ONE SIGN-IN. A client with a Command Center gets both cookies from either
  // door and lands on the desk, so nobody is ever asked to sign in twice.
  const account = accountForEmail(session.email);
  const sb = getSupabase();
  if (account && sb && (await commandCenterVisible(sb, account.clientEmail))) {
    await setCcSessionCookie(account.clientEmail);
    if (account.person) await setCcWhoCookie(account.typed);
    if (next === '/portal') return NextResponse.redirect(`${origin}/cc`);
  }
  // A client's own Command Center is reached through its own address, which
  // hands the request to us. A relative Location keeps the browser on that
  // address; an absolute one would drag them back to ours.
  if (next.startsWith('/office')) return new NextResponse(null, { status: 302, headers: { Location: next } });
  return NextResponse.redirect(`${origin}${next}`);
}
