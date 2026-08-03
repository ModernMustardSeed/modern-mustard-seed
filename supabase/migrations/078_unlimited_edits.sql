-- 078: UNLIMITED EDITS. The two-free-edits budget is retired.
--
-- Decided 2026-08-03. Counting a client's edits, then charging $29 for the third,
-- is nickel-and-diming a system that makes an edit cheap. Every delivery project
-- (demo sites, proposal builds, Talking Websites) now gets unlimited edits, and
-- nothing about editing is ever sold again. The $29 one-off edit and the $97/mo
-- Care Plan both retire; existing Care Plan subscriptions keep working untouched
-- (the flag, the dunning email, and the cancel webhook all stay), but the plan no
-- longer gates anything, because nothing is gated.
--
-- What "unlimited" means under the never-leak-revenue rule: unlimited to the client,
-- hard-capped behind the glass. Every edit spends real forge money, so a generous
-- rolling fair-use ceiling stays in place and FAILS CLOSED. Past it the edit becomes
-- a note to Sarah instead of forge spend. Nobody editing their website like a normal
-- human will ever see it.
--
-- Columns:
--   edits_window_used   edits spent in the current rolling fair-use window
--   edits_window_start  when that window opened (reset when it lapses)
--
-- revisions_used keeps its meaning as the LIFETIME edit count (the ledger the admin
-- board shows and client_requests.revision_number points at). revisions_included is
-- no longer a budget: it survives only as the nonzero FLAG meaning "this project has
-- portal editing turned on", which five queries filter on with .gt(...,0).

alter table projects add column if not exists edits_window_used integer not null default 0;
alter table projects add column if not exists edits_window_start timestamptz;

-- The old 1-arg budget claimer is gone. Drop before create: the replacement takes
-- the cap and period from the caller (same shape as claim_care_edit), and leaving
-- both signatures in place would make a 1-arg call ambiguous.
drop function if exists claim_revision(uuid);

-- Spend one edit. Unlimited, but atomic and fair-use capped.
--
-- FOR UPDATE serializes concurrent claims on the row, so two tabs or a double-click
-- cannot both slip past the ceiling. The rolling-window reset is folded into the same
-- locked statement. Returns the 1-based LIFETIME edit number just claimed, or -1 when
-- the project does not exist or the window is spent (fail closed, caller sends the
-- change to Sarah as a note and never silently does the work anyway).
create or replace function claim_revision(p_project_id uuid, p_cap integer, p_period_days integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window integer;
  v_start timestamptz;
  v_total integer;
begin
  select edits_window_used, edits_window_start, revisions_used
    into v_window, v_start, v_total
    from projects
   where id = p_project_id
   for update;

  if not found then
    return -1;
  end if;

  -- Open a fresh window on the first edit or once the last one has lapsed.
  if v_start is null or now() - v_start >= make_interval(days => p_period_days) then
    v_window := 0;
    v_start := now();
  end if;

  if v_window >= p_cap then
    -- Over fair use: still persist any window reset so it sticks, then fail closed.
    update projects
       set edits_window_used = v_window,
           edits_window_start = v_start,
           updated_at = now()
     where id = p_project_id;
    return -1;
  end if;

  v_window := v_window + 1;
  v_total := coalesce(v_total, 0) + 1;
  update projects
     set edits_window_used = v_window,
         edits_window_start = v_start,
         revisions_used = v_total,
         updated_at = now()
   where id = p_project_id;
  return v_total;
end;
$$;

revoke all on function claim_revision(uuid, integer, integer) from public, anon, authenticated;

-- Hand an edit back. A discarded draft or a failed forge run must return BOTH
-- counters, or a client who threw away a bad edit slowly burns their fair-use
-- window on work they never kept. One statement, so a double refund cannot race.
-- Floors at zero and is safe to call on a project that never spent one.
create or replace function refund_revision(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update projects
     set edits_window_used = greatest(0, edits_window_used - 1),
         revisions_used = greatest(0, revisions_used - 1),
         updated_at = now()
   where id = p_project_id;
$$;

revoke all on function refund_revision(uuid) from public, anon, authenticated;

-- No backfill. Every project starts this rolling window empty: the old budget capped
-- revisions_used at 2, so there is nothing meaningful to carry forward, and a client
-- mid-flight should not open the new era already partway into a ceiling.
