/**
 * THE MEDIA RELAY. TikTok pulls a photo or video from a URL, and only from a
 * domain or URL prefix the app has verified it owns. Client uploads live in
 * Supabase storage, which we cannot verify, so the publisher hands TikTok a
 * signed URL on modernmustardseed.com instead and app/api/posting/media
 * streams the file through.
 *
 * The signature is an HMAC over the source URL, so the relay serves only
 * files the publisher chose, never an arbitrary URL someone types in. The
 * verified prefix to register with TikTok is RELAY_PREFIX.
 */
import { createHmac } from 'node:crypto';
import { SITE } from '@/lib/seo';

export const RELAY_PREFIX = `${SITE.url}/api/posting/media/`;

function secret(): string {
  const s = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('CLIENT_SESSION_SECRET not configured');
  return s;
}

const sign = (payload: string) => createHmac('sha256', secret()).update(`media:${payload}`).digest('base64url').slice(0, 32);

/** The storage host a relayed file must come from. */
export function storageHost(): string | null {
  const raw = process.env.SUPABASE_URL || process.env.supabase_url;
  try {
    return raw ? new URL(raw).host : null;
  } catch {
    return null;
  }
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
}

/** A relay URL for a file in our storage, or null when the file is not ours. */
export function relayUrl(source: string): string | null {
  let u: URL;
  try {
    u = new URL(source);
  } catch {
    return null;
  }
  const host = storageHost();
  if (!host || u.host !== host || !u.pathname.startsWith('/storage/v1/object/public/')) return null;
  const payload = Buffer.from(source).toString('base64url');
  return `${RELAY_PREFIX}${payload}.${sign(payload)}.${isVideoUrl(source) ? 'mp4' : 'jpg'}`;
}

/** The source URL behind a relay token, or null if the signature does not hold. */
export function readRelayToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const want = sign(payload);
  if (want.length !== sig.length || !want.split('').every((c, i) => c === sig[i])) return null;
  try {
    return Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}
