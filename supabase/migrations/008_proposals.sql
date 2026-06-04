-- Modern Mustard Seed — saved proposals
-- Run once in the Supabase SQL Editor. Powers /admin/proposals: save a proposal,
-- track its status (draft, sent, accepted, declined), and surface outstanding
-- value on the overview. The full editable content lives in jsonb so the
-- builder can round-trip it exactly.

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  client_name text,
  client_company text,
  client_email text,
  site_url text,
  situation text,
  notes text,
  path_id text,
  status text not null default 'draft',   -- draft | sent | accepted | declined
  lines jsonb not null default '[]'::jsonb,   -- [{ id, price, qty, scope[], framing }]
  prose jsonb not null default '{}'::jsonb,   -- { intro, situation, recommendation, close }
  one_time_total int not null default 0,
  monthly_total int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_updated_idx on public.proposals (updated_at desc);

drop trigger if exists update_proposals_updated_at on public.proposals;
create trigger update_proposals_updated_at
  before update on public.proposals
  for each row
  execute function public.update_updated_at_column();

-- RLS on. The app reaches this table only through the server-side service role,
-- which bypasses RLS. With no policies, the public anon key cannot read or write
-- client proposal data. Matches the posture of leads, affiliates, and outreach.
alter table public.proposals enable row level security;
