/**
 * MR. MUSTARD'S ACQUISITION TOOLBELT.
 *
 * The handlers behind the tools that only exist on an acquisition call
 * (lib/acq/call.ts appends them per call). They are separated from
 * app/api/voice/route.ts so the studio phone line's own tools stay exactly as
 * they were: nothing here can change how he answers (406) 312-1223.
 *
 * Every handler returns the shape Vapi expects, and every one of them ends in
 * an `instruction` field written for him to act on rather than read aloud.
 * When a tool fails, the instruction tells him what to say instead of leaving
 * him improvising over a silent failure.
 */

import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';
import { enqueue, cancelPendingFor } from '@/lib/acq/queue';
import { foldCallContext } from '@/lib/acq/build';
import { buildProspectSuite } from '@/lib/acq/suite';
import { getCampaign } from '@/lib/acq/settings';
import { revokeConsent } from '@/lib/acq/consent';
import { sendDemoEmail, sendSuiteEmail, sendCheckoutLink } from '@/lib/acq/send';
import { OFFER } from '@/lib/acq/types';
import type { AcqProspect, CallIntel } from '@/lib/acq/types';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { resendClient } from '@/lib/send-email';
import { clientEmail, p, escape } from '@/lib/email';
import { shortBusiness } from '@/lib/acq/campaign';
import { SITE } from '@/lib/seo';

export type AcqCallContext = {
  leadId: string;
  acqCallId: string | null;
  campaignId: string | null;
  business: string | null;
};

/** Pull the acquisition context off the Vapi call metadata, or null. */
export function acqContext(meta: Record<string, unknown>): AcqCallContext | null {
  if (meta.acq !== true || typeof meta.leadId !== 'string') return null;
  return {
    leadId: meta.leadId,
    acqCallId: typeof meta.acqCallId === 'string' ? meta.acqCallId : null,
    campaignId: typeof meta.campaignId === 'string' ? meta.campaignId : null,
    business: typeof meta.business === 'string' ? meta.business : null,
  };
}

const say = (payload: Record<string, unknown>) => JSON.stringify(payload);

async function loadLead(db: SupabaseClient, id: string): Promise<AcqProspect | null> {
  const { data } = await db.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  return (data as AcqProspect) ?? null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ───────────────────────── forge_prospect_agent ─────────────────────────── */

export async function handleBuildProspectAgent(
  ctx: AcqCallContext,
  args: Record<string, unknown>,
): Promise<string> {
  const db = getSupabase();
  if (!db) return say({ ok: false, instruction: 'The build is unreachable. Offer to have Sarah build it and send it over instead.' });

  const lead = await loadLead(db, ctx.leadId);
  if (!lead) return say({ ok: false, instruction: 'Something is wrong on our side. Take their email out loud and promise Sarah will follow up today.' });

  const email = String(args.email ?? lead.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return say({
      ok: false,
      instruction: 'Do not apologize. Ask for the best email, have them spell it, read it back character by character, then call this tool again.',
    });
  }

  if (lead.demo_status === 'ready' && (lead.hub_demo_url || lead.demo_url)) {
    return say({
      ok: true,
      existing: true,
      instruction: `Theirs is already built. Tell them it is waiting, and call email_prospect_demo to send it to ${email} right now.`,
    });
  }
  if (lead.demo_status === 'forging') {
    return say({
      ok: true,
      instruction: 'It is already building from a minute ago. Tell them it is on the way to their inbox and do not fire it again.',
    });
  }

  await db.from('outbound_leads').update({ email, demo_status: 'requested', acq_stage: 'demoed' }).eq('id', lead.id);
  await recordEvent(db, {
    leadId: lead.id,
    campaignId: ctx.campaignId,
    type: 'forge_requested',
    label: 'They asked Mr. Mustard to build theirs',
    detail: { email, ...args },
  });

  const context = {
    tradeInTheirWords: str(args.trade),
    services: str(args.services),
    serviceArea: str(args.service_area),
    hours: str(args.hours),
    pain: str(args.pain),
    preferences: str(args.preferences),
  };

  // Answer Vapi NOW. A tool that blocks fifteen seconds is dead air on a live
  // call, and the whole build runs behind the response.
  after(async () => {
    const fresh = await loadLead(db, ctx.leadId);
    if (!fresh) return;

    // THEIR OWN WORDS GO ON THE ROW FIRST.
    //
    // The voice agent's script, the command center and the website brief all
    // read `notes`, so a build that starts before this lands builds from what we
    // guessed off a Google listing instead of what the owner just said out loud
    // thirty seconds ago. This is the single most valuable thing on the call.
    const notes = foldCallContext({ ...fresh, email } as AcqProspect, context);
    await db.from('outbound_leads').update({ notes, email, demo_status: 'forging' }).eq('id', ctx.leadId);
    const { data: ready } = await db.from('outbound_leads').select('*').eq('id', ctx.leadId).single();

    // The WHOLE suite, website included (Sarah, 2026-08-22). Somebody who says
    // yes on the phone used to end up with less than somebody Sarah built from
    // the board without ever speaking to them, which is backwards: the caller is
    // the warmest lead in the building and they just told us about their own
    // business for four minutes.
    const result = await buildProspectSuite(db, (ready ?? { ...fresh, email }) as AcqProspect, {
      site: true,
      by: 'mr-mustard',
      capped: 'phone',
      // He said the words "it lands at your email shortly" on a live call.
      mailWhenReady: true,
    });
    if (!result.ok) {
      await db.from('outbound_leads').update({ demo_status: 'failed' }).eq('id', ctx.leadId);
      await recordEvent(db, {
        leadId: ctx.leadId,
        campaignId: ctx.campaignId,
        type: 'forge_failed',
        label: 'The build failed after the call',
        detail: { error: result.error },
      });
      // A failed build is a promise we made out loud, so it becomes Sarah's problem.
      await db.from('outbound_leads').update({ needs_human: 'Build failed after Mr. Mustard promised it on the call.' }).eq('id', ctx.leadId);
    }
  });

  return say({
    ok: true,
    instruction:
      `The build is running. Tell them in your own words: you are building the ${ctx.business ?? 'their'} version right now, ` +
      `and it is not just the phone agent, it is a whole website for them as well, designed from scratch off what they just told you. ` +
      `The agent lands at ${email} within minutes and they can call it and try to break it as many times as they like. ` +
      `The website takes longer, up to an hour, because a person's worth of work goes into it, and it turns up on the same page when it is done. ` +
      `It is all free and there is no card. ` +
      `Then ask if they want you to email it as soon as it is ready, and if they say yes call email_prospect_demo.`,
  });
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim().slice(0, 600) : '';
  return s || null;
}

/* ────────────────────────── email_prospect_demo ─────────────────────────── */

export async function handleEmailProspectDemo(ctx: AcqCallContext, args: Record<string, unknown>): Promise<string> {
  const db = getSupabase();
  const campaign = await getCampaign();
  if (!db || !campaign) return say({ ok: false, instruction: 'Email is down. Give them sarah@modernmustardseed.com and move on.' });

  const lead = await loadLead(db, ctx.leadId);
  if (!lead) return say({ ok: false, instruction: 'Take their email out loud and tell them Sarah will send it today.' });

  const email = String(args.email ?? lead.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return say({ ok: false, instruction: 'Ask them to spell the email, read it back, then call this again.' });
  }
  if (email !== lead.email) await db.from('outbound_leads').update({ email }).eq('id', lead.id);

  if (lead.demo_emailed_at) {
    return say({ ok: true, instruction: `It already went to ${email}. Tell them to look for it and to check spam if it is not there.` });
  }
  if (!lead.hub_demo_url && !lead.demo_url) {
    // Queue it so the moment the build lands, the email goes. Idempotent.
    await enqueue(db, { kind: 'demo_email', leadId: lead.id, campaignId: campaign.id, step: 0 });
    return say({
      ok: true,
      pending: true,
      instruction: `It is still building. Tell them it lands at ${email} shortly and that the email sends itself the moment it is ready. Do not call this tool again.`,
    });
  }

  // The suite email when there is a suite, his receptionist email when there is
  // only a receptionist. Same rule the queue runs on, so the two paths cannot
  // send different things about the same build.
  const hasMoreThanVoice = Boolean(lead.os_demo_url) || (lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url));
  const sent = hasMoreThanVoice && lead.hub_demo_url
    ? await sendSuiteEmail(db, campaign, { ...lead, email } as AcqProspect)
    : await sendDemoEmail(db, campaign, { ...lead, email } as AcqProspect);
  if (!sent.ok) {
    await enqueue(db, { kind: 'demo_email', leadId: lead.id, campaignId: campaign.id, step: 0 });
    return say({ ok: false, instruction: `The send did not go through, but it is queued and will land at ${email}. Say that plainly and offer sarah@modernmustardseed.com as a backup.` });
  }
  return say({
    ok: true,
    instruction: `Sent to ${email} just now, from sarah@modernmustardseed.com. Tell them it is in their inbox, to check spam if not, and that the link inside also has the activation button and Sarah's calendar.`,
  });
}

/* ─────────────────────────── send_checkout_link ─────────────────────────── */

export async function handleSendCheckoutLink(ctx: AcqCallContext, args: Record<string, unknown>): Promise<string> {
  const db = getSupabase();
  const campaign = await getCampaign();
  if (!db || !campaign) return say({ ok: false, instruction: 'Checkout is unavailable. Offer to book them with Sarah instead.' });

  const lead = await loadLead(db, ctx.leadId);
  if (!lead) return say({ ok: false, instruction: 'Offer to book them with Sarah instead.' });

  const email = String(args.email ?? lead.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return say({ ok: false, instruction: 'Confirm the email by spelling it back, then call this again.' });
  if (email !== lead.email) await db.from('outbound_leads').update({ email }).eq('id', lead.id);

  const sent = await sendCheckoutLink(db, campaign, { ...lead, email } as AcqProspect, str(args.note) ?? undefined);
  if (!sent.ok) {
    await enqueue(db, { kind: 'checkout', leadId: lead.id, campaignId: campaign.id, step: 0, payload: { note: str(args.note) } });
    return say({ ok: false, instruction: `The link did not send but it is queued for ${email}. Say so, and offer to have Sarah call them.` });
  }
  return say({
    ok: true,
    instruction: `The activation link is in their inbox at ${email}. Confirm the price out loud once, plainly: ${OFFER.line}, month to month, cancel any time, and their number does not change. Then ask if they want Sarah to walk the setup with them.`,
  });
}

/* ──────────────────────────── log_call_outcome ──────────────────────────── */

export async function handleLogCallOutcome(ctx: AcqCallContext, args: Record<string, unknown>): Promise<string> {
  const db = getSupabase();
  if (!db) return say({ ok: true, instruction: 'Noted. Wrap the call up warmly.' });

  const intel: CallIntel = {
    pain_point: str(args.pain_point),
    company_size: str(args.company_size),
    current_phone_workflow: str(args.current_phone_workflow),
    missed_call_problem: str(args.missed_call_problem),
    after_hours_need: str(args.after_hours_need),
    objection: str(args.objection),
    requested_features: Array.isArray(args.requested_features) ? (args.requested_features as string[]).map(String).slice(0, 12) : [],
    buying_intent: (['high', 'medium', 'low', 'none'] as const).includes(args.buying_intent as never)
      ? (args.buying_intent as CallIntel['buying_intent'])
      : null,
    price_reaction: str(args.price_reaction),
    next_step: str(args.next_step),
    competitor: str(args.competitor),
    close_probability: typeof args.close_probability === 'number' ? Math.max(0, Math.min(100, args.close_probability)) : null,
    roleplay_scenario: str(args.roleplay_scenario),
    needs_human: str(args.needs_human),
  };

  if (ctx.acqCallId) {
    await db
      .from('acq_calls')
      .update({ intel, roleplay_scenario: intel.roleplay_scenario, outcome: intel.next_step })
      .eq('id', ctx.acqCallId);
  }

  const patch: Record<string, unknown> = { rep_notes: summarizeIntel(intel) };
  if (intel.needs_human) patch.needs_human = intel.needs_human;
  await db.from('outbound_leads').update(patch).eq('id', ctx.leadId);

  await recordEvent(db, {
    leadId: ctx.leadId,
    campaignId: ctx.campaignId,
    type: intel.needs_human ? 'needs_human' : 'note',
    label: intel.needs_human ? `Mr. Mustard flagged this for Sarah: ${intel.needs_human}` : `Call outcome: ${intel.next_step ?? 'logged'}`,
    detail: { intel },
  });

  if (intel.needs_human) after(() => notifySarah(ctx, intel));

  return say({ ok: true, instruction: 'Logged. Close the call warmly and briefly, and thank them for the three minutes.' });
}

function summarizeIntel(i: CallIntel): string {
  return [
    i.pain_point ? `Pain: ${i.pain_point}` : null,
    i.current_phone_workflow ? `Phones today: ${i.current_phone_workflow}` : null,
    i.after_hours_need ? `After hours: ${i.after_hours_need}` : null,
    i.objection ? `Objection: ${i.objection}` : null,
    i.price_reaction ? `On price: ${i.price_reaction}` : null,
    i.requested_features.length ? `Asked for: ${i.requested_features.join(', ')}` : null,
    i.buying_intent ? `Intent: ${i.buying_intent.toUpperCase()}` : null,
    i.close_probability != null ? `Close read: ${i.close_probability}%` : null,
    i.next_step ? `Next: ${i.next_step}` : null,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);
}

async function notifySarah(ctx: AcqCallContext, intel: CallIntel): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const db = getSupabase();
  const lead = db ? await loadLead(db, ctx.leadId) : null;
  const business = shortBusiness(lead?.business_name ?? ctx.business ?? 'A prospect');
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject: `NEEDS YOU: ${business}`,
      html: clientEmail({
        preheader: intel.needs_human ?? 'Mr. Mustard flagged a prospect for you.',
        eyebrow: 'MR. MUSTARD FLAGGED THIS',
        greeting: `${business} needs a human.`,
        body:
          p(escape(intel.needs_human ?? '')) +
          p(escape(summarizeIntel(intel)).replace(/\n/g, '<br>')) +
          p(`<a href="${SITE.url}/admin/acquisition/prospects/${ctx.leadId}">Open the prospect</a>`),
        signature: 'The Acquisition Engine',
      }),
    });
  } catch (err) {
    console.error('acq needs-human notify failed', err);
  }
}

/* ───────────────────────────── stop_contacting ──────────────────────────── */

export async function handleStopContacting(ctx: AcqCallContext, args: Record<string, unknown>): Promise<string> {
  const db = getSupabase();
  if (!db) return say({ ok: true, instruction: 'Tell them warmly that they are off the list, apologize once, and end the call.' });

  const lead = await loadLead(db, ctx.leadId);
  const reason = str(args.reason) ?? 'Asked Mr. Mustard to stop on the call.';

  await db
    .from('outbound_leads')
    .update({
      acq_eligible: false,
      acq_ineligible_reason: 'Asked to be removed on the call.',
      unsubscribed_at: new Date().toISOString(),
      suppression_reason: reason,
      consent_status: 'revoked',
      status: 'dnc',
      dnc_checked: true,
      acq_stage: 'lost',
    })
    .eq('id', ctx.leadId);

  // Permanent, and across every send path: the shared opt-out list is what the
  // one honest send path in lib/send-email.ts actually reads.
  if (lead?.email) {
    await db.from('suppression').upsert(
      { contact: lead.email.toLowerCase(), reason: 'asked Mr. Mustard to stop' },
      { onConflict: 'contact' },
    );
  }
  if (lead?.phone) {
    const digits = lead.phone.replace(/\D/g, '').slice(-10);
    if (digits.length === 10) await revokeConsent(db, { phoneE164: `+1${digits}`, reason });
  }
  await cancelPendingFor(db, ctx.leadId, undefined, 'They asked to be left alone.');
  await recordEvent(db, {
    leadId: ctx.leadId,
    campaignId: ctx.campaignId,
    type: 'unsubscribed',
    label: 'Asked Mr. Mustard to stop contacting them',
    detail: { reason },
  });

  return say({
    ok: true,
    instruction:
      'Done, and it is permanent. Tell them warmly and briefly that you have taken them off the list and they will not hear from us again. Apologize once, thank them, and end the call. Do not pitch anything.',
  });
}

/* ─────────────────────── end of call: save everything ───────────────────── */

/**
 * Fold the Vapi end-of-call report into the acquisition record.
 *
 * Idempotent on purpose: Vapi retries this webhook, and a retry must not add a
 * second conversation to the funnel or re-fire the follow-ups. The call row is
 * matched by its Vapi id and only advanced from a non-completed state.
 */
export async function handleAcqEndOfCall(
  ctx: AcqCallContext,
  report: { summary: string; transcript: string; durationSeconds?: number; endedReason?: string; vapiCallId?: string },
): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  const completed = (report.durationSeconds ?? 0) >= 30 && !/error|failed|no-answer|busy|voicemail/i.test(report.endedReason ?? '');

  let callRow: { id: string; status: string } | null = null;
  if (ctx.acqCallId) {
    const { data } = await db.from('acq_calls').select('id,status').eq('id', ctx.acqCallId).maybeSingle();
    callRow = (data as { id: string; status: string }) ?? null;
  } else if (report.vapiCallId) {
    const { data } = await db.from('acq_calls').select('id,status').eq('vapi_call_id', report.vapiCallId).maybeSingle();
    callRow = (data as { id: string; status: string }) ?? null;
  }

  // Already banked. A retried webhook stops here.
  if (callRow?.status === 'completed' || callRow?.status === 'no_answer' || callRow?.status === 'failed') return;

  if (callRow) {
    await db
      .from('acq_calls')
      .update({
        status: completed ? 'completed' : 'no_answer',
        ended_at: new Date().toISOString(),
        duration_sec: Math.round(report.durationSeconds ?? 0),
        ended_reason: report.endedReason ?? null,
        summary: report.summary.slice(0, 8000),
        transcript: report.transcript.slice(0, 60000),
      })
      .eq('id', callRow.id)
      .neq('status', 'completed');
  }

  const { data: leadRow } = await db.from('outbound_leads').select('*').eq('id', ctx.leadId).maybeSingle();
  const lead = leadRow as AcqProspect | null;
  if (!lead) return;

  await db
    .from('outbound_leads')
    .update({
      call_stage: completed ? 'completed' : 'attempted',
      last_call_at: new Date().toISOString(),
      acq_stage: advanceStage(lead, completed),
    })
    .eq('id', ctx.leadId);

  await recordEvent(db, {
    leadId: ctx.leadId,
    campaignId: ctx.campaignId,
    type: completed ? 'call_completed' : 'call_failed',
    label: completed
      ? `Mr. Mustard conversation completed (${Math.round(report.durationSeconds ?? 0)}s)`
      : `Call did not connect (${report.endedReason ?? 'unknown'})`,
    detail: { endedReason: report.endedReason, duration: report.durationSeconds, summary: report.summary.slice(0, 1000) },
  });

  const campaign = await getCampaign();

  // Sarah gets told about a high scorer who just finished a real conversation,
  // and about nothing else here. The needs-human flag and the booking and the
  // payment already have their own notifications; adding "a call happened" for
  // every call is how a useful alert becomes noise she filters.
  if (completed && (lead.lead_score ?? 0) >= 70 && (report.durationSeconds ?? 0) >= 120) {
    after(() => notifyHighValueCall(lead, report));
  }

  if (completed && !lead.demo_status && !lead.unsubscribed_at) {
    // They talked but never asked for theirs. One nudge, not a campaign.
    await enqueue(db, {
      kind: 'followup',
      leadId: ctx.leadId,
      campaignId: campaign?.id ?? null,
      step: 30,
      runAfter: new Date(Date.now() + 20 * 60 * 60 * 1000),
      payload: { followup: 'called_no_forge' },
    });
  }

  if (!completed && (lead.call_attempts ?? 1) < (campaign?.max_call_attempts ?? 2) && !lead.unsubscribed_at) {
    // One retry, hours later, on the consent they already gave. Not harassment.
    await enqueue(db, {
      kind: 'call',
      leadId: ctx.leadId,
      campaignId: campaign?.id ?? null,
      step: 2,
      runAfter: new Date(Date.now() + 4 * 60 * 60 * 1000),
      payload: { phone: lead.phone },
    });
  }
}

async function notifyHighValueCall(
  lead: AcqProspect,
  report: { summary: string; durationSeconds?: number },
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const business = shortBusiness(lead.business_name);
  const mins = Math.floor((report.durationSeconds ?? 0) / 60);
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject: `Mr. Mustard just talked to ${business} for ${mins} minutes`,
      html: clientEmail({
        preheader: `Score ${lead.lead_score}. ${[lead.city, lead.state].filter(Boolean).join(', ')}.`,
        eyebrow: 'A GOOD ONE JUST HUNG UP',
        greeting: `${business} scored ${lead.lead_score} and stayed on for ${mins} minutes.`,
        body:
          p(escape(report.summary.slice(0, 1200))) +
          p(`<a href="${SITE.url}/admin/acquisition/prospects/${lead.id}">Open the prospect and read the transcript</a>`),
        signature: 'The Acquisition Engine',
      }),
    });
  } catch (err) {
    console.error('acq high-value call notify failed', err);
  }
}

function advanceStage(lead: AcqProspect, completed: boolean): string {
  const order = ['prospect', 'emailed', 'consented', 'called', 'demoed', 'forged', 'demo_sent', 'meeting', 'client'];
  const want = completed ? 'demoed' : 'called';
  const at = order.indexOf(lead.acq_stage);
  const to = order.indexOf(want);
  return at > to ? lead.acq_stage : want;
}
