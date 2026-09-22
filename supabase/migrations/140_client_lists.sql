-- 140_client_lists.sql
-- NAMED LISTS: "the realtor list", "the Whitefish crowd".
--
-- The book already carries tags, and campaigns already send to a set of tags.
-- What was missing is the noun. An owner does not think "send to everyone
-- tagged realtor and tagged title-company", they think "send it to the realtor
-- list", and the difference between those two sentences is whether they use
-- the thing at all.
--
-- So a list is a NAME OVER A RULE, not a second copy of the people. Tag a new
-- supplier "Supplier" and they are in the supplier list that evening without
-- anybody maintaining membership. A list that held its own rows would start
-- wrong the first time somebody added a contact and forgot, and there is no
-- way to notice that has gone wrong.
--
-- `tags` is an OR: a person in any of them is in the list. That is the rule an
-- owner expects from "realtors and title companies", and the one case where
-- an AND is wanted (Whitefish realtors) is served by tagging that way.

create table if not exists public.client_lists (
  id uuid primary key default gen_random_uuid(),

  -- The project's address, the same key every other client table uses.
  client_email text not null,

  -- What they call it. Shown on the chip and on the send button.
  name text not null,

  -- The rule. Anyone carrying any of these tags is in the list.
  tags text[] not null default '{}',

  -- A line about who it is for, shown under the name when choosing.
  note text,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One list per name per client, however it was capitalised on the day.
create unique index if not exists client_lists_name_idx
  on public.client_lists (client_email, lower(name));

create index if not exists client_lists_client_idx
  on public.client_lists (client_email, created_at desc);

alter table public.client_lists enable row level security;
-- No policies on purpose, as everywhere else in this schema: every reader and
-- writer is a server route on the service key, which bypasses RLS, and anon
-- gets nothing. A client's book is not a public table.

comment on table public.client_lists is
  'Named saved groups over client_contacts.tags. Membership is the rule, never a stored copy, so tagging someone adds them to their lists at once.';
