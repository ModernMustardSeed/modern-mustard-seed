import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { drainQueue } from '@/lib/acq/runner';
import { getAcqSettings, getCampaign } from '@/lib/acq/settings';
import { enqueue } from '@/lib/acq/queue';
import { dueForStep } from '@/lib/acq/eligibility';
import { recordEvent } from '@/lib/acq/events';
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
    .lt('email_stage', 3)
    .is('unsubscribed_at', null)
    .order('last_campaign_email_at', { ascending: true, nullsFirst: true })
    .limit(500);

  for (const row of ((candidates ?? []) as unknown as AcqProspect[])) {
    if (row.client_status === 'client') continue;
    const step = dueForStep(row, now, campaign.step2_after_days, campaign.step3_after_days);
    if (!step) continue;
    const res = await enqueue(db, { kind: 'email', leadId: row.id, campaignId: campaign.id, step });
    if (res.ok && res.created) swept++;
  }

  /* ── 2. drain ── */

  const drained = await drainQueue({ limit: 40, worker: 'cron' });

  if (drained.failed > 0) {
    await recordEvent(db, {
      campaignId: campaign.id,
      type: 'note',
      label: `${drained.failed} acquisition job${drained.failed === 1 ? '' : 's'} failed permanently`,
      detail: { detail: drained.detail.filter((d) => d.outcome === 'failed') },
    });
  }

  return NextResponse.json({ ok: true, swept, drained });
}
