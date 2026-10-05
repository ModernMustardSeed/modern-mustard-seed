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
 *
 * ?back=cc: started from the Command Center, so every way out of the flow,
 * including the callback, lands on its Accounts room and never the portal.
 */
export async function GET(req: Request) {
  const back = new URL(req.url).searchParams.get('back') === 'cc' ? ('cc' as const) : undefined;
  const session = await getClientSession();
  if (!session) {
    return NextResponse.redirect(back === 'cc' ? `${SITE.url}/cc/login` : `${SITE.url}/portal/login?next=/portal`);
  }
  const unconfigured = back === 'cc' ? `${SITE.url}/cc?connect=gbp-unconfigured#accounts` : `${SITE.url}/portal?connect=unconfigured`;
  if (!googleConfig()) return NextResponse.redirect(unconfigured);
  const url = authUrl(session.email, back);
  if (!url) return NextResponse.redirect(unconfigured);
  return NextResponse.redirect(url);
}
