-- 131_client_booking.sql
-- BOOKING ON A CLIENT'S OWN SITE.
--
-- A visitor picks a time on the client's website and it is theirs, not a
-- request somebody confirms by hand. That promise needs one source of truth
-- for what is taken, and this is it: a minute is offered only when no live row
-- here holds it, no block covers it, and nothing in the client's own calendar
-- overlaps it (that last one arrives when they share the secret iCal address
-- of their Google Calendar; until then the first two carry it).
--
-- `starts_at` is UTC and is always shown in America/Denver, because Montana is
-- Mountain time and the offset moves twice a year. The unique index is on
-- (project, starts_at) filtered to live rows, so two people cannot take the
-- same minute and a cancelled slot returns to the pool.
--
-- Status is a mark a person owns, the same rule client_leads follows. No cron,
-- reply or webhook sets it. Only the desk, the client's portal, or the visitor
-- using the cancel link in their own confirmation.
--
-- Run once. Idempotent.

create table if not exists public.client_appointments (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  client_email text not null,
  lead_id uuid references public.client_leads (id) on delete set null,

  kind text not null default 'consult',            -- consult | site-walk
  starts_at timestamptz not null,
  minutes integer not null default 30,
  place text,                                      -- phone | office | property
  status text not null default 'booked',           -- booked | done | no-show | cancelled

  name text,
  phone text,
  email text,
  town text,
  project_type text,
  address text,                                    -- where to meet, for a walk on the land
  notes text,

  sms_consent boolean not null default false,
  campaign text,
  cancel_token text not null default encode(gen_random_bytes(16), 'hex'),
  notified jsonb not null default '{}'::jsonb,
  confirmed jsonb,
  reminded_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  ip_hash text,
  ua text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_appointments disable row level security;

create unique index if not exists client_appointments_slot_live
  on public.client_appointments (project, starts_at)
  where status in ('booked', 'done');

create index if not exists client_appointments_client_time
  on public.client_appointments (client_email, starts_at desc);
create index if not exists client_appointments_cancel_token
  on public.client_appointments (cancel_token);
create index if not exists client_appointments_upcoming
  on public.client_appointments (project, starts_at)
  where status = 'booked';

-- Time the client is not available: a holiday, a week away, an afternoon on a
-- job site. Added from the desk or the portal; subtracted before any slot is
-- offered.
create table if not exists public.client_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  client_email text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.client_availability_blocks disable row level security;
create index if not exists client_availability_blocks_span
  on public.client_availability_blocks (project, starts_at, ends_at);

-- The client's own calendar arrives as a SECRET iCAL ADDRESS, which is the one
-- way a client hands over true availability without a password or an OAuth
-- grant. It is stored encrypted in client_integrations like the Buildertrend
-- token, so the provider list has to admit it.
alter table public.client_integrations drop constraint if exists client_integrations_provider_check;
alter table public.client_integrations
  add constraint client_integrations_provider_check
  check (provider in ('google', 'facebook', 'instagram', 'x', 'linkedin', 'buildertrend', 'gmail', 'calendar-ics'));
