import { NextResponse } from 'next/server';
import { verifyMagicToken, setClientSessionCookie } from '@/lib/client-auth';

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

  if (!token) {
    return NextResponse.redirect(`${origin}/portal/login?error=missing`);
  }

  const session = await verifyMagicToken(token);
  if (!session) {
    return NextResponse.redirect(`${origin}/portal/login?error=expired`);
  }

  await setClientSessionCookie(session.email);
  return NextResponse.redirect(`${origin}/portal`);
}
