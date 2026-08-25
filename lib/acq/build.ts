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

      // The audit is the fifth door and the only one that is about THEM. It
      // runs before the suite email is queued so the mail can carry the score,
      // and it is fail-soft by construction: a suite with four doors is a good
      // day, a build that died grading somebody's website is a lost customer.
      await ensurePresenceAudit(db, row as unknown as Record<string, unknown>);
      const { data: withAudit } = await db.from('outbound_leads').select('*').eq('id', row.id).single();
      if (withAudit) row = withAudit as OutboundLead;

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
