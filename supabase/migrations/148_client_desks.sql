-- A CLIENT'S DESK, AS A ROW.
--
-- Every client whose website, Daily Posting or Command Center runs through the
-- studio needs one record that says who they are: the business, the account
-- email, the sites allowed to post leads, the people and their own inboxes, the
-- phone that hears about a lead, their office front's logo and colours. Until
-- now that record lived in code (CLIENT_PROJECTS in lib/client-leads.ts), so
-- adding a client was a code change, a review and a deploy.
--
-- A desk made on /admin/desks lands here. The app loads these rows into the same
-- registry the code-defined desks live in, so the fifty-odd places that read a
-- client's desk find a new one without knowing where it came from. A desk in
-- code wins over a row with the same key or email, so no row can quietly
-- replace a live client that is still defined in code.
--
-- config is the whole desk in the shape of ClientProject, normalised on save.
-- Only the service role reads or writes it.

create table if not exists public.client_desks (
  key text primary key check (key ~ '^[a-z0-9-]{2,40}$'),
  client_email text not null unique,
  config jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_desks enable row level security;
