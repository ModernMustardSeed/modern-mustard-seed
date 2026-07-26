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
 * rotted. By July 2026 the site had shipped /demos, /sidekick, /websites,
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
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const urls = path ? [`${SITE.url}${path}`] : allUrls();
  const result = await submitToIndexNow(urls);
  return NextResponse.json({ submitted: urls.length, ...result });
}
