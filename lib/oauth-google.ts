import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptSecret, decryptSecret } from './crypto';
import { SITE } from './seo';

/**
 * GOOGLE OAUTH FOR CLIENTS.
 *
 * There was no OAuth of any kind in this codebase. The substitute was the credentials
 * vault (migration 018), where Sarah pastes a client's Google PASSWORD by hand. That
 * does not scale past a handful of clients, and asking a small business owner for
 * their Google password is the wrong thing to ask: it hands over their email, their
 * reviews, and their ad account all at once, with no way to revoke it.
 *
 * A client connects their own account instead. We hold a scoped, revocable token, and
 * they can cut it off from their Google settings at any time without changing a
 * password.
 *
 * WHAT IT UNLOCKS
 *  - Business Profile: their hours, their categories, their reviews, their map listing.
 *    This is the single highest leverage local-search asset a small business owns, and
 *    it is what an AI assistant reads when someone asks "who does this near me".
 *  - Analytics: whether the site we built them is actually working.
 *  - Calendar: so the receptionist can book into their real calendar instead of taking
 *    a message.
 *
 * SECRETS: tokens are AES-256-GCM encrypted at rest (lib/crypto.ts), never logged, and
 * never sent to the browser. The database row alone is useless.
 *
 * FAILS CLOSED: no GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, no connect button. We do
 * not show a client a button that cannot work.
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Ask for exactly what we will use, and nothing else. An over-broad consent screen is
 * the fastest way to make a small business owner close the tab.
 *
 * NOTE on business.manage: the Google Business Profile API is gated behind a quota
 * request Google must approve for the project. The consent will succeed without it;
 * the API calls will not. So we treat a granted business.manage scope as "asked for",
 * not "working", and surface the real state rather than a green check that lies.
 */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

export type GoogleCfg = { clientId: string; clientSecret: string };

export function googleConfig(): GoogleCfg | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function redirectUri(): string {
  return `${SITE.url}/api/oauth/google/callback`;
}

/* ── state: signed, short-lived, and bound to the signed-in client ─────────── */

function stateSecret(): string {
  const s = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('CLIENT_SESSION_SECRET is not configured');
  return s;
}

/**
 * The state parameter is the CSRF defence for the whole flow. It is signed and carries
 * the email of the client who started it, so a callback cannot be replayed to attach
 * someone else's Google account to a different client's portal.
 */
export function signState(email: string): string {
  const payload = `${email}:${Date.now() + 15 * 60 * 1000}`;
  const mac = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${mac}`;
}

export function verifyState(state: string): { email: string } | null {
  const [body, mac] = (state || '').split('.');
  if (!body || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(body, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const idx = payload.lastIndexOf(':');
  const email = payload.slice(0, idx);
  const exp = Number(payload.slice(idx + 1));
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;
  return { email };
}

export function authUrl(email: string): string | null {
  const cfg = googleConfig();
  if (!cfg) return null;
  const u = new URL(AUTH_URL);
  u.searchParams.set('client_id', cfg.clientId);
  u.searchParams.set('redirect_uri', redirectUri());
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
  // offline + consent: Google hands over a refresh token only on the FIRST consent
  // unless we force it. Without one, the connection silently dies in an hour and we
  // would have no way to get it back without bothering the client again.
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('include_granted_scopes', 'true');
  u.searchParams.set('state', signState(email));
  return u.toString();
}

/* ── token exchange ───────────────────────────────────────────────────────── */

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function postToken(body: Record<string, string>): Promise<TokenResponse | { error: string }> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as TokenResponse;
    if (!res.ok || json.error) return { error: json.error_description || json.error || `Google returned ${res.status}` };
    return json;
  } catch (e) {
    return { error: (e as Error)?.message ?? 'network error' };
  }
}

export async function exchangeCode(code: string): Promise<TokenResponse | { error: string }> {
  const cfg = googleConfig();
  if (!cfg) return { error: 'Google is not configured.' };
  return postToken({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  });
}

async function refresh(refreshToken: string): Promise<TokenResponse | { error: string }> {
  const cfg = googleConfig();
  if (!cfg) return { error: 'Google is not configured.' };
  return postToken({
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'refresh_token',
  });
}

/* ── persistence ──────────────────────────────────────────────────────────── */

export type Integration = {
  provider: 'google';
  accountEmail: string | null;
  accountName: string | null;
  scopes: string[];
  status: 'connected' | 'revoked' | 'error';
  error: string | null;
  connectedAt: string;
};

export async function saveGoogleIntegration(
  sb: SupabaseClient,
  clientEmail: string,
  tokens: TokenResponse,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Who did they actually connect? Showing this back to them is how they know they
  // linked the business account and not their personal one.
  let accountEmail: string | null = null;
  let accountName: string | null = null;
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const info = (await res.json()) as { email?: string; name?: string };
      accountEmail = info.email ?? null;
      accountName = info.name ?? null;
    }
  } catch {
    /* the connection still works without a display name */
  }

  const access = encryptSecret(tokens.access_token);
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  const row: Record<string, unknown> = {
    client_email: clientEmail.toLowerCase().trim(),
    provider: 'google',
    account_email: accountEmail,
    account_name: accountName,
    scopes: tokens.scope ?? GOOGLE_SCOPES.join(' '),
    access_ciphertext: access.ciphertext,
    access_iv: access.iv,
    access_tag: access.tag,
    access_expires_at: expiresAt,
    status: 'connected',
    error: null,
    updated_at: new Date().toISOString(),
  };

  // Only overwrite the refresh token when Google actually gave us a new one. A
  // re-consent that omits it must NOT wipe the working one we already hold.
  if (tokens.refresh_token) {
    const r = encryptSecret(tokens.refresh_token);
    row.refresh_ciphertext = r.ciphertext;
    row.refresh_iv = r.iv;
    row.refresh_tag = r.tag;
  }

  const { error } = await sb.from('client_integrations').upsert(row, { onConflict: 'client_email,provider' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listIntegrations(sb: SupabaseClient, clientEmail: string): Promise<Integration[]> {
  const { data } = await sb
    .from('client_integrations')
    .select('provider, account_email, account_name, scopes, status, error, created_at')
    .eq('client_email', clientEmail.toLowerCase().trim());
  return (data ?? []).map((r) => ({
    provider: r.provider as 'google',
    accountEmail: (r.account_email as string) ?? null,
    accountName: (r.account_name as string) ?? null,
    scopes: String(r.scopes ?? '').split(/\s+/).filter(Boolean),
    status: r.status as Integration['status'],
    error: (r.error as string) ?? null,
    connectedAt: r.created_at as string,
  }));
}

/**
 * A usable access token, refreshed if it is stale.
 *
 * Never hand this to a browser. It is server-side only, and every caller should treat
 * a null as "they are not connected" rather than retrying: a refresh failure almost
 * always means the client revoked us, and hammering Google will not change that.
 */
export async function getGoogleAccessToken(sb: SupabaseClient, clientEmail: string): Promise<string | null> {
  const email = clientEmail.toLowerCase().trim();
  const { data: row } = await sb
    .from('client_integrations')
    .select('*')
    .eq('client_email', email)
    .eq('provider', 'google')
    .maybeSingle();
  if (!row || row.status !== 'connected') return null;

  const expires = Date.parse(String(row.access_expires_at ?? ''));
  const fresh = Number.isFinite(expires) && expires - Date.now() > 60_000;
  if (fresh && row.access_ciphertext) {
    try {
      return decryptSecret(row.access_ciphertext, row.access_iv, row.access_tag);
    } catch {
      /* fall through to a refresh */
    }
  }

  if (!row.refresh_ciphertext) {
    await sb
      .from('client_integrations')
      .update({ status: 'error', error: 'No refresh token. They need to reconnect.' })
      .eq('client_email', email)
      .eq('provider', 'google');
    return null;
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(row.refresh_ciphertext, row.refresh_iv, row.refresh_tag);
  } catch {
    return null;
  }

  const next = await refresh(refreshToken);
  if ('error' in next) {
    // Google says no. Almost always: the client revoked access. Record it honestly so
    // the portal shows "reconnect" instead of a green check that lies.
    await sb
      .from('client_integrations')
      .update({ status: 'revoked', error: next.error, updated_at: new Date().toISOString() })
      .eq('client_email', email)
      .eq('provider', 'google');
    return null;
  }

  await saveGoogleIntegration(sb, email, next);
  return next.access_token;
}

export async function disconnectGoogle(sb: SupabaseClient, clientEmail: string): Promise<void> {
  const email = clientEmail.toLowerCase().trim();
  const { data: row } = await sb
    .from('client_integrations')
    .select('refresh_ciphertext, refresh_iv, refresh_tag')
    .eq('client_email', email)
    .eq('provider', 'google')
    .maybeSingle();

  // Tell Google too. Deleting our row while their grant lives on would leave them
  // believing they had cut us off when they had not.
  if (row?.refresh_ciphertext) {
    try {
      const token = decryptSecret(row.refresh_ciphertext, row.refresh_iv, row.refresh_tag);
      await fetch(REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      /* revoke is best effort; the row still goes */
    }
  }

  await sb.from('client_integrations').delete().eq('client_email', email).eq('provider', 'google');
}
