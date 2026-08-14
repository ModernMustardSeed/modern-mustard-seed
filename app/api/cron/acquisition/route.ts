import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { drainQueue } from '@/lib/acq/runner';
import { getAcqSettings, getCampaign } from '@/lib/acq/settings';
import { enqueue } from '@/lib/acq/queue';
import { dueForStep, sequenceLength } from '@/lib/acq/eligibility';
import { replenishReservoir } from '@/lib/acq/reservoir';
import { recordEvent } from '@/lib/acq/events';
import { rampSender } from '@/lib/acq/governor';
import type { AcqProspect } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * THE HEARTBEAT of the acquisition engine.
 *
 * Two jobs, in this order:
 *   1. SWEEP. Find eligible prospects whose next email is due and schedule it.
 *      The sequence normally schedules itself forward as each email sends, so
 *      this is the safety net that catches anything a failed job dropped.
 *   2. DRAIN. Do the work that is due, inside the pace and the caps.
 *
 * Everything it touches is idempotent, so a Vercel retry, an overlapping run,
 * or Sarah pressing "run now" at the same moment cannot double-send.
 * Master pause short-circuits the whole thing before a single message moves.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const settings = await getAcqSettings();
  if (settings.master_paused) {
    return NextResponse.json({ ok: true, held: settings.paused_reason ?? 'Acquisition is paused.', swept: 0, drained: null });
  }

  const campaign = await getCampaign();
  if (!campaign || campaign.status !== 'live') {
    return NextResponse.json({ ok: true, held: `Campaign is ${campaign?.status ?? 'missing'}.`, swept: 0, drained: null });
  }

  /* ── 1. sweep ── */

  let swept = 0;
  const now = new Date();
  const { data: candidates } = await db
    .from('outbound_leads')
    .select('id,acq_stage,email_stage,last_campaign_email_at,consent_status,reply_at,acq_eligible,unsubscribed_at,client_status')
    .eq('acq_campaign_id', campaign.id)
    .eq('acq_eligible', true)
    // The sequence length is configured, not fixed at three. Reading it from
    // the campaign means adding a sixth email does not silently leave every
    // prospect stranded after the fifth because this filter never heard of it.
    .lt('email_stage', sequenceLength(campaign.step_after_days))
    .is('unsubscribed_at', null)
    .order('last_campaign_email_at', { ascending: true, nullsFirst: true })
    .limit(500);

  for (const row of ((candidates ?? []) as unknown as AcqProspect[])) {
    if (row.client_status === 'client') continue;
    const step = dueForStep(row, now, campaign.step_after_days);
    if (!step) continue;
    const res = await enqueue(db, { kind: 'email', leadId: row.id, campaignId: campaign.id, step });
    if (res.ok && res.created) swept++;
  }

  /* ── 1b. keep the reservoir graded ──
     Promotion is what turns discovered prospects into mailable inventory, and
     nothing did it: 781 graded prospects sat at `discovered` while the
     bottleneck engine reported inventory as the constraint. Runs every pass,
     before sourcing, because promoting what we already have is free and
     sourcing more is not. */
  let reservoir: { promoted: number; demoted: number; ready: number; shortfall: number } | null = null;
  try {
    const r = await replenishReservoir(db);
    reservoir = { promoted: r.promoted, demoted: r.demoted, ready: r.readyAfter, shortfall: r.shortfall };
  } catch (err) {
    console.error('cron/acquisition: reservoir replenish failed', err);
  }

  /* ── 2. daily sourcing, if Sarah turned it on ── */

  let sourcingRun: string | null = null;
  if (settings.daily_sourcing_enabled && settings.sourcing_enabled) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date());
    const { data: already } = await db
      .from('acq_sourcing_runs')
      .select('id')
      .gte('created_at', `${today}T00:00:00Z`)
      .in('status', ['queued', 'running', 'done'])
      .limit(1);

    // One run a day, and only under the total campaign ceiling. Uncontrolled
    // sourcing is how a prospect list becomes a liability.
    const { count: total } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).not('acq_campaign_id', 'is', null);
    if (!(already ?? []).length && (total ?? 0) < settings.total_campaign_max) {
      const split = settings.daily_sourcing_split ?? { hvac: 40, plumbing: 30, roofing: 30 };
      const scale = settings.daily_sourcing_target / Math.max(1, Object.values(split).reduce((s, n) => s + Number(n), 0));
      const targets = Object.fromEntries(Object.entries(split).map(([k, v]) => [k, Math.round(Number(v) * scale)]));
      const { data: run } = await db
        .from('acq_sourcing_runs')
        .insert({
          label: `Daily sourcing: ${settings.daily_sourcing_target} prospects`,
          params: { targets, tier: 3, requireEmail: true, minScore: settings.min_lead_score, daily: true },
          target: settings.daily_sourcing_target,
          status: 'queued',
        })
        .select('id')
        .single();
      sourcingRun = (run?.id as string) ?? null;
    }
  }

  /* ── 3. the ramp ── */

  // Evaluated every tick and acted on rarely: up needs a full clean day at the
  // current allowance, down needs only one bad signal. The asymmetry is the
  // whole design.
  const ramp = await rampSender(db);
  if (ramp.changed) {
    await recordEvent(db, {
      campaignId: campaign.id,
      type: 'note',
      label: `Sender allowance ${ramp.to > ramp.from ? 'raised' : 'lowered'} from ${ramp.from} to ${ramp.to} (${ramp.state})`,
      detail: { reason: ramp.reason },
    });
  }

  /* ── 4. drain ── */

  const drained = await drainQueue({ limit: 40, worker: 'cron' });

  if (drained.failed > 0) {
    await recordEvent(db, {
      campaignId: campaign.id,
      type: 'note',
      label: `${drained.failed} acquisition job${drained.failed === 1 ? '' : 's'} failed permanently`,
      detail: { detail: drained.detail.filter((d) => d.outcome === 'failed') },
    });
  }

  return NextResponse.json({ ok: true, swept, reservoir, sourcingRun, ramp, drained });
}
