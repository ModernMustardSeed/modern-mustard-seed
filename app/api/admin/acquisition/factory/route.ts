import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { clientFactoryReport } from '@/lib/acq/factory';
import { computeSenderHealth } from '@/lib/acq/sender-health';
import { getCampaign } from '@/lib/acq/settings';
import { CLIENT_MILESTONES, MRR_MILESTONES_CENTS } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** The Client Factory in one payload: the north star, the ladder, the path, the
 *  bottleneck, the reservoir, and the sender that gates all of it. */
export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;

  const [report, health] = await Promise.all([clientFactoryReport(), computeSenderHealth(g.db)]);
  return NextResponse.json({
    ...report,
    health,
    milestones: { clients: CLIENT_MILESTONES, mrrCents: MRR_MILESTONES_CENTS },
  });
}

/** Move the goal. A milestone is a milestone, so this is expected to change. */
export async function POST(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const campaign = await getCampaign();
  if (!campaign) return NextResponse.json({ error: 'No campaign.' }, { status: 500 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.goal_clients !== undefined) patch.goal_clients = Math.max(1, Number(body.goal_clients));
  if (body.goal_mrr_cents !== undefined) patch.goal_mrr_cents = Math.max(0, Number(body.goal_mrr_cents));
  if (body.goal_revenue_cents !== undefined) patch.goal_revenue_cents = Math.max(0, Number(body.goal_revenue_cents));
  if (body.goal_horizon_months !== undefined) patch.goal_horizon_months = Math.max(1, Math.min(60, Number(body.goal_horizon_months)));
  if (body.monthly_client_target_min !== undefined) patch.monthly_client_target_min = Math.max(1, Number(body.monthly_client_target_min));
  if (body.monthly_client_target_stretch !== undefined) patch.monthly_client_target_stretch = Math.max(1, Number(body.monthly_client_target_stretch));
  if (body.goal_started_on) patch.goal_started_on = String(body.goal_started_on).slice(0, 10);

  if (Object.keys(patch).length === 1) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  await db.from('acq_campaigns').update(patch).eq('id', campaign.id);
  return NextResponse.json({ ok: true, ...(await clientFactoryReport()) });
}
