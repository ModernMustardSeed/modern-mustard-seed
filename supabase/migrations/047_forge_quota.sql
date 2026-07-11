-- 047_forge_quota.sql
-- ATOMIC spend guard for the self-serve Demo Station.
--
-- The first cut read the day's counter, compared it to the cap, then wrote
-- back count+1 in a separate statement. Under concurrency every request reads
-- the same value and every request passes the check, so the "cap" opens wide
-- exactly when it matters (a burst). Each forge that slips through costs a real
-- Vapi run plus a website build on the worker, so this is a money leak.
--
-- claim_forge_slot() does the check and the increment in ONE statement. The
-- INSERT ... ON CONFLICT DO UPDATE takes a row lock, so concurrent callers
-- serialize and each sees a distinct post-increment value. Returns true only
-- while the count is within the cap. Callers must fail CLOSED on any error.

create or replace function claim_forge_slot(p_key text, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  insert into app_state (key, value, updated_at)
  values (p_key, jsonb_build_object('n', 1), now())
  on conflict (key) do update
    set value = jsonb_build_object('n', coalesce((app_state.value ->> 'n')::int, 0) + 1),
        updated_at = now()
  returning (value ->> 'n')::int into n;

  return n <= p_cap;
end;
$$;

-- Service role only (every caller is a server route using the service key).
revoke all on function claim_forge_slot(text, int) from public, anon, authenticated;
