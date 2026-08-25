/**
 * THE OUTBOUND GOVERNOR.
 *
 * One function stands between this company and every marketing email it will
 * ever send. No campaign, bulk action, worker, retry, cron or admin button gets
 * to go around it, and that is the entire point: a system with fourteen send
 * paths and thirteen sets of safety checks has no safety checks.
 *
 * The rolling 24 hour ceiling is a CEILING. It is not a target, and 4,499
 * messages being under it does not make 4,499 messages a good idea. The number
 * the governor actually enforces day to day is `adaptive_daily_allowance`,
 * which starts small, ramps only on measured health, and falls hard on a bad
 * signal.
 *
 * Everything here fails CLOSED. An unreadable suppression list, an unreachable
 * settings row, an unknown sender state: all of them refuse the send. The cost
 * of a message that should not have gone is permanent; the cost of one that
 * waits an hour is an hour.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { activeSuppressions } from '@/lib/email-log';
import { getAcqSettings, getCampaign } from '@/lib/acq/settings';
import { isInternalAddress } from '@/lib/owner';
import { denverParts, nextWindowOpen } from '@/lib/acq/send';
import { isMailableEmailStatus } from '@/lib/acq/types';
import type { AcqCampaign, AcqProspect, AcqSettings } from '@/lib/acq/types';

/* ───────────────────────────── sender states ────────────────────────────── */

export const SENDER_STATES = ['validating', 'healthy', 'scaling', 'mature', 'caution', 'restricted', 'paused'] as const;
export type SenderState = (typeof SENDER_STATES)[number];

export const SENDER_STATE_LABELS: Record<SenderState, string> = {
  validating: 'Validating',
  healthy: 'Healthy',
  scaling: 'Scaling',
  mature: 'Mature',
  caution: 'Caution',
  restricted: 'Restricted',
  paused: 'Paused',
};

/**
 * The ramp. Deliberately conservative at the bottom and slow at the top: the
 * first thousand messages from a domain that has only ever sent one-to-one mail
 * decide how the next hundred thousand are treated.
 */
export const RAMP_STEPS = [100, 250, 500, 750, 1000, 1500, 2000, 2750, 3500, 4500];

/** The next allowance up, capped by the hard ceiling. */
export function nextRampStep(current: number, ceiling: number): number {
  const next = RAMP_STEPS.find((s) => s > current) ?? ceiling;
  return Math.min(next, ceiling);
}

/** The allowance to drop to when health turns. One full step back, never zero. */
export function backOffStep(current: number): number {
  const below = [...RAMP_STEPS].reverse().find((s) => s < current);
  return Math.max(RAMP_STEPS[0], below ?? RAMP_STEPS[0]);
}

/* ────────────────────────────── the decision ────────────────────────────── */

export type GovernorCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  /** A critical check that fails stops the send. A soft one only warns. */
  critical: boolean;
};

export type GovernorDecision = {
  allowed: boolean;
  /** The first critical failure, in plain words, ready to show or log. */
  reason: string | null;
  checks: GovernorCheck[];
  /** How many more may go out in this rolling day and this hour. */
  remainingToday: number;
  remainingThisHour: number;
  /** When it is worth asking again. Null means "not until something changes". */
  retryAfter: Date | null;
  senderState: SenderState;
  /** The allowance actually in force, and the ceiling it can never pass. */
  allowance: number;
  ceiling: number;
};

/**
 * How many sends there have to be before a bounce percentage means anything.
 *
 * This was 25, and 25 is indefensible: one dead address out of 25 is 4.00%,
 * which is the entire ceiling, so a single bad row in a list of twenty-five
 * stopped a day of sending. At 100 a single address is 1%, the rate moves in
 * steps a human can reason about, and a genuinely bad list still trips the
 * brake long before it does real damage.
 */
export const RATE_MEASUREMENT_FLOOR = 100;

export type Rolling = {
  sent24h: number;
  sent1h: number;
  /** Permanent bounces only. This is the number that governs. */
  bounced24h: number;
  complained24h: number;
  unsub24h: number;
  /** Full mailboxes and busy servers. Reported, never enforced. */
  softBounced24h: number;
};

export async function rollingCounts(db: SupabaseClient): Promise<Rolling> {
  const { data, error } = await db.rpc('acq_rolling_send_counts');
  if (error || !data || !data.length) {
    // Fail closed: an unreadable count must read as "at the limit", never as zero.
    throw new Error(`The governor cannot read recent send volume (${error?.message ?? 'no rows'}). Refusing to send.`);
  }
  const r = data[0] as { sent_24h: number; sent_1h: number; bounced_24h: number; complained_24h: number; unsub_24h: number; soft_bounced_24h?: number };
  return {
    sent24h: Number(r.sent_24h ?? 0),
    sent1h: Number(r.sent_1h ?? 0),
    bounced24h: Number(r.bounced_24h ?? 0),
    complained24h: Number(r.complained_24h ?? 0),
    unsub24h: Number(r.unsub_24h ?? 0),
    softBounced24h: Number(r.soft_bounced_24h ?? 0),
  };
}

export type AuthorizeInput = {
  db?: SupabaseClient | null;
  lead: AcqProspect;
  /** Campaign email, follow-up, demo or checkout. Transactional mail never
   *  comes through here; this gate is for marketing. */
  kind?: 'campaign' | 'followup' | 'demo' | 'checkout';
  /** Pre-loaded, so a batch drain does not re-read them per recipient. */
  settings?: AcqSettings;
  campaign?: AcqCampaign | null;
  rolling?: Rolling;
  /** Set when the caller has already counted this batch's own sends. */
  sentThisRun?: number;
  now?: Date;
  /**
   * A human, at a keyboard, right now, deliberately overriding the pacing.
   *
   * This lifts the gates that exist to stop a MACHINE from sending too much
   * too fast: the send window, the hourly rate, the adaptive allowance, the
   * bounce and complaint brakes, and the minimum gap between two emails to
   * the same person. Those protect the domain from volume, and volume is not
   * what is happening when Sarah sends sixteen demos she just built.
   *
   * It lifts NOTHING that protects a person. An unsubscribe, a suppression, a
   * previous hard bounce, a do-not-contact flag and a missing address still
   * refuse, and there is no flag anywhere in this codebase that gets past
   * them. That is not caution, it is the law, and it is also the only reason
   * a list stays worth having.
   *
   * The hard rolling ceiling still stands. It is the one volume number that
   * exists to keep this domain out of a blocklist, and no button gets past it.
   */
  override?: { reason: string } | null;
};

/**
 * May this specific message go, right now, to this specific person?
 *
 * The order matters: cheap global checks first, so a paused engine costs one
 * comparison rather than a suppression query per recipient.
 */
export async function authorize(input: AuthorizeInput): Promise<GovernorDecision> {
  const db = input.db ?? getSupabase();
  const now = input.now ?? new Date();
  const checks: GovernorCheck[] = [];
  const add = (id: string, label: string, passed: boolean, detail: string, critical = true) =>
    checks.push({ id, label, passed, detail, critical });

  const settings = input.settings ?? (await getAcqSettings());
  const campaign = input.campaign !== undefined ? input.campaign : await getCampaign();
  const override = input.override ?? null;
  /** Note a gate that only passed because a human said so, rather than hide it. */
  const lifted = (label: string) => `${label} Lifted by hand: ${override!.reason}`;

  const ceiling = settings.global_rolling_24h_ceiling ?? 4500;
  const allowance = Math.min(settings.adaptive_daily_allowance ?? 100, ceiling);
  const senderState = (settings.sender_state ?? 'validating') as SenderState;

  const deny = (retryAfter: Date | null = null): GovernorDecision => {
    const failed = checks.find((c) => c.critical && !c.passed);
    return {
      allowed: false,
      reason: failed ? `${failed.label}: ${failed.detail}` : 'Refused.',
      checks,
      remainingToday: 0,
      remainingThisHour: 0,
      retryAfter,
      senderState,
      allowance,
      ceiling,
    };
  };

  /* ── global posture ── */

  add('master', 'Master switch', !settings.master_paused, settings.master_paused ? (settings.paused_reason ?? 'The acquisition engine is paused.') : 'Running.');
  if (settings.master_paused) return deny();

  add('email-toggle', 'Outbound email', settings.email_enabled, settings.email_enabled ? 'Enabled.' : 'Outbound email is switched off in Acquisition settings.');
  if (!settings.email_enabled) return deny();

  const campaignLive = campaign?.status === 'live';
  add('campaign', 'Campaign status', campaignLive, campaignLive ? 'Live.' : `Campaign is ${campaign?.status ?? 'missing'}.`);
  if (!campaignLive) return deny();

  add(
    'sender-state',
    'Sender state',
    senderState !== 'paused' && senderState !== 'restricted',
    senderState === 'paused' || senderState === 'restricted'
      ? `The sender is ${SENDER_STATE_LABELS[senderState]}${settings.sender_state_reason ? `: ${settings.sender_state_reason}` : '.'}`
      : SENDER_STATE_LABELS[senderState],
  );
  if (senderState === 'paused' || senderState === 'restricted') return deny();

  /* ── the send window ── */

  if (campaign) {
    const { hour, weekday } = denverParts(now);
    const dayOk = !campaign.send_weekdays_only || (weekday >= 1 && weekday <= 5);
    const hourOk = hour >= campaign.send_start_hour && hour < campaign.send_end_hour;
    add(
      'window',
      'Send window',
      (dayOk && hourOk) || Boolean(override),
      dayOk && hourOk
        ? `Inside ${campaign.send_start_hour}:00 to ${campaign.send_end_hour}:00 Mountain.`
        : (override ? lifted : (t: string) => t)(
            `Outside the send window (${campaign.send_start_hour}:00 to ${campaign.send_end_hour}:00 Mountain${campaign.send_weekdays_only ? ', weekdays' : ''}).`,
          ),
    );
    if ((!dayOk || !hourOk) && !override) return deny(nextWindowOpen(campaign, now));
  }

  /* ── volume, against the allowance and then the ceiling ── */

  if (!db) {
    add('db', 'Database', false, 'The governor cannot reach the database.');
    return deny();
  }

  let rolling: Rolling;
  try {
    rolling = input.rolling ?? (await rollingCounts(db));
  } catch (err) {
    add('volume-read', 'Recent volume', false, err instanceof Error ? err.message : 'Send volume is unreadable.');
    return deny();
  }
  const sent24h = rolling.sent24h + (input.sentThisRun ?? 0);
  const sent1h = rolling.sent1h + (input.sentThisRun ?? 0);

  add('ceiling', 'Rolling 24 hour ceiling', sent24h < ceiling, `${sent24h} of ${ceiling} in the last 24 hours. This is a ceiling, not a target.`);
  if (sent24h >= ceiling) return deny(new Date(now.getTime() + 60 * 60 * 1000));

  const allowanceDetail = `${sent24h} of ${allowance} allowed at the ${SENDER_STATE_LABELS[senderState].toLowerCase()} sender state.`;
  add(
    'allowance',
    'Adaptive allowance',
    sent24h < allowance || Boolean(override),
    sent24h < allowance || !override ? allowanceDetail : lifted(allowanceDetail),
  );
  if (sent24h >= allowance && !override) return deny(new Date(now.getTime() + 60 * 60 * 1000));

  const hourCap = campaign?.hourly_send_cap ?? 25;
  const hourDetail = `${sent1h} of ${hourCap} in the last hour.`;
  add('hourly', 'Hourly rate', sent1h < hourCap || Boolean(override), sent1h < hourCap || !override ? hourDetail : lifted(hourDetail));
  if (sent1h >= hourCap && !override) return deny(new Date(now.getTime() + 15 * 60 * 1000));

  /* ── measured health ── */

  const measurable = sent24h >= RATE_MEASUREMENT_FLOOR;
  const bounceRate = measurable ? (rolling.bounced24h / Math.max(1, sent24h)) * 100 : 0;
  const complaintRate = measurable ? (rolling.complained24h / Math.max(1, sent24h)) * 100 : 0;
  const maxBounce = Number(settings.max_bounce_rate_pct ?? 4);
  const maxComplaint = Number(settings.max_complaint_rate_pct ?? 0.1);

  const bounceDetail = measurable
    ? `${bounceRate.toFixed(2)}% over the last 24 hours, ceiling ${maxBounce}%. ${rolling.bounced24h} permanent of ${sent24h} sent${rolling.softBounced24h ? `, plus ${rolling.softBounced24h} soft that do not count` : ''}.`
    : `${sent24h} sent in the last 24 hours; the rate is not measured under ${RATE_MEASUREMENT_FLOOR}.`;
  add(
    'bounce-rate',
    'Bounce rate',
    bounceRate <= maxBounce || Boolean(override),
    bounceRate <= maxBounce || !override ? bounceDetail : lifted(bounceDetail),
  );
  if (bounceRate > maxBounce && !override) return deny();

  const complaintDetail = measurable
    ? `${complaintRate.toFixed(3)}% over the last 24 hours, ceiling ${maxComplaint}%.`
    : `${sent24h} sent in the last 24 hours; the rate is not measured under ${RATE_MEASUREMENT_FLOOR}.`;
  add(
    'complaint-rate',
    'Complaint rate',
    complaintRate <= maxComplaint || Boolean(override),
    complaintRate <= maxComplaint || !override ? complaintDetail : lifted(complaintDetail),
  );
  if (complaintRate > maxComplaint && !override) return deny();

  /* ── this recipient ── */

  const lead = input.lead;
  const email = (lead.email ?? '').trim().toLowerCase();
  add('address', 'Recipient address', Boolean(email), email ? email : 'No email address on the prospect.');
  if (!email) return deny();

  // Eligibility is cached on the lead row and can be stale; this is the live
  // gate, so the same rule is enforced again here. Mailing our own inbox burns
  // a send, teaches the funnel a lie, and reads to Resend as self-traffic.
  const ours = isInternalAddress(email);
  add('not-ours', 'Recipient is theirs', !ours, ours ? `${email} is one of our own addresses, not the prospect's.` : 'A real outside address.');
  if (ours) return deny();

  add('test', 'Real prospect', !lead.is_test, lead.is_test ? 'Marked as a test prospect.' : 'Real prospect.');
  if (lead.is_test) return deny();

  add('opt-out', 'Opt-out', !lead.unsubscribed_at, lead.unsubscribed_at ? 'They unsubscribed. Permanent.' : 'No opt-out on file.');
  if (lead.unsubscribed_at) return deny();

  add('bounced', 'Previous bounce', !lead.bounced, lead.bounced ? 'This address has hard bounced before.' : 'No prior bounce.');
  if (lead.bounced) return deny();

  add('dnc', 'Do not contact', !(lead.dnc_checked || lead.status === 'dnc'), lead.dnc_checked || lead.status === 'dnc' ? 'On the do-not-contact list.' : 'Not on the DNC list.');
  if (lead.dnc_checked || lead.status === 'dnc') return deny();

  const tier = lead.email_tier ?? tierFor(lead);
  const allowedTiers = settings.allowed_email_tiers ?? ['A', 'B', 'C'];
  const tierOk = isMailableEmailStatus(lead.email_status) && allowedTiers.includes(tier);
  add('confidence', 'Email confidence', tierOk, tierOk ? `Tier ${tier} (${lead.email_status}).` : `Tier ${tier} (${lead.email_status ?? 'unknown'}) is not in the allowed set ${allowedTiers.join(', ')}.`);
  if (!tierOk) return deny();

  // The suppression list is checked HERE, at execution, not when the job was
  // queued. Somebody can unsubscribe in the hours between the two, and the
  // schedule has to lose that argument every time.
  let suppressed: Awaited<ReturnType<typeof activeSuppressions>>;
  try {
    suppressed = await activeSuppressions([email]);
  } catch (err) {
    add('suppression', 'Suppression list', false, err instanceof Error ? err.message : 'The suppression list is unreadable.');
    return deny();
  }
  const blocked = suppressed.get(email);
  add('suppression', 'Suppression list', !blocked, blocked ? `Suppressed: ${blocked.reason ?? 'opted out'}.` : 'Not suppressed.');
  if (blocked) return deny();

  const minDays = settings.min_days_between_emails ?? 2;
  const last = lead.last_campaign_email_at ? new Date(lead.last_campaign_email_at) : null;
  const daysSince = last ? (now.getTime() - last.getTime()) / 86400000 : Infinity;
  const frequencyOk = daysSince >= minDays;
  const freqDetail = frequencyOk
    ? last
      ? `Last emailed ${Math.floor(daysSince)} days ago.`
      : 'Never emailed.'
    : `Emailed ${daysSince.toFixed(1)} days ago, minimum gap is ${minDays} days.`;
  add('frequency', 'Contact frequency', frequencyOk || Boolean(override), frequencyOk || !override ? freqDetail : lifted(freqDetail));
  if (!frequencyOk && !override) return deny(new Date(last!.getTime() + minDays * 86400000));

  return {
    allowed: true,
    reason: null,
    checks,
    remainingToday: Math.max(0, Math.min(allowance, ceiling) - sent24h),
    remainingThisHour: Math.max(0, hourCap - sent1h),
    retryAfter: null,
    senderState,
    allowance,
    ceiling,
  };
}

/**
 * Email confidence tier, from the provenance we recorded when the address was
 * found. Tier A is publicly listed AND independently verified, B is enrichment
 * plus verification, C is publicly displayed but unverified.
 */
export function tierFor(lead: Pick<AcqProspect, 'email_status' | 'email_source' | 'email_confidence'>): 'A' | 'B' | 'C' | 'HOLD' {
  const status = lead.email_status;
  const fromProvider = /hunter|provider|enrich/i.test(lead.email_source ?? '');
  if (status === 'verified') return fromProvider ? 'B' : 'A';
  if (status === 'likely') return (lead.email_confidence ?? 0) >= 70 ? 'A' : 'C';
  if (status === 'public') return 'C';
  return 'HOLD';
}

/* ─────────────────────────── recording a send ───────────────────────────── */

/**
 * Write the send the governor just allowed. Called immediately after the
 * provider accepts, because the rolling window is counted off this table and a
 * send that is not recorded is a send the ceiling does not know about.
 */
export async function recordSend(
  db: SupabaseClient,
  row: {
    leadId: string | null;
    campaignId: string | null;
    cohortId?: string | null;
    kind: string;
    step?: number | null;
    variant?: string | null;
    to: string;
    from: string;
    subject: string;
    providerMessageId?: string | null;
    status?: string;
  },
): Promise<void> {
  await db.from('acq_sends').insert({
    lead_id: row.leadId,
    campaign_id: row.campaignId,
    cohort_id: row.cohortId ?? null,
    kind: row.kind,
    step: row.step ?? null,
    variant: row.variant ?? null,
    to_email: row.to.toLowerCase(),
    from_email: row.from,
    subject: row.subject.slice(0, 300),
    provider_message_id: row.providerMessageId ?? null,
    status: row.status ?? 'sent',
  });
}

/** Record a refusal, so "why did nothing go out" has an answer. */
export async function recordRefusal(
  db: SupabaseClient,
  lead: AcqProspect,
  campaignId: string | null,
  reason: string,
  // The kind matters: a demo suite email refused for volume reads as an
  // ordinary campaign refusal unless the row says which one it was, and
  // "the demos never went" is exactly the question this table has to answer.
  kind: 'campaign' | 'followup' | 'demo' | 'checkout' = 'campaign',
): Promise<void> {
  await db.from('acq_sends').insert({
    lead_id: lead.id,
    campaign_id: campaignId,
    kind,
    to_email: (lead.email ?? 'unknown').toLowerCase(),
    from_email: 'sarah@modernmustardseed.com',
    status: 'refused',
    refused_reason: reason.slice(0, 500),
  });
}

/* ───────────────────────────── the ramp itself ──────────────────────────── */

export type RampResult = { changed: boolean; from: number; to: number; state: SenderState; reason: string };

/**
 * Move the allowance, in one direction, once. Called by the cron.
 *
 * Up requires evidence: a real day of volume at the current allowance with
 * clean rates. Down requires only a bad signal, and takes a full step.
 * Asymmetry is the point.
 */
export async function rampSender(db: SupabaseClient, now = new Date()): Promise<RampResult> {
  const settings = await getAcqSettings();
  const ceiling = settings.global_rolling_24h_ceiling ?? 4500;
  const current = Math.min(settings.adaptive_daily_allowance ?? 100, ceiling);
  const state = (settings.sender_state ?? 'validating') as SenderState;
  const rolling = await rollingCounts(db);

  const measurable = rolling.sent24h >= RATE_MEASUREMENT_FLOOR;
  const bounceRate = measurable ? (rolling.bounced24h / rolling.sent24h) * 100 : 0;
  const complaintRate = measurable ? (rolling.complained24h / rolling.sent24h) * 100 : 0;
  const maxBounce = Number(settings.max_bounce_rate_pct ?? 4);
  const maxComplaint = Number(settings.max_complaint_rate_pct ?? 0.1);

  const apply = async (to: number, nextState: SenderState, reason: string): Promise<RampResult> => {
    await db
      .from('acq_settings')
      .update({
        adaptive_daily_allowance: to,
        sender_state: nextState,
        sender_state_reason: reason,
        sender_state_at: now.toISOString(),
        last_ramp_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', true);
    return { changed: to !== current || nextState !== state, from: current, to, state: nextState, reason };
  };

  // Down, hard, on anything that looks like damage.
  if (measurable && complaintRate > maxComplaint) {
    return apply(RAMP_STEPS[0], 'restricted', `Complaint rate ${complaintRate.toFixed(3)}% is over the ${maxComplaint}% ceiling. Cold sending is held.`);
  }
  if (measurable && bounceRate > maxBounce) {
    return apply(backOffStep(current), 'caution', `Bounce rate ${bounceRate.toFixed(2)}% is over the ${maxBounce}% ceiling. Allowance stepped back.`);
  }

  // Up, slowly, and only with a real day of evidence behind it.
  const lastRamp = settings.last_ramp_at ? new Date(settings.last_ramp_at) : null;
  const hoursSinceRamp = lastRamp ? (now.getTime() - lastRamp.getTime()) / 3600000 : Infinity;
  const usedMost = rolling.sent24h >= current * 0.8;

  if (hoursSinceRamp >= 24 && usedMost && measurable && bounceRate <= maxBounce / 2 && complaintRate <= maxComplaint / 2) {
    const to = nextRampStep(current, ceiling);
    if (to > current) {
      const nextState: SenderState = to >= ceiling ? 'mature' : to >= 1000 ? 'scaling' : 'healthy';
      return apply(to, nextState, `A clean day at ${current}. Allowance raised to ${to}.`);
    }
    return apply(current, 'mature', `Holding at the ceiling of ${ceiling}.`);
  }

  return {
    changed: false,
    from: current,
    to: current,
    state,
    reason: !measurable
      ? 'Not enough volume yet to judge. Holding.'
      : !usedMost
        ? `Only ${rolling.sent24h} of the ${current} allowance used. No reason to raise it.`
        : `Waiting out the 24 hour ramp window (${Math.floor(hoursSinceRamp)}h so far).`,
  };
}
