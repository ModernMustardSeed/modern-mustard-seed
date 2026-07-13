import { z } from 'zod';

/**
 * Outbound Revenue Rescue Cockpit: shared types, zod schemas, and helpers.
 * Tables live in supabase/migrations/035_outbound.sql (outbound_* namespace,
 * because public.leads is already the inbound CRM from 001).
 */

export const NICHES = ['home_service', 'dental_medspa', 'real_estate', 'restaurant', 'other'] as const;
export type Niche = (typeof NICHES)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'callback', 'demo_booked', 'pilot_live', 'won', 'lost', 'dnc'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CALL_OUTCOMES = ['no_answer', 'gatekeeper', 'voicemail', 'conversation', 'demo_booked', 'not_interested', 'callback'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const SCRIPT_STAGES = ['opener', 'hook_bad', 'hook_good', 'gap_question', 'revenue_math', 'close', 'objection', 'voicemail', 'gatekeeper'] as const;
export type ScriptStage = (typeof SCRIPT_STAGES)[number];

export const PRICING_MODELS = ['convert_to_setprice', 'rev_share'] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const NICHE_LABELS: Record<Niche, string> = {
  home_service: 'Home service',
  dental_medspa: 'Dental / medspa',
  real_estate: 'Real estate',
  restaurant: 'Restaurant',
  other: 'Other',
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  callback: 'Callback',
  demo_booked: 'Demo booked',
  pilot_live: 'Pilot live',
  won: 'Won',
  lost: 'Lost',
  dnc: 'DNC',
};

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: 'No answer',
  gatekeeper: 'Gatekeeper',
  voicemail: 'Voicemail',
  conversation: 'Conversation',
  demo_booked: 'Demo booked',
  not_interested: 'Not interested',
  callback: 'Callback',
};

export type Rep = {
  id: string;
  name: string;
  role: string;
  daily_dial_goal: number;
  daily_demo_goal: number;
  active: boolean;
};

/** Shape of the cached website audit (matches lib/website-audit.ts report). */
export type OutboundAudit = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis: string;
  categories?: Record<string, { score: number; letter: string; notes: string }>;
  top_three_fixes?: { title: string; why: string; how: string }[];
  full_todo?: { category: string; priority: string; task: string }[];
};

export type OutboundLead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  niche: Niche;
  city: string | null;
  state: string | null;
  avg_job_value: number | null;
  est_missed_calls_week: number | null;
  close_rate_pct: number | null;
  status: LeadStatus;
  source: string | null;
  owner_rep_id: string | null;
  dnc_checked: boolean;
  next_action_at: string | null;
  notes: string | null;
  audit_score: number | null;
  audit_url: string | null;
  audit_json: OutboundAudit | null;
  audit_at: string | null;
  pipeline_lead_id: string | null;
  email_opened_at: string | null;
  email_open_count: number;
  last_email_at: string | null;
  last_open_at: string | null;
  demo_url: string | null;
  demo_run_id: string | null;
  site_demo_id: string | null;
  site_demo_url: string | null;
  site_demo_status: SiteDemoStatus | null;
  os_demo_id: string | null;
  os_demo_url: string | null;
  os_demo_status: 'ready' | null;
  hub_demo_id: string | null;
  hub_demo_url: string | null;
  created_at: string;
  updated_at: string;
};

/** Lifecycle of the forged demo WEBSITE (built by the local demo-site worker). */
export type SiteDemoStatus = 'queued' | 'building' | 'ready' | 'failed';

/** Why a lead is where it is in the heat-ranked queue. */
export type HeatReason =
  | 'replied'
  | 'reading_now'
  | 'self_serve'
  | 'opened_recently'
  | 'callback_due'
  | 'retry_due'
  | 'worst_audit'
  | 'review_pain'
  | 'no_website'
  | 'fresh';

export const HEAT_LABELS: Record<HeatReason, string> = {
  replied: 'Replied',
  reading_now: 'Reading your audit now',
  self_serve: 'Forged their own demos',
  opened_recently: 'Opened the email',
  callback_due: 'Callback due',
  retry_due: 'Retry due',
  worst_audit: 'Painful audit',
  review_pain: 'Customers cannot reach them',
  no_website: 'No real website',
  fresh: 'Fresh lead',
};

export type ThreadMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  from_addr: string | null;
  to_addr: string | null;
  subject: string | null;
  snippet: string | null;
  body: string | null;
  read: boolean;
  occurred_at: string;
};

export type CallLog = {
  id: string;
  lead_id: string;
  rep_id: string;
  called_at: string;
  outcome: CallOutcome;
  duration_sec: number | null;
  disposition: string | null;
  next_action: string | null;
  next_action_at: string | null;
};

export type Pilot = {
  id: string;
  lead_id: string;
  started_at: string;
  ends_at: string;
  calls_caught: number;
  revenue_recovered: number;
  pricing_model: PricingModel;
  convert_price: number | null;
  rev_share_pct: number | null;
  monthly_floor: number | null;
  vapi_assistant_id: string | null;
  status: 'running' | 'won' | 'lost';
  notes: string | null;
  lead?: Pick<OutboundLead, 'id' | 'business_name' | 'contact_name' | 'phone' | 'niche' | 'city' | 'avg_job_value'>;
};

export type Script = {
  id: string;
  name: string;
  niche: Niche | null;
  stage: ScriptStage;
  body: string;
  is_verbatim: boolean;
  source: string | null;
  sort_order: number;
};

export type DailyRepStat = {
  rep_id: string;
  day: string;
  dials: number;
  conversations: number;
  demos_booked: number;
};

/* ---------------------------- zod input schemas ---------------------------- */

const trimmed = (max: number) => z.string().trim().max(max);
// Both helpers end in .optional() so an absent key is valid (zod v4 requires
// explicit key optionality; a union containing undefined is not enough).
const optionalText = (max: number) =>
  z
    .union([trimmed(max), z.literal(''), z.null()])
    .transform((v) => (v ? v : null))
    .optional();
const optionalNumber = (max = 100_000_000) =>
  z
    .union([z.number(), z.string(), z.null()])
    .transform((v) => {
      if (v === null || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    })
    .pipe(z.union([z.number().min(0).max(max), z.null()]))
    .optional();

export const leadInputSchema = z.object({
  business_name: trimmed(200).min(1, 'Business name is required.'),
  contact_name: optionalText(200),
  phone: trimmed(40).min(7, 'A dialable phone number is required.'),
  email: optionalText(200),
  website: optionalText(300),
  niche: z.enum(NICHES).default('other'),
  city: optionalText(120),
  state: optionalText(40),
  avg_job_value: optionalNumber(),
  est_missed_calls_week: optionalNumber(500),
  close_rate_pct: optionalNumber(100),
  status: z.enum(LEAD_STATUSES).default('new'),
  source: optionalText(120),
  owner_rep_id: optionalText(60),
  dnc_checked: z.boolean().default(false),
  notes: optionalText(4000),
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadPatchSchema = leadInputSchema.partial().extend({
  next_action_at: optionalText(60),
});
export type LeadPatch = z.infer<typeof leadPatchSchema>;

export const importRowsSchema = z.object({
  rows: z.array(leadInputSchema).min(1, 'No rows to import.').max(2000, 'Import 2000 rows at a time or fewer.'),
});

export const callInputSchema = z.object({
  lead_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  outcome: z.enum(CALL_OUTCOMES),
  duration_sec: optionalNumber(60 * 60 * 6),
  disposition: optionalText(2000),
  next_action: optionalText(400),
  next_action_at: optionalText(60),
});
export type CallInput = z.infer<typeof callInputSchema>;

export const pilotInputSchema = z.object({
  lead_id: z.string().uuid(),
  pricing_model: z.enum(PRICING_MODELS).default('convert_to_setprice'),
  convert_price: optionalNumber(),
  rev_share_pct: optionalNumber(15),
  monthly_floor: optionalNumber(),
  notes: optionalText(2000),
});

export const pilotPatchSchema = z.object({
  calls_caught: optionalNumber(100000),
  revenue_recovered: optionalNumber(),
  pricing_model: z.enum(PRICING_MODELS).optional(),
  convert_price: optionalNumber(),
  rev_share_pct: optionalNumber(15),
  monthly_floor: optionalNumber(),
  vapi_assistant_id: optionalText(80),
  status: z.enum(['running', 'won', 'lost']).optional(),
  notes: optionalText(2000),
  ends_at: optionalText(60),
});

/* --------------------------------- helpers -------------------------------- */

/** Digits-only key used for dedupe. Strips a leading US country code. */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

export function formatPhone(phone: string): string {
  const d = phoneKey(phone);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

/** The weapon. monthlyLeak = missedCallsWeek * 4.3 * (closeRate/100) * avgJobValue */
export function monthlyLeak(missedCallsWeek: number, closeRatePct: number, avgJobValue: number): number {
  return missedCallsWeek * 4.3 * (closeRatePct / 100) * avgJobValue;
}

export function fmtMoney(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const DENVER = 'America/Denver';

/** YYYY-MM-DD for "today" in America/Denver. */
export function denverToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DENVER }).format(now);
}

/** YYYY-MM-DD of the Monday starting the current Denver week. */
export function denverWeekStart(now = new Date()): string {
  const today = denverToday(now);
  const [y, m, d] = today.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = utcNoon.getUTCDay(); // 0 Sun .. 6 Sat, for the Denver calendar date
  const back = dow === 0 ? 6 : dow - 1;
  utcNoon.setUTCDate(utcNoon.getUTCDate() - back);
  return utcNoon.toISOString().slice(0, 10);
}

/** ISO timestamp for the end of the Denver day (used for "due today or overdue"). */
export function denverEndOfToday(now = new Date()): string {
  const today = denverToday(now);
  // Denver is UTC-6 (MDT) or UTC-7 (MST). 23:59:59 Denver is at latest 06:59:59 UTC next day.
  const [y, m, d] = today.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d + 1, 7, 0, 0));
  return guess.toISOString();
}

export function daysLeft(endsAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / 86400000));
}

/**
 * Interpret a date + time the rep typed as Mountain Time (America/Denver),
 * whatever the machine's clock is set to, and return the UTC instant. Two
 * correction passes converge across DST boundaries.
 */
export function denverIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const desired = Date.UTC(y, m - 1, d, hh, mm);
  let utc = desired;
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: DENVER,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utc));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    utc += desired - shown;
  }
  return new Date(utc).toISOString();
}
