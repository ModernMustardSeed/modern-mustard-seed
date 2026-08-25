import { z } from 'zod';

/**
 * CLIENT FACTORY: the blueprint schema and the row types.
 *
 * The blueprint is the single source of truth for what a Factory is. It is not
 * prose with a JSON wrapper: every field below is something the compiler reads
 * and turns into live configuration, which is why it can be generated,
 * validated, versioned, diffed, deployed, cloned and rolled back. Anything that
 * cannot be expressed here is either a module (reusable behaviour) or genuinely
 * custom engineering, and those are the only three levels that exist.
 *
 * Related: lib/factory/blueprint.ts (validate/diff/version),
 * lib/factory/compiler.ts (blueprint -> live Factory),
 * lib/factory/preflight.ts (may this deploy at all),
 * supabase/migrations/094_client_factory.sql (storage).
 */

/* ─────────────────────────────── enums ─────────────────────────────── */

export const FACTORY_STATUSES = ['draft', 'forging', 'review', 'testing', 'live', 'paused', 'archived'] as const;
export type FactoryStatus = (typeof FACTORY_STATUSES)[number];

export const FACTORY_MODES = ['test', 'live'] as const;
export type FactoryMode = (typeof FACTORY_MODES)[number];

/**
 * How much the Factory may do without a human.
 *  manual   - it recommends, a person approves every outbound action.
 *  assisted - sourcing, enrichment and scoring run themselves; messaging is approved.
 *  factory  - approved workflows run inside the configured guardrails.
 * No level ever lets it change pricing, offers, claims or contract terms.
 */
export const AUTONOMY_LEVELS = ['manual', 'assisted', 'factory'] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const PROSPECT_STATES = [
  'discovered', 'qualified', 'ready', 'active', 'engaged', 'hot', 'won', 'nurture', 'suppressed', 'lost',
] as const;
export type ProspectState = (typeof PROSPECT_STATES)[number];

export const CHANNELS = ['email', 'ai_call', 'human_call', 'sms', 'site'] as const;
export type Channel = (typeof CHANNELS)[number];

/** Channels whose consent requirements are NOT the same. Treating them alike is how a product gets a business sued. */
export const CONSENT_REQUIRED_CHANNELS: Channel[] = ['ai_call', 'sms'];

export const REPLY_CLASSES = [
  'positive', 'question', 'pricing', 'meeting', 'negative', 'unsubscribe', 'ooo', 'wrong_person',
] as const;
export type ReplyClass = (typeof REPLY_CLASSES)[number];

/** The classes a human is expected to look at. Drives the Inbox. */
export const INBOX_CLASSES: ReplyClass[] = ['positive', 'question', 'pricing', 'meeting'];

export const DEFAULT_PIPELINE = [
  'prospect', 'contacted', 'engaged', 'qualified', 'demo', 'meeting', 'proposal', 'won', 'lost',
] as const;

export const TEMPLATE_CHANNELS = ['internal', 'beta', 'stable', 'deprecated'] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

/* ───────────────────────── blueprint schema ────────────────────────── */

const text = (max: number) => z.string().trim().max(max);
const opt = (max: number) =>
  z.union([text(max), z.literal(''), z.null()]).transform((v) => (v ? v : null)).optional();
const list = (max: number, cap = 40) => z.array(text(max).min(1)).max(cap).default([]);
const money = z.union([z.number().min(0).max(1_000_000_000), z.null()]).optional();

/** Who the Factory works for. Facts about the customer, never invented. */
export const businessSchema = z.object({
  name: text(200).min(1),
  website: opt(300),
  industry: opt(120),
  description: opt(2000),
  services: list(200),
  locations: list(160, 60),
  service_area: opt(300),
  team_size: z.union([z.number().int().min(0).max(1_000_000), z.null()]).optional(),
  existing_crm: opt(120),
  existing_calendar: opt(120),
  current_lead_sources: list(120),
  competitors: list(160, 20),
  /** Verbatim, approved claims the AI may make. Nothing outside this list is sayable. */
  approved_claims: list(400, 40),
  /** Explicitly forbidden. Checked by preflight and injected into the agent prompt. */
  prohibited_claims: list(400, 40),
});

/** What the customer sells, at what price. The AI quotes from here or not at all. */
export const offerSchema = z.object({
  headline: text(300).min(1),
  detail: opt(3000),
  packages: z
    .array(
      z.object({
        name: text(160).min(1),
        price_cents: money,
        cadence: z.enum(['one_time', 'monthly', 'annual', 'quote']).default('quote'),
        includes: list(240, 20),
      }),
    )
    .max(20)
    .default([]),
  /** Guarantees, trials, and anything else the AI may offer. Empty means: offer nothing. */
  incentives: list(240, 10),
  /** Set false and the agent refuses every pricing question and routes to a human. */
  ai_may_quote_price: z.boolean().default(false),
  ai_may_discount: z.boolean().default(false),
});

/** Who the Factory should find. Public, observable business characteristics only. */
export const icpSchema = z.object({
  label: text(160).min(1),
  industries: list(120),
  job_titles: list(120),
  employee_min: z.union([z.number().int().min(0).max(1_000_000), z.null()]).optional(),
  employee_max: z.union([z.number().int().min(0).max(1_000_000), z.null()]).optional(),
  geographies: list(120),
  revenue_range: opt(120),
  technology_signals: list(120),
  /** Public traits: review count, location count, site age, no online booking, etc. */
  business_signals: list(200),
  audience: z.enum(['b2b', 'b2c', 'both']).default('b2b'),
  exclusions: list(200),
});

/** Real numbers from the customer. Never modelled, never guessed. */
export const economicsSchema = z.object({
  avg_first_sale_cents: money,
  avg_recurring_cents: money,
  lifetime_value_cents: money,
  gross_margin_pct: z.union([z.number().min(0).max(100), z.null()]).optional(),
  sales_cycle_days: z.union([z.number().int().min(0).max(3650), z.null()]).optional(),
  close_rate_pct: z.union([z.number().min(0).max(100), z.null()]).optional(),
  qualified_lead_value_cents: money,
  target_cac_cents: money,
  /** What makes one prospect worth more than another, in the customer's words. */
  value_drivers: list(240, 12),
});

/** Why anyone buys. This is the acquisition intelligence the messaging runs on. */
export const painSchema = z.object({
  primary: text(600).min(1),
  secondary: opt(600),
  trigger_events: list(240, 12),
  fears: list(240, 12),
  objections: z
    .array(z.object({ objection: text(300).min(1), response: text(1200).min(1) }))
    .max(20)
    .default([]),
  alternatives: list(200, 12),
  urgency: opt(600),
});

/** The differentiator: what the Factory DOES for a prospect before asking for anything. */
export const valueActionSchema = z.object({
  key: text(80).min(1),
  label: text(200).min(1),
  /** Per-tenant configuration, validated against the module's own config_schema. */
  config: z.record(z.string(), z.unknown()).default({}),
  /** Ceiling per run, so one expensive action cannot eat a plan. */
  max_cost_cents: z.number().int().min(0).max(100_000).default(0),
  /** Above this score, run it before the first touch instead of on engagement. */
  preemptive_score: z.union([z.number().int().min(0).max(100), z.null()]).optional(),
  human_approval: z.boolean().default(false),
});

/** The customer's AI salesperson. Identity, limits, and the tools it may hold. */
export const agentSchema = z.object({
  name: text(80).min(1),
  role: text(160).min(1),
  tone: text(400).default('Direct, specific, warm. No hype.'),
  languages: list(40, 10).default([]),
  /** Never optional, never overridable: the agent says it is an AI. */
  disclosure: text(400).default('I am an AI assistant, not a person.'),
  may_discuss: list(240, 30),
  must_not_discuss: list(240, 30),
  escalation_rules: list(300, 20),
  escalation_to: z
    .array(z.object({ label: text(120).min(1), email: text(200).min(1), when: text(300).min(1) }))
    .max(10)
    .default([]),
  /** Tool keys from the MMS Tool Registry. An empty toolbelt is a legal agent. */
  tools: list(80, 40),
  qualification_questions: list(400, 20),
  voice_enabled: z.boolean().default(false),
  voice_assistant_id: opt(120),
});

export const campaignSchema = z.object({
  name: text(200).min(1),
  channel: z.enum(CHANNELS).default('email'),
  icp_label: opt(160),
  offer_headline: opt(300),
  hook: text(600).min(1),
  secondary_hook: opt(600),
  cta: text(300).min(1),
  value_action_key: opt(80),
  sequence: z
    .array(
      z.object({
        step: z.number().int().min(1).max(20),
        day_offset: z.number().int().min(0).max(365),
        subject: text(300).min(1),
        body: text(8000).min(1),
        variant: text(20).default('A'),
      }),
    )
    .max(20)
    .default([]),
  daily_send_cap: z.number().int().min(1).max(2000).default(50),
  conversion_event: z.enum(['meeting', 'checkout', 'reply', 'demo_viewed', 'proposal']).default('meeting'),
  goal: opt(300),
});

export const complianceSchema = z.object({
  /** Physical mailing address on every commercial email. Required to send at all. */
  postal_address: opt(300),
  unsubscribe_url: opt(300),
  sender_domain: opt(160),
  sender_from: opt(200),
  /** Consent is per-channel and never assumed. */
  consent: z
    .object({
      email: z.enum(['legitimate_interest', 'opt_in']).default('legitimate_interest'),
      ai_call: z.enum(['forbidden', 'opt_in_only']).default('forbidden'),
      sms: z.enum(['forbidden', 'opt_in_only']).default('forbidden'),
    })
    .default({ email: 'legitimate_interest', ai_call: 'forbidden', sms: 'forbidden' }),
  /** Healthcare, legal, financial, insurance. Blocks activation until reviewed. */
  regulated_vertical: z.boolean().default(false),
  compliance_review_by: opt(200),
  compliance_notes: opt(2000),
});

export const limitsSchema = z.object({
  prospects_month: z.number().int().min(0).max(1_000_000).default(0),
  emails_month: z.number().int().min(0).max(5_000_000).default(0),
  ai_conversations_month: z.number().int().min(0).max(1_000_000).default(0),
  value_actions_month: z.number().int().min(0).max(1_000_000).default(0),
  voice_minutes_month: z.number().int().min(0).max(1_000_000).default(0),
  monthly_budget_cents: z.number().int().min(0).max(100_000_000).default(0),
});

export const blueprintSchema = z.object({
  /** Bumped when the SHAPE changes, so old docs can be migrated rather than broken. */
  schema_version: z.literal(1).default(1),
  template_key: opt(80),
  template_version: z.union([z.number().int().min(1), z.null()]).optional(),
  business: businessSchema,
  offer: offerSchema,
  icp: z.array(icpSchema).min(1).max(10),
  economics: economicsSchema,
  pain: painSchema,
  agent: agentSchema,
  campaigns: z.array(campaignSchema).min(1).max(20),
  value_actions: z.array(valueActionSchema).max(10).default([]),
  /** Module keys this Factory composes. Checked against plan entitlements at deploy. */
  modules: list(80, 60),
  sourcing: z
    .object({
      providers: list(60, 10),
      inventory_target: z.number().int().min(0).max(1_000_000).default(1000),
      monthly_target: z.number().int().min(0).max(1_000_000).default(500),
      min_score: z.number().int().min(0).max(100).default(40),
      enrichment_budget_cents: z.number().int().min(0).max(10_000_000).default(0),
    })
    .default({ providers: [], inventory_target: 1000, monthly_target: 500, min_score: 40, enrichment_budget_cents: 0 }),
  scoring: z
    .object({
      /** Signal key -> weight. Score is the weighted sum, clamped 0..100. */
      weights: z.record(z.string(), z.number().min(-100).max(100)).default({}),
      threshold_ready: z.number().int().min(0).max(100).default(50),
      threshold_hot: z.number().int().min(0).max(100).default(80),
    })
    .default({ weights: {}, threshold_ready: 50, threshold_hot: 80 }),
  crm: z
    .object({
      pipeline: z.array(text(60).min(1)).min(2).max(20).default([...DEFAULT_PIPELINE]),
      owner_email: opt(200),
    })
    .default({ pipeline: [...DEFAULT_PIPELINE], owner_email: null }),
  scheduling: z
    .object({
      enabled: z.boolean().default(true),
      provider: z.enum(['mms', 'google', 'outlook', 'external']).default('mms'),
      duration_min: z.number().int().min(5).max(480).default(30),
      booking_url: opt(300),
      assign_to: list(200, 10),
    })
    .default({ enabled: true, provider: 'mms', duration_min: 30, booking_url: null, assign_to: [] }),
  checkout: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['stripe', 'external', 'none']).default('none'),
      /** Canonical price ids only. The AI never composes a price. */
      price_refs: list(160, 20),
    })
    .default({ enabled: false, provider: 'none', price_refs: [] }),
  proposals: z
    .object({
      enabled: z.boolean().default(false),
      requires_human_approval: z.boolean().default(true),
      template: opt(120),
    })
    .default({ enabled: false, requires_human_approval: true, template: null }),
  followup: z
    .object({
      max_touches: z.number().int().min(0).max(20).default(4),
      stop_on_reply: z.boolean().default(true),
      nurture_days: z.number().int().min(0).max(3650).default(90),
    })
    .default({ max_touches: 4, stop_on_reply: true, nurture_days: 90 }),
  kpis: list(200, 20),
  goals: z
    .object({
      customers_month: z.union([z.number().int().min(0).max(100000), z.null()]).optional(),
      meetings_month: z.union([z.number().int().min(0).max(100000), z.null()]).optional(),
      revenue_month_cents: money,
      pipeline_month_cents: money,
    })
    .default({}),
  limits: limitsSchema.default({
    prospects_month: 0, emails_month: 0, ai_conversations_month: 0,
    value_actions_month: 0, voice_minutes_month: 0, monthly_budget_cents: 0,
  }),
  compliance: complianceSchema.default({
    postal_address: null, unsubscribe_url: null, sender_domain: null, sender_from: null,
    consent: { email: 'legitimate_interest', ai_call: 'forbidden', sms: 'forbidden' },
    regulated_vertical: false, compliance_review_by: null, compliance_notes: null,
  }),
  integrations: list(60, 30),
  notes: opt(4000),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type BlueprintInput = z.input<typeof blueprintSchema>;
export type BusinessFacts = z.infer<typeof businessSchema>;
export type Icp = z.infer<typeof icpSchema>;
export type CampaignSpec = z.infer<typeof campaignSchema>;
export type AgentSpec = z.infer<typeof agentSchema>;
export type ValueActionSpec = z.infer<typeof valueActionSchema>;

/**
 * A partial blueprint: what a template layer or a Build step contributes.
 *
 * Deliberately loose. zod v4 dropped `deepPartial`, and a hand-written deep
 * partial of a schema this size would be a second copy to keep in sync. Layers
 * are validated where it matters instead: `blueprintFromTemplate` merges them
 * and runs the FULL schema over the result, so a bad layer fails at composition
 * with a real path in the error rather than passing a weaker check here.
 */
export const partialBlueprintSchema = z.record(z.string(), z.unknown());

/* ────────────────────────────── row types ──────────────────────────── */

export type FactoryTenant = {
  id: string;
  slug: string;
  name: string;
  client_email: string | null;
  plan_code: string | null;
  status: 'active' | 'suspended' | 'churned';
  kind: 'customer' | 'internal' | 'demo';
  mrr_cents: number | null;
  setup_cents: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FactoryRow = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  template_key: string | null;
  template_version: number | null;
  status: FactoryStatus;
  mode: FactoryMode;
  autonomy: AutonomyLevel;
  sourcing_paused: boolean;
  outreach_paused: boolean;
  ai_paused: boolean;
  followup_paused: boolean;
  pause_reason: string | null;
  health: FactoryHealth | Record<string, never>;
  health_at: string | null;
  goals: Record<string, unknown>;
  activated_at: string | null;
  first_prospect_at: string | null;
  first_contact_at: string | null;
  first_engagement_at: string | null;
  first_opportunity_at: string | null;
  first_customer_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlueprintRow = {
  id: string;
  tenant_id: string;
  factory_id: string;
  version: number;
  status: 'draft' | 'approved' | 'deployed' | 'superseded' | 'rejected';
  doc: Blueprint;
  validation: PreflightReport | Record<string, never>;
  source: 'forge' | 'template' | 'clone' | 'manual' | 'migration';
  change_summary: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deployed_at: string | null;
  created_at: string;
};

/** One thing wrong with a blueprint, and whether it blocks going live. */
export type PreflightCheck = {
  key: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  /** A failing blocker means ACTIVATE is not offered. A failing non-blocker is a warning. */
  blocker: boolean;
};

export type PreflightReport = {
  ok: boolean;
  checks: PreflightCheck[];
  /** 0..100 per area, for the setup score panel. */
  scores: Record<string, number>;
  overall: number;
  at: string;
};

export type HealthDimension = 'prospect' | 'sender' | 'ai' | 'conversion' | 'integration' | 'cost';

export type FactoryHealth = {
  overall: number;
  band: 'critical' | 'attention' | 'healthy' | 'growth' | 'new' | 'paused';
  dimensions: Record<HealthDimension, { score: number; note: string }>;
  reasons: string[];
  at: string;
};

export type UsageMetric =
  | 'prospects_sourced'
  | 'enrichment_calls'
  | 'hunter_lookups'
  | 'email_verifications'
  | 'emails_sent'
  | 'ai_conversations'
  | 'ai_tokens'
  | 'voice_minutes'
  | 'value_actions'
  | 'storage_mb'
  | 'forge_runs';

/** What one unit of each metric costs MMS, in cents. The margin math's only input. */
export const UNIT_COST_CENTS: Record<UsageMetric, number> = {
  prospects_sourced: 1,
  enrichment_calls: 2,
  hunter_lookups: 4,
  email_verifications: 1,
  emails_sent: 1,
  // The model runs on Sarah's Max subscription (lib/llm.ts), a flat cost. This is
  // an internal allocation so a heavy tenant still shows up in the margin view,
  // not a bill anybody pays per conversation.
  ai_conversations: 3,
  ai_tokens: 0,
  voice_minutes: 9,
  value_actions: 6,
  storage_mb: 0,
  forge_runs: 25,
};

export const PLAN_LIMIT_FOR_METRIC: Partial<Record<UsageMetric, string>> = {
  prospects_sourced: 'prospects_month',
  emails_sent: 'emails_month',
  ai_conversations: 'ai_conversations_month',
  value_actions: 'value_actions_month',
  voice_minutes: 'voice_minutes_month',
};

/* ────────────────────────────── helpers ────────────────────────────── */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'factory';
}

/** Stable dedupe key for a prospect: domain wins, then email, then name+city. */
export function prospectKey(p: { domain?: string | null; email?: string | null; company: string; city?: string | null }): string {
  const domain = (p.domain || '').toLowerCase().replace(/^www\./, '').trim();
  if (domain) return `d:${domain}`;
  const email = (p.email || '').toLowerCase().trim();
  if (email) return `e:${email}`;
  return `n:${slugify(p.company)}:${slugify(p.city || '')}`;
}

export function centsToUsd(cents: number | null | undefined, digits = 0): string {
  // "not set" rather than a dash: an unknown number and a zero are different
  // facts, and a placeholder glyph gets read as either one.
  if (cents === null || cents === undefined) return 'not set';
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}
