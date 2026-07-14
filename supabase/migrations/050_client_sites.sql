-- 050_client_sites.sql
--
-- PUTTING A CLIENT'S SITE LIVE ON THEIR OWN DOMAIN.
--
-- lib/demo-order.ts sells the website as "the site you just toured, customized to your
-- business and PUT LIVE ON YOUR DOMAIN". There was no code in this repo that could
-- publish anything to any domain: no registrar, no DNS, no deploy. Every launch was
-- Sarah by hand, and the offer was a promise the system could not keep.
--
-- The forged demo (outbound_demo_sites.html) is IMMUTABLE and belongs to the sales
-- pitch: re-forging is the only way it ever changed. The real site is a different
-- thing with a different life. It starts as a copy of the demo, then absorbs their
-- logo, their photos, their menu, and their two rounds of edits, and it is the thing
-- that actually goes live. So it gets its own home on the project.
--
-- site_html is the live artifact and the editor's document. Everything else is where
-- it lives in the world.

alter table projects add column if not exists site_html text;
alter table projects add column if not exists site_domain text;
alter table projects add column if not exists site_vercel_project_id text;
alter table projects add column if not exists site_live_url text;
alter table projects add column if not exists site_published_at timestamptz;

-- How the domain came to be, so we never guess later whether we own it, they own it,
-- or nobody does. 'external' means the client already owned it and has to point DNS.
alter table projects add column if not exists site_domain_source text
  check (site_domain_source in ('bought', 'external') or site_domain_source is null);

-- Purchases are real money, so they leave a receipt that is not an email.
create table if not exists domain_purchases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  client_email text,
  domain text not null unique,
  price_usd numeric(10, 2),
  order_id text,
  bought_by text,
  created_at timestamptz not null default now()
);
create index if not exists domain_purchases_client_idx on domain_purchases (client_email);

-- Same posture as every other table holding client data here: RLS on, no policies.
-- The service role (every server route in this app) bypasses it; any other key gets
-- nothing.
alter table domain_purchases enable row level security;
