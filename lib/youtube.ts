import type { SupabaseClient } from '@supabase/supabase-js';
import { googleConfig, signState, saveGoogleIntegration, getGoogleAccessToken } from '@/lib/oauth-google';
import { SITE } from '@/lib/seo';

/**
 * PUBLISH TO YOUTUBE.
 *
 * The @modernmustardseed channel connects ONCE, as an admin action, through the
 * same Google OAuth the client portal uses (lib/oauth-google). Its tokens live in
 * client_integrations under this fixed sentinel key, encrypted at rest, so
 * getGoogleAccessToken refreshes them automatically forever after.
 *
 * FAILS CLOSED: no GOOGLE_CLIENT_ID/SECRET -> no connect button. Not connected ->
 * publish returns an honest "connect the channel first", never a fake success.
 *
 * NOTE: youtube.upload is a "sensitive" Google scope. The Cloud project must have
 * it approved (app verification) before anyone but a test user can publish. The
 * consent will complete either way; the upload only works once approved.
 */
export const CHANNEL_KEY = 'youtube-channel@modernmustardseed';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export function channelRedirectUri(): string {
  return `${SITE.url}/api/admin/youtube/oauth/callback`;
}

/** The Google consent URL for connecting the channel. Null when Google is unconfigured. */
export function channelAuthUrl(): string | null {
  const cfg = googleConfig();
  if (!cfg) return null;
  const u = new URL(AUTH_URL);
  u.searchParams.set('client_id', cfg.clientId);
  u.searchParams.set('redirect_uri', channelRedirectUri());
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES.join(' '));
  u.searchParams.set('access_type', 'offline'); // we need a refresh token
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('state', signState(CHANNEL_KEY));
  return u.toString();
}

export async function exchangeChannelCode(
  code: string,
): Promise<Record<string, unknown> | { error: string }> {
  const cfg = googleConfig();
  if (!cfg) return { error: 'Google is not configured.' };
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: channelRedirectUri(),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as Record<string, unknown> & { error?: string; error_description?: string };
    if (!res.ok || json.error) return { error: json.error_description || json.error || `Google returned ${res.status}` };
    return json;
  } catch (e) {
    return { error: (e as Error)?.message ?? 'network error' };
  }
}

export async function saveChannelTokens(sb: SupabaseClient, tokens: Record<string, unknown>) {
  // saveGoogleIntegration is generic (keyed by email); the channel just uses the sentinel.
  return saveGoogleIntegration(sb, CHANNEL_KEY, tokens as never);
}

export type YtStatus = {
  configured: boolean;
  connected: boolean;
  channelTitle: string | null;
  channelUrl: string | null;
};

export async function youtubeStatus(sb: SupabaseClient): Promise<YtStatus> {
  const configured = googleConfig() != null;
  if (!configured) return { configured: false, connected: false, channelTitle: null, channelUrl: null };
  const token = await getGoogleAccessToken(sb, CHANNEL_KEY);
  if (!token) return { configured: true, connected: false, channelTitle: null, channelUrl: null };
  let channelTitle: string | null = null;
  let channelUrl: string | null = null;
  try {
    const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (r.ok) {
      const j = (await r.json()) as { items?: { id: string; snippet?: { title?: string; customUrl?: string } }[] };
      const ch = j.items?.[0];
      if (ch) {
        channelTitle = ch.snippet?.title ?? null;
        channelUrl = ch.snippet?.customUrl
          ? `https://youtube.com/${ch.snippet.customUrl}`
          : `https://youtube.com/channel/${ch.id}`;
      }
    }
  } catch {
    /* connection is still valid without the display name */
  }
  return { configured: true, connected: true, channelTitle, channelUrl };
}

export type UploadInput = {
  data: Buffer | Uint8Array;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'public' | 'unlisted' | 'private';
};

/**
 * Resumable upload of a finished video to the connected channel. Returns the
 * watch URL, or an honest error. The bytes come from our booth bucket, so the
 * caller downloads them server-side and hands the buffer here.
 */
export async function uploadVideoToYouTube(
  sb: SupabaseClient,
  input: UploadInput,
): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  const token = await getGoogleAccessToken(sb, CHANNEL_KEY);
  if (!token) return { ok: false, error: 'The @modernmustardseed channel is not connected. Connect it first.' };

  const bytes = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
  const meta = {
    snippet: {
      title: input.title.trim().slice(0, 100),
      description: input.description.slice(0, 4900),
      tags: input.tags.filter(Boolean).slice(0, 30),
      categoryId: '22', // People & Blogs
    },
    status: { privacyStatus: input.privacyStatus, selfDeclaredMadeForKids: false },
  };

  // 1) open a resumable session
  let location: string | null = null;
  try {
    const start = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/*',
          'X-Upload-Content-Length': String(bytes.length),
        },
        body: JSON.stringify(meta),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!start.ok) {
      const t = await start.text();
      return { ok: false, error: `YouTube rejected the upload (${start.status}): ${t.slice(0, 240)}` };
    }
    location = start.headers.get('location');
  } catch (e) {
    return { ok: false, error: `Could not start the upload: ${(e as Error).message}` };
  }
  if (!location) return { ok: false, error: 'YouTube did not return an upload URL.' };

  // 2) send the bytes
  try {
    const put = await fetch(location, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/*', 'Content-Length': String(bytes.length) },
      body: bytes,
      signal: AbortSignal.timeout(600_000),
    });
    const j = (await put.json().catch(() => ({}))) as { id?: string };
    if (!put.ok || !j.id) return { ok: false, error: `Upload failed (${put.status}).` };
    return { ok: true, id: j.id, url: `https://youtu.be/${j.id}` };
  } catch (e) {
    return { ok: false, error: `Upload failed mid-transfer: ${(e as Error).message}` };
  }
}
