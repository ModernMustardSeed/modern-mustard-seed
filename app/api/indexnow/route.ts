import { NextResponse } from 'next/server';
import { listContent } from '@/lib/content';
import { submitToIndexNow } from '@/lib/indexnow';
import { SITE } from '@/lib/seo';

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

function allUrls(): string[] {
  const staticPaths = [
    '',
    '/build-queue',
    '/work',
    '/services',
    '/work-with-us',
    '/blog',
    '/playbooks',
    '/audit',
    '/ai-proof',
    '/about',
    '/contact',
  ];
  const work = listContent('work').map((s) => `/work/${s.slug}`);
  const blog = listContent('blog').map((p) => `/blog/${p.slug}`);
  const playbooks = listContent('playbooks').map((p) => `/playbooks/${p.slug}`);
  return [...staticPaths, ...work, ...blog, ...playbooks].map((p) => `${SITE.url}${p}`);
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
