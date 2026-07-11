-- 046_demo_orders.sql
-- "Order it right there" on the forged-demo surfaces: a prospect watching their
-- demo buys on the spot (monthly + one-time setup), we customize and release
-- within a week. This migration also captures the legacy `orders` table that
-- was created in the SQL editor and never checked in (webhook + ActivityFeed
-- depend on it), so a fresh database can be rebuilt from migrations alone.

-- Legacy revenue ledger (idempotent capture; exists in prod already).
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text,
  stripe_payment_intent_id text,
  product_slug text,
  product_name text,
  item_type text,
  price_paid_cents integer not null default 0,
  currency text default 'usd',
  email text not null,
  name text,
  status text not null default 'paid',
  created_at timestamptz default now()
);
create unique index if not exists orders_stripe_session_id_idx
  on orders (stripe_session_id);

-- The demo-order lifecycle: one row per checkout from a demo surface.
-- Revenue itself still lands in `orders` per paid invoice (existing webhook
-- rule); this table tracks fulfillment: paid -> intake_done -> delivered.
create table if not exists demo_orders (
  id uuid primary key default gen_random_uuid(),
  outbound_lead_id uuid references outbound_leads(id) on delete set null,
  hub_demo_id uuid,
  business_name text,
  products jsonb not null default '[]'::jsonb,   -- ['voice','site','os'] or ['bundle']
  setup_cents integer not null default 0,
  monthly_cents integer not null default 0,
  stripe_session_id text unique,
  stripe_subscription_id text,
  stripe_customer_id text,
  email text,
  name text,
  phone text,
  ref text,                                       -- partner code credited on the monthly
  status text not null default 'pending'
    check (status in ('pending','paid','intake_done','delivered','canceled')),
  intake jsonb,                                   -- the post-purchase customization form
  intake_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists demo_orders_lead_idx on demo_orders (outbound_lead_id);
create index if not exists demo_orders_status_idx on demo_orders (status);

-- Service-role only (same posture as the outbound_* tables).
alter table demo_orders disable row level security;
