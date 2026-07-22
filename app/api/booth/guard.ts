import type { NextRequest } from 'next/server';

/**
 * The /sarah booth has no login (it is a private, noindex, unlinked, single-user
 * page), and its API routes talk to a private storage bucket with the service
 * role. This is the one cheap guard in front of them: refuse a browser request
 * whose Origin is a different site, which stops drive-by/CSRF calls from other
 * pages. Same-origin fetches from the booth either send a matching Origin or
 * omit it entirely, so those always pass. It is not a replacement for auth
 * against a determined non-browser caller; it just keeps the door from standing
 * wide open now that the booth code is gone.
 */
export function sameOriginOnly(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin requests may omit Origin
  const host = req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
