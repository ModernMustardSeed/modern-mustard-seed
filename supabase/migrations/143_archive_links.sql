-- 143_archive_links.sql
-- AN ARCHIVE YOU CAN OPEN.
--
-- `client_archive_posts` was built to hold what the outgoing provider reported:
-- the words, the day, the networks, whatever numbers they gave us. That was
-- right for a spreadsheet read off somebody else's dashboard.
--
-- Now the posts come from the platform itself the moment a Page is connected,
-- and the platform gives two things the spreadsheet never had: a link to the
-- post as it stands on the feed, and the picture that went with it. Both
-- belong to the business. Without them the archive is a transcript; with them
-- it is their own record, and "show me what we posted last March" is a screen
-- rather than an apology.

alter table public.client_archive_posts
  -- The post on the feed, for a person who wants to see the real thing.
  add column if not exists url text,
  -- The picture as the platform serves it. Not copied into our storage: this
  -- is a record of what they posted, not a second copy of their photo library.
  add column if not exists image_url text;

comment on column public.client_archive_posts.url is
  'The permalink on the platform. Written by lib/posting/import-history.ts when a Page or Instagram account is connected.';
