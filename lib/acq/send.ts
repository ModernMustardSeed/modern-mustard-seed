/**
 * THE SENDER.
 *
 * Pacing is not politeness here, it is survival: this rides
 * sarah@modernmustardseed.com, the same domain every client invoice, proposal
 * and booking confirmation depends on. A day of blasting a cold list would cost
 * far more than the list is worth.
 *
 * So the queue drains inside a window (business hours, Mountain, weekdays by
 * default), under an hourly and a daily cap, and it stops itself when the
 * bounce rate for the day crosses a threshold rather than waiting for a human
 * to notice. Every send goes through lib/send-email.ts, which is the one honest
 * path: it refuses suppressed recipients, records proof, and emits the RFC 8058
 * one-click unsubscribe header.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { buildCampaignEmail, buildDemoEmail, buildFollowupEmail, buildSuiteEmail } from '@/lib/acq/campaign';
import type { FollowupKind } from '@/lib/acq/campaign';
import { getVariants, pickVariant } from '@/lib/acq/settings';
import { recordEvent } from '@/lib/acq/events';
import { OFFER } from '@/lib/acq/types';
import type { AcqCampaign, AcqProspect } from '@/lib/acq/types';
import { SITE } from '@/lib/seo';
import { authorize, recordSend, recordRefusal } from '@/lib/acq/governor';

/** Above this share of the day's sends bouncing, stop and shout. */
export const BOUNCE_ALARM_PCT = 4;

export type PaceVerdict =
  | { ok: true; remainingToday: number; remainingThisHour: number }
  | { ok: false; reason: string; retryAfter: Date | null };

const DENVER = 'America/Denver';

export function denverParts(now = new Date()): { hour: number; weekday: number; date: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER,
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const WEEK = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>;
  return {
    hour: Number(parts.hour) % 24,
    weekday: WEEK[parts.weekday as string] ?? 1,
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** Next moment the window opens, so a paused drain can say when it resumes. */
export function nextWindowOpen(campaign: AcqCampaign, now = new Date()): Date {
  const d = new Date(now.getTime());
  for (let i = 0; i < 24 * 8; i++) {
    d.setTime(d.getTime() + 60 * 60 * 1000);
    const { hour, weekday } = denverParts(d);
    const dayOk = !campaign.send_weekdays_only || (weekday >= 1 && weekday <= 5);
    if (dayOk && hour >= campaign.send_start_hour && hour < campaign.send_end_hour) {
      d.setMinutes(0, 0, 0);
      return d;
    }
  }
  return new Date(now.getTime() + 60 * 60 * 1000);
}

/**
 * How many more campaign emails may leave right now. Counts real sends from the
 * event log rather than a counter that a crash could desynchronize.
 */
export async function checkPace(
  db: SupabaseClient,
  campaign: AcqCampaign,
  now = new Date(),
): Promise<PaceVerdict> {
  const { hour, weekday } = denverParts(now);
  if (campaign.send_weekdays_only && (weekday === 0 || weekday === 6)) {
    return { ok: false, reason: 'Outside the send window (weekends are off).', retryAfter: nextWindowOpen(campaign, now) };
  }
  if (hour < campaign.send_start_hour || hour >= campaign.send_end_hour) {
    return {
      ok: false,
      reason: `Outside the send window (${campaign.send_start_hour}:00 to ${campaign.send_end_hour}:00 Mountain).`,
      retryAfter: nextWindowOpen(campaign, now),
    };
  }

  const dayStart = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const hourStart = new Date(now.getTime() - 3600 * 1000).toISOString();

  const { data } = await db
    .from('acq_events')
    .select('type,occurred_at')
    .in('type', ['email_sent', 'email_bounced'])
    .gte('occurred_at', dayStart)
    .limit(20000);

  const rows = (data ?? []) as { type: string; occurred_at: string }[];
  const sentToday = rows.filter((r) => r.type === 'email_sent').length;
  const bouncedToday = rows.filter((r) => r.type === 'email_bounced').length;
  const sentThisHour = rows.filter((r) => r.type === 'email_sent' && r.occurred_at >= hourStart).length;

  if (sentToday >= 25 && (bouncedToday / Math.max(1, sentToday)) * 100 > BOUNCE_ALARM_PCT) {
    return {
      ok: false,
      reason: `Bounce rate is ${Math.round((bouncedToday / sentToday) * 100)}% today, over the ${BOUNCE_ALARM_PCT}% ceiling. Sending is held to protect the domain.`,
      retryAfter: null,
    };
  }
  if (sentToday >= campaign.daily_send_cap) {
    return { ok: false, reason: `Daily cap of ${campaign.daily_send_cap} reached.`, retryAfter: nextWindowOpen(campaign, now) };
  }
  if (sentThisHour >= campaign.hourly_send_cap) {
    return {
      ok: false,
      reason: `Hourly cap of ${campaign.hourly_send_cap} reached.`,
      retryAfter: new Date(now.getTime() + 15 * 60 * 1000),
    };
  }

  return {
    ok: true,
    remainingToday: campaign.daily_send_cap - sentToday,
    remainingThisHour: campaign.hourly_send_cap - sentThisHour,
  };
}

/** Estimated wall clock to drain N queued emails at the configured pace. */
export function estimateDrain(queued: number, campaign: AcqCampaign): string {
  if (queued <= 0) return 'Queue is empty.';
  const perDay = Math.max(1, campaign.daily_send_cap);
  const days = Math.ceil(queued / perDay);
  if (days <= 1) {
    const hours = Math.ceil(queued / Math.max(1, campaign.hourly_send_cap));
    return `about ${hours} sending hour${hours === 1 ? '' : 's'}`;
  }
  return `about ${days} sending day${days === 1 ? '' : 's'} at ${campaign.daily_send_cap}/day`;
}

/* ─────────────────────────────── the sends ──────────────────────────────── */

export type SendResult = { ok: true; messageId: string; subject: string } | { ok: false; error: string; permanent: boolean };

/** A failure that will never succeed on retry: stop trying and record why. */
function permanent(error: string): SendResult {
  return { ok: false, error, permanent: true };
}

/**
 * THE ONE GATE. Every marketing send in this file asks first, and a refusal is
 * recorded rather than swallowed so "why did nothing go out" always has an
 * answer. Transactional mail does not come through here.
 */
async function gateOrRefuse(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
  kind: 'campaign' | 'followup' | 'demo' | 'checkout',
): Promise<{ ok: true } | { ok: false; result: SendResult }> {
  const decision = await authorize({ db, lead, kind, campaign });
  if (decision.allowed) return { ok: true };
  await recordRefusal(db, lead, campaign.id, decision.reason ?? 'refused', kind);
  // A refusal about THIS person is permanent for this job; a refusal about
  // volume or the window is not, and the queue should come back later.
  const aboutTheRecipient = /opt-out|suppress|bounce|do not contact|confidence|test prospect|no email/i.test(decision.reason ?? '');
  return { ok: false, result: { ok: false, error: decision.reason ?? 'Refused by the outbound governor.', permanent: aboutTheRecipient } };
}

export async function sendCampaignEmail(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
  step: number,
): Promise<SendResult> {
  const gate = await gateOrRefuse(db, campaign, lead, 'campaign');
  if (!gate.ok) return gate.result;

  const variants = await getVariants(campaign.id);
  const variant = pickVariant(variants, step, lead.id);
  if (!variant) return permanent(`No active variant for step ${step}.`);

  const built = buildCampaignEmail({
    lead,
    variant,
    step,
    fromName: campaign.from_name,
    fromEmail: campaign.from_email,
    replyTo: campaign.reply_to,
  });
  if (!built) return permanent('No email address on the prospect.');

  const sent = await sendViaResend({
    from: built.from,
    to: built.to,
    replyTo: built.replyTo,
    subject: built.subject,
    html: built.html,
    mailbox: campaign.reply_to,
    unsubscribeUrl: built.unsubscribeUrl,
    leadId: lead.id,
  });

  if (!sent.ok) {
    const suppressed = Boolean(sent.suppressed?.length);
    if (suppressed) {
      await db
        .from('outbound_leads')
        .update({ acq_eligible: false, acq_ineligible_reason: sent.error.slice(0, 300), unsubscribed_at: new Date().toISOString() })
        .eq('id', lead.id);
      await recordEvent(db, {
        leadId: lead.id,
        campaignId: campaign.id,
        type: 'suppressed',
        label: 'Refused: the address is suppressed',
        detail: { error: sent.error },
      });
    }
    return { ok: false, error: sent.error, permanent: suppressed };
  }

  await db
    .from('outbound_leads')
    .update({
      email_stage: step,
      last_campaign_email_at: new Date().toISOString(),
      acq_stage: lead.acq_stage === 'prospect' ? 'emailed' : lead.acq_stage,
      acq_variant: lead.acq_variant ?? variant.key,
      status: lead.status === 'new' ? 'contacted' : lead.status,
      last_email_at: new Date().toISOString(),
    })
    .eq('id', lead.id);

  await recordEvent(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    type: 'email_sent',
    label: `Campaign email ${step} sent (variant ${variant.key}): ${built.subject}`,
    detail: { step, variant: variant.key, subject: built.subject, messageId: sent.id, to: built.to },
  });
  // The governor counts its rolling window off acq_sends, so a send that is not
  // recorded is a send the ceiling does not know about.
  await recordSend(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    cohortId: lead.acq_cohort_id,
    kind: 'campaign',
    step,
    variant: variant.key,
    to: built.to,
    from: built.from,
    subject: built.subject,
    providerMessageId: sent.id,
  });

  return { ok: true, messageId: sent.id, subject: built.subject };
}

/**
 * Where they buy.
 *
 * The real order page is the forged hub's own order screen, because that is
 * where the Stripe session is minted with the demo order attached, and it is
 * what carries the purchase back onto this lead through the store webhook. A
 * prospect with nothing forged yet has no hub, so they get the public offer page
 * instead of a link that would 404 in front of a buyer.
 */
/**
 * WHERE "I WANT IT" ACTUALLY GOES.
 *
 * This pointed at /demo/order/{hubId}, which has never existed as a page. Only
 * /demo/order/{hubId}/thanks does, and that is the POST-payment intake. So the
 * button in the checkout email Mr. Mustard fires the moment somebody says yes
 * returned a 404, which is the single most expensive failure this system is
 * capable of: it loses the one prospect who already decided to buy.
 *
 * The buy panel (components/demo/MakeItRealCTA) is rendered by the demo suite
 * hub, so that is the page. Nothing rendered the order path; it was simply a
 * URL somebody assembled that read plausibly.
 *
 * A rehearsal check now fetches this URL for a real lead and asserts a 200, so
 * a link we put in front of a buyer can never silently stop resolving again.
 */
export function checkoutUrlFor(lead: AcqProspect): string {
  const hubId = lead.hub_demo_id;
  if (hubId) return `${SITE.url}/demo/hub/${hubId}`;
  if (lead.hub_demo_url) return lead.hub_demo_url;
  return `${SITE.url}/demos`;
}

export const CALENDAR_URL = `${SITE.url}/book`;

export async function sendDemoEmail(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
): Promise<SendResult> {
  const demoUrl = lead.hub_demo_url || lead.demo_url;
  if (!demoUrl) return { ok: false, error: 'Nothing forged yet.', permanent: false };

  const gate = await gateOrRefuse(db, campaign, lead, 'demo');
  if (!gate.ok) return gate.result;

  // Their Presence Audit rides along when one exists. Read fresh rather than
  // carried on the prospect type, because the audit is written by a different
  // path (the cockpit, or the forge) and the lead row in hand can be stale.
  let auditUrl: string | null = null;
  let auditScore: number | null = null;
  let auditHeadline: string | null = null;
  {
    const { data: row } = await db
      .from('outbound_leads')
      .select('presence_audit_url, presence_audit_score, presence_audit_id')
      .eq('id', lead.id)
      .maybeSingle();
    auditUrl = (row?.presence_audit_url as string | null) ?? null;
    auditScore = (row?.presence_audit_score as number | null) ?? null;
    if (row?.presence_audit_id) {
      const { data: audit } = await db.from('presence_audits').select('report').eq('id', row.presence_audit_id).maybeSingle();
      const head = (audit?.report as { headline?: string } | null)?.headline;
      if (typeof head === 'string' && head.trim()) auditHeadline = head.trim();
    }
  }

  const built = buildDemoEmail({
    lead,
    demoUrl,
    checkoutUrl: checkoutUrlFor(lead),
    calendarUrl: CALENDAR_URL,
    offerLine: OFFER.line,
    fromName: 'Mr. Mustard at Modern Mustard Seed',
    fromEmail: campaign.from_email,
    replyTo: campaign.reply_to,
    auditUrl,
    auditScore,
    auditHeadline,
  });
  if (!built) return permanent('No email address on the prospect.');

  const sent = await sendViaResend({
    from: built.from,
    to: built.to,
    replyTo: built.replyTo,
    subject: built.subject,
    html: built.html,
    mailbox: campaign.reply_to,
    unsubscribeUrl: built.unsubscribeUrl,
    leadId: lead.id,
  });
  if (!sent.ok) return { ok: false, error: sent.error, permanent: Boolean(sent.suppressed?.length) };

  await recordSend(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    cohortId: lead.acq_cohort_id,
    kind: 'demo',
    to: built.to,
    from: built.from,
    subject: built.subject,
    providerMessageId: sent.id,
  });
  await db
    .from('outbound_leads')
    .update({ demo_emailed_at: new Date().toISOString(), acq_stage: 'demo_sent', reservoir_state: 'hot' })
    .eq('id', lead.id);
  await recordEvent(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    type: 'demo_emailed',
    label: `Personalized demo emailed to ${built.to}`,
    detail: { demoUrl, messageId: sent.id },
  });

  return { ok: true, messageId: sent.id, subject: built.subject };
}


/**
 * SEND THEM THE WHOLE SUITE.
 *
 * sendDemoEmail above is Mr. Mustard's, sent to somebody who just spent four
 * minutes on the phone with him, and it points at one thing: the receptionist
 * they heard. This one is for everybody else, and it leads with all of it.
 *
 * Three refusals happen before a byte moves, and each of them exists because
 * the alternative is a broken link in front of a stranger:
 *   1. Nothing forged: there is no suite to send.
 *   2. A website that is still on the anvil is never named. The email is
 *      rebuilt around whatever is genuinely finished.
 *   3. The governor decides, exactly as it does for every other send, so the
 *      sending domain is protected by one gate and not by four.
 */
export async function sendSuiteEmail(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
  opts: { resend?: boolean } = {},
): Promise<SendResult> {
  const hubUrl = lead.hub_demo_url;
  const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
  if (!hubUrl || (!lead.demo_url && !siteReady && !lead.os_demo_url)) {
    return { ok: false, error: 'Nothing is forged for them yet. Build the suite first.', permanent: false };
  }
  if (lead.demo_emailed_at && !opts.resend) {
    return { ok: false, error: 'Their suite already went out. Use the follow-ups from here.', permanent: true };
  }

  const gate = await gateOrRefuse(db, campaign, lead, 'demo');
  if (!gate.ok) return gate.result;

  // Only claim a video that is actually attached. Both lookups fail soft: a
  // storage hiccup costs the email one sentence, never the send.
  let personalVideo = false;
  try {
    const { data } = await db.storage.from('booth').createSignedUrl(`founder/${lead.id}.webm`, 60);
    personalVideo = Boolean(data?.signedUrl);
  } catch {
    personalVideo = false;
  }
  const film = (lead as unknown as { suite_film_status?: string | null }).suite_film_status === 'ready';

  const built = buildSuiteEmail({
    lead,
    suite: {
      hubUrl,
      voiceUrl: lead.demo_url,
      siteUrl: siteReady ? lead.site_demo_url : null,
      osUrl: lead.os_demo_url,
      personalVideo,
      film,
    },
    checkoutUrl: checkoutUrlFor(lead),
    calendarUrl: CALENDAR_URL,
    offerLine: OFFER.line,
    // He only signs it if he has actually spoken to them. A stranger getting a
    // warm note from a character they have never met reads as a bot.
    fromMustard: lead.call_stage === 'completed',
    fromName: lead.call_stage === 'completed' ? 'Mr. Mustard at Modern Mustard Seed' : campaign.from_name,
    fromEmail: campaign.from_email,
    replyTo: campaign.reply_to,
  });
  if (!built) return permanent('No email address on the prospect.');

  const sent = await sendViaResend({
    from: built.from,
    to: built.to,
    replyTo: built.replyTo,
    subject: built.subject,
    html: built.html,
    mailbox: campaign.reply_to,
    unsubscribeUrl: built.unsubscribeUrl,
    leadId: lead.id,
  });
  if (!sent.ok) return { ok: false, error: sent.error, permanent: Boolean(sent.suppressed?.length) };

  await recordSend(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    cohortId: lead.acq_cohort_id,
    kind: 'demo',
    to: built.to,
    from: built.from,
    subject: built.subject,
    providerMessageId: sent.id,
  });
  await db
    .from('outbound_leads')
    .update({ demo_emailed_at: new Date().toISOString(), acq_stage: 'demo_sent', reservoir_state: 'hot' })
    .eq('id', lead.id);
  await recordEvent(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    type: 'demo_emailed',
    label: `Their full suite was emailed to ${built.to}`,
    detail: {
      hubUrl,
      voice: Boolean(lead.demo_url),
      site: siteReady,
      os: Boolean(lead.os_demo_url),
      personalVideo,
      film,
      messageId: sent.id,
    },
  });

  return { ok: true, messageId: sent.id, subject: built.subject };
}

export async function sendFollowup(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
  kind: FollowupKind,
): Promise<SendResult> {
  const gate = await gateOrRefuse(db, campaign, lead, 'followup');
  if (!gate.ok) return gate.result;

  const built = buildFollowupEmail({
    kind,
    lead,
    demoUrl: lead.hub_demo_url || lead.demo_url,
    checkoutUrl: checkoutUrlFor(lead),
    calendarUrl: CALENDAR_URL,
    offerLine: OFFER.line,
    fromName: kind === 'no_call_after_consent' ? campaign.from_name : 'Mr. Mustard at Modern Mustard Seed',
    fromEmail: campaign.from_email,
    replyTo: campaign.reply_to,
  });
  if (!built) return permanent('No email address on the prospect.');

  const sent = await sendViaResend({
    from: built.from,
    to: built.to,
    replyTo: built.replyTo,
    subject: built.subject,
    html: built.html,
    mailbox: campaign.reply_to,
    unsubscribeUrl: built.unsubscribeUrl,
    leadId: lead.id,
  });
  if (!sent.ok) return { ok: false, error: sent.error, permanent: Boolean(sent.suppressed?.length) };

  await db.from('outbound_leads').update({ last_campaign_email_at: new Date().toISOString() }).eq('id', lead.id);
  await recordSend(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    cohortId: lead.acq_cohort_id,
    kind: 'followup',
    variant: kind,
    to: built.to,
    from: built.from,
    subject: built.subject,
    providerMessageId: sent.id,
  });
  await recordEvent(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    type: 'email_sent',
    label: `Follow-up sent (${kind}): ${built.subject}`,
    detail: { kind, messageId: sent.id, followup: true },
  });

  return { ok: true, messageId: sent.id, subject: built.subject };
}

/** Send the activation link. Separate from the demo email so Mr. Mustard can
 *  fire it the moment somebody says "I want it" without re-sending the demo. */
export async function sendCheckoutLink(
  db: SupabaseClient,
  campaign: AcqCampaign,
  lead: AcqProspect,
  note?: string,
): Promise<SendResult> {
  if (!lead.email) return permanent('No email address on the prospect.');

  // The activation link is asked for out loud on a call, so it is the one place
  // where the send window and the pacing caps would be actively unhelpful. It
  // still goes through the governor: opt-out, suppression, bounce, do-not-contact
  // and the hard ceiling all still apply.
  const gate = await gateOrRefuse(db, campaign, lead, 'checkout');
  if (!gate.ok && gate.result.ok === false && gate.result.permanent) return gate.result;

  const { clientEmail, p, escape } = await import('@/lib/email');
  const { complianceFooter, unsubscribeUrlFor } = await import('@/lib/outbound-email');
  const { shortBusiness, greetingFor } = await import('@/lib/acq/campaign');
  const { possessive } = await import('@/lib/business-name');
  const url = checkoutUrlFor(lead);
  const business = shortBusiness(lead.business_name);

  const html =
    clientEmail({
      preheader: 'The activation link you asked for.',
      eyebrow: 'ACTIVATE YOUR VOICE AGENT',
      greeting: greetingFor(lead),
      body:
        p(note ? escape(note) : `Here is the link to put your receptionist on ${escape(possessive(business))} real calls.`) +
        p(`${escape(OFFER.line)}. Month to month, cancel anytime. Your phone number does not change, it forwards.`) +
        p('We install it by hand and it is live within a week.'),
      cta: { label: 'Activate my Voice Agent', url },
      secondary: { label: 'Talk with Sarah first', url: CALENDAR_URL },
      signature: 'Mr. Mustard',
      trackId: lead.id,
    }) + complianceFooter(lead.email);

  const sent = await sendViaResend({
    from: `Mr. Mustard at Modern Mustard Seed <${campaign.from_email}>`,
    to: lead.email,
    replyTo: campaign.reply_to,
    subject: `Your Voice Agent activation link, ${business}`,
    html,
    mailbox: campaign.reply_to,
    unsubscribeUrl: unsubscribeUrlFor(lead.email),
    leadId: lead.id,
  });
  if (!sent.ok) return { ok: false, error: sent.error, permanent: Boolean(sent.suppressed?.length) };

  await recordSend(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    cohortId: lead.acq_cohort_id,
    kind: 'checkout',
    to: lead.email,
    from: campaign.from_email,
    subject: `Your Voice Agent activation link, ${business}`,
    providerMessageId: sent.id,
  });
  await db
    .from('outbound_leads')
    .update({ checkout_sent_at: new Date().toISOString(), checkout_url: url, acq_stage: 'meeting', reservoir_state: 'checkout' })
    .eq('id', lead.id);
  await recordEvent(db, {
    leadId: lead.id,
    campaignId: campaign.id,
    type: 'checkout_sent',
    label: 'Checkout link sent',
    detail: { url, messageId: sent.id },
  });

  return { ok: true, messageId: sent.id, subject: 'activation link' };
}
