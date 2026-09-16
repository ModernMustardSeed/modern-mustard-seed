-- 130_command_center_visible.sql
-- The Command Center is built before it is bought. Until the client has
-- approved and paid, they see none of it; Sarah sees all of it on the desk.
-- One row per client, off by default. Run once. Idempotent.

create table if not exists public.client_command_center (
  client_email text primary key,
  visible boolean not null default false,
  shown_at timestamptz,
  shown_by text,
  updated_at timestamptz not null default now()
);
alter table public.client_command_center disable row level security;
