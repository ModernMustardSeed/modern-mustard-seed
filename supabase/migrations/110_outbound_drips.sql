-- OUTBOUND DRIPS (2026-08-25, Sarah: "a button in each contact to create or show
-- a drip campaign for them, and whatever the first email is triggers it so it
-- continues over the next few weeks").
--
-- One row per outbound lead. Sending the first email from the cockpit starts
-- it; the outbound-cadence cron advances it on business-day gaps; a reply, an
-- unsubscribe, a bounce, DNC, won or lost stops it. This is the OUTBOUND drip,
-- separate from the acquisition engine's acq_queue sequence, which has its own
-- campaign, governor and eligibility. Sends still land in acq_sends so the
-- rolling ceiling counts them.

create table if not exists public.outbound_drips (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.outbound_leads(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'done', 'stopped')),
  -- The last step sent (1..n). 0 means created but nothing sent yet.
  step smallint not null default 0,
  -- Business days to wait after each step before the next one. Length + 1 = emails.
  gaps smallint[] not null default '{3,4,5,5}',
  next_at timestamptz,
  started_at timestamptz not null default now(),
  started_by text,
  last_sent_at timestamptz,
  stopped_reason text,
  -- [{step, at, messageId, subject}] for the cockpit timeline.
  sent jsonb not null default '[]'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbound_drips_due_idx on public.outbound_drips (next_at) where status = 'active';

comment on table public.outbound_drips is
  'Per-lead outbound email sequence. Started from the cockpit, advanced by /api/cron/outbound-cadence, stopped by reply, unsubscribe, bounce, DNC, won or lost.';
