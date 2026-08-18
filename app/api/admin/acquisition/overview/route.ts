import { NextResponse } from 'next/server';
import { requireAcqAdmin, priorityQueues } from '@/lib/acq/server';
import { computeStats } from '@/lib/acq/stats';
import { runPreflight } from '@/lib/acq/preflight';
import { getAcqSettings, getCampaign } from '@/lib/acq/settings';
import { queueCounts } from '@/lib/acq/queue';
import { estimateDrain, checkPace } from '@/lib/acq/send';
import { recentEvents } from '@/lib/acq/events';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** One fetch for the whole Command Center. Everything Sarah needs to decide
 *  whether to press START, and everything she needs after she has. */
export async function GET() {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const campaign = await getCampaign();
  const settings = await getAcqSettings();

  const [stats, preflight, queues, counts, events] = await Promise.all([
    computeStats(campaign?.id ?? null, campaign?.goal_clients ?? 50),
    runPreflight(),
    priorityQueues(db),
    queueCounts('email'),
    recentEvents(40),
  ]);

  const pace = campaign ? await checkPace(db, campaign) : null;

  // A feed line without a name is a fact about nobody. Attach who did it.
  const eventLeadIds = [...new Set(events.map((e) => e.lead_id).filter(Boolean))] as string[];
  const { data: eventLeads } = eventLeadIds.length
    ? await db.from('outbound_leads').select('id,business_name,city,state').in('id', eventLeadIds)
    : { data: [] };
  const nameById = new Map(((eventLeads ?? []) as { id: string; business_name: string; city: string | null; state: string | null }[]).map((l) => [l.id, l]));
  const namedEvents = events.map((e) => {
    const l = e.lead_id ? nameById.get(e.lead_id) : null;
    return { ...e, business_name: l?.business_name ?? null, city: l?.city ?? null, state: l?.state ?? null };
  });

  return NextResponse.json({
    campaign,
    settings,
    stats,
    preflight,
    queues,
    emailQueue: {
      ...counts,
      estimate: campaign ? estimateDrain(counts.pending, campaign) : 'No campaign.',
      pace: pace?.ok
        ? { sending: true, remainingToday: pace.remainingToday, remainingThisHour: pace.remainingThisHour }
        : { sending: false, reason: pace?.reason ?? 'No campaign.', retryAfter: pace && !pace.ok ? pace.retryAfter : null },
    },
    events: namedEvents,
  });
}
