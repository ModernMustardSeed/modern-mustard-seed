import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE_TEMPLATES, SHARED_DEVICES, templateFontsHref } from '@/lib/site-templates.mjs';
import { TRADE_PRESETS } from '@/data/demo-os-trades';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE TEMPLATE GALLERY'S DATA (2026-08-24). The registry itself lives in code
 * (lib/site-templates.mjs) because a template is law the builder executes, not
 * a row someone edits in a form. This route adds what only the database knows:
 * how many sites wear each template, the last one built, and a few live
 * examples to open.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  type Usage = { count: number; lastAt: string | null; examples: { id: string; business: string; url: string; at: string }[] };
  const usage: Record<string, Usage> = {};
  for (const t of SITE_TEMPLATES) usage[t.key] = { count: 0, lastAt: null, examples: [] };

  try {
    const { data } = await sb
      .from('outbound_demo_sites')
      .select('id, business_name, site_template, built_at, status, lead_id')
      .not('site_template', 'is', null)
      .eq('status', 'ready')
      .order('built_at', { ascending: false })
      .limit(500);
    for (const r of data ?? []) {
      const u = usage[r.site_template as string];
      if (!u) continue;
      u.count += 1;
      if (!u.lastAt) u.lastAt = (r.built_at as string | null) ?? null;
      if (u.examples.length < 4) {
        u.examples.push({ id: r.id as string, business: r.business_name as string, url: `/demo/site/${r.id}`, at: (r.built_at as string | null) ?? '' });
      }
    }
  } catch { /* column not applied yet: the gallery still renders, with zero counts */ }

  const tradeLabel = (k: string) => (TRADE_PRESETS as Record<string, { label: string }>)[k]?.label ?? k;

  return NextResponse.json({
    shared: SHARED_DEVICES,
    templates: SITE_TEMPLATES.map((t) => ({
      ...t,
      fitsLabels: t.fits.map(tradeLabel),
      avoidLabels: t.avoidFor.map(tradeLabel),
      fontsHref: templateFontsHref(t),
      usage: usage[t.key],
    })),
  });
}
