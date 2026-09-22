-- 138_partner_prospects.sql
-- THE PARTNER DESK: the people we invite into the partner program, before they apply.
--
-- The partner program has had a public page, a portal, a commission engine and a
-- flywheel since June, and nine partners, all of them family or team. Nobody outside
-- has ever applied, because nobody outside was ever asked. Cross + Covenant gets five
-- creator inquiries a week because it has an ambassador desk that finds people and
-- writes to them. This table is the same desk for Modern Mustard Seed.
--
-- One row per person or organisation we want as a partner. The letters are hand
-- sent from the desk, one at a time, from Sarah's own address: no cron, no drip, no
-- bulk header. The root domain carries one-to-one mail only (lib/send-email.ts).

create table if not exists public.partner_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- creator | referral | community
  kind text not null default 'creator',
  handle text,
  platform text,
  niche text,
  email text,
  website text,
  instagram text,
  tiktok text,
  youtube text,
  x text,
  linkedin text,
  followers integer,
  -- mega | macro | mid | micro, derived from followers
  tier text,
  -- manual | youtube | csv | cxc-book
  source text not null default 'manual',
  -- queued | emailed | dm_sent | replied | joined | passed
  status text not null default 'queued',
  -- how many letters have gone out (0, 1, 2 or 3)
  step integer not null default 0,
  notes text,
  last_contacted_at timestamptz,
  -- when the next letter is due; null once the sequence is spent or the person answered
  next_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_prospects_status_idx on public.partner_prospects (status);
create index if not exists partner_prospects_next_at_idx on public.partner_prospects (next_at);
create index if not exists partner_prospects_email_idx on public.partner_prospects (lower(email));

alter table public.partner_prospects enable row level security;
