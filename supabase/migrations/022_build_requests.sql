-- Build requests: the auto-builder queue. The admin "Build" button creates a
-- row with a full assembled spec; a headless Claude Code worker claims it,
-- builds + deploys in a sandbox, and writes the result back. The delivered
-- artifact is also posted to the client portal (client_files), closing the loop.
create table if not exists public.build_requests (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  project_id uuid references public.projects(id) on delete set null,
  deliverable_type text not null default 'website',  -- website | app | tool | software | brand_bible | other
  title text not null,
  spec text not null default '',
  status text not null default 'requested',  -- requested | building | delivered | failed | canceled
  result jsonb not null default '{}'::jsonb,  -- { live_url, repo_url, notes }
  error text,
  worker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz
);

create index if not exists build_requests_status_idx on public.build_requests (status);
create index if not exists build_requests_email_idx on public.build_requests (client_email);
create index if not exists build_requests_created_idx on public.build_requests (created_at desc);

alter table public.build_requests enable row level security;
