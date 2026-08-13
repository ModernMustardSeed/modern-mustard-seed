import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { getAcqSettings, updateAcqSettings } from '@/lib/acq/settings';
import { runPreflight } from '@/lib/acq/preflight';
import { recordEvent } from '@/lib/acq/events';
import { queueCounts, reclaimStale } from '@/lib/acq/queue';

export const runtime = 'nodejs';

export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const [settings, preflight, counts] = await Promise.all([getAcqSettings(), runPreflight(), queueCounts()]);
  return NextResponse.json({ settings, preflight, counts });
}

/**
 * The safety controls. MASTER PAUSE is the one that matters: it stops outbound
 * email, scheduled follow-ups and new Mr. Mustard calls without touching queue
 * state, so resuming continues rather than restarting.
 */
export async function POST(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === 'reclaim') {
    const n = await reclaimStale(db, Number(body.minutes ?? 20));
    return NextResponse.json({ ok: true, reclaimed: n });
  }

  const patch: Record<string, unknown> = {};
  for (const k of ['master_paused', 'sourcing_enabled', 'enrichment_enabled', 'email_enabled', 'calls_enabled', 'followups_enabled', 'daily_sourcing_enabled']) {
    if (body[k] !== undefined) patch[k] = Boolean(body[k]);
  }
  for (const k of ['daily_sourcing_target', 'total_campaign_max', 'min_lead_score']) {
    if (body[k] !== undefined) patch[k] = Math.max(0, Number(body[k]));
  }
  if (body.daily_sourcing_split && typeof body.daily_sourcing_split === 'object') {
    patch.daily_sourcing_split = body.daily_sourcing_split;
  }
  if (body.master_paused === true) {
    patch.paused_reason = String(body.reason ?? 'Paused from Acquisition settings.');
  }
  if (body.master_paused === false) patch.paused_reason = null;

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  const settings = await updateAcqSettings(patch);
  if (body.master_paused !== undefined) {
    await recordEvent(db, {
      type: 'note',
      label: body.master_paused ? 'MASTER PAUSE engaged' : 'MASTER PAUSE released',
      detail: { reason: patch.paused_reason ?? null },
    });
  }
  return NextResponse.json({ ok: true, settings });
}
