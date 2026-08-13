-- ============================================================================
-- 095_client_factory.sql  ·  THE OUTBOUND GOVERNOR, SENDER HEALTH, AND THE
--                            NUMBERS THE CLIENT FACTORY STEERS BY
--
-- Three things the acquisition engine needs before it can be trusted at scale:
--
--   1. A GOVERNOR that no send path can go around. The rolling 24 hour ceiling
--      lives here, and it is a CEILING, not a target: the governor's own
--      adaptive allowance is usually far below it.
--   2. SENDER HEALTH as recorded fact rather than vibes. Every provider event
--      we actually receive is counted, and the rates are read off those counts.
--   3. MRR MOVEMENT, because "new clients this month" is a vanity number if the
--      same month churned more than it won. Net New MRR is the north star.
-- ============================================================================

-- ─────────────────────────── 1. the governor ────────────────────────────────

alter table public.acq_settings
  -- The absolute ceiling, in a rolling 24 hours, across EVERY campaign and
  -- every manual action. Sarah's number is "below 5,000"; 4,500 is the ceiling
  -- and the adaptive allowance below is what actually gets used day to day.
  add column if not exists global_rolling_24h_ceiling integer not null default 4500,
  -- validating | healthy | scaling | mature | caution | restricted | paused
  add column if not exists sender_state text not null default 'validating',
  add column if not exists sender_state_reason text,
  add column if not exists sender_state_at timestamptz not null default now(),
  -- What the governor is currently willing to send in a rolling 24 hours. It
  -- ramps up from real health and drops hard on a bad signal.
  add column if not exists adaptive_daily_allowance integer not null default 100,
  add column if not exists last_ramp_at timestamptz,
  -- Rates above these, measured over a real sample, throttle or stop the engine.
  add column if not exists max_bounce_rate_pct numeric(5,2) not null default 4.00,
  add column if not exists max_complaint_rate_pct numeric(5,2) not null default 0.10,
  -- Nobody gets mailed by this engine more often than this, whatever the queue
  -- believes and whatever campaign they belong to.
  add column if not exists min_days_between_emails smallint not null default 2,
  -- Only these email confidence tiers may be mailed. A is public + verified,
  -- B is enrichment + verified, C is publicly displayed but unverified.
  add column if not exists allowed_email_tiers text[] not null default array['A','B','C'],
  -- Target READY inventory. Sourcing replenishes toward it, never past the cap.
  add column if not exists target_ready_inventory integer not null default 25000,
  add column if not exists hunter_min_lead_score smallint not null default 70,
  add column if not exists hunter_daily_credit_cap integer not null default 0;

comment on column public.acq_settings.global_rolling_24h_ceiling is
  'Hard ceiling across every campaign and manual action. NOT a target: adaptive_daily_allowance is what is actually used.';

/**
 * Every marketing send, recorded at the moment the governor allows it.
 *
 * This exists rather than being derived from acq_events because the governor
 * has to count sends across EVERY campaign and every manual action in one
 * place, and because a decision to refuse is worth keeping too: "why did
 * nothing go out yesterday" is the question this table answers.
 */
create table if not exists public.acq_sends (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outbound_leads(id) on delete set null,
  campaign_id uuid references public.acq_campaigns(id) on delete set null,
  cohort_id uuid,
  kind text not null default 'campaign',
  step smallint,
  variant text,
  to_email text not null,
  from_email text not null,
  subject text,
  provider text not null default 'resend',
  provider_message_id text,
  -- queued | sent | accepted | delivered | deferred | blocked | bounced |
  -- complaint | unsubscribed | refused
  status text not null default 'sent',
  status_detail text,
  refused_reason text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  unsubscribed_at timestamptz
);

create index if not exists acq_sends_sent_at_idx on public.acq_sends (sent_at desc);
create index if not exists acq_sends_status_idx on public.acq_sends (status, sent_at desc);
create index if not exists acq_sends_lead_idx on public.acq_sends (lead_id, sent_at desc);
create index if not exists acq_sends_provider_msg_idx on public.acq_sends (provider_message_id);
create index if not exists acq_sends_cohort_idx on public.acq_sends (cohort_id);

/**
 * Counting a rolling 24 hours, in the database, in one round trip.
 *
 * The governor is consulted before EVERY send, so this has to be cheap. A
 * partial index on the last day would need a moving predicate, so the plain
 * sent_at index above carries it and the window stays small by definition.
 */
create or replace function public.acq_rolling_send_counts()
returns table (sent_24h integer, sent_1h integer, bounced_24h integer, complained_24h integer, unsub_24h integer)
language sql
stable
as $$
  select
    count(*) filter (where sent_at > now() - interval '24 hours' and status <> 'refused')::integer,
    count(*) filter (where sent_at > now() - interval '1 hour' and status <> 'refused')::integer,
    count(*) filter (where sent_at > now() - interval '24 hours' and status = 'bounced')::integer,
    count(*) filter (where sent_at > now() - interval '24 hours' and status = 'complaint')::integer,
    count(*) filter (where sent_at > now() - interval '24 hours' and status = 'unsubscribed')::integer
  from public.acq_sends;
$$;

-- ──────────────────────────── 2. cohorts ────────────────────────────────────
--
-- A hundred thousand prospects are an asset, and a single undifferentiated
-- blast is how you burn one. Prospects are released in named cohorts so a
-- result can be attributed to a segment and a variant rather than to "the
-- campaign".

create table if not exists public.acq_cohorts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.acq_campaigns(id) on delete cascade,
  name text not null,
  slug text not null unique,
  -- The selection that defined it, kept so the cohort is reproducible.
  filters jsonb not null default '{}'::jsonb,
  trade text,
  metro text,
  variant text,
  size integer not null default 0,
  -- draft | releasing | released | paused | done
  status text not null default 'draft',
  released_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists acq_cohorts_status_idx on public.acq_cohorts (status, created_at desc);

alter table public.outbound_leads
  add column if not exists acq_cohort_id uuid,
  -- The reservoir state, wider than acq_stage: a prospect can be RESEARCHING
  -- long before it is ever eligible for a campaign.
  add column if not exists reservoir_state text not null default 'discovered',
  add column if not exists email_tier text,
  add column if not exists metro text,
  add column if not exists last_enriched_at timestamptz,
  add column if not exists enrichment_provider text,
  add column if not exists enrichment_cost_cents integer;

comment on column public.outbound_leads.reservoir_state is
  'discovered | researching | qualified | email_found | verified | ready | hold | queued | contacted | engaged | consented | called | forged | hot | meeting | checkout | won | nurture | lost | suppressed | disqualified';

create index if not exists outbound_leads_reservoir_idx on public.outbound_leads (reservoir_state);
create index if not exists outbound_leads_cohort_idx on public.outbound_leads (acq_cohort_id);
create index if not exists outbound_leads_metro_idx on public.outbound_leads (metro);
create index if not exists outbound_leads_ready_idx
  on public.outbound_leads (reservoir_state, lead_score desc) where reservoir_state = 'ready';

-- ───────────────────── 3. MRR movement, the north star ──────────────────────
--
-- Gross new MRR is a headline. NET new MRR is the business. Every movement is
-- one append-only row, so a month can always be decomposed into what won, what
-- expanded, what shrank and what left.

create table if not exists public.acq_mrr_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outbound_leads(id) on delete set null,
  client_id uuid,
  -- new | expansion | contraction | churn | payment_failed | reactivation
  type text not null,
  -- Signed cents. Churn and contraction are negative.
  mrr_delta_cents integer not null,
  setup_cents integer not null default 0,
  product text,
  reason text,
  stripe_subscription_id text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists acq_mrr_events_occurred_idx on public.acq_mrr_events (occurred_at desc);
create index if not exists acq_mrr_events_type_idx on public.acq_mrr_events (type, occurred_at desc);
create index if not exists acq_mrr_events_lead_idx on public.acq_mrr_events (lead_id);

-- ─────────────────── 4. goals, which are milestones not ceilings ────────────

alter table public.acq_campaigns
  add column if not exists goal_mrr_cents integer not null default 0,
  add column if not exists goal_revenue_cents bigint not null default 100000000,
  add column if not exists goal_horizon_months smallint not null default 12,
  add column if not exists goal_started_on date,
  add column if not exists monthly_client_target_min smallint not null default 30,
  add column if not exists monthly_client_target_stretch smallint not null default 40;

comment on column public.acq_campaigns.goal_clients is
  'A milestone, never a ceiling. 50 proves the factory; the ladder runs 50, 100, 210, 500, 1000, 2500, 5000 and custom.';

-- The $1M horizon starts the day the campaign first goes live, not the day the
-- row was created, so a campaign drafted weeks early does not eat its own runway.
update public.acq_campaigns
   set goal_started_on = coalesce(goal_started_on, started_at::date, current_date),
       goal_mrr_cents = case when goal_mrr_cents = 0 then 39700 * goal_clients else goal_mrr_cents end
 where slug = 'meet-mr-mustard';

-- ────────────────────── 5. cost economics, when known ───────────────────────

create table if not exists public.acq_costs (
  id uuid primary key default gen_random_uuid(),
  -- sourcing | hunter | validation | sending | ai | vapi | telephony | forge
  category text not null,
  provider text,
  cents integer not null,
  units integer,
  unit_label text,
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists acq_costs_occurred_idx on public.acq_costs (occurred_on desc, category);

-- ──────────────────────────── 6. row level security ─────────────────────────

alter table public.acq_sends       enable row level security;
alter table public.acq_cohorts     enable row level security;
alter table public.acq_mrr_events  enable row level security;
alter table public.acq_costs       enable row level security;
