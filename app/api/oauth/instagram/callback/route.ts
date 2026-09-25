import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { connectInstagramByCode } from '@/lib/posting/instagram-login';
import { homeFor, verifyState } from '@/lib/posting/oauth';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const st = verifyState(url.searchParams.get('state') ?? '');
  if (!st || st.provider !== 'instagram') return NextResponse.redirect(`${SITE.url}/portal/posting?connect=instagram-failed`);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(homeFor(st, 'instagram-denied'));

  const sb = getSupabase();
  if (!sb) return NextResponse.redirect(homeFor(st, 'instagram-failed:db'));

  const r = await connectInstagramByCode(sb, st.email, code);
  if (!r.ok) return NextResponse.redirect(homeFor(st, `instagram-failed:${r.error.slice(0, 160)}`));
  return NextResponse.redirect(homeFor(st, `instagram-ok:Instagram${r.username ? ` @${r.username}` : ''}`));
}
