-- 142_site_requests.sql
-- ONE QUEUE FOR EVERYTHING THEY ASK OF THEIR WEBSITE.
--
-- Today a client can put photographs on a page that already exists and paste a
-- link to an article somebody else published. Anything else, which is most of
-- what a business actually wants (a new project page for the house they just
-- finished, a piece written for their own blog, "move that photo", "we do
-- barndominiums now"), has no door at all. They email Sarah, or more often
-- they think about emailing Sarah and then do not, and the site slowly stops
-- being about the business it belongs to.
--
-- WHY THIS EXTENDS client_requests RATHER THAN ADDING A TABLE. Sarah already
-- works from that queue and the admin already reads it. A second table would
-- mean a second place to watch, and the failure mode of a second place to
-- watch is a client waiting a fortnight on something nobody saw. So the same
-- rows carry the new kinds, and the client sees the status on the row Sarah is
-- already moving.
--
-- The client sees `status`, which is why `status_note` exists beside it: "we
-- are on it" with nothing else said is how a person decides software is
-- lying to them.

alter table public.client_requests
  -- note     a message, the old default
  -- project  a new project page, with photographs and the story
  -- article  a piece for their own blog
  -- change   anything else about the site
  -- photos   photographs onto a page that exists
  add column if not exists kind text not null default 'note',
  add column if not exists title text,
  -- The kind's own fields: the town and what sort of build for a project, the
  -- angle for an article. Deliberately loose, because these shapes will change
  -- faster than a migration should.
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists photos text[] not null default '{}',
  -- What Sarah said back, in words the client reads on their own screen.
  add column if not exists status_note text,
  -- Where it landed, once it is live. The proof, and the link they will send
  -- their mother.
  add column if not exists live_url text,
  add column if not exists updated_at timestamptz not null default now();

-- The client's own view of their queue: newest first, per business.
create index if not exists client_requests_kind_idx
  on public.client_requests (client_email, kind, created_at desc);

comment on column public.client_requests.kind is
  'note | project | article | change | photos. The Website room writes the last four; see lib/cc-site.ts.';
comment on column public.client_requests.status_note is
  'What the studio said back, shown to the client beside the status. Silence is what makes people stop trusting a queue.';
