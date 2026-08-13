import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { getAcqSettings, gate } from '@/lib/acq/settings';
import { MARKETS } from '@/lib/acq/markets';

export const runtime = 'nodejs';

/**
 * FIND MORE PROSPECTS.
 *
 * The route only opens a run row; the work is done by the local worker
 * (`npx tsx scripts/acq-source.mts --watch`), for the same reason the demo-site
 * forge runs locally: a run that reads nine hundred company websites and drives
 * a real browser cannot live inside a sixty second serverless invocation.
 *
 * Progress is written back to the run row every market, so this screen shows the
 * genuine count rather than a spinner.
 */
export async function GET(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const url = new URL(req.url);
  const runId = url.searchParams.get('run');

  if (runId) {
    const { data } = await db.from('acq_sourcing_runs').select('*').eq('id', runId).maybeSingle();
    return NextResponse.json({ run: data ?? null });
  }

  const { data: runs } = await db
    .from('acq_sourcing_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const { count: sourced } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'acq-lead-finder');

  return NextResponse.json({
    runs: runs ?? [],
    sourcedTotal: sourced ?? 0,
    markets: MARKETS.map((m) => ({ key: m.key, label: `${m.city}, ${m.state}`, tier: m.tier })),
    workerCommand: 'npx tsx scripts/acq-source.mts --watch',
  });
}

export async function POST(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const settings = await getAcqSettings();
  const allowed = gate(settings, 'sourcing');
  if (!allowed.allowed) return NextResponse.json({ error: allowed.reason }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === 'cancel') {
    const id = String(body.runId ?? '');
    if (!id) return NextResponse.json({ error: 'runId is required.' }, { status: 400 });
    await db.from('acq_sourcing_runs').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', id).in('status', ['queued', 'running']);
    return NextResponse.json({ ok: true });
  }

  const industry = String(body.industry ?? 'all');
  const count = Math.max(10, Math.min(2000, Number(body.count ?? 100)));
  const split =
    industry === 'all'
      ? { hvac: Math.round(count * 0.4), plumbing: Math.round(count * 0.3), roofing: Math.round(count * 0.3) }
      : { hvac: 0, plumbing: 0, roofing: 0, [industry]: count };

  const params = {
    targets: split,
    tier: Math.min(3, Math.max(1, Number(body.tier ?? 3))),
    markets: Array.isArray(body.markets) && body.markets.length ? (body.markets as string[]) : undefined,
    requireEmail: body.requireEmail !== false,
    minScore: Number(body.minScore ?? 0),
    minReviews: Number(body.minReviews ?? 0),
    excludeChains: body.excludeChains !== false,
    excludeExisting: true,
  };

  const total = (split.hvac ?? 0) + (split.plumbing ?? 0) + (split.roofing ?? 0);
  const { data, error } = await db
    .from('acq_sourcing_runs')
    .insert({
      label: `${total} leads · ${split.hvac ?? 0} HVAC / ${split.plumbing ?? 0} plumbing / ${split.roofing ?? 0} roofing`,
      params,
      target: total,
      status: 'queued',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, run: data });
}
