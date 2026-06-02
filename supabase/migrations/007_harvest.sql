-- Modern Mustard Seed, Harvest lead engine
-- Run once in the same Supabase project that powers modernmustardseed.com/admin
-- (the MMS CRM). Harvest writes here through its data adapter. It reuses the
-- existing leads, outreach_messages, and suppression tables and adds one new
-- table, harvest_prospects, for the richer local-business lead score.
--
-- Safe to run on the live MMS database. Every statement is additive and
-- idempotent. It does not touch the existing leads, prospects, targets,
-- client_portal, entitlements, affiliates, or outreach schema except to add
-- one nullable discriminator column to outreach_messages.

-- ---------------------------------------------------------------------------
-- harvest_prospects: the Harvest brain. One row per discovered local business.
-- Deterministic Layer 1 code (discovery, audit, enrichment, scoring) fills the
-- scalar columns and the jsonb payloads. Layer 2 (the Cowork operator) fills the
-- clearly-marked slots: pain_phrase, the live AI visibility result inside
-- ai_discoverability_json, and the conversion-asset URLs.
-- ---------------------------------------------------------------------------
create table if not exists public.harvest_prospects (
  id uuid primary key default gen_random_uuid(),

  -- identity and discovery (Module 1, Google Places)
  place_id text unique,                 -- dedup key from Google Places
  name text not null,
  website text,
  phone text,
  email text,                           -- only if publicly listed on their own site
  address text,
  category text,
  rating numeric(2,1),
  review_count int,
  price_level int,                      -- 0..4 from Google
  maps_url text,

  -- run context
  vertical text,                        -- e.g. hvac, dental, salon
  geo text,                             -- e.g. "Kalispell, MT"
  source text not null default 'outbound',   -- outbound | inbound
  channel_type text not null default 'email', -- email | phone | linkedin | form
  contact text,                         -- chosen public contact route, lowercased

  -- the lead score, six weighted inputs plus the AI discoverability axis (0..100)
  score_need int,
  score_money int,
  score_intent int,
  score_fit int,
  score_reach int,
  score_proximity int,
  score_ai_discoverability int,
  composite int,                        -- the routed brain output, 0..100

  -- routing
  routed_offer text,                    -- site-2500 | software | ai-integration | geo
  offer_line text,                      -- web | software | ai
  pain_phrase text,                     -- Layer 2 slot: top mined review pain phrase

  -- audit and enrichment payloads, jsonb so deterministic code can fill freely
  audit_json jsonb,                     -- Module 2: subscores, lighthouse, screenshot paths
  enrichment_json jsonb,                -- Module 3: ad-spend, tech stack, analog, owner/franchise, seo
  ai_discoverability_json jsonb,        -- Module 3B: blocked engines, missing schema, live-test slot

  -- conversion assets (Module 5). Layer 2 fills the URLs.
  microsite_url text,
  audit_pdf_url text,
  mockup_url text,
  revenue_leak_estimate int,            -- conservative monthly dollar figure

  -- pipeline
  status text not null default 'discovered',
    -- discovered | audited | scored | qualified | drafted | queued | sent
    -- | replied | booked | won | lost | dropped | suppressed
  stage text,
  routed_to text,                       -- madison | voice-staff | human
  dropped_reason text,                  -- which negative filter dropped it
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists harvest_prospects_status_idx on public.harvest_prospects (status);
create index if not exists harvest_prospects_composite_idx on public.harvest_prospects (composite desc);
create index if not exists harvest_prospects_vertical_idx on public.harvest_prospects (vertical);
create index if not exists harvest_prospects_source_idx on public.harvest_prospects (source);
create index if not exists harvest_prospects_contact_idx on public.harvest_prospects (contact);
create index if not exists harvest_prospects_created_at_idx on public.harvest_prospects (created_at desc);

-- Ensure the updated_at trigger function exists (defined in 001_leads.sql on the
-- website project, but recreated here so this migration is self-sufficient on
-- any MMS project).
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_harvest_prospects_updated_at on public.harvest_prospects;
create trigger update_harvest_prospects_updated_at
  before update on public.harvest_prospects
  for each row
  execute function public.update_updated_at_column();

-- Accessed only via the service role key from server routes and worker scripts,
-- gated by the same ADMIN_EMAIL + ADMIN_PASSWORD shell as the rest of the back
-- office. RLS stays off to match the existing MMS tables.
alter table public.harvest_prospects disable row level security;

-- ---------------------------------------------------------------------------
-- Reuse outreach_messages for Harvest drafts. Add a nullable discriminator so
-- the existing creator-outreach admin can filter Harvest rows out later if
-- wanted. Existing rows stay null (treated as 'partner'). Harvest writes
-- kind = 'harvest'. This column is additive and breaks nothing: the MMS
-- /admin/outreach view only renders messages whose prospect_id matches a row in
-- public.prospects, so Harvest drafts (prospect_id in harvest_prospects) never
-- appear there regardless.
-- ---------------------------------------------------------------------------
alter table public.outreach_messages
  add column if not exists kind text not null default 'partner';

create index if not exists outreach_messages_kind_idx on public.outreach_messages (kind);

-- Note: suppression and leads are reused as-is, no schema change. Harvest stores
-- suppression contacts lowercased and trimmed to match lib/outreach.ts.
