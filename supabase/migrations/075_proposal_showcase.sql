-- 075: the proposal carries the work already forged for the prospect (clickable
-- demo links rendered as the "Already built for you" showcase) and an honest
-- send ledger. Part of the client-spine consolidation: proposals, delivery, and
-- the client book all read these columns.

alter table public.proposals
  add column if not exists demo_links jsonb not null default '[]'::jsonb;

alter table public.proposals
  add column if not exists sent_at timestamptz;
