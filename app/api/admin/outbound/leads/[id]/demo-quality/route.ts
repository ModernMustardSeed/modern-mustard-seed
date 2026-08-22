import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { judgeDemo } from '@/lib/demo-quality.mjs';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * IS THIS DEMO WORTH SENDING?
 *
 * Sarah, on the twenty two demos a one-shot engine built overnight: "i want the
 * option to rebuild in the contact so i can decide if its worth it by looking at
 * it." Opening twenty two demos and judging each by eye is not a workflow. The
 * verdict is computable from the html, so it rides next to the link instead.
 *
 * Read-only and cheap on purpose: it fetches one row, measures it, and returns a
 * badge. Nothing here queues, spends or changes anything.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: site, error } = await guard.supabase
    .from('outbound_demo_sites')
    .select('id, html, worker, status, built_at')
    .eq('lead_id', id)
    .eq('status', 'ready')
    .order('built_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!site?.html) return NextResponse.json({ ok: true, has: false });

  const q = judgeDemo(site.html, site.worker);
  return NextResponse.json({
    ok: true,
    has: true,
    verdict: q.verdict,
    label: q.label,
    reasons: q.reasons,
    distinct: q.distinct,
    images: q.images,
    kb: q.kb,
    fonts: q.fonts,
    hasProof: q.hasProof,
    keepPhotos: q.keepPhotos,
    engine: site.worker,
    builtAt: site.built_at,
  });
}
