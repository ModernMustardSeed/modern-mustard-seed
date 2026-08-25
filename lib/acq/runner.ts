/**
 * THE DRAIN.
 *
 * One function that claims jobs, does them, and records the truth. Called by the
 * cron every few minutes and by the admin "run now" button, and safe to call
 * from both at once because claiming is atomic.
 *
 * Every job re-reads the lead and re-checks eligibility at execution time. That
 * is the whole reason this is a queue and not a loop: a prospect can unsubscribe
 * between being scheduled and being sent to, and the schedule must lose that
 * argument every time.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { claimJobs, completeJob, failJob, skipJob, reclaimStale, enqueue } from '@/lib/acq/queue';
import type { QueueJob } from '@/lib/acq/queue';
import { getAcqSettings, gate, getCampaign } from '@/lib/acq/settings';
import { checkPace, sendCampaignEmail, sendDemoEmail, sendFollowup, sendSuiteEmail, sendCheckoutLink } from '@/lib/acq/send';
import type { FollowupKind } from '@/lib/acq/campaign';
import { evaluate, dueForStep, sequenceGaps } from '@/lib/acq/eligibility';
import { activeSuppressions } from '@/lib/email-log';
import { forgeProspectAgent } from '@/lib/acq/forge';
import { forgeProspectSuite } from '@/lib/acq/suite';
import { placeDemoCall } from '@/lib/acq/call';
import { recordEvent } from '@/lib/acq/events';
import type { AcqCampaign, AcqProspect } from '@/lib/acq/types';
import { hasLiveConsent, toE164 } from '@/lib/acq/consent';

export type DrainReport = {
  claimed: number;
  done: number;
  skipped: number;
  failed: number;
  reclaimed: number;
  held: string | null;
  detail: { id: string; kind: string; outcome: string; note?: string }[];
};

export async function drainQueue(opts: { limit?: number; worker?: string } = {}): Promise<DrainReport> {
  const db = getSupabase();
  const report: DrainReport = { claimed: 0, done: 0, skipped: 0, failed: 0, reclaimed: 0, held: null, detail: [] };
  if (!db) {
    report.held = 'Database is not configured.';
    return report;
  }

  const settings = await getAcqSettings();
  if (settings.master_paused) {
    report.held = settings.paused_reason || 'The acquisition engine is paused. Nothing was sent or called.';
    return report;
  }
  const campaign = await getCampaign();
  if (!campaign) {
    report.held = 'The MEET MR. MUSTARD campaign row is missing.';
    return report;
  }
  if (campaign.status !== 'live') {
    report.held = `Campaign is ${campaign.status}, so the queue is holding.`;
    return report;
  }

  report.reclaimed = await reclaimStale(db);

  // Pace decides how many EMAILS may go. Calls, forges and demo sends are not
  // rate limited by the mail window: somebody who just asked to be called is
  // waiting with their phone in their hand.
  const pace = await checkPace(db, campaign);
  const emailBudget = pace.ok ? Math.min(pace.remainingThisHour, pace.remainingToday) : 0;
  if (!pace.ok) report.held = pace.reason;

  const worker = opts.worker ?? 'cron';
  const limit = opts.limit ?? 40;

  // Demo suite emails go first, always.
  //
  // A forged demo is a live agent and a live site standing there with the
  // prospect's own name on it, built because that person asked. A cold email
  // is a cold email. FIFO across one shared queue means a backlog of cold
  // sends starves the demos behind it, and at 25 an hour a thousand-job
  // backlog is days: on 2026-08-24 sixteen forged demos sat behind 1,082 cold
  // emails. The person who raised their hand does not wait behind the people
  // who did not.
  const demoFirst = await claimJobs(db, ['demo_email'], limit, worker);
  const rest = demoFirst.length < limit ? await claimJobs(db, null, limit - demoFirst.length, worker) : [];
  const jobs = [...demoFirst, ...rest];
  report.claimed = jobs.length;

  let emailsSent = 0;

  for (const job of jobs) {
    try {
      const outcome = await runJob(db, campaign, job, {
        emailAllowed: gate(settings, 'email').allowed && emailsSent < emailBudget,
        callsAllowed: gate(settings, 'calls').allowed,
        followupsAllowed: gate(settings, 'followups').allowed,
        emailHoldReason: pace.ok ? gate(settings, 'email').allowed ? null : 'Outbound email is switched off.' : pace.reason,
        retryAfter: pace.ok ? null : pace.retryAfter,
      });
      if (outcome.kind === 'done') {
        report.done++;
        if (job.kind === 'email' || job.kind === 'demo_email' || job.kind === 'followup') emailsSent++;
        await completeJob(db, job.id, outcome.result ?? {});
        report.detail.push({ id: job.id, kind: job.kind, outcome: 'done', note: outcome.note });
      } else if (outcome.kind === 'skip') {
        report.skipped++;
        await skipJob(db, job.id, outcome.note);
        report.detail.push({ id: job.id, kind: job.kind, outcome: 'skipped', note: outcome.note });
      } else if (outcome.kind === 'defer') {
        await db
          .from('acq_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            claimed_by: null,
            attempts: Math.max(0, job.attempts - 1),
            run_after: (outcome.until ?? new Date(Date.now() + 30 * 60_000)).toISOString(),
            error: outcome.note,
          })
          .eq('id', job.id);
        report.detail.push({ id: job.id, kind: job.kind, outcome: 'deferred', note: outcome.note });
      } else {
        const result = await failJob(db, job, outcome.note);
        if (result === 'failed') report.failed++;
        report.detail.push({ id: job.id, kind: job.kind, outcome: result, note: outcome.note });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result = await failJob(db, job, msg);
      if (result === 'failed') report.failed++;
      report.detail.push({ id: job.id, kind: job.kind, outcome: result, note: msg });
    }
  }

  return report;
}

type JobOutcome =
  | { kind: 'done'; note?: string; result?: Record<string, unknown> }
  | { kind: 'skip'; note: string }
  | { kind: 'defer'; note: string; until?: Date }
  | { kind: 'fail'; note: string };

type Permissions = {
  emailAllowed: boolean;
  callsAllowed: boolean;
  followupsAllowed: boolean;
  emailHoldReason: string | null;
  retryAfter: Date | null;
};

async function loadLead(db: SupabaseClient, id: string): Promise<AcqProspect | null> {
  const { data } = await db.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  return (data as AcqProspect) ?? null;
}

export async function runJob(
  db: SupabaseClient,
  campaign: AcqCampaign,
  job: QueueJob,
  perms: Permissions,
): Promise<JobOutcome> {
  if (!job.lead_id) return { kind: 'skip', note: 'Job has no prospect attached.' };
  const lead = await loadLead(db, job.lead_id);
  if (!lead) return { kind: 'skip', note: 'Prospect no longer exists.' };

  switch (job.kind) {
    case 'email':
      return runEmailJob(db, campaign, job, lead, perms);
    case 'followup':
      return runFollowupJob(db, campaign, job, lead, perms);
    case 'demo_email':
      return runDemoEmailJob(db, campaign, job, lead, perms);
    case 'checkout':
      return runCheckoutJob(db, campaign, lead, perms, String(job.payload.note ?? ''));
    case 'call':
      return runCallJob(db, campaign, job, lead, perms);
    case 'forge':
      return runForgeJob(db, lead, job);
    case 'research':
      return { kind: 'skip', note: 'Research runs in the Lead Finder worker, not the queue.' };
    default:
      return { kind: 'fail', note: `Unknown job kind: ${job.kind}` };
  }
}

/* ────────────────────────────── email jobs ─────────────────────────────── */

async function guardMailable(db: SupabaseClient, lead: AcqProspect, minScore: number): Promise<string | null> {
  if (!lead.email) return 'No email address.';
  const supp = await activeSuppressions([lead.email]);
  const verdict = evaluate(lead, { suppressed: new Set(supp.keys()), minLeadScore: minScore });
  return verdict.eligible ? null : verdict.reason;
}

async function runEmailJob(
  db: SupabaseClient,
  campaign: AcqCampaign,
  job: QueueJob,
  lead: AcqProspect,
  perms: Permissions,
): Promise<JobOutcome> {
  if (!perms.emailAllowed) {
    return { kind: 'defer', note: perms.emailHoldReason ?? 'Sending is held.', until: perms.retryAfter ?? undefined };
  }
  const settings = await getAcqSettings();
  const blocked = await guardMailable(db, lead, settings.min_lead_score);
  if (blocked) {
    await db.from('outbound_leads').update({ acq_eligible: false, acq_ineligible_reason: blocked }).eq('id', lead.id);
    return { kind: 'skip', note: blocked };
  }

  const gaps = sequenceGaps(campaign.step_after_days);
  const step = Math.max(1, job.step || 1);
  if ((lead.email_stage ?? 0) >= step) {
    return { kind: 'skip', note: `Email ${step} already went out (stage ${lead.email_stage}).` };
  }
  // The sequence stops the moment they convert, even if this was scheduled first.
  const due = dueForStep(lead, new Date(), campaign.step_after_days);
  if (due === null) return { kind: 'skip', note: 'The prospect moved past the email sequence.' };
  if (due !== step) return { kind: 'defer', note: `Step ${step} is not due yet (next is ${due}).` };

  const sent = await sendCampaignEmail(db, campaign, lead, step);
  if (!sent.ok) return sent.permanent ? { kind: 'skip', note: sent.error } : { kind: 'fail', note: sent.error };

  // Schedule the next one immediately so the sequence is durable rather than
  // dependent on a nightly sweep finding it again. gaps[step - 1] is the wait
  // that follows THIS email; running off the end means this was the last one.
  if (step <= gaps.length) {
    await enqueue(db, {
      kind: 'email',
      leadId: lead.id,
      campaignId: campaign.id,
      step: step + 1,
      runAfter: addBusinessDays(new Date(), gaps[step - 1]),
    });
  }

  return { kind: 'done', note: sent.subject, result: { messageId: sent.messageId, step } };
}

async function runFollowupJob(
  db: SupabaseClient,
  campaign: AcqCampaign,
  job: QueueJob,
  lead: AcqProspect,
  perms: Permissions,
): Promise<JobOutcome> {
  if (!perms.followupsAllowed) return { kind: 'defer', note: 'Follow-ups are switched off.' };
  if (!perms.emailAllowed) {
    return { kind: 'defer', note: perms.emailHoldReason ?? 'Sending is held.', until: perms.retryAfter ?? undefined };
  }
  const kind = String(job.payload.followup ?? '') as FollowupKind;
  if (!kind) return { kind: 'fail', note: 'Follow-up job has no kind.' };

  const settings = await getAcqSettings();
  const blocked = await guardMailable(db, lead, 0);
  if (blocked) return { kind: 'skip', note: blocked };
  void settings;

  // Stop chasing the moment the thing we were chasing happened.
  const stop = shouldStopFollowup(kind, lead);
  if (stop) return { kind: 'skip', note: stop };

  const sent = await sendFollowup(db, campaign, lead, kind);
  if (!sent.ok) return sent.permanent ? { kind: 'skip', note: sent.error } : { kind: 'fail', note: sent.error };
  return { kind: 'done', note: sent.subject, result: { messageId: sent.messageId, followup: kind } };
}

export function shouldStopFollowup(kind: FollowupKind, lead: AcqProspect): string | null {
  if (lead.client_status === 'client') return 'They bought. Follow-ups stop.';
  if (lead.meeting_status === 'booked') return 'They booked Sarah. Sales chasing stops.';
  if (lead.unsubscribed_at) return 'They unsubscribed.';
  switch (kind) {
    case 'no_call_after_consent':
      return lead.call_stage === 'completed' ? 'The call happened after all.' : null;
    case 'called_no_forge':
      return lead.demo_status === 'ready' || lead.demo_status === 'forging' ? 'Their demo is already being built.' : null;
    default:
      return lead.checkout_sent_at && lead.payment_status === 'paid' ? 'Already paid.' : null;
  }
}

async function runDemoEmailJob(
  db: SupabaseClient,
  campaign: AcqCampaign,
  job: QueueJob,
  lead: AcqProspect,
  perms: Permissions,
): Promise<JobOutcome> {
  if (!perms.emailAllowed) {
    return { kind: 'defer', note: perms.emailHoldReason ?? 'Sending is held.', until: perms.retryAfter ?? undefined };
  }
  if (lead.demo_emailed_at) return { kind: 'skip', note: 'The demo email already went out.' };
  if (!lead.hub_demo_url && !lead.demo_url) {
    return { kind: 'defer', note: 'Nothing forged yet; waiting on the build.', until: new Date(Date.now() + 10 * 60_000) };
  }
  const blocked = await guardMailable(db, lead, 0);
  if (blocked) return { kind: 'skip', note: blocked };

  // A prospect with a website or a command center gets the SUITE email, which
  // names every piece that is finished. One with only a voice agent gets Mr.
  // Mustard's receptionist email, unchanged, because that is what he promised
  // them on the call.
  const hasMoreThanVoice = Boolean(lead.os_demo_url) || (lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url));
  const sent = hasMoreThanVoice && lead.hub_demo_url
    ? await sendSuiteEmail(db, campaign, lead)
    : await sendDemoEmail(db, campaign, lead);
  if (!sent.ok) return sent.permanent ? { kind: 'skip', note: sent.error } : { kind: 'fail', note: sent.error };

  // The "did you try to break it" sequence starts inside the senders now, so
  // that a demo sent from the admin, the forge screen, demos-now or Mr. Mustard
  // on a call gets the same follow-through this worker used to get alone. See
  // lib/acq/post-demo.ts.
  void job;
  return { kind: 'done', note: sent.subject, result: { messageId: sent.messageId } };
}

async function runCheckoutJob(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
  perms: Permissions,
  note: string,
): Promise<JobOutcome> {
  if (!perms.emailAllowed) {
    return { kind: 'defer', note: perms.emailHoldReason ?? 'Sending is held.', until: perms.retryAfter ?? undefined };
  }
  if (lead.checkout_sent_at) return { kind: 'skip', note: 'Checkout link already sent.' };
  const sent = await sendCheckoutLink(db, campaign, lead, note || undefined);
  if (!sent.ok) return sent.permanent ? { kind: 'skip', note: sent.error } : { kind: 'fail', note: sent.error };
  return { kind: 'done', note: 'checkout link sent', result: { messageId: sent.messageId } };
}

/* ─────────────────────────────── call jobs ─────────────────────────────── */

async function runCallJob(
  db: SupabaseClient,
  campaign: AcqCampaign,
  job: QueueJob,
  lead: AcqProspect,
  perms: Permissions,
): Promise<JobOutcome> {
  if (!perms.callsAllowed) return { kind: 'defer', note: 'Mr. Mustard calls are switched off.' };
  if (lead.call_stage === 'completed') return { kind: 'skip', note: 'They already had their call.' };
  if ((lead.call_attempts ?? 0) >= campaign.max_call_attempts) {
    return { kind: 'skip', note: `Already tried ${lead.call_attempts} times. Not chasing further.` };
  }

  const phone = toE164(String(job.payload.phone ?? lead.phone ?? ''));
  if (!phone) return { kind: 'skip', note: 'No dialable number.' };

  // THE GATE. A call without a live consent record never happens, whatever the
  // queue believes.
  if (!(await hasLiveConsent(db, phone))) {
    return { kind: 'skip', note: 'No live consent on file for that number. Refusing to call.' };
  }

  const placed = await placeDemoCall({
    lead,
    phoneE164: phone,
    consentId: lead.consent_id,
    consentAt: lead.consent_at,
    campaignId: campaign.id,
    attempt: (lead.call_attempts ?? 0) + 1,
  });

  if (!placed.ok) {
    if (placed.reason === 'duplicate') return { kind: 'skip', note: 'A call to that number just went out.' };
    if (placed.reason === 'not-configured') return { kind: 'defer', note: 'Telephony is not configured yet.', until: new Date(Date.now() + 60 * 60_000) };
    return { kind: 'fail', note: `${placed.reason}: ${placed.detail ?? ''}`.trim() };
  }

  // If nothing comes back, chase it once by email rather than dialling forever.
  await enqueue(db, {
    kind: 'followup',
    leadId: lead.id,
    campaignId: campaign.id,
    step: 20,
    runAfter: new Date(Date.now() + 6 * 60 * 60 * 1000),
    payload: { followup: 'no_call_after_consent' satisfies FollowupKind },
  });

  return { kind: 'done', note: `calling ${phone}`, result: { vapiCallId: placed.vapiCallId } };
}

async function runForgeJob(db: SupabaseClient, lead: AcqProspect, job: QueueJob): Promise<JobOutcome> {
  const wantsSite = job.payload.site === true;
  const siteSettled = lead.site_demo_status === 'ready' || lead.site_demo_status === 'queued' || lead.site_demo_status === 'building';
  // "Already forged" used to mean only the voice agent, so a job asking for the
  // whole suite would be skipped by a prospect who had nothing but a receptionist.
  if (lead.demo_status === 'ready' && (!wantsSite || siteSettled)) {
    return { kind: 'skip', note: 'Already forged.' };
  }

  // A forge job carrying no site flag is the phone path: Mr. Mustard forging
  // mid-call, where the only thing that may run is what is instant. The board
  // sets site:true and gets the whole suite.
  if (!wantsSite) {
    const result = await forgeProspectAgent(db, lead, (job.payload.context as Record<string, string>) ?? {});
    if (!result.ok) return result.retryable ? { kind: 'fail', note: result.error } : { kind: 'skip', note: result.error };
    return { kind: 'done', note: result.demoUrl, result: { demoUrl: result.demoUrl } };
  }

  const result = await forgeProspectSuite(db, lead, {
    site: true,
    designTier: job.payload.designTier === 3 ? 3 : 2,
    talkingWebsite: job.payload.talkingWebsite === true,
    by: String(job.payload.by ?? 'queue'),
    // Nobody is watching this one, so it counts against the daily ceiling.
    capped: 'queue',
  });
  if (!result.ok) return result.retryable ? { kind: 'fail', note: result.error } : { kind: 'skip', note: result.error };
  return {
    kind: 'done',
    note: result.created.length ? `Forged ${result.created.join(', ')}` : 'Already built',
    result: { created: result.created, hubUrl: result.hubUrl, siteUrl: result.siteUrl, warnings: result.warnings },
  };
}

/* ─────────────────────────────── scheduling ────────────────────────────── */

/** Business days forward, landing mid-morning Mountain so nothing arrives at 3am. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = Math.max(0, days);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  d.setUTCHours(16, 0, 0, 0); // ~09:00-10:00 America/Denver
  return d;
}
