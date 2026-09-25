import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { SITE } from '@/lib/seo';
import { signState } from '@/lib/posting/oauth';
import { instagramLoginReady } from '@/lib/posting/accounts';
import { authorizeUrl } from '@/lib/posting/instagram-login';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Connect Instagram on its own, with Instagram Login. The owner (or Sarah
 * looking as them) signs in with the Business or Creator account on
 * Instagram's own screen; no Facebook Page link is needed.
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

  if (!instagramLoginReady()) {
    const note = 'instagram-unconfigured';
    if (back === 'cc') return NextResponse.redirect(`${SITE.url}/cc?connect=${note}#accounts`);
    return NextResponse.redirect(by === 'admin' ? `${SITE.url}/admin/posting?client=${encodeURIComponent(email)}&connect=${note}` : `${SITE.url}/portal/posting?connect=${note}`);
  }

  return NextResponse.redirect(authorizeUrl(signState({ email, provider: 'instagram', by, back })));
}
