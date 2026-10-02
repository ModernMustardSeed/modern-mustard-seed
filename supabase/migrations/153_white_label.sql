-- The White Label Program: agencies that resell MMS work under their own
-- name, and the clients they sell it to. Written 2026-10-02.
--
-- An agency moves applied -> approved -> active (first client live) and can be
-- paused or declined. A client moves submitted -> building -> review -> live
-- and can be paused or cancelled. Billing is one Stripe subscription per
-- agency with one item per live service; the ids live on these rows so a
-- status change can add or remove exactly what it owns.

create table if not exists white_label_agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_name text,
  email text not null,
  phone text,
  website text,
  color text,
  logo_url text,
  client_count text,
  sells text,
  status text not null default 'applied'
    check (status in ('applied', 'approved', 'active', 'paused', 'declined')),
  founding boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  notes text,
  source text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists white_label_agencies_status_idx on white_label_agencies (status, created_at desc);
create index if not exists white_label_agencies_email_idx on white_label_agencies (lower(email));

create table if not exists white_label_clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references white_label_agencies (id) on delete cascade,
  business text not null,
  website text,
  city text,
  contact_name text,
  owner_phone text,
  owner_email text,
  transfer_number text,
  -- The number the agency rings for its test call before the client goes live.
  test_number text,
  hours text,
  services_text text,
  -- Slugs from data/white-label.ts WL_LINES.
  lines text[] not null default '{}',
  status text not null default 'submitted'
    check (status in ('submitted', 'building', 'review', 'live', 'paused', 'cancelled')),
  -- { "<line slug>": "<stripe subscription item id>" }
  stripe_items jsonb not null default '{}'::jsonb,
  notes text,
  -- The agency called the test line and pressed Approve in its portal.
  agency_approved_at timestamptz,
  live_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists white_label_clients_agency_idx on white_label_clients (agency_id, created_at desc);
create index if not exists white_label_clients_status_idx on white_label_clients (status);

alter table white_label_agencies enable row level security;
alter table white_label_clients enable row level security;
-- No policies: only the service role reads or writes these.
