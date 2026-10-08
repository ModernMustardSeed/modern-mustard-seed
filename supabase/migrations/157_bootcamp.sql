-- The One-Person Company Bootcamp. Written 2026-10-08.
--
-- Four tables. Registrations hold every person who raised a hand: a free
-- masterclass seat, a paid ticket, or an Operator Program seat (one row per
-- email per launch, the tier climbs). Hosts are the people who run a room for
-- their own audience and keep the ticket. Outreach is the list of audience
-- owners we ask to host, with the sequence step each is on. Events is the
-- append-only log the desk and the crons read back.

create table if not exists bootcamp_registrations (
  id uuid primary key default gen_random_uuid(),
  launch text not null default 'launch-1',
  email text not null,
  name text,
  first_name text,
  business text,
  website text,
  trade text,
  phone text,
  -- masterclass -> ga | vip | platinum -> operator
  tier text not null default 'masterclass'
    check (tier in ('masterclass', 'ga', 'vip', 'platinum', 'operator')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer not null default 0,
  -- Who sent them. A host slug from bootcamp_hosts, or null for the house.
  host_slug text,
  -- utm_source / the ?via= word on the link.
  source text,
  -- What the person told us at registration, in their own words.
  why text,
  -- Drip bookkeeping: which emails have gone, as a set of step keys.
  sent_steps text[] not null default '{}',
  unsubscribed_at timestamptz,
  attended_days integer[] not null default '{}',
  replay_until timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (launch, email)
);

create index if not exists bootcamp_registrations_tier_idx on bootcamp_registrations (launch, tier, created_at desc);
create index if not exists bootcamp_registrations_host_idx on bootcamp_registrations (host_slug, created_at desc);
create index if not exists bootcamp_registrations_email_idx on bootcamp_registrations (lower(email));

create table if not exists bootcamp_hosts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  email text not null,
  website text,
  platforms text,
  audience text,
  vertical text,
  -- The trade room they want to run, if any.
  room text,
  status text not null default 'applied'
    check (status in ('applied', 'approved', 'live', 'paused', 'declined')),
  founding boolean not null default false,
  -- 100 on tickets, 20 on the program, as whole percents.
  ticket_pct integer not null default 100,
  program_pct integer not null default 20,
  clicks integer not null default 0,
  notes text,
  payout_email text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bootcamp_hosts_status_idx on bootcamp_hosts (status, created_at desc);

create table if not exists bootcamp_outreach (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  email text,
  contact_path text,
  contact_type text not null default 'email'
    check (contact_type in ('email', 'form', 'booking', 'dm')),
  platforms text,
  audience text,
  audience_source text,
  sells text,
  evidence text,
  hook text,
  vertical text not null default 'ai-business',
  fit integer not null default 3,
  tier text not null default 'B',
  source_urls text[] not null default '{}',
  -- queued -> sent (step 1) -> sent (step 2) -> sent (step 3) -> done, or
  -- replied / hosting / declined / bounced along the way. Hand means the
  -- contact path is a form or a DM, so the desk shows the message to paste.
  status text not null default 'queued'
    check (status in ('queued', 'hand', 'sent', 'replied', 'hosting', 'declined', 'bounced', 'done', 'skipped')),
  step integer not null default 0,
  next_at timestamptz,
  last_sent_at timestamptz,
  replied_at timestamptz,
  host_slug text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bootcamp_outreach_email_uidx on bootcamp_outreach (lower(email)) where email is not null;
create index if not exists bootcamp_outreach_status_idx on bootcamp_outreach (status, next_at);
create index if not exists bootcamp_outreach_vertical_idx on bootcamp_outreach (vertical, fit desc);

create table if not exists bootcamp_events (
  id bigserial primary key,
  kind text not null,
  email text,
  registration_id uuid references bootcamp_registrations (id) on delete set null,
  outreach_id uuid references bootcamp_outreach (id) on delete set null,
  host_slug text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bootcamp_events_kind_idx on bootcamp_events (kind, created_at desc);

alter table bootcamp_registrations enable row level security;
alter table bootcamp_hosts enable row level security;
alter table bootcamp_outreach enable row level security;
alter table bootcamp_events enable row level security;
-- No policies: only the service role reads or writes these.
