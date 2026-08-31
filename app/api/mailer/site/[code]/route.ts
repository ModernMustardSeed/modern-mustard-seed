/**
 * Serves the preview site as a standalone document, for the iframe on
 * /y/<code>.
 *
 * It is the SAME previewSiteHtml() the postcard was screenshotted from, so the
 * paper and the screen cannot drift. Served from its own route rather than
 * inlined with srcDoc because a real document in a real frame scrolls, prints
 * and zooms like a website, which is the entire illusion we are selling.
 */

import { lookupMailCode } from '@/lib/mailer/lookup';
import { previewSiteHtml } from '@/lib/mailer/site-html';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const found = await lookupMailCode(code);
  if (!found) return new Response('Not found', { status: 404 });

  return new Response(previewSiteHtml(found.spec, { width: 1440 }), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Their own site, generated from their own row. Never in a shared cache.
      'cache-control': 'private, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
