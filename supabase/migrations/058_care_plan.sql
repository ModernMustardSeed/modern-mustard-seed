-- 058: The Care Plan + self-serve edit accounting.
--
-- The self-serve edit tier (migration 057) sells one edit at a time for $29. The
-- Care Plan is the retention wedge sitting on top of it: a $97/mo subscription that
-- makes every edit included and none of them counted. To honor the never-leak-revenue
-- rule (hard-cap EVERY plan, no uncapped overage, fail closed), "unlimited" is a
-- fair-use HARD CAP of a generous number of edits per rolling period. At the cap the
-- edit degrades to a change request for Sarah (no more forge spend), never a silent
-- overage.
--
-- Columns:
--   care_plan          the plan is active for this project
--   care_sub_id        Stripe subscription id (so a cancel webhook finds the row)
--   care_customer_id   Stripe customer id
--   care_edits_used    edits spent in the current rolling window
--   care_period_start  when the current window opened (resets when it lapses)
--   paid_edits_count   how many one-off $29 edits this project has bought (for the
--                      "you have spent $X on edits" upsell framing)
--   edit_care          the in-flight edit is a CARE edit (so a discard refunds a care
--                      edit, never a free revision the client never spent)

alter table projects add column if not exists care_plan boolean not null default false;
alter table projects add column if not exists care_sub_id text;
alter table projects add column if not exists care_customer_id text;
alter table projects add column if not exists care_edits_used integer not null default 0;
alter table projects add column if not exists care_period_start timestamptz;
alter table projects add column if not exists paid_edits_count integer not null default 0;
alter table projects add column if not exists edit_care boolean not null default false;

create index if not exists projects_care_sub_idx on projects (care_sub_id);

-- Spend one CARE edit atomically, with the rolling window reset folded into the same
-- locked statement. FOR UPDATE serializes concurrent claims on the row, so two tabs
-- can never both slip past the cap. FAILS CLOSED: no active plan, or over the cap,
-- returns -1 and the caller sends the change to Sarah as a note instead.
create or replace function claim_care_edit(p_project_id uuid, p_cap integer, p_period_days integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_start timestamptz;
begin
  select care_edits_used, care_period_start
    into v_used, v_start
    from projects
   where id = p_project_id
     and care_plan = true
   for update;

  if not found then
    return -1; -- no such project, or the plan is not active: fail closed
  end if;

  -- Open a fresh window if this is the first edit or the last one has lapsed.
  if v_start is null or now() - v_start >= make_interval(days => p_period_days) then
    v_used := 0;
    v_start := now();
  end if;

  if v_used < p_cap then
    v_used := v_used + 1;
    update projects
       set care_edits_used = v_used,
           care_period_start = v_start,
           updated_at = now()
     where id = p_project_id;
    return v_used;
  end if;

  -- Over the cap: still persist any window reset so it sticks, then fail closed.
  update projects
     set care_edits_used = v_used,
         care_period_start = v_start,
         updated_at = now()
   where id = p_project_id;
  return -1;
end;
$$;
