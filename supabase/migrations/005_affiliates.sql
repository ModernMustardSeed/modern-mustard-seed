-- Modern Mustard Seed — affiliate and sales engine
-- Run once in the Supabase SQL Editor. Powers /partners, /partners/hq, the
-- back-office sales management, and commission attribution. Tenancy by email
-- and by referral code. Service-role access only, so RLS stays off.

-- Affiliates. Pending until Sarah approves; approval generates the code.
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  code text unique,                  -- the referral code, set on approval
  promote_where text,                -- where they will promote
  audience text,                     -- size and shape of their audience
  why text,                          -- why they want in
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- Referral clicks, for the dashboard numbers.
create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  path text,
  created_at timestamptz default now()
);

-- Commissions. Product (50%) or build (10%). Earned (payable) once the refund
-- window passes, clawed back on refund.
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_code text not null,
  affiliate_email text not null,
  order_email text,
  product_slug text,
  kind text not null default 'product' check (kind in ('product', 'build')),
  amount_cents int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'payable', 'paid', 'clawed_back')),
  stripe_session_id text,
  created_at timestamptz default now()
);

create index if not exists affiliates_code_idx on public.affiliates (code);
create index if not exists affiliates_status_idx on public.affiliates (status);
create index if not exists affiliate_clicks_code_idx on public.affiliate_clicks (code);
create index if not exists commissions_code_idx on public.commissions (affiliate_code);
create index if not exists commissions_status_idx on public.commissions (status);
create unique index if not exists commissions_session_unique on public.commissions (stripe_session_id) where stripe_session_id is not null;

alter table public.affiliates disable row level security;
alter table public.affiliate_clicks disable row level security;
alter table public.commissions disable row level security;
