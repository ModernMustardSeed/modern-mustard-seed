/**
 * THE MR. MUSTARD ACQUISITION ENGINE — shared vocabulary.
 *
 * One journey, five words: Prospect → Permission → Mr. Mustard → Forge → Sale.
 * Every stage name, score band and status string in the engine comes from here,
 * so the admin, the queue, the emails and the voice tools can never disagree
 * about what a lead's state actually is.
 */

import { DEMO_PRODUCTS } from '@/lib/demo-order';
import { TRADE_DEFS } from '@/lib/acq/trades';

/* ─────────────────────────────── the trades ─────────────────────────────── */

/**
 * Every industry the engine can source, sell to and answer the phone for.
 *
 * The definitions (how to find them, what a job is worth, how Mr. Mustard
 * behaves as their receptionist) live in lib/acq/trades.ts, one block each.
 * Only the key list lives here, because this file is imported by the database
 * types and must not pull in the sourcing regexes.
 */
export const TRADES = [
  'hvac',
  'plumbing',
  'roofing',
  'electrical',
  'garage_door',
  'appliance_repair',
  'restoration',
  'pest_control',
  'landscaping',
  'tree_service',
  'pool_service',
  'chimney',
  'painting',
  'flooring',
  'auto_repair',
  'veterinary',
  /* the construction family (2026-08-22) */
  'general_contractor',
  'concrete',
  'masonry',
  'fencing',
  'siding_gutters',
  'windows_doors',
  'septic',
  'well_water',
  'excavation',
  'paving',
  'other',
] as const;
export type Trade = (typeof TRADES)[number];

/**
 * Display names and the two things the voice agent needs, derived from the
 * registry so an industry is added in exactly one place. `other` is the honest
 * fallback for a business we banked without pinning the trade.
 */
export const TRADE_LABELS: Record<Trade, string> = Object.fromEntries([
  ...Object.entries(TRADE_DEFS).map(([k, d]) => [k, d.label]),
  ['other', 'Other trade'],
]) as Record<Trade, string>;

/** What a customer of this trade calls about when it is urgent and expensive. */
export const TRADE_SCENARIOS: Record<Trade, string[]> = Object.fromEntries([
  ...Object.entries(TRADE_DEFS).map(([k, d]) => [k, d.scenarios]),
  ['other', ['an urgent service call after hours', 'a quote on a job worth real money']],
]) as Record<Trade, string[]>;

/** The greeting a receptionist for this trade actually opens with at 11pm. */
export const TRADE_ROLEPLAY_NOTE: Record<Trade, string> = Object.fromEntries([
  ...Object.entries(TRADE_DEFS).map(([k, d]) => [k, d.roleplay]),
  ['other', 'Handle it like an excellent front desk: who is calling, what they need, how urgent, and how to reach them.'],
]) as Record<Trade, string>;

/* ─────────────────────────── the journey stages ─────────────────────────── */

export const ACQ_STAGES = [
  'prospect',
  'emailed',
  'consented',
  'called',
  'demoed',
  'forged',
  'demo_sent',
  'meeting',
  'client',
  'lost',
] as const;
export type AcqStage = (typeof ACQ_STAGES)[number];

export const STAGE_LABELS: Record<AcqStage, string> = {
  prospect: 'Prospect',
  emailed: 'Email sent',
  consented: 'Consented',
  called: 'Mr. Mustard called',
  demoed: 'Demo completed',
  forged: 'Agent forged',
  demo_sent: 'Demo sent',
  meeting: 'Meeting / checkout',
  client: 'Client',
  lost: 'Lost',
};

/** The funnel, in order, as the Command Center draws it. */
export const FUNNEL_STAGES: AcqStage[] = [
  'prospect',
  'emailed',
  'consented',
  'called',
  'demoed',
  'forged',
  'demo_sent',
  'meeting',
  'client',
];

/* ───────────────────────────── email quality ────────────────────────────── */

export const EMAIL_STATUSES = ['verified', 'likely', 'public', 'risky', 'invalid', 'unknown'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  verified: 'Verified',
  likely: 'Likely valid',
  public: 'Publicly listed',
  risky: 'Risky',
  invalid: 'Invalid',
  unknown: 'Unknown',
};

/**
 * THE SEND GATE. Nothing outside this set is ever mailed by the campaign, and
 * the check lives in one place so no future surface can quietly widen it.
 * `risky` and `invalid` are excluded on purpose: a bounce costs the sending
 * domain far more than a lead is worth, and this rides sarah@modernmustardseed.com.
 */
export const MAILABLE_EMAIL_STATUSES: EmailStatus[] = ['verified', 'likely', 'public'];

export function isMailableEmailStatus(s: string | null | undefined): boolean {
  return MAILABLE_EMAIL_STATUSES.includes(s as EmailStatus);
}

/* ──────────────────────────── the call record ───────────────────────────── */

export type CallStage = 'none' | 'requested' | 'queued' | 'ringing' | 'attempted' | 'completed' | 'failed';
export type DemoStatus = 'none' | 'requested' | 'forging' | 'ready' | 'failed';
export type ConsentStatus = 'none' | 'granted' | 'revoked';

/* ─────────────────────────── the queue job kinds ────────────────────────── */

export const QUEUE_KINDS = ['email', 'call', 'forge', 'demo_email', 'checkout', 'research', 'followup'] as const;
export type QueueKind = (typeof QUEUE_KINDS)[number];

/* ───────────────────────────── canonical price ──────────────────────────── */

/**
 * The offer this campaign sells, read from the ONE place price lives
 * (data/sidekick.ts → lib/demo-order.ts). Never retype the number: if Sarah
 * reprices the Voice Agent, the emails, the goal math and Mr. Mustard's script
 * all move with it on the next request.
 */
export const OFFER = {
  get name() {
    return DEMO_PRODUCTS.voice.name;
  },
  get setupCents() {
    return DEMO_PRODUCTS.voice.setupCents;
  },
  get monthlyCents() {
    return DEMO_PRODUCTS.voice.monthlyCents;
  },
  get setupUsd() {
    return Math.round(DEMO_PRODUCTS.voice.setupCents / 100);
  },
  get monthlyUsd() {
    return Math.round(DEMO_PRODUCTS.voice.monthlyCents / 100);
  },
  /** "$397 setup + $397/month" — the exact phrase every surface uses. */
  get line() {
    return `$${Math.round(DEMO_PRODUCTS.voice.setupCents / 100)} setup + $${Math.round(
      DEMO_PRODUCTS.voice.monthlyCents / 100,
    )}/month`;
  },
} as const;

/* ────────────────────────────── the campaign ────────────────────────────── */

export const CAMPAIGN_SLUG = 'meet-mr-mustard';

export type AcqCampaign = {
  id: string;
  slug: string;
  name: string;
  status: 'draft' | 'live' | 'paused' | 'stopped';
  goal_clients: number;
  daily_send_cap: number;
  hourly_send_cap: number;
  send_start_hour: number;
  send_end_hour: number;
  send_weekdays_only: boolean;
  from_name: string;
  from_email: string;
  reply_to: string;
  /**
   * Business days to wait AFTER email n before email n+1, so entry [0] is the
   * gap between emails 1 and 2. A six email sequence has five entries; the
   * sequence length is read from this array, never hard-coded.
   */
  step_after_days: number[];
  max_call_attempts: number;
  settings: Record<string, unknown>;
  started_at: string | null;
  paused_at: string | null;
  /* goals, which are milestones and never ceilings (migration 095) */
  goal_mrr_cents: number;
  goal_revenue_cents: number;
  goal_horizon_months: number;
  goal_started_on: string | null;
  monthly_client_target_min: number;
  monthly_client_target_stretch: number;
};

export type AcqVariant = {
  id: string;
  campaign_id: string;
  key: string;
  step: number;
  subject: string;
  cta_label: string;
  body_key: string;
  weight: number;
  active: boolean;
};

export type AcqSettings = {
  master_paused: boolean;
  sourcing_enabled: boolean;
  enrichment_enabled: boolean;
  email_enabled: boolean;
  calls_enabled: boolean;
  followups_enabled: boolean;
  daily_sourcing_enabled: boolean;
  daily_sourcing_target: number;
  daily_sourcing_split: Record<string, number>;
  total_campaign_max: number;
  min_lead_score: number;
  paused_reason: string | null;
  updated_at: string;
  /* the governor (migration 095) */
  global_rolling_24h_ceiling: number;
  sender_state: string;
  sender_state_reason: string | null;
  sender_state_at: string;
  adaptive_daily_allowance: number;
  last_ramp_at: string | null;
  max_bounce_rate_pct: number;
  max_complaint_rate_pct: number;
  min_days_between_emails: number;
  allowed_email_tiers: string[];
  target_ready_inventory: number;
  hunter_min_lead_score: number;
  hunter_daily_credit_cap: number;
};

/**
 * The acquisition view of a lead. A superset of OutboundLead's acquisition
 * columns; queries select what they need, so this is intentionally partial-safe.
 */
export type AcqProspect = {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_title: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  niche: string;
  trade: Trade | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postal_code: string | null;
  service_area: string | null;
  email_status: EmailStatus | null;
  email_confidence: number | null;
  email_source: string | null;
  email_source_url: string | null;
  contact_source_url: string | null;
  phone_type: string | null;
  rating: number | null;
  review_count: number | null;
  hours: Record<string, string> | null;
  open_24_7: boolean;
  emergency_service: boolean;
  call_volume_score: number | null;
  missed_call_score: number | null;
  lead_score: number | null;
  score_reasons: ScoreReason[] | null;
  priority: number | null;
  source: string | null;
  source_urls: string[] | null;
  acq_campaign_id: string | null;
  acq_stage: AcqStage;
  acq_variant: string | null;
  acq_eligible: boolean;
  acq_ineligible_reason: string | null;
  email_stage: number;
  last_campaign_email_at: string | null;
  reply_at: string | null;
  call_stage: CallStage | null;
  call_attempts: number;
  last_call_at: string | null;
  consent_status: ConsentStatus | null;
  consent_at: string | null;
  consent_id: string | null;
  demo_status: DemoStatus | null;
  demo_emailed_at: string | null;
  checkout_sent_at: string | null;
  checkout_url: string | null;
  meeting_status: string | null;
  meeting_at: string | null;
  payment_status: string | null;
  client_status: string | null;
  won_at: string | null;
  setup_cents: number | null;
  mrr_cents: number | null;
  unsubscribed_at: string | null;
  suppression_reason: string | null;
  bounced: boolean;
  duplicate_of: string | null;
  is_test: boolean;
  assigned_to: string | null;
  last_researched_at: string | null;
  imported_at: string | null;
  needs_human: string | null;
  notes: string | null;
  rep_notes: string | null;
  demo_url: string | null;
  hub_demo_id: string | null;
  hub_demo_url: string | null;
  hub_view_count: number | null;
  site_demo_id: string | null;
  site_demo_url: string | null;
  site_demo_status: string | null;
  os_demo_id: string | null;
  os_demo_url: string | null;
  os_demo_status: string | null;
  /** The walkthrough film cut off THEIR suite, once the website build lands. */
  suite_film_status: 'queued' | 'filming' | 'ready' | 'failed' | null;
  dnc_checked: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  /* the reservoir (migration 095) */
  acq_cohort_id: string | null;
  reservoir_state: ReservoirState;
  email_tier: 'A' | 'B' | 'C' | 'HOLD' | null;
  metro: string | null;
  last_enriched_at: string | null;
  enrichment_provider: string | null;
  enrichment_cost_cents: number | null;
};

/**
 * Where a business sits in the reservoir, which is wider than the campaign
 * journey: a prospect can be RESEARCHING for days before it is ever eligible to
 * be emailed, and NURTURE is a real destination rather than a failure.
 */
export const RESERVOIR_STATES = [
  'discovered', 'researching', 'qualified', 'email_found', 'verified', 'ready', 'hold',
  'queued', 'contacted', 'engaged', 'consented', 'called', 'forged', 'hot', 'meeting',
  'checkout', 'won', 'nurture', 'lost', 'suppressed', 'disqualified',
] as const;
export type ReservoirState = (typeof RESERVOIR_STATES)[number];

export const RESERVOIR_LABELS: Record<ReservoirState, string> = {
  discovered: 'Discovered', researching: 'Researching', qualified: 'Qualified',
  email_found: 'Email found', verified: 'Verified', ready: 'Ready', hold: 'Hold',
  queued: 'Queued', contacted: 'Contacted', engaged: 'Engaged', consented: 'Consented',
  called: 'Mr. Mustard called', forged: 'Forged', hot: 'Hot', meeting: 'Meeting',
  checkout: 'Checkout', won: 'Won', nurture: 'Nurture', lost: 'Lost',
  suppressed: 'Suppressed', disqualified: 'Disqualified',
};

/** The client milestones. A milestone is never a ceiling. */
export const CLIENT_MILESTONES = [50, 100, 210, 500, 1000, 2500, 5000] as const;

/** The MRR milestones, in cents. */
export const MRR_MILESTONES_CENTS = [2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000] as const;

/** One line of "why this lead scored what it scored", shown in the CRM. */
export type ScoreReason = { label: string; points: number };

export type AcqEvent = {
  id: string;
  lead_id: string | null;
  campaign_id: string | null;
  type: string;
  label: string;
  detail: Record<string, unknown>;
  occurred_at: string;
};

export type AcqCall = {
  id: string;
  lead_id: string | null;
  vapi_call_id: string | null;
  status: 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
  attempt: number;
  to_phone: string;
  requested_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  ended_reason: string | null;
  roleplay_scenario: string | null;
  summary: string | null;
  transcript: string | null;
  intel: CallIntel | null;
  outcome: string | null;
};

/** What we pull out of a Mr. Mustard conversation and act on. */
export type CallIntel = {
  pain_point: string | null;
  company_size: string | null;
  current_phone_workflow: string | null;
  missed_call_problem: string | null;
  after_hours_need: string | null;
  objection: string | null;
  requested_features: string[];
  buying_intent: 'high' | 'medium' | 'low' | 'none' | null;
  price_reaction: string | null;
  next_step: string | null;
  competitor: string | null;
  close_probability: number | null;
  roleplay_scenario: string | null;
  needs_human: string | null;
};
