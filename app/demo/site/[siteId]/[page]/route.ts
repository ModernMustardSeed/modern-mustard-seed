import { getSupabase } from '@/lib/supabase';
import { settleCursorCompanions } from '@/lib/cursor-companion';

export const dynamic = 'force-dynamic';

/**
 * The OTHER pages of a multi-page paid site, so the whole thing can be walked before
 * it is published.
 *
 * A paid build now writes five real files (see MULTIPAGE_RULE): index.html lands on
 * the demo row and is served by ../raw, and the other four land in
 * projects.site_pages. Without this route the nav on the preview would 404 on every
 * link except home, and a five page site nobody can click through is not reviewable.
 *
 * Path shape is deliberate. The preview home is served at /demo/site/<id>/raw, which
 * has no trailing slash, so a relative href="services.html" in the page resolves
 * against /demo/site/<id>/ and lands exactly here. The pages therefore need no
 * preview-specific markup: the same file that ships to the client is the file served
 * here, which is the only way the preview is worth anything.
 *
 * Static segments win over dynamic ones in Next, so /raw and /tour still resolve to
 * their own routes and are never captured by [page].
 */
export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string; page: string }> }) {
  const { siteId, page } = await params;
  const sb = getSupabase();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(siteId)) return new Response('Not found', { status: 404 });

  // Only ever a bare filename. No slashes, no traversal, no lookups we did not intend.
  if (!/^[a-z0-9][a-z0-9-]*\.html$/i.test(page)) return new Response('Not found', { status: 404 });

  const { data: site } = await sb
    .from('outbound_demo_sites')
    .select('project_id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site?.project_id) return new Response('Not found', { status: 404 });

  const { data: project } = await sb
    .from('projects')
    .select('site_pages')
    .eq('id', site.project_id)
    .maybeSingle();

  const pages = (project?.site_pages ?? null) as Record<string, string> | null;
  const key = Object.keys(pages ?? {}).find((k) => k.toLowerCase() === page.toLowerCase());
  const html = key ? pages?.[key] : null;
  if (!html) return new Response('Not found', { status: 404 });

  // On the live domain the home link is "/". In preview that would leave the site
  // entirely, so point it back at the preview home and keep the walk closed.
  const previewed = settleCursorCompanions(html).replace(
    /href=(["'])\/\1/g,
    `href="/demo/site/${siteId}/raw"`,
  );

  return new Response(previewed, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}
