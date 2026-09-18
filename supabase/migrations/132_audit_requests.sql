-- ============================================================================
-- 132  AUDIT REQUESTS
-- ============================================================================
-- The Online Presence Audit is requested, not generated on the spot.
--
-- Sarah, 2026-09-18: "I want them to have to put email in and then I will run
-- audit for them in my mms admin and it will email them back once I run it."
--
-- So a visitor on /presence-audit leaves an email, a business name and a site,
-- and the request waits here. Sarah reads their Google listing, types the few
-- facts it shows into the Audit Desk, and presses Run. The presence engine
-- (lib/presence-audit.ts) grades all three pillars, files the report in
-- presence_audits, and the requester is emailed the link to it.
--
-- WHY NOT outbound_leads. That table feeds the acquisition engine, and its
-- eligibility sweep re-evaluates every row. A person who asked us for an audit
-- is not a cold prospect and must never be enrolled in a cold sequence because
-- the row looked mailable. They live here, on their own.
--
-- The listing facts Sarah reads are columns rather than a blob, because they are
-- exactly the eight checks the profile pillar scores and the admin edits them one
-- field at a time before the run.
-- ============================================================================

begin;

create table if not exists public.audit_requests (
  id                 uuid primary key default gen_random_uuid(),

  -- what the visitor gave us
  email              text not null,
  name               text,
  business_name      text not null,
  website            text,
  town               text,
  google_url         text,
  note               text,

  -- what Sarah reads off their Google listing before the run
  listing_seen       boolean not null default false,
  rating             numeric(2,1),
  review_count       integer,
  listing_phone      text,
  listing_address    text,
  hours_published    boolean not null default false,
  open_24_7          boolean not null default false,
  emergency_service  boolean not null default false,
  trade              text,

  -- the run
  status             text not null default 'new'
                     check (status in ('new', 'running', 'grading', 'sent', 'failed', 'declined')),
  presence_audit_id  uuid references public.presence_audits(id) on delete set null,
  audit_url          text,
  score              smallint,
  letter             text,
  error              text,
  run_at             timestamptz,
  sent_at            timestamptz,
  send_count         integer not null default 0,

  -- what they asked us to build off the finished report, if anything
  wants              text[],
  wants_at           timestamptz,

  -- where it came from
  source             text,
  referrer           text,
  ip_hash            text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- The desk lists open requests newest first.
create index if not exists audit_requests_status_idx on public.audit_requests (status, created_at desc);
-- The public route throttles on these two.
create index if not exists audit_requests_email_idx on public.audit_requests (lower(email), created_at desc);
create index if not exists audit_requests_ip_idx on public.audit_requests (ip_hash, created_at desc);
-- The report page finds its request by the audit it produced.
create index if not exists audit_requests_audit_idx on public.audit_requests (presence_audit_id);

create or replace function public.audit_requests_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists audit_requests_touch on public.audit_requests;
create trigger audit_requests_touch
  before update on public.audit_requests
  for each row execute function public.audit_requests_touch();

-- Same posture as presence_audits: RLS on, no public policy. Every read and
-- write goes through a server route holding the service key.
alter table public.audit_requests enable row level security;

commit;
