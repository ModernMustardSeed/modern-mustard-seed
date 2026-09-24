import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { connectFacebookByToken } from '@/lib/posting/accounts';
import { homeFor, real, redirectUri, verifyState } from '@/lib/posting/oauth';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lowercase letters and digits, company suffixes dropped: "Built Right in Montana LLC" -> "builtrightinmontana". */
function key(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(llc|inc|co|corp|company|ltd)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const st = verifyState(url.searchParams.get('state') ?? '');
  if (!st || st.provider !== 'facebook') return NextResponse.redirect(`${SITE.url}/portal/posting?connect=facebook-failed`);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(homeFor(st, 'facebook-denied'));

  const appId = real(process.env.FACEBOOK_APP_ID);
  const appSecret = real(process.env.FACEBOOK_APP_SECRET);
  if (!appId || !appSecret) return NextResponse.redirect(homeFor(st, 'facebook-unconfigured'));

  const tokUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokUrl.searchParams.set('client_id', appId);
  tokUrl.searchParams.set('client_secret', appSecret);
  tokUrl.searchParams.set('redirect_uri', redirectUri('facebook'));
  tokUrl.searchParams.set('code', code);
  const tok = await fetch(tokUrl, { signal: AbortSignal.timeout(20_000) });
  const tj = (await tok.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!tok.ok || !tj.access_token) return NextResponse.redirect(homeFor(st, `facebook-failed:${(tj.error?.message ?? `HTTP ${tok.status}`).slice(0, 80)}`));

  const sb = getSupabase();
  if (!sb) return NextResponse.redirect(homeFor(st, 'facebook-failed:db'));

  // The same path as the paste: the user token is made long-lived, the Page
  // token read from it does not expire, and Instagram rides on the Page.
  let r = await connectFacebookByToken(sb, st.email, tj.access_token, null);

  // Whoever signed in may run several Pages (Sarah runs every client's). Pick
  // the one whose name is the client's business; never guess between two.
  if (!r.ok && r.choices?.length) {
    const { data } = await sb.from('posting_settings').select('business_name').eq('client_email', st.email).maybeSingle();
    const want = key(String((data as { business_name?: string } | null)?.business_name ?? ''));
    const hits = want ? r.choices.filter((c) => key(c.name).startsWith(want) || want.startsWith(key(c.name))) : [];
    if (hits.length !== 1) {
      return NextResponse.redirect(homeFor(st, `facebook-failed:that sign-in runs ${r.choices.length} Pages and none is plainly this business. Untick the others on Facebook's screen and connect again.`));
    }
    r = await connectFacebookByToken(sb, st.email, tj.access_token, hits[0].id);
  }

  if (!r.ok) return NextResponse.redirect(homeFor(st, `facebook-failed:${r.error.slice(0, 120)}`));
  return NextResponse.redirect(homeFor(st, `facebook-ok:${r.page.name}${r.instagram ? ` and Instagram @${r.instagram.username ?? ''}` : ''}`));
}
