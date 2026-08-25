import { getSupabase } from '@/lib/supabase';
import { settleCursorCompanions } from '@/lib/cursor-companion';
import { dressClosingBand } from '@/lib/closing-band';
import { levelMarquees } from '@/lib/level-marquee';
import { takeBrownOff } from '@/lib/no-brown';

export const dynamic = 'force-dynamic';

/**
 * The built site's html as a real same-origin document. The demo shell's
 * iframe points HERE instead of using srcdoc: inside a srcdoc document a
 * nav link like href="#services" resolves against the PARENT page URL, so
 * clicking it reloaded the wrapper instead of scrolling to the section
 * (found on Porsha Lee, 2026-07-17). A real URL makes fragment links plain
 * same-document navigation, which fixes the sticky-nav anchors on every
 * demo at once.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const sb = getSupabase();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(siteId)) {
    return new Response('Not found', { status: 404 });
  }
  const { data: site } = await sb
    .from('outbound_demo_sites')
    .select('html')
    .eq('id', siteId)
    .maybeSingle();
  if (!site?.html) return new Response('Not found', { status: 404 });

  // Every site already in the table was built before the companion rules, the
  // level-stripe law and the no-brown law existed, so settle its cursor glyph,
  // flatten its marquee and take the brown off on the way out rather than
  // rebuilding a hundred demos to fix one stuck mark, one tilted band and one
  // muddy ending. takeBrownOff goes LAST so its script runs after the others and
  // sees the colours they leave behind.
  return new Response(takeBrownOff(levelMarquees(dressClosingBand(settleCursorCompanions(site.html as string)))), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}
