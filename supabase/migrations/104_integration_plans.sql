-- 104_integration_plans.sql
-- The AI Integration Plan: the free, customized, step-by-step document a field
-- partner hands (or emails) a business. Queue-and-worker pattern copied from
-- 042_outbound_demo_sites: an admin button queues a row, the local worker on
-- Sarah's machine writes the plan with headless Claude on the Max plan, the
-- finished HTML serves at /demo/plan/<id> (print-ready; the browser's print
-- dialog is the PDF). Service-role only, like 042.

create table if not exists public.integration_plans (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.outbound_leads(id) on delete cascade,
  business_name text not null,
  status text not null default 'queued' check (status in ('queued', 'building', 'ready', 'failed')),
  brief text not null,
  html text,
  error text,
  worker text,
  claimed_at timestamptz,
  built_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_plans_status_idx on public.integration_plans (status, created_at);
create index if not exists integration_plans_lead_idx on public.integration_plans (lead_id);

alter table public.integration_plans enable row level security;

-- Lead-side pointers so boards render plan state without joins, same shape as
-- the site_demo_* trio.
alter table public.outbound_leads
  add column if not exists integration_plan_id uuid,
  add column if not exists integration_plan_url text,
  add column if not exists integration_plan_status text;
