import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { authUrl, googleConfig } from '@/lib/oauth-google';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Send a signed-in client to Google's consent screen.
 *
 * The flow is anchored to THEIR session: the state parameter carries the signed-in
 * email, signed with our secret, so a callback can never be replayed to bolt someone
 * else's Google account onto a different client's portal.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.redirect(`${SITE.url}/portal/login?next=/portal`);
  }
  if (!googleConfig()) {
    return NextResponse.redirect(`${SITE.url}/portal?connect=unconfigured`);
  }
  const url = authUrl(session.email);
  if (!url) return NextResponse.redirect(`${SITE.url}/portal?connect=unconfigured`);
  return NextResponse.redirect(url);
}
