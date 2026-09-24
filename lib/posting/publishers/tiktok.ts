/**
 * TikTok, through the Content Posting API on the creator's own OAuth token.
 *
 * TikTok posts a photo or a video, never words alone, and it pulls the file
 * from a URL on a domain the app has verified, so every file goes out through
 * the media relay (lib/posting/media.ts).
 *
 * Two modes, one switch:
 *   DIRECT POST (TIKTOK_DIRECT_POST=1). The post goes live on its own. TikTok
 *     allows this only once the app has passed its audit; before that a
 *     direct post can only be private, which is worth nothing to a business.
 *   INBOX (the default). The file and caption land in the account's TikTok
 *     inbox and one tap in the app publishes it. This works the day the app
 *     is approved, audit or not.
 *
 * Access tokens last a day; the refresh token (a year) renews them before
 * every post.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount, refreshTokenFor, saveAccount } from '../accounts';
import { isVideoUrl, relayUrl } from '../media';
import type { PostResult } from '../types';

const API = 'https://open.tiktokapis.com/v2';

function real(v: string | undefined): string | null {
  return v && !/^\[SENSITIVE\]$/i.test(v) ? v : null;
}

type TikTokError = { code?: string; message?: string; log_id?: string };

async function call<T>(token: string, path: string, body: unknown): Promise<{ data: T | null; error: TikTokError | null; status: number }> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const j = (await res.json().catch(() => ({}))) as { data?: T; error?: TikTokError };
  const err = j.error && j.error.code && j.error.code !== 'ok' ? j.error : !res.ok ? { code: `http_${res.status}`, message: `HTTP ${res.status}` } : null;
  return { data: j.data ?? null, error: err, status: res.status };
}

export async function tiktokToken(sb: SupabaseClient, clientEmail: string): Promise<{ token: string; name: string | null } | { error: string; pending?: boolean }> {
  const acct = await accessToken(sb, clientEmail, 'tiktok');
  if (!acct) return { error: 'TikTok is not connected.', pending: true };
  const expires = Date.parse(String(acct.row.access_expires_at ?? ''));
  if (Number.isFinite(expires) && expires - Date.now() > 60_000) return { token: acct.token, name: acct.row.account_name };

  const refresh = await refreshTokenFor(sb, clientEmail, 'tiktok');
  const key = real(process.env.TIKTOK_CLIENT_KEY);
  const secret = real(process.env.TIKTOK_CLIENT_SECRET);
  if (!refresh || !key || !secret) return { token: acct.token, name: acct.row.account_name };

  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secret, grant_type: 'refresh_token', refresh_token: refresh }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };
  if (!res.ok || !j.access_token) {
    const msg = j.error_description ?? j.error ?? `HTTP ${res.status}`;
    await markAccount(sb, clientEmail, 'tiktok', 'revoked', `Refresh failed: ${msg}`);
    return { error: `TikTok refresh failed: ${msg}` };
  }
  await saveAccount(sb, clientEmail, {
    provider: 'tiktok',
    externalId: acct.row.external_id,
    accountName: acct.row.account_name,
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? refresh,
    expiresInSec: j.expires_in ?? 86_400,
    scopes: j.scope ?? acct.row.scopes ?? undefined,
    meta: (acct.row.meta as Record<string, unknown>) ?? {},
  });
  return { token: j.access_token, name: acct.row.account_name };
}

/** TikTok's photo title is 90 characters; the rest of the caption goes in the description. */
function photoText(caption: string): { title: string; description: string } {
  const first = caption.split(/\n/)[0].trim();
  const title = first.length <= 90 ? first : `${first.slice(0, 87).trimEnd()}...`;
  return { title, description: caption.slice(0, 4000) };
}

type Status = { status?: string; fail_reason?: string; publicaly_available_post_id?: Array<string | number> };

/** Watch the upload for a few seconds, so a bad file fails here and not silently. */
async function settle(token: string, publishId: string): Promise<Status | null> {
  let last: Status | null = null;
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 3_000));
    const s = await call<Status>(token, '/post/publish/status/fetch/', { publish_id: publishId });
    if (s.data) last = s.data;
    const st = last?.status ?? '';
    if (st === 'FAILED' || st === 'PUBLISH_COMPLETE' || st === 'SEND_TO_USER_INBOX') return last;
  }
  return last;
}

export async function publishTikTok(sb: SupabaseClient, clientEmail: string, caption: string, imageUrl: string | null): Promise<PostResult> {
  const at = new Date().toISOString();
  // Words alone cannot go to TikTok. This day's post simply skips the feed.
  if (!imageUrl) return { ok: false, pending: true, at, error: 'TikTok needs a photo or a video. This post has neither, so it was left off TikTok.' };
  const media = relayUrl(imageUrl);
  if (!media) return { ok: false, at, error: 'The photo is not in our storage, so TikTok cannot pull it. Upload it through the portal.' };

  const t = await tiktokToken(sb, clientEmail);
  if ('error' in t) return { ok: false, error: t.error, at, pending: t.pending };

  const direct = process.env.TIKTOK_DIRECT_POST === '1';
  const video = isVideoUrl(imageUrl);

  try {
    const privacy = 'PUBLIC_TO_EVERYONE';
    if (direct) {
      // TikTok requires reading the creator's options before a direct post.
      const info = await call<{ privacy_level_options?: string[]; creator_nickname?: string }>(t.token, '/post/publish/creator_info/query/', {});
      if (info.error) return { ok: false, at, error: `TikTok: ${info.error.message || info.error.code}` };
      const options = info.data?.privacy_level_options ?? [];
      if (!options.includes('PUBLIC_TO_EVERYONE')) return { ok: false, at, error: 'This TikTok account cannot post publicly through the app yet. It is private, or the app has not passed its audit.' };
    }

    let init: { data: { publish_id?: string } | null; error: TikTokError | null; status: number };
    if (video) {
      const path = direct ? '/post/publish/video/init/' : '/post/publish/inbox/video/init/';
      const body = direct
        ? { post_info: { title: caption.slice(0, 2200), privacy_level: privacy, disable_comment: false, disable_duet: false, disable_stitch: false }, source_info: { source: 'PULL_FROM_URL', video_url: media } }
        : { source_info: { source: 'PULL_FROM_URL', video_url: media } };
      init = await call(t.token, path, body);
    } else {
      const { title, description } = photoText(caption);
      init = await call(t.token, '/post/publish/content/init/', {
        post_info: { title, description, disable_comment: false, auto_add_music: true, ...(direct ? { privacy_level: privacy } : {}) },
        source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [media] },
        post_mode: direct ? 'DIRECT_POST' : 'MEDIA_UPLOAD',
        media_type: 'PHOTO',
      });
    }

    if (init.error || !init.data?.publish_id) {
      const e = init.error;
      if (e?.code === 'access_token_invalid' || init.status === 401) await markAccount(sb, clientEmail, 'tiktok', 'revoked', e?.message ?? 'Token rejected.');
      const hint = e?.code === 'url_ownership_unverified' ? ' The relay prefix is not verified in the TikTok developer portal.' : '';
      return { ok: false, at, error: `TikTok: ${e?.message || e?.code || 'no publish id'}.${hint}` };
    }

    const publishId = init.data.publish_id;
    const s = await settle(t.token, publishId);
    if (s?.status === 'FAILED') return { ok: false, at, id: publishId, error: `TikTok could not take the file: ${s.fail_reason ?? 'unknown reason'}.` };

    if (!direct) return { ok: true, at, id: publishId, error: 'Waiting in the TikTok inbox. One tap in the TikTok app posts it.' };
    const postId = s?.publicaly_available_post_id?.[0];
    const handle = (t.name ?? '').replace(/^@/, '');
    return {
      ok: true,
      at,
      id: String(postId ?? publishId),
      url: postId && handle ? `https://www.tiktok.com/@${handle}/${video ? 'video' : 'photo'}/${postId}` : undefined,
      ...(s?.status === 'PUBLISH_COMPLETE' ? {} : { error: 'TikTok is still processing it. It goes live on its own.' }),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', at };
  }
}
