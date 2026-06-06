-- Client requests: change requests, edits, and notes a client sends from their
-- portal, either by typing a note or by asking the Mr. Mustard Seed assistant to
-- pass something along. Surfaces in the owner command center and the contact's
-- activity timeline.
create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  client_name text,
  project_id uuid references public.projects(id) on delete set null,
  body text not null,
  source text not null default 'note',   -- 'note' | 'chatbot'
  status text not null default 'new',    -- 'new' | 'read' | 'done'
  created_at timestamptz not null default now()
);

create index if not exists client_requests_email_idx on public.client_requests (client_email);
create index if not exists client_requests_status_idx on public.client_requests (status);
create index if not exists client_requests_created_idx on public.client_requests (created_at desc);

-- Service role (server) bypasses RLS; enable it so nothing is readable by anon keys.
alter table public.client_requests enable row level security;
