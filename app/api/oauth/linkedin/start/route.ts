import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { SITE } from '@/lib/seo';
import { real, redirectUri, signState } from '@/lib/posting/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Connect LinkedIn, one of two ways.
 *
 * COMPANY PAGE (LINKEDIN_ORG_POSTING=1): the page admin signs in; the callback
 * lists the organizations they administer and keeps the first (or the one
 * named by ?org= on a second pass). Needs the Community Management API
 * product, which LinkedIn reviews before it grants w_organization_social.
 *
 * THE PERSON (the default until that review clears): "Share on LinkedIn" and
 * "Sign In with LinkedIn" are granted the moment an app adds them, so posts
 * go out on the profile of whoever signs in, today, with no waiting.
 */
const ORG_SCOPES = ['openid', 'profile', 'w_organization_social', 'r_organization_social', 'rw_organization_admin'];
const MEMBER_SCOPES = ['openid', 'profile', 'w_member_social'];

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

  const clientId = real(process.env.LINKEDIN_CLIENT_ID);
  if (!clientId) {
    if (back === 'cc') return NextResponse.redirect(`${SITE.url}/cc?connect=linkedin-unconfigured#accounts`);
    return NextResponse.redirect(by === 'admin' ? `${SITE.url}/admin/posting?client=${encodeURIComponent(email)}&connect=linkedin-unconfigured` : `${SITE.url}/portal/posting?connect=linkedin-unconfigured`);
  }

  const mode = process.env.LINKEDIN_ORG_POSTING === '1' ? ('org' as const) : ('member' as const);
  const state = signState({ email, provider: 'linkedin', by, back, mode });
  const auth = new URL('https://www.linkedin.com/oauth/v2/authorization');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri('linkedin'));
  auth.searchParams.set('scope', (mode === 'org' ? ORG_SCOPES : MEMBER_SCOPES).join(' '));
  auth.searchParams.set('state', state);
  return NextResponse.redirect(auth.toString());
}
