import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { SITE } from '@/lib/seo';
import { real, redirectUri, signState } from '@/lib/posting/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The Page, its posts, and the Instagram account linked to it. business_management
// is what lets a Page held in a Meta business portfolio appear in the list.
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish'];

/**
 * Connect a Facebook Page, and the Instagram account linked to it, with
 * Facebook Login. Replaces the Graph Explorer paste: the owner, or Sarah
 * looking as them, presses Connect, ticks the Page on Facebook's own screen,
 * and the callback saves a Page token that does not expire.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
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
  if (!email) return NextResponse.redirect(`${SITE.url}/portal/login?next=/portal/posting`);

  const appId = real(process.env.FACEBOOK_APP_ID);
  if (!appId || !real(process.env.FACEBOOK_APP_SECRET)) {
    const note = 'facebook-unconfigured';
    if (back === 'cc') return NextResponse.redirect(`${SITE.url}/cc?connect=${note}#accounts`);
    return NextResponse.redirect(by === 'admin' ? `${SITE.url}/admin/posting?client=${encodeURIComponent(email)}&connect=${note}` : `${SITE.url}/portal/posting?connect=${note}`);
  }

  const state = signState({ email, provider: 'facebook', by, back });
  const auth = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  auth.searchParams.set('client_id', appId);
  auth.searchParams.set('redirect_uri', redirectUri('facebook'));
  auth.searchParams.set('scope', SCOPES.join(','));
  auth.searchParams.set('state', state);
  auth.searchParams.set('response_type', 'code');
  // Ask again for anything declined last time, so a Page or Instagram left unticked can be added.
  auth.searchParams.set('auth_type', 'rerequest');
  return NextResponse.redirect(auth.toString());
}
