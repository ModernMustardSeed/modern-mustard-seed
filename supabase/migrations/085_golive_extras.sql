-- 085_golive_extras.sql
-- Hand-added runbook steps, kept OUTSIDE data so a rescan (which replaces the
-- scanned plan wholesale) can never wipe what Sarah typed in herself.
-- Shape: [{ id, group, who, what }] — merged into the matching group at read
-- time, or into an "Added By Hand" group when the group name no longer exists.

alter table public.golive_runbooks
  add column if not exists extras jsonb not null default '[]'::jsonb;
