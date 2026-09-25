import { readRelayToken, storageHost } from '@/lib/posting/media';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** TikTok takes JPEG and WEBP photos. Anything else goes through the optimizer as WEBP. */
const PHOTO_OK = /^image\/(jpeg|jpg|webp)$/i;

/**
 * Streams one signed file from our storage so TikTok can pull it from a
 * domain the app has verified. See lib/posting/media.ts.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const source = readRelayToken(token);
  if (!source) return new Response('Not found', { status: 404 });
  let host: string;
  try {
    host = new URL(source).host;
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (host !== storageHost()) return new Response('Not found', { status: 404 });

  let upstream = await fetch(source, { signal: AbortSignal.timeout(45_000) });
  if (!upstream.ok || !upstream.body) return new Response('Not found', { status: 404 });
  let type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim();

  if (type.startsWith('image/') && !PHOTO_OK.test(type)) {
    const optimized = await fetch(`${SITE.url}/_next/image?url=${encodeURIComponent(source)}&w=1920&q=85`, {
      headers: { Accept: 'image/webp' },
      signal: AbortSignal.timeout(45_000),
    });
    const otype = (optimized.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!optimized.ok || !optimized.body || !PHOTO_OK.test(otype)) return new Response('Unsupported image', { status: 415 });
    upstream = optimized;
    type = otype;
  }

  const headers = new Headers({ 'Content-Type': type || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
  const len = upstream.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  return new Response(upstream.body, { status: 200, headers });
}
