import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { computeIntelligence, computeStats } from '@/lib/acq/stats';
import { getCampaign, getVariants } from '@/lib/acq/settings';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Which category, which city, which subject line, and how many conversations
 *  it currently takes to make one sale. All from observed data, never a guess. */
export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;

  const campaign = await getCampaign();
  const [intel, stats, variants] = await Promise.all([
    computeIntelligence(campaign?.id ?? null),
    computeStats(campaign?.id ?? null, campaign?.goal_clients ?? 50),
    campaign ? getVariants(campaign.id) : Promise.resolve([]),
  ]);

  return NextResponse.json({ campaign, intel, stats, variants });
}
