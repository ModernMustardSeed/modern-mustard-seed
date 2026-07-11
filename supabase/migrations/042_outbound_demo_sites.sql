-- 042: Forged demo WEBSITES for the outbound dial floor, plus the team dial
-- quota change (everyone runs 25 calls a day now).
--
-- The cockpit's "Forge website" button queues a row here; a local worker
-- (scripts/demo-site-worker.mjs) runs Claude Code HEADLESS on Sarah's Max plan
-- (flat subscription cost, never the metered API) to build a complete
-- single-file demo website for the lead, stores the HTML back on the row, and
-- the public page /demo/site/<id> serves it with the lead's forged AI
-- receptionist (the Sidekick voice demo) overlaid as a live call widget.
-- Service-role only, RLS enabled with no policies, like the rest of outbound_*.

create table if not exists public.outbound_demo_sites (
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

create index if not exists outbound_demo_sites_status_idx on public.outbound_demo_sites (status, created_at);
create index if not exists outbound_demo_sites_lead_idx on public.outbound_demo_sites (lead_id);

alter table public.outbound_demo_sites enable row level security;

-- Lead-side pointers so the cockpit list can render forge state without joins.
alter table public.outbound_leads
  add column if not exists site_demo_id uuid,
  add column if not exists site_demo_url text,
  add column if not exists site_demo_status text;

-- Dial quotas: Polly, Sarah, and Easton all run 25 calls a day (2026-07-10).
update public.outbound_reps set daily_dial_goal = 25, updated_at = now()
where name in ('Polly', 'Sarah', 'Easton');

insert into public.outbound_reps (name, role, daily_dial_goal, daily_demo_goal)
values ('Easton', 'caller', 25, 1)
on conflict (name) do update set daily_dial_goal = 25, updated_at = now();
