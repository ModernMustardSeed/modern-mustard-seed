-- Per-client Launch Checklist state. One row per signed-in client (keyed by
-- their portal email). Stores the industry vertical they picked and a jsonb map
-- of { itemId: true } for every item they have checked off. Best-effort from the
-- app: if this table is absent the portal silently falls back to localStorage.
create table if not exists public.portal_checklist (
  email text primary key,
  industry text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_checklist_updated_idx on public.portal_checklist (updated_at desc);

alter table public.portal_checklist enable row level security;
