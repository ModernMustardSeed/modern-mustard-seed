-- 063: rep presence + persisted call batch.
--
-- Until now a caller's working state lived only in their browser: the frozen
-- batch and cursor were localStorage (see setDialSession in ui.tsx), and nobody
-- could see who was on the floor or which lead each person was working. That
-- means a rep who closed the tab, switched machines, or got logged out lost
-- their place, and two callers could dial the same business at the same time
-- without knowing.
--
-- These columns move that state onto the rep row so it is durable and shared:
--   last_seen_at     - heartbeat stamp; "online now" = within a couple minutes
--   current_lead_id  - the lead this rep has open right now (presence + no double-dialing)
--   batch_lead_ids   - the frozen, ordered stack minted by "Start batch"
--   batch_started_at - when that stack was minted (drives the session timer + pace)
--   batch_cursor     - furthest index worked, so "pick up where you left off" is exact
--
-- All additive and nullable/defaulted, so every existing select('*') on
-- outbound_reps (outbound-server.ts, reps route) picks them up with no code change.
alter table public.outbound_reps add column if not exists last_seen_at timestamptz;
alter table public.outbound_reps add column if not exists current_lead_id uuid references public.outbound_leads(id) on delete set null;
alter table public.outbound_reps add column if not exists batch_lead_ids jsonb not null default '[]'::jsonb;
alter table public.outbound_reps add column if not exists batch_started_at timestamptz;
alter table public.outbound_reps add column if not exists batch_cursor int not null default 0;

-- "Who's online" scans reps by recency; tiny table, but keep the access pattern honest.
create index if not exists idx_outbound_reps_last_seen on public.outbound_reps (last_seen_at desc nulls last);
