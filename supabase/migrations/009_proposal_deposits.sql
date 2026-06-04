-- Modern Mustard Seed — proposal deposits + lead linkage (the money loop)
-- Run once in the Supabase SQL Editor. Lets an accepted proposal generate a
-- Stripe deposit payment link, track payment, and link back to its pipeline lead.

alter table public.proposals
  add column if not exists lead_id uuid,
  add column if not exists deposit_amount int not null default 0,
  add column if not exists deposit_status text not null default 'unpaid',  -- unpaid | link_sent | paid
  add column if not exists deposit_url text,
  add column if not exists deposit_session_id text,
  add column if not exists deposit_paid_at timestamptz;

create index if not exists proposals_lead_idx on public.proposals (lead_id);
