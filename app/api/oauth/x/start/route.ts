import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { SITE } from '@/lib/seo';
import { pkce, real, redirectUri, signState } from '@/lib/posting/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'];

/**
 * Connect an X account with OAuth 2.0 and PKCE. The client clicks from their
 * calendar; Sarah can run it for them from the desk with ?client=.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const client = await getClientSession();
  let email: string | null = client?.email ?? null;
  let by: 'client' | 'admin' = 'client';
  if (!email) {
    const admin = await getAdminSession();
    const target = url.searchParams.get('client');
    if (admin && target) {
      email = target.toLowerCase().trim();
      by = 'admin';
    }
  }
  if (!email) return NextResponse.redirect(`${SITE.url}/portal/login?next=/portal/posting`);

  const clientId = real(process.env.X_OAUTH2_CLIENT_ID);
  if (!clientId) return NextResponse.redirect(by === 'admin' ? `${SITE.url}/admin/posting?client=${encodeURIComponent(email)}&connect=x-unconfigured` : `${SITE.url}/portal/posting?connect=x-unconfigured`);

  const { verifier, challenge } = pkce();
  const state = signState({ email, provider: 'x', verifier, by });
  const auth = new URL('https://x.com/i/oauth2/authorize');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri('x'));
  auth.searchParams.set('scope', SCOPES.join(' '));
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');
  return NextResponse.redirect(auth.toString());
}
