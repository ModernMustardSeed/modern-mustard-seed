import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/admin-auth';

/**
 * THE BOOTH ROUTES HOLD THE SERVICE ROLE OVER A PRIVATE BUCKET, SO THEY NEED
 * REAL AUTH, NOT A HEADER CONVENTION.
 *
 * These endpoints list every take, mint 3-hour signed playback URLs, mint signed
 * UPLOAD urls at a caller-chosen path, and delete objects. The only gate used to
 * be an Origin check whose first line was `if (!origin) return true`, because a
 * same-origin browser fetch may omit the header. Any non-browser caller omits it
 * too: `curl -X POST /api/booth/list` with no Origin returned playable links to
 * the whole bucket, and /api/booth/delete erased it. The old comment said as
 * much ("not a replacement for auth against a determined non-browser caller"),
 * which was true and was the problem.
 *
 * The booth is Sarah's private single-user studio, so the admin session is the
 * right key. It is already issued site-wide by lib/admin-auth, so the /sarah,
 * /sarahbook and /sarahcxc pages send it on same-origin fetches whenever she is
 * signed in to /admin; if she is not, she signs in once.
 *
 * RENAMED ON PURPOSE (2026-08-11). The check is now async, and an awaited call
 * that loses its `await` evaluates a Promise, which is always truthy, silently
 * disabling the guard. Renaming forces every call site to fail compilation until
 * it is updated, so no route can quietly keep the old behavior.
 */
export async function requireBoothAccess(req: NextRequest): Promise<boolean> {
  // Keep the cross-origin rejection as defense in depth against CSRF from
  // another site riding a logged-in browser.
  const origin = req.headers.get('origin');
  if (origin) {
    const host = req.headers.get('host');
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }
  return Boolean(await getSession());
}
