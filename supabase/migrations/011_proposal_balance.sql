-- Modern Mustard Seed — proposal balance payment (the other 50%)
-- Run once in the Supabase SQL Editor.

alter table public.proposals
  add column if not exists balance_status text not null default 'unpaid',  -- unpaid | link_sent | paid
  add column if not exists balance_paid_at timestamptz;
