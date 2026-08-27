/**
 * BUILD THE PROSPECT'S OWN AGENT.
 *
 * The Build already exists and is good, so this adds nothing to it. What it does
 * is bind the build to a prospect we ALREADY have a row for, instead of the
 * self-serve path (lib/voice-build-suite.ts) which inserts a fresh lead because
 * a stranger just walked in off the phone line.
 *
 * That distinction matters: the acquisition lead already carries its email
 * provenance, its score, its consent record and its timeline. Inserting a second
 * row for the same business would fork the story in half.
 *
 * The web demo is the deliverable. No phone number is provisioned for a
 * prospect: one excellent Mr. Mustard call proves the technology, and the
 * personalized demo they can poke at whenever they want is what closes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import { buildLeadVoiceDemo, ensureDemoHub } from '@/lib/outbound-demo';
import type { OutboundLead } from '@/lib/outbound';
import { SITE } from '@/lib/seo';
import { recordEvent } from '@/lib/acq/events';
import { enqueue } from '@/lib/acq/queue';
import { ensurePresenceAudit } from '@/lib/presence-audit';
import type { AcqProspect } from '@/lib/acq/types';

/** His own ceiling. A phone line that can spawn builds is a wallet with a
 *  public number, so the cap is not optional and it fails closed. */
const DAILY_CAP = 25;

export type BuildProspectResult =
  | { ok: true; existing: boolean; demoUrl: string; hubUrl: string | null }
  | { ok: false; error: string; retryable: boolean };

export type BuildContext = {
  services?: string | null;
  serviceArea?: string | null;
  hours?: string | null;
  pain?: string | null;
  preferences?: string | null;
  tradeInTheirWords?: string | null;
};

/** Fold what the owner said on the call into the notes the Build reads. */
export function foldCallContext(lead: AcqProspect, ctx: BuildContext): string {
  const lines = [
    lead.notes?.trim() || null,
    'BUILT FROM A MR. MUSTARD ACQUISITION CALL.',
    ctx.tradeInTheirWords ? `TRADE (their words): ${ctx.tradeInTheirWords}` : null,
    ctx.services ? `SERVICES (their words): ${ctx.services}` : null,
    ctx.serviceArea ? `SERVICE AREA: ${ctx.serviceArea}` : null,
    ctx.hours ? `HOURS AND AFTER-HOURS: ${ctx.hours}` : null,
    ctx.pain ? `THE CALL THEY HATE TO MISS: ${ctx.pain}` : null,
    ctx.preferences ? `WHAT THEY ASKED FOR: ${ctx.preferences}` : null,
  ].filter(Boolean);
  return lines.join('\n').slice(0, 6000);
}

async function claimDailySlot(db: SupabaseClient): Promise<boolean> {
  const { data, error } = await db.rpc('claim_forge_slot', {
    p_key: `acqbuild:day:${new Date().toISOString().slice(0, 10)}`,
    p_cap: DAILY_CAP,
  });
  if (error) {
    console.error('acq build cap claim failed:', error.message);
    return false;
  }
  return data === true;
}

/**
 * Build this prospect's personalized voice agent demo.
 *
 * Fast path only: the voice agent and the command center are minted inline
 * because they are instant, and the website (which runs through the local
 * headless builder and takes 20 to 40 minutes) is queued behind them. A tool
 * that blocks a live phone call for fifteen seconds is dead air, so anything
 * slow runs in `after()`.
 */
export async function buildProspectAgent(
  db: SupabaseClient,
  lead: AcqProspect,
  ctx: BuildContext = {},
  opts: { queueSite?: boolean; deferHeavy?: boolean } = {},
): Promise<BuildProspectResult> {
  if (lead.demo_url) {
    await recordEvent(db, {
      leadId: lead.id,
      type: 'forge_completed',
      label: 'Their agent was already built; reusing it',
      detail: { demoUrl: lead.demo_url, existing: true },
    });
    return { ok: true, existing: true, demoUrl: lead.demo_url, hubUrl: lead.hub_demo_url };
  }

  if (!(await claimDailySlot(db))) {
    return {
      ok: false,
      retryable: true,
      error: 'The build is at capacity for today. Take their details and tell them it gets built first thing.',
    };
  }

  const notes = foldCallContext(lead, ctx);
  await db
    .from('outbound_leads')
    .update({ notes, demo_status: 'forging', acq_stage: 'forged', last_researched_at: new Date().toISOString() })
    .eq('id', lead.id);

  await recordEvent(db, { leadId: lead.id, type: 'forge_started', label: 'Build started', detail: { ctx } });

  const { data: fresh } = await db.from('outbound_leads').select('*').eq('id', lead.id).single();
  let row = (fresh ?? lead) as unknown as OutboundLead;

  const voice = await buildLeadVoiceDemo(db, row);
  if (!voice.ok) {
    await db.from('outbound_leads').update({ demo_status: 'failed' }).eq('id', lead.id);
    await recordEvent(db, {
      leadId: lead.id,
      type: 'forge_failed',
      label: 'The voice build failed',
      detail: { error: voice.error },
    });
    return { ok: false, retryable: true, error: voice.error || 'The build misfired.' };
  }
  row = voice.lead;

  const finish = async () => {
    try {
      // THE COMMAND CENTER IS NOT BUILT HERE ANY MORE (Sarah, 2026-08-22).
      // It used to be minted with every voice agent because it rode free with
      // the pair. It is now sold on its own, built by hand, and scoped with the
      // client first, so a build that quietly produced one was promising a
      // thing we are not ready to ship at this quality. Sarah still makes them
      // from the cockpit; nothing automatic does.
      row = await ensureDemoHub(db, row);

      /*
       * THE BUILD IS FINISHED HERE, BEFORE ANYTHING SLOW RUNS (2026-08-27).
       *
       * These three writes used to sit BELOW the presence audit, which waits up
       * to 85 seconds on the LLM. This runs inside a route capped at 60
       * (app/api/admin/acquisition/prospects/[id]/route.ts), so a slow audit got
       * the whole function killed mid-wait and none of this ever ran: the lead
       * stayed at demo_status 'forging' forever, no forge_completed landed, and
       * the demo email was never queued. The catch below could not save it
       * either, because the process was gone rather than throwing.
       *
       * It cost us Lyons Roofing: a 100/100 lead who clicked "the free build",
       * got a working voice agent built for him on 2026-08-26, and was never
       * sent it. His audit came back at 97 seconds. Nothing anywhere said so.
       *
       * So the state and the mail go first and the audit goes last. The mail job
       * re-reads the lead when it sends (lib/acq/runner.ts runDemoEmailJob), so
       * an audit that lands before the queue ticks still rides along in the
       * email. One that is slow, or dies, now costs a score rather than a sale.
       */
      await db
        .from('outbound_leads')
        .update({ demo_status: 'ready', acq_stage: 'forged' })
        .eq('id', row.id);

      await recordEvent(db, {
        leadId: row.id,
        type: 'forge_completed',
        label: 'Their personalized agent is live',
        detail: { demoUrl: row.demo_url, hubUrl: row.hub_demo_url },
      });

      // Mail it. Queued rather than sent inline so a retry cannot double-send.
      await enqueue(db, {
        kind: 'demo_email',
        leadId: row.id,
        campaignId: lead.acq_campaign_id,
        step: 0,
        payload: { demoUrl: row.hub_demo_url || row.demo_url },
      });

      // The audit is the fifth door and the only one that is about THEM. It is
      // fail-soft by construction: a suite with four doors is a good day, and a
      // build that died grading somebody's website is a lost customer.
      await ensurePresenceAudit(db, row as unknown as Record<string, unknown>);
      const { data: withAudit } = await db.from('outbound_leads').select('*').eq('id', row.id).single();
      if (withAudit) row = withAudit as OutboundLead;
    } catch (err) {
      console.error('acq build finish failed', err);
      await recordEvent(db, {
        leadId: row.id,
        type: 'forge_failed',
        label: 'The build finished the voice agent but stumbled after it',
        detail: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  };

  if (opts.deferHeavy) after(finish);
  else await finish();

  return {
    ok: true,
    existing: false,
    demoUrl: voice.demoUrl || row.demo_url || '',
    hubUrl: row.hub_demo_url,
  };
}

/**
 * THE BACKSTOP: A BUILD THAT FINISHED BUT NEVER SAID SO.
 *
 * The reorder above stops the known cause. This catches every other one. If a
 * lead holds a live voice agent and has been sitting at demo_status 'forging'
 * for a quarter of an hour, the build is not in flight, it is stranded: the
 * process that would have flipped it died, was redeployed under, or timed out
 * somewhere new. That is a finished demo nobody will ever be sent.
 *
 * Runs on every queue drain, next to reclaimStale, because a stalled build is
 * exactly the same class of problem as a stalled job. Only ever moves a lead
 * FORWARD, never re-mails one that already went (`demo_emailed_at`), and the
 * enqueue is idempotent, so a repeat pass costs one insert that fails on its
 * unique key.
 */
export async function rescueStalledBuilds(db: SupabaseClient, olderThanMs = 15 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { data } = await db
    .from('outbound_leads')
    .select('id,business_name,demo_url,hub_demo_url,acq_campaign_id,updated_at')
    .eq('demo_status', 'forging')
    .is('demo_emailed_at', null)
    .lt('updated_at', cutoff)
    .limit(50);

  let rescued = 0;
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = String(row.id);
    const hubUrl = (row.hub_demo_url as string | null) ?? null;
    const demoUrl = (row.demo_url as string | null) ?? null;
    // No agent means the build really did die before it made anything. That is
    // a failure to retry, not a completion to announce, so leave it alone.
    if (!hubUrl && !demoUrl) continue;

    await db.from('outbound_leads').update({ demo_status: 'ready', acq_stage: 'forged' }).eq('id', id);
    await recordEvent(db, {
      leadId: id,
      type: 'forge_completed',
      label: 'Their personalized agent is live (recovered: the build stalled before it could say so)',
      detail: { demoUrl, hubUrl, recovered: true, stalledSince: row.updated_at },
    });
    await enqueue(db, {
      kind: 'demo_email',
      leadId: id,
      campaignId: (row.acq_campaign_id as string | null) ?? null,
      step: 0,
      payload: { demoUrl: hubUrl || demoUrl },
    });
    rescued += 1;
  }
  return rescued;
}
