-- ============================================================================
-- 106  THE PRESENCE AUDIT
-- ============================================================================
-- The website audit already existed and graded one thing: the website. What a
-- contractor actually has is three things, and two of them are usually better
-- than the one we were grading.
--
--   WEBSITE   the seven-category engine we already run
--   PROFILE   their Google Business Profile, on eight checks that are each
--             either true or false
--   REVIEWS   volume and rating against a trades benchmark
--
-- The report is stored whole as jsonb rather than shredded into columns. It is
-- a document that gets rendered and printed, not something we query by field,
-- and a schema for it would need a migration every time the rubric learns
-- something. The two things we DO query, the score and the letter, are columns.
--
-- The audit joins the demo suite as its fifth door, so a lead carries a pointer
-- to its latest one exactly the way it carries the integration plan.
-- ============================================================================

begin;

create table if not exists public.presence_audits (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.outbound_leads(id) on delete cascade,
  business_name text not null,
  website       text,
  score         smallint,
  letter        text,
  report        jsonb,
  status        text not null default 'ready' check (status in ('queued', 'building', 'ready', 'failed')),
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The hub and the emails both look the audit up by lead, newest first.
create index if not exists presence_audits_lead_idx on public.presence_audits (lead_id, created_at desc);

-- ── the lead's pointer to its latest audit ──────────────────────────────────
-- Mirrors integration_plan_* (migration 104) on purpose: the demo hub reads
-- every door the same way, so a fifth door needs no new shape.
alter table public.outbound_leads
  add column if not exists presence_audit_id    uuid references public.presence_audits(id) on delete set null,
  add column if not exists presence_audit_url   text,
  add column if not exists presence_audit_score smallint,
  add column if not exists presence_audit_at    timestamptz;

-- ── row level security ──────────────────────────────────────────────────────
-- Same posture as the rest of the outbound namespace: RLS on, no public policy,
-- so only the service role reads it. The public /demo/audit/<id> page is served
-- by the server with the service key and never by the browser, which is what
-- keeps an unguessable id from becoming a lead-table enumeration tool.
alter table public.presence_audits enable row level security;

commit;
