-- From-the-studio updates: Seedside agents post approved progress notes into
-- the client portal. Service-role only (RLS, no policies); every row exists
-- because Sarah turned a key in the office.
create table if not exists client_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  author_agent text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_updates_project_idx on client_updates(project_id, created_at desc);
alter table client_updates enable row level security;
