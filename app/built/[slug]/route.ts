import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE PUBLISH SURFACE. A member's page or tool, live at a real address.
 *
 * This is the difference between an arsenal that produces and one that deploys
 * (Sarah, 2026-08-07: "produces but does not publish" is not the immersion she
 * wants). The document is one self-contained HTML string in the row, so putting
 * it live is a status flip and taking it down cannot strand an orphan file
 * serving on the internet under somebody's business name.
 *
 * ⚠️ THIS PAGE IS DELIBERATELY EMBEDDABLE ANYWHERE. No X-Frame-Options and no
 * frame-ancestors restriction, because the whole point of a member's quoter is
 * that it goes in an iframe on THEIR website. That is the opposite of the
 * decision made for /api/programs/tool, which is a paid asset behind a login
 * and is correctly locked to SAMEORIGIN. Do not "harden" this one to match it.
 *
 * noindex: their tool ranking on our domain is not something either of us
 * wants. It belongs to the member's site, not to our sitemap.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getSupabase();
  if (!sb || !/^[a-z0-9-]{3,120}$/i.test(slug)) return new Response('Not found', { status: 404 });

  const { data } = await sb
    .from('hundredfold_systems')
    .select('artifact_html, status, published_at')
    .eq('public_slug', slug)
    .maybeSingle();

  // `retired` is how a member takes their own page down. It must stop serving.
  if (!data?.artifact_html || data.status === 'retired' || !data.published_at) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(data.artifact_html as string, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      'Content-Security-Policy': "frame-ancestors *;",
    },
  });
}
