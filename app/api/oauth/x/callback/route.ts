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
  if (!st || st.provider !== 'x') return NextResponse.redirect(`${SITE.url}/portal/posting?connect=x-failed`);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(homeFor(st, 'x-denied'));

  const clientId = real(process.env.X_OAUTH2_CLIENT_ID);
  const clientSecret = real(process.env.X_OAUTH2_CLIENT_SECRET);
  if (!clientId) return NextResponse.redirect(homeFor(st, 'x-unconfigured'));

  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri('x'), client_id: clientId, code_verifier: st.verifier ?? '' });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  const tok = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers, body, signal: AbortSignal.timeout(20_000) });
  const tj = (await tok.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string };
  if (!tok.ok || !tj.access_token) return NextResponse.redirect(homeFor(st, `x-failed:${(tj.error_description ?? `HTTP ${tok.status}`).slice(0, 80)}`));

  const me = await fetch('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${tj.access_token}` }, signal: AbortSignal.timeout(20_000) });
  const mj = (await me.json().catch(() => ({}))) as { data?: { id: string; username: string } };
  if (!mj.data) return NextResponse.redirect(homeFor(st, 'x-failed:no-user'));

  const sb = getSupabase();
  if (!sb) return NextResponse.redirect(homeFor(st, 'x-failed:db'));
  const saved = await saveAccount(sb, st.email, {
    provider: 'x',
    externalId: mj.data.id,
    accountName: `@${mj.data.username}`,
    accessToken: tj.access_token,
    refreshToken: tj.refresh_token ?? null,
    expiresInSec: tj.expires_in ?? 7200,
    scopes: tj.scope,
    meta: { via: 'oauth', by: st.by },
  });
  return NextResponse.redirect(homeFor(st, saved.ok ? `x-ok:@${mj.data.username}` : `x-failed:${saved.error.slice(0, 80)}`));
}
