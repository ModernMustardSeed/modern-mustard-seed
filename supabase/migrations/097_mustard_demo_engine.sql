-- ============================================================================
-- 097_mustard_demo_engine.sql  ·  THE UNIVERSAL INSTANT DEMO ENGINE
--
-- One doorway, many entrances. /mustard is the only place a stranger ever needs
-- to land to experience Mr. Mustard, whether they came from a Facebook group, a
-- LinkedIn reply, a cold email, a QR code on a truck, or Sarah reading them the
-- URL over the phone.
--
-- The module underneath is deliberately generic: a SURFACE owns the branding,
-- the consent language, the assistant and the CTA. MMS is surface number one
-- with Mr. Mustard. A Client Factory tenant later gets their own surface with
-- their own agent, and none of this has to be rewritten to allow it.
-- ============================================================================

-- ───────────────────────────── 1. the surfaces ──────────────────────────────

create table if not exists public.mustard_surfaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- Who the caller will be. Null falls back to the configured Mr. Mustard.
  vapi_assistant_id text,
  vapi_phone_number_id text,
  seller_name text not null default 'Modern Mustard Seed',
  headline text not null default 'Want my AI receptionist to call you?',
  cta_label text not null default 'CALL ME NOW',
  consent_version text not null default 'mms-ai-call-v1',
  -- Abuse defense, per surface, because a tenant with a smaller list needs
  -- tighter numbers than MMS does.
  cooldown_minutes smallint not null default 20,
  max_per_phone_per_day smallint not null default 3,
  max_per_ip_per_hour smallint not null default 5,
  max_per_ip_per_day smallint not null default 20,
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.mustard_surfaces (slug, name)
values ('mms', 'Modern Mustard Seed · Mr. Mustard')
on conflict (slug) do nothing;

-- ──────────────────────── 2. every request, forever ─────────────────────────
--
-- One row per person who asked to be called, written BEFORE the call is placed
-- and updated as the call moves. This is the funnel: page visits are counted
-- here as `started`, and everything after it is a state on the same row, so a
-- source's conversion is a group-by rather than a join across five tables.

create table if not exists public.mustard_requests (
  id uuid primary key default gen_random_uuid(),
  surface_id uuid references public.mustard_surfaces(id) on delete set null,
  lead_id uuid references public.outbound_leads(id) on delete set null,
  consent_id uuid references public.acq_consents(id) on delete set null,
  call_id uuid references public.acq_calls(id) on delete set null,
  vapi_call_id text,

  -- where they came from
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing_url text,
  link_id uuid,

  -- who they are
  phone_e164 text,
  phone_as_typed text,
  business_name text,
  contact_name text,

  -- started | consented | calling | connected | completed | failed | cancelled | refused
  status text not null default 'started',
  refused_reason text,
  outcome text,
  error text,

  -- abuse defense evidence
  ip text,
  user_agent text,
  session_id text,
  idempotency_key text unique,

  created_at timestamptz not null default now(),
  consented_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz
);

create index if not exists mustard_requests_created_idx on public.mustard_requests (created_at desc);
create index if not exists mustard_requests_source_idx on public.mustard_requests (source, created_at desc);
create index if not exists mustard_requests_phone_idx on public.mustard_requests (phone_e164, created_at desc);
create index if not exists mustard_requests_ip_idx on public.mustard_requests (ip, created_at desc);
create index if not exists mustard_requests_status_idx on public.mustard_requests (status, created_at desc);
create index if not exists mustard_requests_lead_idx on public.mustard_requests (lead_id);
create index if not exists mustard_requests_vapi_idx on public.mustard_requests (vapi_call_id);

-- ───────────────────────── 3. the magic links ───────────────────────────────
--
-- Sarah gets somebody to yes on a human call and sends them a link that already
-- knows their number, so they type nothing.
--
-- ⚠️ THE LINK PREFILLS. IT NEVER CONSENTS. Generating one is not permission,
-- and the person still has to check the box and press the button themselves. A
-- link that placed the call on open would be an unsolicited AI telemarketing
-- call dressed up as a convenience.

create table if not exists public.mustard_links (
  id uuid primary key default gen_random_uuid(),
  surface_id uuid references public.mustard_surfaces(id) on delete set null,
  lead_id uuid references public.outbound_leads(id) on delete cascade,
  -- Only the hash is stored. The token itself is shown once, at creation.
  token_hash text not null unique,
  source text not null default 'human-call',
  campaign text,
  created_by text,
  expires_at timestamptz not null,
  used_at timestamptz,
  use_count smallint not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mustard_links_lead_idx on public.mustard_links (lead_id, created_at desc);
create index if not exists mustard_links_expiry_idx on public.mustard_links (expires_at);

-- ─────────────────── 4. attribution that survives conversion ────────────────

alter table public.outbound_leads
  add column if not exists first_touch_source text,
  add column if not exists first_touch_at timestamptz,
  add column if not exists last_touch_source text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text;

comment on column public.outbound_leads.first_touch_source is
  'Never overwritten once set. The channel that originally produced this prospect survives every later touch, the Forge, checkout and conversion.';

create index if not exists outbound_leads_first_touch_idx on public.outbound_leads (first_touch_source);

-- ─────────────────────────── 5. row level security ──────────────────────────

alter table public.mustard_surfaces enable row level security;
alter table public.mustard_requests enable row level security;
alter table public.mustard_links    enable row level security;
