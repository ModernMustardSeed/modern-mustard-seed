import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { saveAccount } from '@/lib/posting/accounts';
import { homeFor, real, redirectUri, verifyState } from '@/lib/posting/oauth';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const st = verifyState(url.searchParams.get('state') ?? '');
  if (!st || st.provider !== 'tiktok') return NextResponse.redirect(`${SITE.url}/portal/posting?connect=tiktok-failed`);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(homeFor(st, 'tiktok-denied'));

  const key = real(process.env.TIKTOK_CLIENT_KEY);
  const secret = real(process.env.TIKTOK_CLIENT_SECRET);
  if (!key || !secret) return NextResponse.redirect(homeFor(st, 'tiktok-unconfigured'));

  const tok = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secret, code, grant_type: 'authorization_code', redirect_uri: redirectUri('tiktok'), code_verifier: st.verifier ?? '' }),
    signal: AbortSignal.timeout(20_000),
  });
  const tj = (await tok.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; open_id?: string; scope?: string; error?: string; error_description?: string };
  if (!tok.ok || !tj.access_token) return NextResponse.redirect(homeFor(st, `tiktok-failed:${(tj.error_description ?? tj.error ?? `HTTP ${tok.status}`).slice(0, 80)}`));

  const me = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', { headers: { Authorization: `Bearer ${tj.access_token}` }, signal: AbortSignal.timeout(20_000) });
  const mj = (await me.json().catch(() => ({}))) as { data?: { user?: { open_id?: string; display_name?: string } } };
  const name = mj.data?.user?.display_name ?? 'TikTok';

  const sb = getSupabase();
  if (!sb) return NextResponse.redirect(homeFor(st, 'tiktok-failed:db'));
  const saved = await saveAccount(sb, st.email, {
    provider: 'tiktok',
    externalId: tj.open_id ?? mj.data?.user?.open_id ?? null,
    accountName: name,
    accessToken: tj.access_token,
    refreshToken: tj.refresh_token ?? null,
    expiresInSec: tj.expires_in ?? 86_400,
    scopes: tj.scope,
    meta: { via: 'oauth', by: st.by },
  });
  return NextResponse.redirect(homeFor(st, saved.ok ? `tiktok-ok:${name}` : `tiktok-failed:${saved.error.slice(0, 80)}`));
}
