-- 134_cc_desk.sql
-- The Command Center becomes a desk three people can share.
--
-- 1. Who has it. A lead can be held by one named person on the account
--    (Shan, Carmen, Zayne), so nobody calls the same number twice and nobody
--    assumes somebody else did. The key is the person's key on the project in
--    lib/client-leads.ts; the name is stored beside it so the log still reads
--    right after a person leaves the project.
--
-- 2. What happened. An append-only log per lead: a note, a call that was
--    tried and not answered, the called mark going on or coming off, a lead
--    being taken or handed over. Every row is written by a person pressing a
--    button. Nothing automatic writes here, and a 'tried' row never marks a
--    lead called: only the person's own Called press does that.
--
-- Run once. Idempotent.

alter table public.client_leads add column if not exists owner_key text;
alter table public.client_leads add column if not exists owner_name text;
alter table public.client_leads add column if not exists owner_at timestamptz;

create table if not exists public.client_lead_events (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  lead_id uuid not null references public.client_leads (id) on delete cascade,
  kind text not null check (kind in ('note', 'tried', 'called', 'uncalled', 'taken', 'handed', 'released')),
  -- what was said, in their words. Null for a bare mark.
  body text,
  -- for 'handed': who it went to
  to_key text,
  to_name text,
  -- who pressed the button
  author_key text,
  author_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_lead_events_lead_idx
  on public.client_lead_events (lead_id, created_at desc);
create index if not exists client_lead_events_client_idx
  on public.client_lead_events (client_email, created_at desc);
alter table public.client_lead_events enable row level security;

notify pgrst, 'reload schema';
