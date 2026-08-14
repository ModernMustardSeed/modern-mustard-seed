import { NextResponse } from 'next/server';
import { requireAcqAdmin, enrollEligible } from '@/lib/acq/server';
import { getCampaign, getAcqSettings, updateAcqSettings, getVariants } from '@/lib/acq/settings';
import { runPreflight } from '@/lib/acq/preflight';
import { sequenceGaps } from '@/lib/acq/eligibility';
import { drainQueue } from '@/lib/acq/runner';
import { recordEvent } from '@/lib/acq/events';
import { queueCounts } from '@/lib/acq/queue';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const campaign = await getCampaign();
  if (!campaign) return NextResponse.json({ error: 'No campaign row. Apply migration 094.' }, { status: 500 });
  const [variants, counts, settings] = await Promise.all([getVariants(campaign.id), queueCounts(), getAcqSettings()]);
  return NextResponse.json({ campaign, variants, counts, settings });
}

/**
 * START / PAUSE / RESUME / STOP, plus enrolment and a manual drain.
 *
 * START is the only action that refuses to run: it checks preflight first, so
 * the campaign can never begin without a working sender, a postal address, a
 * readable suppression list and an unsubscribe path. Everything else is allowed
 * because everything else makes the machine quieter, not louder.
 */
export async function POST(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const campaign = await getCampaign();
  if (!campaign) return NextResponse.json({ error: 'No campaign row. Apply migration 094.' }, { status: 500 });

  const stamp = new Date().toISOString();

  switch (action) {
    case 'start': {
      const preflight = await runPreflight();
      const blockers = preflight.blockers.filter((b) => b.id !== 'paused');
      if (blockers.length) {
        return NextResponse.json(
          {
            error: `Outbound paused: ${blockers[0].label.toLowerCase()}.`,
            blockers,
          },
          { status: 409 },
        );
      }
      await db
        .from('acq_campaigns')
        .update({ status: 'live', started_at: campaign.started_at ?? stamp, paused_at: null, updated_at: stamp })
        .eq('id', campaign.id);
      await updateAcqSettings({ master_paused: false, paused_reason: null, email_enabled: true, calls_enabled: true, followups_enabled: true });
      await recordEvent(db, { campaignId: campaign.id, type: 'note', label: 'Campaign STARTED' });
      break;
    }
    case 'pause': {
      await db.from('acq_campaigns').update({ status: 'paused', paused_at: stamp, updated_at: stamp }).eq('id', campaign.id);
      await updateAcqSettings({ master_paused: true, paused_reason: String(body.reason ?? 'Paused from the Command Center.') });
      await recordEvent(db, { campaignId: campaign.id, type: 'note', label: 'Campaign PAUSED' });
      break;
    }
    case 'resume': {
      await db.from('acq_campaigns').update({ status: 'live', paused_at: null, updated_at: stamp }).eq('id', campaign.id);
      await updateAcqSettings({ master_paused: false, paused_reason: null });
      await recordEvent(db, { campaignId: campaign.id, type: 'note', label: 'Campaign RESUMED' });
      break;
    }
    case 'stop': {
      // Stop is not delete. Pending work stays exactly where it is so a restart
      // picks up rather than re-sending from the top.
      await db.from('acq_campaigns').update({ status: 'stopped', paused_at: stamp, updated_at: stamp }).eq('id', campaign.id);
      await updateAcqSettings({ master_paused: true, paused_reason: 'Campaign stopped from the Command Center.' });
      await recordEvent(db, { campaignId: campaign.id, type: 'note', label: 'Campaign STOPPED' });
      break;
    }
    case 'settings': {
      const patch: Record<string, unknown> = { updated_at: stamp };
      for (const k of [
        'daily_send_cap',
        'hourly_send_cap',
        'send_start_hour',
        'send_end_hour',
        'max_call_attempts',
        'goal_clients',
      ]) {
        if (body[k] !== undefined) patch[k] = Number(body[k]);
      }
      // The gaps between emails, one entry per gap. Run through sequenceGaps so
      // a hand-edited payload cannot set a zero-day gap and fire the remaining
      // sequence into one inbox in a single pass.
      if (Array.isArray(body.step_after_days)) {
        patch.step_after_days = sequenceGaps(body.step_after_days as number[]);
      }
      if (body.send_weekdays_only !== undefined) patch.send_weekdays_only = Boolean(body.send_weekdays_only);
      if (body.from_name) patch.from_name = String(body.from_name).slice(0, 120);
      await db.from('acq_campaigns').update(patch).eq('id', campaign.id);
      break;
    }
    case 'enroll': {
      const settings = await getAcqSettings();
      const report = await enrollEligible(db, campaign.id, {
        minScore: Number(body.minScore ?? settings.min_lead_score),
        trades: Array.isArray(body.trades) ? (body.trades as string[]) : undefined,
        dryRun: body.dryRun === true,
        queueFirstEmail: body.queue !== false,
        limit: body.limit ? Number(body.limit) : undefined,
      });
      return NextResponse.json({ ok: true, report });
    }
    case 'drain': {
      const report = await drainQueue({ limit: Number(body.limit ?? 25), worker: 'admin' });
      return NextResponse.json({ ok: true, report });
    }
    case 'variant': {
      const id = String(body.variantId ?? '');
      if (!id) return NextResponse.json({ error: 'variantId is required.' }, { status: 400 });
      const patch: Record<string, unknown> = {};
      if (body.subject !== undefined) patch.subject = String(body.subject).slice(0, 200);
      if (body.cta_label !== undefined) patch.cta_label = String(body.cta_label).slice(0, 80);
      if (body.active !== undefined) patch.active = Boolean(body.active);
      if (body.weight !== undefined) patch.weight = Math.max(0, Number(body.weight));
      await db.from('acq_variants').update(patch).eq('id', id);
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const fresh = await getCampaign();
  return NextResponse.json({ ok: true, campaign: fresh, settings: await getAcqSettings() });
}
