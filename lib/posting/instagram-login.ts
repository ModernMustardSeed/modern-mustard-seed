/**
 * INSTAGRAM, SIGNED IN ON ITS OWN.
 *
 * The Facebook door only reaches Instagram when the account is linked to the
 * Page and the Facebook sign-in grants the Instagram permissions, and either
 * one missing leaves Instagram quietly off. Instagram Login (Meta's Instagram
 * API with Instagram Login) needs neither: the owner signs in with the
 * Instagram account itself, a Business or Creator account, and we hold a
 * token that posts to it.
 *
 * The token lives 60 days and is renewed with itself, so `instagramAccess`
 * renews any token inside a week of its end whenever it is used, and the
 * publish cron renews every one of them once a day so a quiet month never
 * lets one lapse.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount, saveAccount } from './accounts';
import { real, redirectUri } from './oauth';

export const IG_GRAPH = 'https://graph.instagram.com/v21.0';
const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const RENEW_INSIDE_MS = 7 * 24 * 3600_000;

export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

type IgRow = { external_id: string | null; account_name: string | null; access_expires_at: string | null; meta: Record<string, unknown> | null };

export function viaInstagramLogin(row: { meta: Record<string, unknown> | null } | null | undefined): boolean {
  return (row?.meta as { via?: string } | null)?.via === 'instagram-login';
}

export function authorizeUrl(state: string): string {
  const u = new URL('https://www.instagram.com/oauth/authorize');
  u.searchParams.set('client_id', real(process.env.INSTAGRAM_APP_ID) ?? '');
  u.searchParams.set('redirect_uri', redirectUri('instagram'));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', INSTAGRAM_SCOPES.join(','));
  u.searchParams.set('state', state);
  // Always show the account picker, so the owner can choose the business account and not whichever one the phone is signed into.
  u.searchParams.set('force_reauth', 'true');
  return u.toString();
}

async function json<T>(res: Response): Promise<T & { error?: { message?: string } | string; error_message?: string; error_description?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string; error_description?: string };
}

function why(j: { error?: { message?: string } | string; error_message?: string; error_description?: string }, status: number): string {
  if (typeof j.error === 'object' && j.error?.message) return j.error.message;
  return j.error_message ?? j.error_description ?? (typeof j.error === 'string' ? j.error : `HTTP ${status}`);
}

/**
 * The callback's work: code to short token, short to 60-day token, read who
 * it is, refuse a personal account, and store it as the client's Instagram.
 */
export async function connectInstagramByCode(
  sb: SupabaseClient,
  clientEmail: string,
  code: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const appId = real(process.env.INSTAGRAM_APP_ID);
  const secret = real(process.env.INSTAGRAM_APP_SECRET);
  if (!appId || !secret) return { ok: false, error: 'The Instagram app keys are not on the site.' };

  // Instagram appends "#_" to the code it hands back.
  const clean = code.replace(/#_$/, '');
  const short = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: appId, client_secret: secret, grant_type: 'authorization_code', redirect_uri: redirectUri('instagram'), code: clean }),
    signal: AbortSignal.timeout(20_000),
  });
  const sj = await json<{ access_token?: string; permissions?: string[] | string }>(short);
  if (!short.ok || !sj.access_token) return { ok: false, error: why(sj, short.status) };

  const long = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(sj.access_token)}`, {
    signal: AbortSignal.timeout(20_000),
  });
  const lj = await json<{ access_token?: string; expires_in?: number }>(long);
  if (!long.ok || !lj.access_token) return { ok: false, error: why(lj, long.status) };

  const me = await fetch(`${IG_GRAPH}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(lj.access_token)}`, { signal: AbortSignal.timeout(20_000) });
  const mj = await json<{ user_id?: string; username?: string; account_type?: string }>(me);
  if (!me.ok || !mj.user_id) return { ok: false, error: why(mj, me.status) };
  if (mj.account_type && !['BUSINESS', 'MEDIA_CREATOR'].includes(mj.account_type)) {
    return { ok: false, error: `@${mj.username ?? 'that account'} is a personal account. Switch it to a Business or Creator account in Instagram, Settings, Account type, then connect again.` };
  }

  const granted = Array.isArray(sj.permissions) ? sj.permissions.join(' ') : String(sj.permissions ?? INSTAGRAM_SCOPES.join(' ')).replace(/,/g, ' ');
  if (!granted.includes('instagram_business_content_publish')) {
    return { ok: false, error: 'Instagram signed in but posting was not allowed. Connect again and leave "publish content" ticked.' };
  }

  const saved = await saveAccount(sb, clientEmail, {
    provider: 'instagram',
    externalId: mj.user_id,
    accountName: mj.username ? `@${mj.username}` : null,
    scopes: granted,
    accessToken: lj.access_token,
    expiresInSec: lj.expires_in ?? 60 * 24 * 3600,
    meta: { via: 'instagram-login', account_type: mj.account_type ?? null },
  });
  if (!saved.ok) return saved;
  return { ok: true, username: mj.username ?? '' };
}

async function renew(sb: SupabaseClient, clientEmail: string, token: string, row: IgRow): Promise<string | null> {
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20_000) });
  const j = await json<{ access_token?: string; expires_in?: number }>(res);
  if (!res.ok || !j.access_token) {
    const msg = why(j, res.status);
    // An expired or revoked token cannot renew itself; the owner has to sign in again.
    if (Date.parse(String(row.access_expires_at ?? '')) < Date.now()) await markAccount(sb, clientEmail, 'instagram', 'revoked', `Instagram sign-in ended: ${msg}`);
    return null;
  }
  await saveAccount(sb, clientEmail, {
    provider: 'instagram',
    externalId: row.external_id,
    accountName: row.account_name,
    scopes: INSTAGRAM_SCOPES.join(' '),
    accessToken: j.access_token,
    expiresInSec: j.expires_in ?? 60 * 24 * 3600,
    meta: row.meta ?? { via: 'instagram-login' },
  });
  return j.access_token;
}

/**
 * The token and the Graph host for the client's Instagram, whichever door it
 * came through. A Page-linked account posts on graph.facebook.com with the
 * Page token; an Instagram Login account posts on graph.instagram.com with
 * its own, renewed here when it is inside a week of ending.
 */
export async function instagramAccess(
  sb: SupabaseClient,
  clientEmail: string,
): Promise<{ token: string; row: NonNullable<Awaited<ReturnType<typeof accessToken>>>['row']; graph: string } | null> {
  const acct = await accessToken(sb, clientEmail, 'instagram');
  if (!acct) return null;
  if (!viaInstagramLogin(acct.row)) return { ...acct, graph: FB_GRAPH };
  let token = acct.token;
  const ends = Date.parse(String(acct.row.access_expires_at ?? ''));
  if (Number.isFinite(ends) && ends - Date.now() < RENEW_INSIDE_MS) token = (await renew(sb, clientEmail, acct.token, acct.row)) ?? acct.token;
  return { token, row: acct.row, graph: IG_GRAPH };
}

/** Once a day from the publish cron: renew every Instagram Login token inside a week of its end. */
export async function renewInstagramLogins(sb: SupabaseClient): Promise<number> {
  const soon = new Date(Date.now() + RENEW_INSIDE_MS).toISOString();
  const { data } = await sb
    .from('client_integrations')
    .select('client_email')
    .eq('provider', 'instagram')
    .eq('status', 'connected')
    .eq('meta->>via', 'instagram-login')
    .lt('access_expires_at', soon);
  let n = 0;
  for (const r of (data ?? []) as Array<{ client_email: string }>) {
    if (await instagramAccess(sb, r.client_email)) n++;
  }
  return n;
}
