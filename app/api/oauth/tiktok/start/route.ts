import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { SITE } from '@/lib/seo';
import { pkce, real, redirectUri, signState } from '@/lib/posting/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Connect a TikTok account with Login Kit. user.info.basic names the account;
 * video.upload puts a post in the inbox; video.publish posts it directly once
 * the app has passed TikTok's audit. The client clicks from their calendar;
 * Sarah can run it for them from the desk with ?client=.
 */
const SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Started from the Command Center: come home to its Accounts room, not the portal.
  const back = url.searchParams.get('back') === 'cc' ? ('cc' as const) : undefined;
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
  if (!email) return NextResponse.redirect(back === 'cc' ? `${SITE.url}/cc/login` : `${SITE.url}/portal/login?next=/portal/posting`);

  const key = real(process.env.TIKTOK_CLIENT_KEY);
  if (!key) {
    if (back === 'cc') return NextResponse.redirect(`${SITE.url}/cc?connect=tiktok-unconfigured#accounts`);
    return NextResponse.redirect(by === 'admin' ? `${SITE.url}/admin/posting?client=${encodeURIComponent(email)}&connect=tiktok-unconfigured` : `${SITE.url}/portal/posting?connect=tiktok-unconfigured`);
  }

  const { verifier, challenge } = pkce();
  const state = signState({ email, provider: 'tiktok', verifier, by, back });
  const auth = new URL('https://www.tiktok.com/v2/auth/authorize/');
  auth.searchParams.set('client_key', key);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('scope', SCOPES.join(','));
  auth.searchParams.set('redirect_uri', redirectUri('tiktok'));
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');
  return NextResponse.redirect(auth.toString());
}
