-- ============================================================================
-- CLIENT FACTORY: the multi-tenant acquisition platform (2026-08-13)
--
-- WHAT THIS IS. MMS already runs one acquisition machine for itself: the
-- outbound_* tables, the Forge, the demo-site worker, Mr. Mustard. That machine
-- is a single tenant hard-wired to one business. This migration adds the
-- PRODUCT: the same engine, generalized, so MMS can sell and deploy a Client
-- Factory to any business without writing an application for each one.
--
-- WHAT IT DOES NOT DO. It does not touch outbound_*, leads, clients, orders,
-- entitlements or any other existing table. The internal Factory keeps running
-- exactly as it is. MMS then becomes tenant #1 of the product (seeded at the
-- bottom of this file), which is the only honest way to dogfood it.
--
-- NAMESPACE. Everything here is factory_* or factories. Nothing collides.
--
-- TENANCY. Every tenant-owned row carries tenant_id, and every index leads with
-- tenant_id so a cross-tenant read is not merely forbidden, it is not even a
-- cheap query. RLS is enabled with NO policies on every table: the app talks to
-- Postgres as service_role (which bypasses RLS), so this costs nothing at
-- runtime and makes any anon/publishable key that ever reaches a browser read
-- exactly zero rows. Authorization itself lives server-side in
-- lib/factory/tenant.ts, which is the only thing allowed to decide which
-- tenant_id a request may touch. A tenant id from a browser or an LLM is input,
-- never authority.
--
-- Safe to re-run.
-- ============================================================================

-- ─────────────────────────── plans and tenants ──────────────────────────────

-- Product packaging. Prices live here, not in code, because MMS has not settled
-- canonical Client Factory pricing and nothing should hardcode a number that a
-- pricing decision will contradict. NULL price = "not priced yet", which the UI
-- renders as "Contact" rather than inventing a figure.
create table if not exists public.factory_plans (
  code text primary key,
  name text not null,
  blurb text,
  -- Which modules/value actions/tools this plan may use. { "modules": [...], "value_actions": [...] }
  entitlements jsonb not null default '{}'::jsonb,
  -- Hard caps enforced server-side. { "prospects_month": 2000, "emails_month": 6000, ... }
  limits jsonb not null default '{}'::jsonb,
  setup_price_cents int,
  monthly_price_cents int,
  -- What an overage unit costs the customer, per metric. { "emails": 2, ... } (cents)
  overage_cents jsonb not null default '{}'::jsonb,
  managed boolean not null default false,
  status text not null default 'private' check (status in ('private', 'beta', 'public', 'retired')),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One MMS customer. The unit of isolation. `client_email` is the join back to
-- the existing portal identity (public.clients / lib/client-auth), so a Client
-- Factory customer signs in with the same magic link as every other MMS client.
create table if not exists public.factory_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  client_email text,
  plan_code text references public.factory_plans(code),
  status text not null default 'active' check (status in ('active', 'suspended', 'churned')),
  -- 'internal' marks MMS itself: the reference tenant, excluded from revenue math.
  kind text not null default 'customer' check (kind in ('customer', 'internal', 'demo')),
  -- What MMS bills them. Kept beside the plan because a managed engagement can
  -- sit on a standard plan at a negotiated price.
  mrr_cents int,
  setup_cents int,
  stripe_customer_id text,
  stripe_subscription_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists factory_tenants_client_email_idx on public.factory_tenants (lower(client_email));
create index if not exists factory_tenants_status_idx on public.factory_tenants (status, kind);

-- Who inside the customer may see the tenant. Authorization is a JOIN, never a
-- string comparison against something the browser sent.
create table if not exists public.factory_tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create index if not exists factory_tenant_members_email_idx on public.factory_tenant_members (lower(email));

-- ─────────────────────── templates and blueprints ───────────────────────────

-- MMS IP. A template is the reusable STRUCTURE of a working Factory with every
-- tenant-specific fact stripped out. `parent_key` gives single-parent
-- inheritance (base -> b2b-service -> agency), resolved by composition in
-- lib/factory/templates.ts so a fix to the base reaches every descendant.
create table if not exists public.factory_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version int not null default 1,
  name text not null,
  vertical text,
  blurb text,
  parent_key text,
  -- Partial blueprint: whatever this layer sets, merged over its parent.
  body jsonb not null default '{}'::jsonb,
  channel text not null default 'internal' check (channel in ('internal', 'beta', 'stable', 'deprecated')),
  -- Set when the template was promoted out of a real Factory (SAVE AS TEMPLATE).
  source_factory_id uuid,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version)
);
create index if not exists factory_templates_channel_idx on public.factory_templates (channel, key);

-- The Factory itself. Configuration only: everything it DOES lives in the rows
-- below, everything it IS lives in its current blueprint.
create table if not exists public.factories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  template_key text,
  template_version int,
  status text not null default 'draft' check (status in ('draft', 'forging', 'review', 'testing', 'live', 'paused', 'archived')),
  -- TEST MODE IS THE DEFAULT AND IT IS NOT COSMETIC. While mode='test' the
  -- send path refuses any address that is not a test record, so a Factory
  -- cannot contact a real prospect before somebody deliberately flips it.
  mode text not null default 'test' check (mode in ('test', 'live')),
  autonomy text not null default 'manual' check (autonomy in ('manual', 'assisted', 'factory')),
  -- Granular kill switches, all independent of `status`.
  sourcing_paused boolean not null default false,
  outreach_paused boolean not null default false,
  ai_paused boolean not null default false,
  followup_paused boolean not null default false,
  pause_reason text,
  -- Denormalized health, recomputed by lib/factory/health.ts. Rendering the ops
  -- board must not require scoring a thousand factories on every page load.
  health jsonb not null default '{}'::jsonb,
  health_at timestamptz,
  goals jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  first_prospect_at timestamptz,
  first_contact_at timestamptz,
  first_engagement_at timestamptz,
  first_opportunity_at timestamptz,
  first_customer_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists factories_tenant_idx on public.factories (tenant_id, status);
create index if not exists factories_status_idx on public.factories (status, mode);

-- Every version of a Factory's configuration, forever. A blueprint is never
-- edited in place: an edit writes the next version and supersedes the last, so
-- "what changed, why, and what do we roll back to" is answerable at 1,000
-- tenants without anyone's memory.
create table if not exists public.factory_blueprints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  version int not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'deployed', 'superseded', 'rejected')),
  doc jsonb not null,
  -- Result of lib/factory/preflight.ts against this exact doc.
  validation jsonb not null default '{}'::jsonb,
  source text not null default 'forge' check (source in ('forge', 'template', 'clone', 'manual', 'migration')),
  change_summary text,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (factory_id, version)
);
create index if not exists factory_blueprints_factory_idx on public.factory_blueprints (factory_id, version desc);
create index if not exists factory_blueprints_tenant_idx on public.factory_blueprints (tenant_id, status);

-- One compile of an approved blueprint into live configuration. Carries the
-- scale metrics the secondary directive asks for: human minutes to launch and
-- how much of the deployment the software did by itself.
create table if not exists public.factory_deployments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  blueprint_id uuid not null references public.factory_blueprints(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'rolled_back')),
  report jsonb not null default '{}'::jsonb,
  human_minutes numeric,
  automation_pct numeric,
  deployed_by text,
  created_at timestamptz not null default now()
);
create index if not exists factory_deployments_factory_idx on public.factory_deployments (factory_id, created_at desc);

-- ─────────────────── registries (modules, actions, tools) ───────────────────
--
-- The code in lib/factory/registry.ts is the source of truth for behaviour;
-- these rows are the operational mirror, so MMS can disable a misbehaving
-- module for everyone, or gate a new one to a beta cohort, without a deploy.

create table if not exists public.factory_modules (
  key text primary key,
  name text not null,
  category text not null,
  blurb text,
  config_schema jsonb not null default '{}'::jsonb,
  -- What one run costs MMS. { "unit": "email", "cents": 1 }
  cost_model jsonb not null default '{}'::jsonb,
  requires jsonb not null default '[]'::jsonb,
  risk text not null default 'low' check (risk in ('low', 'medium', 'high')),
  status text not null default 'stable' check (status in ('internal', 'beta', 'stable', 'deprecated')),
  -- Set when the module does not exist yet: the "BUILD MISSING CAPABILITY" row.
  build_spec text,
  updated_at timestamptz not null default now()
);

create table if not exists public.factory_value_actions (
  key text primary key,
  name text not null,
  blurb text,
  -- What the Factory does FOR a prospect before asking for anything.
  inputs jsonb not null default '[]'::jsonb,
  outputs jsonb not null default '[]'::jsonb,
  module_key text,
  industries jsonb not null default '[]'::jsonb,
  cost_cents int not null default 0,
  risk text not null default 'low' check (risk in ('low', 'medium', 'high')),
  safety text,
  success_metric text,
  status text not null default 'stable' check (status in ('internal', 'beta', 'stable', 'deprecated', 'proposed')),
  updated_at timestamptz not null default now()
);

-- ────────────────────────── the prospect reservoir ──────────────────────────

create table if not exists public.factory_prospects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  company text not null,
  domain text,
  website text,
  contact_name text,
  contact_title text,
  email text,
  phone text,
  city text,
  -- Geography is `region`, not `state`: `state` on this table is the reservoir
  -- lifecycle below, and one column cannot be both.
  region text,
  country text default 'US',
  industry text,
  employee_count int,
  -- Public, observable signals only. Never inferred demographics.
  signals jsonb not null default '{}'::jsonb,
  enrichment jsonb not null default '{}'::jsonb,
  source text,
  provider text,
  cohort text,
  score int not null default 0,
  score_reasons jsonb not null default '[]'::jsonb,
  state text not null default 'discovered' check (state in (
    'discovered', 'qualified', 'ready', 'active', 'engaged', 'hot', 'won', 'nurture', 'suppressed', 'lost'
  )),
  -- A test-mode prospect can never be contacted by a live send, and vice versa.
  is_test boolean not null default false,
  dedupe_key text not null,
  campaign_id uuid,
  last_contact_at timestamptz,
  last_engagement_at timestamptz,
  next_action_at timestamptz,
  suppressed_at timestamptz,
  suppressed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (factory_id, dedupe_key)
);
create index if not exists factory_prospects_reservoir_idx on public.factory_prospects (tenant_id, factory_id, state, score desc);
create index if not exists factory_prospects_next_action_idx on public.factory_prospects (factory_id, next_action_at) where next_action_at is not null;
create index if not exists factory_prospects_domain_idx on public.factory_prospects (tenant_id, domain);
create index if not exists factory_prospects_email_idx on public.factory_prospects (tenant_id, lower(email));
create index if not exists factory_prospects_cohort_idx on public.factory_prospects (factory_id, cohort);

-- Per-tenant do-not-contact. Checked on every send, in both directions
-- (address and domain), and never removable by an automated path.
create table if not exists public.factory_suppressions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  kind text not null check (kind in ('email', 'domain')),
  value text not null,
  reason text not null default 'unsubscribe' check (reason in ('unsubscribe', 'bounce', 'complaint', 'manual', 'client_list')),
  created_at timestamptz not null default now(),
  unique (tenant_id, kind, value)
);

-- Consent evidence. A permission-first AI call is only permission-first if the
-- permission is a row somebody can produce later.
create table if not exists public.factory_consent (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'ai_call', 'human_call')),
  state text not null default 'none' check (state in ('none', 'requested', 'granted', 'revoked')),
  evidence jsonb not null default '{}'::jsonb,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists factory_consent_lookup_idx on public.factory_consent (tenant_id, prospect_id, channel, state);

-- ───────────────────────────── campaigns ────────────────────────────────────

create table if not exists public.factory_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'running', 'paused', 'finished')),
  channel text not null default 'email' check (channel in ('email', 'ai_call', 'human_call', 'sms', 'site')),
  icp jsonb not null default '{}'::jsonb,
  offer text,
  hook text,
  secondary_hook text,
  cta text,
  value_action_key text,
  -- [{ step, day_offset, subject, body, variant }]
  sequence jsonb not null default '[]'::jsonb,
  qualification jsonb not null default '{}'::jsonb,
  conversion_event text,
  daily_send_cap int not null default 50,
  budget_cents int,
  goal text,
  cohort text,
  variant text not null default 'A',
  experiment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists factory_campaigns_factory_idx on public.factory_campaigns (tenant_id, factory_id, status);

create table if not exists public.factory_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  campaign_id uuid references public.factory_campaigns(id) on delete set null,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null default 'email',
  step int,
  variant text,
  subject text,
  body text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'received')),
  provider_id text,
  -- How a reply was read: positive | question | pricing | meeting | negative | unsubscribe | ooo | wrong_person
  classification text,
  is_test boolean not null default false,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists factory_messages_prospect_idx on public.factory_messages (tenant_id, prospect_id, created_at desc);
create index if not exists factory_messages_campaign_idx on public.factory_messages (factory_id, campaign_id, status);
create index if not exists factory_messages_inbox_idx on public.factory_messages (factory_id, direction, classification, created_at desc);

-- ──────────────────── AI conversations and value actions ────────────────────

create table if not exists public.factory_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'chat', 'voice', 'sms')),
  agent_version int,
  transcript jsonb not null default '[]'::jsonb,
  -- Structured read of the conversation: pain, objection, timeline, budget,
  -- decision_maker, competitor, intent, next_step.
  intelligence jsonb not null default '{}'::jsonb,
  outcome text check (outcome in ('open', 'qualified', 'disqualified', 'meeting', 'checkout', 'escalated', 'closed')),
  escalated_to text,
  is_test boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists factory_conversations_factory_idx on public.factory_conversations (tenant_id, factory_id, started_at desc);

-- One run of a Value Action for one prospect. Expensive work, so it is a row
-- with an idempotency key, not a fire-and-forget call.
create table if not exists public.factory_action_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  action_key text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'ready', 'failed', 'skipped')),
  inputs jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  output_url text,
  cost_cents int not null default 0,
  error text,
  idempotency_key text,
  is_test boolean not null default false,
  delivered_at timestamptz,
  viewed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (factory_id, idempotency_key)
);
create index if not exists factory_action_runs_factory_idx on public.factory_action_runs (tenant_id, factory_id, status, created_at desc);

-- ───────────────────────────── the CRM ──────────────────────────────────────

create table if not exists public.factory_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  name text not null,
  stage text not null default 'prospect',
  value_cents int,
  probability int,
  owner text,
  -- Full acquisition provenance, frozen at creation. This is what makes ROI a
  -- fact rather than a guess.
  attribution jsonb not null default '{}'::jsonb,
  close_reason text,
  is_test boolean not null default false,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists factory_opportunities_factory_idx on public.factory_opportunities (tenant_id, factory_id, stage);

create table if not exists public.factory_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  opportunity_id uuid references public.factory_opportunities(id) on delete cascade,
  kind text not null,
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  actor text,
  occurred_at timestamptz not null default now()
);
create index if not exists factory_activities_timeline_idx on public.factory_activities (tenant_id, prospect_id, occurred_at desc);

create table if not exists public.factory_meetings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  prospect_id uuid references public.factory_prospects(id) on delete cascade,
  opportunity_id uuid references public.factory_opportunities(id) on delete set null,
  starts_at timestamptz not null,
  duration_min int not null default 30,
  attendee_email text,
  attendee_name text,
  assigned_to text,
  location text,
  status text not null default 'booked' check (status in ('booked', 'held', 'no_show', 'canceled', 'rescheduled')),
  external_id text,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists factory_meetings_factory_idx on public.factory_meetings (tenant_id, factory_id, starts_at);

-- ─────────────────── integrations, usage, audit, queue ──────────────────────

create table if not exists public.factory_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete cascade,
  provider text not null,
  category text not null,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'expired')),
  config jsonb not null default '{}'::jsonb,
  -- AES-256-GCM via lib/crypto.ts. Never a plaintext secret, never logged.
  secret_ciphertext text,
  secret_iv text,
  secret_tag text,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, factory_id, provider)
);
create index if not exists factory_integrations_health_idx on public.factory_integrations (status, provider);

-- Every unit of variable cost, attributed. Without this there is no margin, and
-- without margin a high-usage customer silently becomes a loss.
create table if not exists public.factory_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete cascade,
  campaign_id uuid,
  metric text not null,
  module_key text,
  quantity numeric not null default 1,
  cost_cents numeric not null default 0,
  meta jsonb not null default '{}'::jsonb,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);
create index if not exists factory_usage_rollup_idx on public.factory_usage (tenant_id, metric, occurred_at desc);
create index if not exists factory_usage_factory_idx on public.factory_usage (factory_id, occurred_at desc);

create table if not exists public.factory_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.factory_tenants(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete cascade,
  actor text,
  actor_kind text not null default 'system' check (actor_kind in ('admin', 'client', 'system', 'ai')),
  action text not null,
  target text,
  meta jsonb not null default '{}'::jsonb,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  occurred_at timestamptz not null default now()
);
create index if not exists factory_events_tenant_idx on public.factory_events (tenant_id, occurred_at desc);
create index if not exists factory_events_severity_idx on public.factory_events (severity, occurred_at desc) where severity <> 'info';

-- Work queue. Logically separated by `lane` so one 5,000-row sourcing job can
-- never sit in front of a hot lead's reply.
create table if not exists public.factory_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete cascade,
  lane text not null check (lane in ('hot', 'inbound', 'ai', 'value_action', 'campaign', 'enrich', 'sourcing', 'analytics', 'notify')),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'canceled')),
  priority int not null default 100,
  attempts int not null default 0,
  max_attempts int not null default 5,
  run_after timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  result jsonb,
  error text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (tenant_id, idempotency_key)
);
-- The claim query: pending work, hottest lane first, oldest first.
create index if not exists factory_jobs_claim_idx on public.factory_jobs (status, priority, run_after) where status = 'queued';
create index if not exists factory_jobs_tenant_idx on public.factory_jobs (tenant_id, status, lane);

-- ───────────── experiments, simulations, and productization ─────────────────

create table if not exists public.factory_experiments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  name text not null,
  hypothesis text,
  dimension text not null,
  variants jsonb not null default '[]'::jsonb,
  status text not null default 'running' check (status in ('draft', 'running', 'winner', 'loser', 'inconclusive', 'stopped')),
  winner text,
  results jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists factory_experiments_factory_idx on public.factory_experiments (factory_id, status);

-- AI sales readiness. QA, explicitly not a conversion prediction.
create table if not exists public.factory_simulations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.factory_tenants(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete cascade,
  blueprint_id uuid references public.factory_blueprints(id) on delete cascade,
  agent_version int,
  score int,
  scenarios jsonb not null default '[]'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists factory_simulations_factory_idx on public.factory_simulations (factory_id, created_at desc);

-- "7 clients asked for bilingual routing." The queue that decides what MMS
-- productizes next, instead of somebody remembering.
create table if not exists public.factory_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.factory_tenants(id) on delete set null,
  factory_id uuid references public.factories(id) on delete set null,
  -- Normalized so the same ask from nine customers collapses to one row.
  request_key text not null,
  title text not null,
  detail text,
  kind text not null default 'capability' check (kind in ('capability', 'integration', 'value_action', 'template', 'fix')),
  status text not null default 'open' check (status in ('open', 'planned', 'building', 'shipped', 'declined')),
  resolution text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists factory_requests_key_idx on public.factory_requests (request_key, status);

-- Custom code written for one tenant. If it is not in here, it does not exist,
-- which is the only way custom work stops becoming a forgotten liability.
create table if not exists public.factory_custom_code (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.factory_tenants(id) on delete set null,
  factory_id uuid references public.factories(id) on delete set null,
  title text not null,
  purpose text,
  location text,
  owner text,
  reusable boolean,
  generalized_module_key text,
  maintenance_risk text not null default 'medium' check (maintenance_risk in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'generalized', 'retired')),
  created_at timestamptz not null default now()
);

-- MMS LAB. Where a system idea lives before it is a template.
create table if not exists public.factory_lab_ideas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text,
  template_key text,
  value_action_key text,
  cohort_size int,
  stage text not null default 'idea' check (stage in ('idea', 'prototype', 'internal_test', 'customer_pilot', 'validated', 'templated', 'ga', 'killed')),
  notes text,
  results jsonb not null default '{}'::jsonb,
  factory_id uuid references public.factories(id) on delete set null,
  promoted_template_key text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists factory_lab_ideas_stage_idx on public.factory_lab_ideas (stage, updated_at desc);

-- ───────────────────────────── lockdown ─────────────────────────────────────
-- RLS on, zero policies. service_role bypasses it; nothing else reads a row.

do $$
declare t text;
begin
  foreach t in array array[
    'factory_plans','factory_tenants','factory_tenant_members','factory_templates','factories',
    'factory_blueprints','factory_deployments','factory_modules','factory_value_actions',
    'factory_prospects','factory_suppressions','factory_consent','factory_campaigns','factory_messages',
    'factory_conversations','factory_action_runs','factory_opportunities','factory_activities',
    'factory_meetings','factory_integrations','factory_usage','factory_events','factory_jobs',
    'factory_experiments','factory_simulations','factory_requests','factory_custom_code','factory_lab_ideas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ─────────────────────────────── seeds ──────────────────────────────────────

insert into public.factory_plans (code, name, blurb, entitlements, limits, managed, status, sort_order) values
  ('launch', 'Client Factory Launch',
   'One Factory, one campaign, the AI salesperson, the CRM, booking, and the dashboard.',
   '{"modules":["data.web_research","data.business_search","data.email_verify","outbound.cold_email","outbound.followup","ai.salesperson","value.website_audit","value.roi_calculator","conversion.calendar","conversion.handoff","ops.crm","ops.analytics","ops.attribution","ops.notifications"],"value_actions":["website_audit","roi_calculator","personalized_report"]}'::jsonb,
   '{"factories":1,"campaigns":2,"prospects_month":1500,"prospect_inventory":3000,"emails_month":4000,"ai_conversations_month":250,"value_actions_month":150,"voice_minutes_month":0,"seats":3,"integrations":3,"custom_tools":0}'::jsonb,
   true, 'private', 10),
  ('pro', 'Client Factory Pro',
   'Continuous sourcing, more campaigns, more demonstration, optimization and integrations.',
   '{"modules":["data.web_research","data.business_search","data.hunter","data.email_verify","data.csv_import","outbound.cold_email","outbound.followup","outbound.permission_request","outbound.reply_classifier","ai.salesperson","ai.voice_agent","ai.objection_handler","value.website_audit","value.roi_calculator","value.personalized_report","value.demo_builder","value.quote_builder","value.receptionist_roleplay","conversion.calendar","conversion.checkout","conversion.proposal","conversion.handoff","ops.crm","ops.analytics","ops.attribution","ops.notifications","ops.experiments"],"value_actions":["website_audit","roi_calculator","personalized_report","receptionist_roleplay","demo_site","quote_estimate"]}'::jsonb,
   '{"factories":3,"campaigns":8,"prospects_month":6000,"prospect_inventory":15000,"emails_month":15000,"ai_conversations_month":1200,"value_actions_month":800,"voice_minutes_month":300,"seats":10,"integrations":8,"custom_tools":1}'::jsonb,
   true, 'private', 20),
  ('enterprise', 'Client Factory Enterprise',
   'Multiple markets, multiple agents, multiple factories, deep integrations, higher scale.',
   '{"modules":["*"],"value_actions":["*"]}'::jsonb,
   '{"factories":10,"campaigns":40,"prospects_month":40000,"prospect_inventory":150000,"emails_month":80000,"ai_conversations_month":8000,"value_actions_month":5000,"voice_minutes_month":3000,"seats":50,"integrations":25,"custom_tools":10}'::jsonb,
   true, 'private', 30),
  ('internal', 'MMS Internal',
   'Modern Mustard Seed itself. No limits, no billing, same engine.',
   '{"modules":["*"],"value_actions":["*"]}'::jsonb,
   '{}'::jsonb,
   false, 'private', 90)
on conflict (code) do update set
  name = excluded.name, blurb = excluded.blurb, entitlements = excluded.entitlements,
  limits = excluded.limits, managed = excluded.managed, sort_order = excluded.sort_order,
  updated_at = now();

-- MMS is tenant #1. Its Factory row is created by lib/factory/bootstrap.ts so
-- it goes through the same compiler every customer does; here we only make the
-- tenant exist so nothing has to special-case "the internal one".
insert into public.factory_tenants (slug, name, client_email, plan_code, kind, status, notes)
values ('modern-mustard-seed', 'Modern Mustard Seed', 'sarah@modernmustardseed.com', 'internal', 'internal', 'active',
        'The reference tenant. Our own acquisition machine, running on the product we sell.')
on conflict (slug) do nothing;

insert into public.factory_tenant_members (tenant_id, email, name, role)
select id, 'sarah@modernmustardseed.com', 'Sarah Scarano', 'owner'
from public.factory_tenants where slug = 'modern-mustard-seed'
on conflict (tenant_id, email) do nothing;
