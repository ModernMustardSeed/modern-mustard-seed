-- Modern Mustard Seed — leads table
-- Run this once in the Supabase SQL Editor. After that, every lead from
-- the contact form, build queue, AI audit, and newsletter signup will
-- write here automatically, and you'll see them at modernmustardseed.com/admin.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('build-queue', 'audit', 'contact', 'newsletter')),
  status text not null default 'new' check (status in ('new', 'replied', 'booked', 'won', 'lost', 'archived')),
  name text,
  email text not null,
  phone text,
  company text,
  business_name text,
  idea_description text,
  message text,
  industry text,
  audit_url text,
  audit_score int,
  revenue_range text,
  timeline text,
  suggested_playbook text,
  source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists leads_type_idx on public.leads (type);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (email);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_leads_updated_at on public.leads;
create trigger update_leads_updated_at
  before update on public.leads
  for each row
  execute function public.update_updated_at_column();

-- Row Level Security is OFF for this table because we only access it via
-- the service role key from server routes. The admin UI is gated by the
-- ADMIN_EMAIL + ADMIN_PASSWORD env vars, not Supabase Auth.
alter table public.leads disable row level security;
