-- 055: atomic increment for the partner-forge QA counter. The read-modify-
-- write in the release route could lose a count when two admins release two
-- different holds of the same partner concurrently (ship-gate warning).
create or replace function bump_forge_qa(p_affiliate uuid)
returns int
language sql
security definer
set search_path = public
as $$
  update public.affiliates
     set forge_qa_approved = forge_qa_approved + 1
   where id = p_affiliate
  returning forge_qa_approved;
$$;
revoke all on function bump_forge_qa(uuid) from public, anon, authenticated;
