import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { saveAccount } from '@/lib/posting/accounts';
import { homeFor, real, redirectUri, verifyState } from '@/lib/posting/oauth';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = 'https://api.linkedin.com/rest';
const VERSION = '202508';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const st = verifyState(url.searchParams.get('state') ?? '');
  if (!st || st.provider !== 'linkedin') return NextResponse.redirect(`${SITE.url}/portal/posting?connect=linkedin-failed`);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(homeFor(st, 'linkedin-denied'));

  const clientId = real(process.env.LINKEDIN_CLIENT_ID);
  const clientSecret = real(process.env.LINKEDIN_CLIENT_SECRET);
  if (!clientId || !clientSecret) return NextResponse.redirect(homeFor(st, 'linkedin-unconfigured'));

  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri('linkedin'), client_id: clientId, client_secret: clientSecret });
  const tok = await fetch('https://www.linkedin.com/oauth/v2/accessToken', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(20_000) });
  const tj = (await tok.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string; error_description?: string };
  if (!tok.ok || !tj.access_token) return NextResponse.redirect(homeFor(st, `linkedin-failed:${(tj.error_description ?? `HTTP ${tok.status}`).slice(0, 80)}`));

  // Which company pages does this person administer?
  const orgs = await fetch(`${API}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization~(localizedName)))`, {
    headers: { Authorization: `Bearer ${tj.access_token}`, 'LinkedIn-Version': VERSION, 'X-Restli-Protocol-Version': '2.0.0' },
    signal: AbortSignal.timeout(20_000),
  });
  const oj = (await orgs.json().catch(() => ({}))) as { elements?: Array<{ organization: string; 'organization~'?: { localizedName?: string } }> };
  const list = (oj.elements ?? []).map((e) => ({ urn: e.organization, name: e['organization~']?.localizedName ?? e.organization }));
  if (!list.length) return NextResponse.redirect(homeFor(st, 'linkedin-failed:no-company-page-admin'));
  const wanted = url.searchParams.get('org');
  const org = list.find((o) => o.urn === wanted) ?? list[0];

  const sb = getSupabase();
  if (!sb) return NextResponse.redirect(homeFor(st, 'linkedin-failed:db'));
  const saved = await saveAccount(sb, st.email, {
    provider: 'linkedin',
    externalId: org.urn,
    accountName: org.name,
    accessToken: tj.access_token,
    refreshToken: tj.refresh_token ?? null,
    expiresInSec: tj.expires_in ?? 60 * 24 * 3600,
    scopes: tj.scope,
    meta: { via: 'oauth', by: st.by, choices: list },
  });
  return NextResponse.redirect(homeFor(st, saved.ok ? `linkedin-ok:${org.name}` : `linkedin-failed:${saved.error.slice(0, 80)}`));
}
