-- Launch date change requests ride on client_requests (source = 'launch_date').
-- proposed_date holds the date the client is asking for, so the owner can
-- approve it in one click and the project's launch_target updates.
alter table public.client_requests
  add column if not exists proposed_date date;
