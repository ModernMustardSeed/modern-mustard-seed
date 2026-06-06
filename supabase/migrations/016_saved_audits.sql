-- Saved website audits: persist an audit against a client so the audit and the
-- proposal are both on file for the engagement and nothing gets lost before the
-- work is delivered. Surfaces on the contact's activity timeline.
create table if not exists public.saved_audits (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  url text,
  score int,
  letter text,
  headline text,
  report jsonb not null default '{}'::jsonb,
  status text not null default 'saved',   -- 'saved' | 'delivered'
  created_at timestamptz not null default now()
);

create index if not exists saved_audits_email_idx on public.saved_audits (client_email);
create index if not exists saved_audits_created_idx on public.saved_audits (created_at desc);

alter table public.saved_audits enable row level security;
