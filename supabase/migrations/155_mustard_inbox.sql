-- 155_mustard_inbox.sql
-- Mr. Mustard's inbox: the follow-ups he works on his own between calls.
--
-- Rows come from two places: Vapi's post-call analysis of his own calls (what
-- he promised, what the caller asked for), and Sarah adding one by hand at
-- /admin/calls. lib/mustard-inbox.ts runs them: a promised link is emailed, a
-- requested callback is dialled in the calling window, and anything that
-- would put new words under Sarah's name waits for her approval.
--
-- ⚠️ Nothing here ever sets a lead's `contacted` status. That is a human mark.

create table if not exists public.mustard_inbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('callback', 'send_link', 'email_note')),
  -- proposed: waiting on Sarah. queued: approved or auto, waiting for its time.
  -- running: being worked right now. done / failed / dismissed: finished.
  status text not null default 'proposed'
    check (status in ('proposed', 'queued', 'running', 'done', 'failed', 'dismissed')),
  source text not null default 'call' check (source in ('call', 'sarah')),
  due_at timestamptz not null default now(),
  name text,
  phone text,
  email text,
  business text,
  -- What to do, in plain words. On a callback this is his briefing for the call.
  instruction text not null,
  -- send_link: link keys from the send_email catalog. email_note: subject and note.
  links text[] not null default '{}',
  subject text,
  note text,
  -- The call that produced this row, and the call that worked it.
  from_call_id text,
  result_call_id text,
  result text,
  attempts int not null default 0,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mustard_inbox_work_idx on public.mustard_inbox (status, due_at);
create index if not exists mustard_inbox_from_call_idx on public.mustard_inbox (from_call_id);

alter table public.mustard_inbox enable row level security;
-- Service role only. No policies on purpose: the admin reads it through the API.
