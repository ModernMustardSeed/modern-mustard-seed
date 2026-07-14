-- 053: phone numbers on team identities, for the Partner Hub team directory.
alter table public.team_members add column if not exists phone text;
