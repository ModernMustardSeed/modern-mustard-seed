/**
 * CONNECTED ACCOUNTS, THE WAY SARAH ALREADY POSTS.
 *
 * No middleman. Facebook and Instagram post through the Graph API with a
 * long-lived Page token, X through its own API with the account's OAuth 2.0
 * user token, LinkedIn through the Marketing API with the page admin's token,
 * Google Business Profile through the Business Profile API on the Google
 * connection the portal already has. Every token is encrypted at rest in
 * `client_integrations` with the same secret the Google connection uses, and
 * none of them ever reach a browser.
 *
 * Two ways in for every platform, so the desk never waits on a form Sarah
 * cannot reach:
 *   1. CONNECT. An OAuth button in the portal (X, LinkedIn, Google) that
 *      works the moment the app credentials are in the environment.
 *   2. PASTE. A token generated the way Sarah generates her own (Graph API
 *      Explorer for a Page token, the X developer portal for user tokens),
 *      pasted on the admin desk and validated against the live API before
 *      it is stored.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import type { AccountView, Platform } from './types';

const GRAPH = 'https://graph.facebook.com/v21.0';

type Row = {
  provider: string;
  account_email: string | null;
  account_name: string | null;
  external_id: string | null;
  scopes: string | null;
  status: 'connected' | 'revoked' | 'error';
  error: string | null;
  meta: Record<string, unknown> | null;
  access_ciphertext: string | null;
  access_iv: string | null;
  access_tag: string | null;
  access_expires_at: string | null;
  refresh_ciphertext: string | null;
  refresh_iv: string | null;
  refresh_tag: string | null;
  created_at: string;
};

function real(v: string | undefined): string | null {
  return v && !/^\[SENSITIVE\]$/i.test(v) ? v : null;
}

/** What a platform still needs before it can connect, or null when it is ready. */
export function connectNeeds(platform: Platform): string | null {
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return null; // a pasted Page token always works; the app id only extends short tokens
    case 'x':
      return real(process.env.X_OAUTH2_CLIENT_ID) && real(process.env.X_OAUTH2_CLIENT_SECRET) ? null : 'X_OAUTH2_CLIENT_ID and X_OAUTH2_CLIENT_SECRET in the environment';
    case 'linkedin':
      return real(process.env.LINKEDIN_CLIENT_ID) && real(process.env.LINKEDIN_CLIENT_SECRET) ? null : 'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the environment';
    case 'gbp':
      return real(process.env.GOOGLE_CLIENT_ID) && real(process.env.GOOGLE_CLIENT_SECRET) ? null : 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment';
    case 'houzz':
      return 'Houzz has no posting API. It is hand-posted from the sheet every day.';
  }
}

async function rows(sb: SupabaseClient, clientEmail: string): Promise<Row[]> {
  const { data } = await sb.from('client_integrations').select('*').eq('client_email', clientEmail.toLowerCase().trim());
  return (data ?? []) as Row[];
}

/** Every platform, connected or not, in the shape both desks render. */
export async function accountViews(sb: SupabaseClient, clientEmail: string): Promise<AccountView[]> {
  const all = await rows(sb, clientEmail);
  const byProvider = new Map(all.map((r) => [r.provider, r]));
  const google = byProvider.get('google');
  const out: AccountView[] = [];
  const platforms: Platform[] = ['facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz'];
  for (const p of platforms) {
    const r = p === 'gbp' ? google : byProvider.get(p);
    const connected = !!r && r.status === 'connected' && (p !== 'gbp' || Boolean((r.meta as { gbp_location?: string } | null)?.gbp_location));
    out.push({
      provider: p,
      connected,
      status: r ? r.status : 'none',
      accountName: r?.account_name ?? r?.account_email ?? null,
      externalId: p === 'gbp' ? ((r?.meta as { gbp_location?: string } | null)?.gbp_location ?? null) : (r?.external_id ?? null),
      error: p === 'gbp' && r && r.status === 'connected' && !connected ? 'Google is connected; the Business Profile location is not chosen yet.' : (r?.error ?? null),
      manualOnly: p === 'houzz',
      needs: connected ? null : connectNeeds(p),
    });
  }
  return out;
}

/** The decrypted access token for a provider, or null. Server only. */
export async function accessToken(sb: SupabaseClient, clientEmail: string, provider: Platform | 'google'): Promise<{ token: string; row: Row } | null> {
  const all = await rows(sb, clientEmail);
  const r = all.find((x) => x.provider === provider);
  if (!r || r.status !== 'connected' || !r.access_ciphertext || !r.access_iv || !r.access_tag) return null;
  try {
    return { token: decryptSecret(r.access_ciphertext, r.access_iv, r.access_tag), row: r };
  } catch {
    return null;
  }
}

export async function refreshTokenFor(sb: SupabaseClient, clientEmail: string, provider: Platform): Promise<string | null> {
  const all = await rows(sb, clientEmail);
  const r = all.find((x) => x.provider === provider);
  if (!r?.refresh_ciphertext || !r.refresh_iv || !r.refresh_tag) return null;
  try {
    return decryptSecret(r.refresh_ciphertext, r.refresh_iv, r.refresh_tag);
  } catch {
    return null;
  }
}

export type SaveAccount = {
  provider: Platform;
  externalId: string | null;
  accountName: string | null;
  accountEmail?: string | null;
  scopes?: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSec?: number | null;
  meta?: Record<string, unknown>;
};

export async function saveAccount(sb: SupabaseClient, clientEmail: string, a: SaveAccount): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = encryptSecret(a.accessToken);
  const row: Record<string, unknown> = {
    client_email: clientEmail.toLowerCase().trim(),
    provider: a.provider,
    account_email: a.accountEmail ?? null,
    account_name: a.accountName,
    external_id: a.externalId,
    scopes: a.scopes ?? '',
    access_ciphertext: access.ciphertext,
    access_iv: access.iv,
    access_tag: access.tag,
    // A Page token extended the Graph Explorer way never expires; record a far date so the refresher leaves it alone.
    access_expires_at: a.expiresInSec ? new Date(Date.now() + a.expiresInSec * 1000).toISOString() : new Date(Date.now() + 10 * 365 * 24 * 3600_000).toISOString(),
    status: 'connected',
    error: null,
    meta: a.meta ?? {},
    updated_at: new Date().toISOString(),
  };
  if (a.refreshToken) {
    const r = encryptSecret(a.refreshToken);
    row.refresh_ciphertext = r.ciphertext;
    row.refresh_iv = r.iv;
    row.refresh_tag = r.tag;
  }
  const { error } = await sb.from('client_integrations').upsert(row, { onConflict: 'client_email,provider' });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function markAccount(sb: SupabaseClient, clientEmail: string, provider: Platform | 'google', status: 'connected' | 'revoked' | 'error', error: string | null): Promise<void> {
  await sb
    .from('client_integrations')
    .update({ status, error, updated_at: new Date().toISOString() })
    .eq('client_email', clientEmail.toLowerCase().trim())
    .eq('provider', provider);
}

export async function disconnectAccount(sb: SupabaseClient, clientEmail: string, provider: Platform): Promise<void> {
  await sb.from('client_integrations').delete().eq('client_email', clientEmail.toLowerCase().trim()).eq('provider', provider);
}

/** Set which Business Profile location the Google connection posts to. */
export async function setGbpLocation(sb: SupabaseClient, clientEmail: string, location: string | null, title: string | null): Promise<void> {
  const { data } = await sb.from('client_integrations').select('meta').eq('client_email', clientEmail.toLowerCase().trim()).eq('provider', 'google').maybeSingle();
  const meta = { ...((data?.meta as Record<string, unknown>) ?? {}), gbp_location: location, gbp_title: title };
  await sb.from('client_integrations').update({ meta, updated_at: new Date().toISOString() }).eq('client_email', clientEmail.toLowerCase().trim()).eq('provider', 'google');
}

/* ────────────────────────── Facebook and Instagram, by pasted token ────────────────────────── */

type GraphPage = { id: string; name: string; access_token?: string; instagram_business_account?: { id: string; username?: string } };

/**
 * Take any token a Page admin generated in the Graph API Explorer, work out
 * which Page it can post to, pull the Page token and the linked Instagram
 * account, and store both. Validated against the live API before anything is
 * written, so a stale paste never shows a green check.
 */
export async function connectFacebookByToken(
  sb: SupabaseClient,
  clientEmail: string,
  token: string,
  preferPageId?: string | null,
): Promise<{ ok: true; page: { id: string; name: string }; instagram: { id: string; username: string | null } | null; choices?: undefined } | { ok: false; error: string; choices?: Array<{ id: string; name: string }> }> {
  const raw = token.trim();
  if (!raw) return { ok: false, error: 'Paste the token first.' };

  // A user token that can be made long-lived is, when the app credentials exist. A Page token passes through untouched.
  let userToken = raw;
  const appId = real(process.env.FACEBOOK_APP_ID);
  const appSecret = real(process.env.FACEBOOK_APP_SECRET);
  if (appId && appSecret) {
    try {
      const ex = await fetch(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(raw)}`);
      const j = (await ex.json()) as { access_token?: string };
      if (ex.ok && j.access_token) userToken = j.access_token;
    } catch {
      /* the raw token still works for as long as it lasts */
    }
  }

  // Is this already a Page token? /me answers with the Page itself.
  const me = await graph<{ id: string; name: string; instagram_business_account?: { id: string; username?: string }; error?: { message: string } }>(
    `${GRAPH}/me?fields=id,name,instagram_business_account{id,username}`,
    userToken,
  );
  if (!me.ok) return { ok: false, error: `Facebook did not accept that token: ${me.error}` };

  let pages: GraphPage[] = [];
  const acc = await graph<{ data?: GraphPage[] }>(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100`, userToken);
  if (acc.ok && Array.isArray(acc.data.data) && acc.data.data.length) pages = acc.data.data;

  let page: GraphPage | null = null;
  let pageToken = userToken;
  if (pages.length) {
    if (pages.length > 1 && !preferPageId) {
      return { ok: false, error: 'That account manages more than one Page. Pick the one to post as.', choices: pages.map((p) => ({ id: p.id, name: p.name })) };
    }
    page = pages.find((p) => p.id === preferPageId) ?? pages[0];
    pageToken = page.access_token ?? userToken;
  } else {
    // No /me/accounts: the paste was a Page token. Confirm it can post.
    const probe = await graph<{ id: string; name: string; instagram_business_account?: { id: string; username?: string } }>(`${GRAPH}/${me.data.id}?fields=id,name,instagram_business_account{id,username}`, userToken);
    if (!probe.ok) return { ok: false, error: `Could not read the Page: ${probe.error}` };
    page = { id: probe.data.id, name: probe.data.name, instagram_business_account: probe.data.instagram_business_account };
  }

  const perms = await graph<{ data?: Array<{ permission: string; status: string }> }>(`${GRAPH}/me/permissions`, userToken);
  const granted = new Set((perms.ok ? perms.data.data ?? [] : []).filter((p) => p.status === 'granted').map((p) => p.permission));
  if (granted.size && !granted.has('pages_manage_posts')) {
    return { ok: false, error: 'That token cannot post: it is missing pages_manage_posts. Generate it again with pages_manage_posts and pages_read_engagement ticked.' };
  }

  const fb = await saveAccount(sb, clientEmail, {
    provider: 'facebook',
    externalId: page.id,
    accountName: page.name,
    scopes: [...granted].join(' '),
    accessToken: pageToken,
    meta: { via: 'token' },
  });
  if (!fb.ok) return fb;

  const ig = page.instagram_business_account ?? null;
  if (ig) {
    const igOk = await saveAccount(sb, clientEmail, {
      provider: 'instagram',
      externalId: ig.id,
      accountName: ig.username ? `@${ig.username}` : page.name,
      scopes: [...granted].join(' '),
      accessToken: pageToken,
      meta: { via: 'token', page_id: page.id },
    });
    if (!igOk.ok) return igOk;
  } else {
    await disconnectAccount(sb, clientEmail, 'instagram');
  }
  return { ok: true, page: { id: page.id, name: page.name }, instagram: ig ? { id: ig.id, username: ig.username ?? null } : null };
}

async function graph<T>(url: string, token: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20_000) });
    const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok || j.error) return { ok: false, error: j.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, data: j };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

/* ────────────────────────── X, by pasted OAuth 2.0 tokens ────────────────────────── */

/** X user tokens pasted from the developer portal, validated against /2/users/me before they are kept. */
export async function connectXByTokens(sb: SupabaseClient, clientEmail: string, access: string, refresh: string | null): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const res = await fetch('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${access.trim()}` }, signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as { data?: { id: string; username: string; name: string }; title?: string; detail?: string };
  if (!res.ok || !j.data) return { ok: false, error: `X did not accept that token: ${j.detail ?? j.title ?? `HTTP ${res.status}`}` };
  const saved = await saveAccount(sb, clientEmail, {
    provider: 'x',
    externalId: j.data.id,
    accountName: `@${j.data.username}`,
    accessToken: access.trim(),
    refreshToken: refresh?.trim() || null,
    expiresInSec: refresh ? 7200 : null,
    scopes: 'tweet.read tweet.write users.read media.write offline.access',
    meta: { via: 'token' },
  });
  if (!saved.ok) return saved;
  return { ok: true, username: j.data.username };
}
