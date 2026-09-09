/**
 * X, through the v2 API on the account's own OAuth 2.0 user token. The image
 * goes up through the v2 media upload endpoint first, then the post
 * references it. Tokens from the OAuth flow expire in two hours; the refresh
 * token (offline.access) renews them before every post.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount, refreshTokenFor, saveAccount } from '../accounts';
import type { PostResult } from '../types';

const API = 'https://api.x.com/2';

function real(v: string | undefined): string | null {
  return v && !/^\[SENSITIVE\]$/i.test(v) ? v : null;
}

/** A token that will still be valid for the next minute, refreshing if the flow gave us a refresh token. */
async function freshToken(sb: SupabaseClient, clientEmail: string): Promise<{ token: string; userId: string | null; name: string | null } | { error: string; pending?: boolean }> {
  const acct = await accessToken(sb, clientEmail, 'x');
  if (!acct) return { error: 'X is not connected.', pending: true };
  const expires = Date.parse(String(acct.row.access_expires_at ?? ''));
  const fresh = Number.isFinite(expires) && expires - Date.now() > 60_000;
  if (fresh) return { token: acct.token, userId: acct.row.external_id, name: acct.row.account_name };

  const refresh = await refreshTokenFor(sb, clientEmail, 'x');
  const clientId = real(process.env.X_OAUTH2_CLIENT_ID);
  const clientSecret = real(process.env.X_OAUTH2_CLIENT_SECRET);
  if (!refresh || !clientId) return { token: acct.token, userId: acct.row.external_id, name: acct.row.account_name };

  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh, client_id: clientId });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  const res = await fetch(`${API}/oauth2/token`, { method: 'POST', headers, body, signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !j.access_token) {
    const msg = j.error_description ?? j.error ?? `HTTP ${res.status}`;
    await markAccount(sb, clientEmail, 'x', 'revoked', `Refresh failed: ${msg}`);
    return { error: `X refresh failed: ${msg}` };
  }
  await saveAccount(sb, clientEmail, {
    provider: 'x',
    externalId: acct.row.external_id,
    accountName: acct.row.account_name,
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? refresh,
    expiresInSec: j.expires_in ?? 7200,
    scopes: acct.row.scopes ?? undefined,
    meta: (acct.row.meta as Record<string, unknown>) ?? {},
  });
  return { token: j.access_token, userId: acct.row.external_id, name: acct.row.account_name };
}

async function uploadMedia(token: string, imageUrl: string): Promise<{ id: string } | { error: string }> {
  const img = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!img.ok) return { error: `Could not fetch the image (${img.status}).` };
  const bytes = Buffer.from(await img.arrayBuffer());
  const type = img.headers.get('content-type') ?? 'image/jpeg';
  const form = new FormData();
  form.append('media', new Blob([bytes], { type }), 'photo.jpg');
  form.append('media_category', 'tweet_image');
  const res = await fetch(`${API}/media/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(60_000) });
  const j = (await res.json().catch(() => ({}))) as { data?: { id?: string }; id?: string; media_id_string?: string; detail?: string; title?: string };
  const id = j.data?.id ?? j.id ?? j.media_id_string;
  if (!res.ok || !id) return { error: `Media upload failed: ${j.detail ?? j.title ?? `HTTP ${res.status}`}` };
  return { id: String(id) };
}

export async function publishX(sb: SupabaseClient, clientEmail: string, caption: string, imageUrl: string | null): Promise<PostResult> {
  const at = new Date().toISOString();
  const t = await freshToken(sb, clientEmail);
  if ('error' in t) return { ok: false, error: t.error, at, pending: t.pending };

  const text = caption.length > 280 ? `${caption.slice(0, 277).trimEnd()}...` : caption;
  const body: { text: string; media?: { media_ids: string[] } } = { text };
  if (imageUrl) {
    const m = await uploadMedia(t.token, imageUrl);
    if ('id' in m) body.media = { media_ids: [m.id] };
    // A failed image upload still posts the words; the result notes the image was dropped.
    else if (!text) return { ok: false, error: m.error, at };
  }

  try {
    const res = await fetch(`${API}/tweets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const j = (await res.json().catch(() => ({}))) as { data?: { id?: string }; detail?: string; title?: string; status?: number };
    if (!res.ok || !j.data?.id) {
      const msg = j.detail ?? j.title ?? `HTTP ${res.status}`;
      if (res.status === 401) await markAccount(sb, clientEmail, 'x', 'revoked', msg);
      return { ok: false, error: msg, at };
    }
    const handle = (t.name ?? '').replace(/^@/, '') || 'i';
    return { ok: true, id: j.data.id, url: `https://x.com/${handle}/status/${j.data.id}`, at, ...(imageUrl && !body.media ? { error: 'Posted without the image.' } : {}) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', at };
  }
}
