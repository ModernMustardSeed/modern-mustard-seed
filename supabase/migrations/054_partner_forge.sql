-- 054: PARTNER-WIELDED FORGE ("Forge Under Your Flag")
-- A gated mint surface lets approved partners and the internal team queue a
-- forged demo suite for a business they personally know. Attribution rides the
-- lead (affiliate_id + origin) so the existing commission engine fires
-- untouched; per-minter caps ride claim_forge_slot (047) keys; a QA strip
-- holds a partner's first three mints for human review; demo_events is the
-- first per-origin funnel telemetry spine.

-- Forge grants on affiliates. can_forge defaults FALSE: minting spends real
-- Vapi + worker + fal money, so access is granted per partner, never implied
-- by approval.
alter table public.affiliates add column if not exists can_forge boolean not null default false;
alter table public.affiliates add column if not exists forge_daily_cap int not null default 3;
alter table public.affiliates add column if not exists forge_weekly_cap int not null default 10;
alter table public.affiliates add column if not exists forge_agreement_at timestamptz;
alter table public.affiliates add column if not exists forge_qa_approved int not null default 0;

-- Attribution + presence on the lead (the hub renders from the lead, and the
-- checkout resolves ref from it). Plain text like site_demo_status (042):
-- values enforced in TS ('rep' | 'partner'), not by a DB check.
alter table public.outbound_leads add column if not exists affiliate_id uuid references public.affiliates(id) on delete set null;
alter table public.outbound_leads add column if not exists origin text;
alter table public.outbound_leads add column if not exists forge_qa text;
alter table public.outbound_leads add column if not exists last_seen_at timestamptz;
create index if not exists outbound_leads_affiliate_idx on public.outbound_leads (affiliate_id) where affiliate_id is not null;
create index if not exists outbound_leads_forge_qa_idx on public.outbound_leads (forge_qa) where forge_qa is not null;

-- Provenance on the site-forge queue (worker + failsafe read these rows; the
-- telemetry spine joins on them).
alter table public.outbound_demo_sites add column if not exists affiliate_id uuid;
alter table public.outbound_demo_sites add column if not exists origin text;

-- demo_events: the attribution-complete funnel telemetry spine. Service-role
-- only (RLS enabled, no policies), allowlisted event names enforced in TS.
create table if not exists public.demo_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outbound_leads(id) on delete cascade,
  hub_id uuid,
  event text not null,
  origin text,
  affiliate_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists demo_events_lead_idx on public.demo_events (lead_id, created_at desc);
create index if not exists demo_events_event_idx on public.demo_events (event, created_at desc);
alter table public.demo_events enable row level security;
