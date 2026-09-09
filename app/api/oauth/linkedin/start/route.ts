import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { SITE } from '@/lib/seo';
import { real, redirectUri, signState } from '@/lib/posting/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Connect a LinkedIn company page. The page admin signs in; the callback lists
 * the organizations they administer and keeps the first (or the one named by
 * ?org= on a second pass). Needs a LinkedIn app with the Community Management
 * API product, which is what grants w_organization_social.
 */
const SCOPES = ['openid', 'profile', 'w_organization_social', 'r_organization_social', 'rw_organization_admin'];

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

  const clientId = real(process.env.LINKEDIN_CLIENT_ID);
  if (!clientId) return NextResponse.redirect(by === 'admin' ? `${SITE.url}/admin/posting?client=${encodeURIComponent(email)}&connect=linkedin-unconfigured` : `${SITE.url}/portal/posting?connect=linkedin-unconfigured`);

  const state = signState({ email, provider: 'linkedin', by });
  const auth = new URL('https://www.linkedin.com/oauth/v2/authorization');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri('linkedin'));
  auth.searchParams.set('scope', SCOPES.join(' '));
  auth.searchParams.set('state', state);
  return NextResponse.redirect(auth.toString());
}
