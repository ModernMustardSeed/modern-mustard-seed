-- 043: The third forge, the BUSINESS OS demo ("you have the calls, you can't
-- manage them" leads). Unlike the website forge there is NO worker and NO
-- generation cost: /demo/os/[id] is one polished template app that renders
-- from a small per-lead config frozen here at forge time (name, trade, city,
-- phone, mined review evidence, audit score). Forging is instant. The only
-- live AI is the in-demo assistant / ad maker, capped hard per demo.

create table if not exists public.outbound_demo_os (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.outbound_leads(id) on delete cascade,
  business_name text not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists outbound_demo_os_lead_idx on public.outbound_demo_os (lead_id);

alter table public.outbound_demo_os enable row level security;

alter table public.outbound_leads
  add column if not exists os_demo_id uuid,
  add column if not exists os_demo_url text,
  add column if not exists os_demo_status text;
