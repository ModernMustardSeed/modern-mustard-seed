-- ============================================================================
-- 094_acquisition.sql  ·  THE MR. MUSTARD ACQUISITION ENGINE
--
-- Prospect → Permission → Mr. Mustard → Forge → Sale.
--
-- Deliberately NOT a new CRM. `outbound_leads` is already the prospect table
-- (4,387 rows, the forge columns, the demo hub, the audit cache, the message
-- thread, the pipeline sync). Everything acquisition-specific is added TO it,
-- so a lead Mr. Mustard forges on a cold call is the same row the dial floor,
-- the Forge board and the Client Book already understand.
--
-- The new tables are only the things that genuinely have no home yet: the
-- campaign and its variants, a durable idempotent job queue, the per-prospect
-- event timeline, the consent ledger, the demo-call record, sourcing runs, and
-- the master safety switch.
-- ============================================================================

-- ─────────────────────────── 1. the prospect record ─────────────────────────

alter table public.outbound_leads
  -- what they do, narrower than `niche` (home_service covers 2,055 rows)
  add column if not exists trade text,
  -- email provenance, so nothing is ever mailed on a guess
  add column if not exists email_status text,
  add column if not exists email_confidence smallint,
  add column if not exists email_source text,
  add column if not exists email_source_url text,
  add column if not exists phone_type text,
  -- where they are and who they serve
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists service_area text,
  add column if not exists contact_title text,
  add column if not exists contact_source_url text,
  -- public reputation signals
  add column if not exists rating numeric(2,1),
  add column if not exists review_count integer,
  add column if not exists hours jsonb,
  add column if not exists open_24_7 boolean not null default false,
  add column if not exists emergency_service boolean not null default false,
  -- why this lead is worth a call
  add column if not exists call_volume_score smallint,
  add column if not exists missed_call_score smallint,
  add column if not exists lead_score smallint,
  add column if not exists score_reasons jsonb,
  add column if not exists priority smallint,
  add column if not exists source_urls jsonb,
  -- campaign membership and journey state
  add column if not exists acq_campaign_id uuid,
  add column if not exists acq_stage text not null default 'prospect',
  add column if not exists acq_variant text,
  add column if not exists acq_eligible boolean not null default false,
  add column if not exists acq_ineligible_reason text,
  add column if not exists email_stage smallint not null default 0,
  add column if not exists last_campaign_email_at timestamptz,
  add column if not exists reply_at timestamptz,
  add column if not exists call_stage text,
  add column if not exists call_attempts smallint not null default 0,
  add column if not exists last_call_at timestamptz,
  add column if not exists consent_status text,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_id uuid,
  add column if not exists demo_status text,
  add column if not exists demo_emailed_at timestamptz,
  add column if not exists checkout_sent_at timestamptz,
  add column if not exists checkout_url text,
  add column if not exists meeting_status text,
  add column if not exists meeting_at timestamptz,
  add column if not exists payment_status text,
  add column if not exists client_status text,
  add column if not exists won_at timestamptz,
  add column if not exists setup_cents integer,
  add column if not exists mrr_cents integer,
  -- hygiene
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists suppression_reason text,
  add column if not exists bounced boolean not null default false,
  add column if not exists duplicate_of uuid,
  add column if not exists is_test boolean not null default false,
  add column if not exists assigned_to text,
  add column if not exists last_researched_at timestamptz,
  add column if not exists imported_at timestamptz,
  add column if not exists needs_human text,
  -- dedupe keys, written by lib/acq/dedupe.ts on every insert and enrich
  add column if not exists name_key text,
  add column if not exists domain_key text,
  add column if not exists phone_digits text,
  add column if not exists email_key text;

comment on column public.outbound_leads.trade is
  'Narrow acquisition trade: hvac | plumbing | roofing | other. `niche` stays the funnel bucket.';
comment on column public.outbound_leads.email_status is
  'verified | likely | public | risky | invalid | unknown. Only verified/likely/public are ever mailed.';
comment on column public.outbound_leads.acq_stage is
  'prospect | emailed | consented | called | demoed | forged | demo_sent | meeting | client | lost';

create index if not exists outbound_leads_acq_stage_idx on public.outbound_leads (acq_stage);
create index if not exists outbound_leads_trade_idx on public.outbound_leads (trade);
create index if not exists outbound_leads_lead_score_idx on public.outbound_leads (lead_score desc nulls last);
create index if not exists outbound_leads_acq_campaign_idx on public.outbound_leads (acq_campaign_id);
create index if not exists outbound_leads_name_key_idx on public.outbound_leads (name_key);
create index if not exists outbound_leads_domain_key_idx on public.outbound_leads (domain_key);
create index if not exists outbound_leads_phone_digits_idx on public.outbound_leads (phone_digits);
create index if not exists outbound_leads_email_key_idx on public.outbound_leads (email_key);
create index if not exists outbound_leads_eligible_idx
  on public.outbound_leads (acq_eligible, email_stage) where acq_eligible = true;

-- ──────────────────────────── 2. the campaign ───────────────────────────────

create table if not exists public.acq_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- draft | live | paused | stopped
  status text not null default 'draft',
  goal_clients integer not null default 50,
  daily_send_cap integer not null default 150,
  hourly_send_cap integer not null default 25,
  -- quiet hours in America/Denver; outside these the sender waits
  send_start_hour smallint not null default 8,
  send_end_hour smallint not null default 17,
  send_weekdays_only boolean not null default true,
  from_name text not null default 'Sarah at Modern Mustard Seed',
  from_email text not null default 'sarah@modernmustardseed.com',
  reply_to text not null default 'sarah@modernmustardseed.com',
  -- business days between email 1→2 and 2→3
  step2_after_days smallint not null default 2,
  step3_after_days smallint not null default 4,
  max_call_attempts smallint not null default 2,
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subject / CTA variants. Optimized for PURCHASES, not opens.
create table if not exists public.acq_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.acq_campaigns(id) on delete cascade,
  key text not null,
  step smallint not null default 1,
  subject text not null,
  cta_label text not null default 'YES — HAVE MR. MUSTARD CALL ME',
  body_key text not null default 'default',
  weight smallint not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campaign_id, step, key)
);

-- ─────────────────── 3. the durable, idempotent job queue ───────────────────

create table if not exists public.acq_queue (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.acq_campaigns(id) on delete cascade,
  lead_id uuid references public.outbound_leads(id) on delete cascade,
  -- email | call | forge | demo_email | checkout | research | followup
  kind text not null,
  step smallint not null default 0,
  -- pending | claimed | done | failed | skipped | cancelled
  status text not null default 'pending',
  run_after timestamptz not null default now(),
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  -- THE anti-duplicate guarantee. A retried webhook, a double-clicked button and
  -- a re-run cron all produce the same key, and the unique index refuses the
  -- second one. Nobody gets emailed twice, called twice, or forged twice.
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  claimed_at timestamptz,
  claimed_by text,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists acq_queue_ready_idx
  on public.acq_queue (status, run_after) where status = 'pending';
create index if not exists acq_queue_lead_idx on public.acq_queue (lead_id);
create index if not exists acq_queue_kind_idx on public.acq_queue (kind, status);

-- Atomic claim. Without SKIP LOCKED two cron invocations overlapping by a second
-- both pick up the same job and the prospect is emailed twice.
create or replace function public.acq_claim_jobs(p_kinds text[], p_limit integer, p_worker text)
returns setof public.acq_queue
language plpgsql
as $$
begin
  return query
  with picked as (
    select q.id
      from public.acq_queue q
     where q.status = 'pending'
       and q.run_after <= now()
       and (p_kinds is null or q.kind = any(p_kinds))
     order by q.run_after
     limit p_limit
     for update skip locked
  )
  update public.acq_queue q
     set status = 'claimed',
         claimed_at = now(),
         claimed_by = p_worker,
         attempts = q.attempts + 1
    from picked
   where q.id = picked.id
  returning q.*;
end;
$$;

-- ──────────────────────────── 4. the timeline ───────────────────────────────

create table if not exists public.acq_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outbound_leads(id) on delete cascade,
  campaign_id uuid references public.acq_campaigns(id) on delete set null,
  type text not null,
  label text not null,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists acq_events_lead_idx on public.acq_events (lead_id, occurred_at desc);
create index if not exists acq_events_type_idx on public.acq_events (type, occurred_at desc);

-- ───────────────────────── 5. the consent ledger ────────────────────────────
--
-- Mr. Mustard is an AI voice placing a commercial call, so the record of what
-- someone agreed to has to survive the lead row, the campaign, and a rewrite of
-- the consent language. Rows are append-only and versioned; revoking writes
-- revoked_at rather than deleting.

create table if not exists public.acq_consents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outbound_leads(id) on delete set null,
  campaign_id uuid references public.acq_campaigns(id) on delete set null,
  phone_e164 text not null,
  phone_as_typed text not null,
  business_name text,
  contact_name text,
  website text,
  seller text not null default 'Modern Mustard Seed',
  -- the EXACT sentence they agreed to, stored whole, plus its version id
  consent_version text not null,
  consent_text text not null,
  checkbox_checked boolean not null,
  typed_name text,
  ip text,
  user_agent text,
  source_campaign text,
  source_email_id text,
  source_variant text,
  referer text,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now()
);

create index if not exists acq_consents_phone_idx on public.acq_consents (phone_e164);
create index if not exists acq_consents_lead_idx on public.acq_consents (lead_id);

-- ────────────────────── 6. the Mr. Mustard demo calls ───────────────────────

create table if not exists public.acq_calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outbound_leads(id) on delete cascade,
  campaign_id uuid references public.acq_campaigns(id) on delete set null,
  consent_id uuid references public.acq_consents(id) on delete set null,
  vapi_call_id text unique,
  -- queued | ringing | in_progress | completed | failed | no_answer
  status text not null default 'queued',
  attempt smallint not null default 1,
  to_phone text not null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer,
  ended_reason text,
  roleplay_scenario text,
  summary text,
  transcript text,
  -- structured sales intelligence pulled out of the transcript
  intel jsonb,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists acq_calls_lead_idx on public.acq_calls (lead_id, requested_at desc);
create index if not exists acq_calls_status_idx on public.acq_calls (status);

-- ───────────────────────── 7. lead sourcing runs ────────────────────────────

create table if not exists public.acq_sourcing_runs (
  id uuid primary key default gen_random_uuid(),
  label text,
  params jsonb not null default '{}'::jsonb,
  -- queued | running | done | failed | cancelled
  status text not null default 'queued',
  target integer not null default 0,
  searched integer not null default 0,
  found integer not null default 0,
  with_email integer not null default 0,
  verified integer not null default 0,
  duplicates integer not null default 0,
  invalid integer not null default 0,
  inserted integer not null default 0,
  current_market text,
  log jsonb not null default '[]'::jsonb,
  error text,
  heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists acq_sourcing_runs_status_idx on public.acq_sourcing_runs (status, created_at desc);

-- ─────────────────── 8. the master switch (single row) ──────────────────────

create table if not exists public.acq_settings (
  id boolean primary key default true,
  master_paused boolean not null default true,
  sourcing_enabled boolean not null default true,
  enrichment_enabled boolean not null default true,
  email_enabled boolean not null default true,
  calls_enabled boolean not null default true,
  followups_enabled boolean not null default true,
  daily_sourcing_enabled boolean not null default false,
  daily_sourcing_target integer not null default 100,
  daily_sourcing_split jsonb not null default '{"hvac":40,"plumbing":30,"roofing":30}'::jsonb,
  total_campaign_max integer not null default 25000,
  min_lead_score smallint not null default 40,
  paused_reason text,
  updated_at timestamptz not null default now(),
  constraint acq_settings_single_row check (id)
);

-- Starts PAUSED on purpose. Nothing leaves this machine until Sarah says go.
insert into public.acq_settings (id) values (true) on conflict (id) do nothing;

-- ─────────────────────── 9. seed the MEET MR. MUSTARD campaign ──────────────

insert into public.acq_campaigns (slug, name, status)
values ('meet-mr-mustard', 'MEET MR. MUSTARD', 'draft')
on conflict (slug) do nothing;

insert into public.acq_variants (campaign_id, key, step, subject, cta_label, body_key)
select c.id, v.key, v.step, v.subject, v.cta, v.body
  from public.acq_campaigns c
  cross join (values
    ('A', 1::smallint, 'Want my AI receptionist to call you?', 'YES — HAVE MR. MUSTARD CALL ME', 'default'),
    ('B', 1::smallint, '{{first_name}}, this is easier to hear than explain', 'YES — HAVE MR. MUSTARD CALL ME', 'default'),
    ('C', 1::smallint, 'Can Mr. Mustard call you?', 'HAVE MR. MUSTARD CALL ME', 'default'),
    ('A', 2::smallint, 'Want to try to stump him?', 'LET MR. MUSTARD CALL ME', 'default'),
    ('A', 3::smallint, 'Should I leave you alone?', 'YES — HAVE HIM CALL', 'default')
  ) as v(key, step, subject, cta, body)
 where c.slug = 'meet-mr-mustard'
on conflict (campaign_id, step, key) do nothing;

-- ─────────────────────────── 10. row level security ─────────────────────────
-- Same posture as the rest of the outbound namespace: RLS on, no public policy,
-- so only the service role (the server) can read or write.

alter table public.acq_campaigns      enable row level security;
alter table public.acq_variants       enable row level security;
alter table public.acq_queue          enable row level security;
alter table public.acq_events         enable row level security;
alter table public.acq_consents       enable row level security;
alter table public.acq_calls          enable row level security;
alter table public.acq_sourcing_runs  enable row level security;
alter table public.acq_settings       enable row level security;
