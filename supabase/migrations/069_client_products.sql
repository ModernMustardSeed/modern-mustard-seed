-- 069_client_products.sql
-- THE UNIFIED PURCHASE LEDGER.
--
-- Before this, a buyer's post-purchase fate was decided entirely by which `kind`
-- branch they hit in the Stripe webhook. Demo/proposal buyers became real portal
-- clients with a project; Chief/program buyers got a separate entitlement HQ;
-- Sidekick/Pictures/Ads/Hatchery/Press/GEO/Switchboard buyers became nothing but
-- a lead row and a note in Sarah's inbox. Three disjoint worlds, no shared record.
--
-- client_products is the one normalized thing EVERY paid offer writes, so a signed-in
-- client sees a single "What you own" rail no matter what they bought, and the back
-- office has one place to read every active relationship. It does not replace the
-- specialized tables (projects, entitlements, chief_clients, orders); it sits on top
-- as the uniform ownership layer they all point back to.
--
-- Idempotent by order_session_id (unique): a Stripe retry, a double-click, or a
-- dashboard resend can never mint a second card for the same purchase.

create table if not exists public.client_products (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,                       -- tenancy, like every portal table
  kind text not null,                               -- 'demo-order','chief','sidekick','pictures','ads','press','hatchery','geo','program','mustard-mode','mustard-launch','switchboard','store','engagement'
  label text not null,                              -- human name of what they own, e.g. "The Chief"
  tier text,                                        -- plan name (free text; clients.tier is CHECK-constrained, this is not)
  status text not null default 'provisioning',      -- provisioning | building | in_production | active | delivered
  home_url text,                                    -- where this product lives (/chief/hq, /portal, ...)
  detail text,                                      -- one line of "what happens next"
  order_session_id text unique,                     -- Stripe checkout session id => idempotency anchor
  project_id uuid,                                  -- link to projects when the offer has one
  amount_cents int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_products_email_idx on public.client_products (client_email);
create index if not exists client_products_kind_idx on public.client_products (kind);

drop trigger if exists update_client_products_updated_at on public.client_products;
create trigger update_client_products_updated_at
  before update on public.client_products
  for each row
  execute function public.update_updated_at_column();

-- Service-role only from server routes, which scope every query by session email,
-- so RLS stays off like clients/projects/client_files (see 003_client_portal.sql).
alter table public.client_products disable row level security;
