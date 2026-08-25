import { NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/indexnow';
import { SITE } from '@/lib/seo';
import sitemap from '@/app/sitemap';

export const runtime = 'nodejs';

// On-demand IndexNow submission. Call with ?path=/work/voicestaff to submit a single URL,
// or with no params to submit every public URL on the site.
// Authorize with the same CRON_SECRET as the newsletter cron.
function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return auth === `Bearer ${expected}`;
}

/**
 * Every public URL, DERIVED FROM THE SITEMAP.
 *
 * This used to be a hand-maintained list of eleven paths, and it silently
 * rotted. By July 2026 the site had shipped /demos, /voice-agents/build, /websites,
 * /command-center, /chief, /press, /pictures, /hatchery, /switchboard, /store,
 * /website-audit and the whole trade-page set, and NOT ONE of them was ever
 * announced to IndexNow: the weekly cron kept re-submitting the same eleven old
 * URLs. Deriving from the sitemap means a new page is announced the moment it
 * is listed, with no second list to keep in sync. (Fixed 2026-07-25.)
 */
function allUrls(): string[] {
  return sitemap().map((entry) => entry.url);
}

export async function GET(req: Request) {
  /**
   * Unauthenticated health check: GET /api/indexnow?health=1
   *
   * This exists because the submitter was dead for months and nothing said so.
   * INDEXNOW_KEY was never set in production, so every weekly cron run bailed
   * at the first line of submitToIndexNow and returned {ok:false} into a void
   * nobody read. The failure was invisible from the outside.
   *
   * Nothing here is a secret. The IndexNow key is PUBLIC BY DESIGN: the
   * protocol requires it to be served at /<key>.txt so search engines can
   * verify ownership. So reporting whether it is configured, and whether it
   * matches the published key file, leaks nothing and makes the silent failure
   * loud. keyConfigured false means the weekly cron is a no-op again.
   */
  const probe = new URL(req.url);
  if (probe.searchParams.get('health')) {
    const key = process.env.INDEXNOW_KEY;
    return NextResponse.json({
      keyConfigured: Boolean(key),
      keyLocation: key ? `${SITE.url}/${key}.txt` : null,
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      urlsThatWouldSubmit: allUrls().length,
    });
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const urls = path ? [`${SITE.url}${path}`] : allUrls();
  const result = await submitToIndexNow(urls);
  return NextResponse.json({ submitted: urls.length, ...result });
}
