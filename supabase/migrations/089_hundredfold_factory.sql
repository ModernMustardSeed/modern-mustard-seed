-- 089_hundredfold_factory.sql
-- THE BUILD FACTORY: the arsenal stops being a queue and starts producing.
--
-- 088 gave a build somewhere to put its assets. It still had nothing that made
-- them. This migration adds the two things a factory needs that a queue does
-- not: somewhere to keep a DEPLOYABLE artifact, and an honest ledger of what
-- the work cost, because HUNDREDFOLD.monthlyAiCreditCents has been a number and
-- a policy with no enforcement behind it since the day it was written.

alter table public.hundredfold_systems
  -- The deployable artifact for a `page` or a `tool`: one self-contained HTML
  -- document, no external dependencies, exactly like the site forge produces.
  -- Kept in the row rather than in storage so publishing is a status flip and
  -- an un-publish cannot leave an orphan file serving on the internet.
  add column if not exists artifact_html text,
  -- Where it is live. Unique, readable, and stable across a rebuild so a member
  -- who has already pasted the embed on their own site never has it break.
  add column if not exists public_slug text,
  add column if not exists published_at timestamptz,
  -- The generator that made it, so a row can always answer "who built this".
  add column if not exists engine text,
  add column if not exists built_at timestamptz;

create unique index if not exists hundredfold_systems_slug_idx
  on public.hundredfold_systems (public_slug)
  where public_slug is not null;

-- The AI credit ledger.
--
-- ⚠️ WHY A LEDGER AND NOT A SUM OF hundredfold_systems.spend_cents: a build can
-- be re-run. spend_cents on the row is that build's lifetime total, so summing
-- it by the row's created_at charges this month's rebuild to the month the
-- build was first filed, and a member could rebuild forever inside a cycle that
-- already looks spent. Each RUN writes its own line here, stamped when it ran.
-- The meter reads this table and nothing else.
create table if not exists public.hundredfold_spend (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.hundredfold_members(id) on delete cascade,
  system_id uuid references public.hundredfold_systems(id) on delete set null,

  -- 'fal-image' | 'claude' | 'manual'
  source text not null,
  -- The BuildKind this run was serving, for reading the bill later.
  kind text,
  cents int not null default 0,
  note text,

  at timestamptz not null default now()
);

create index if not exists hundredfold_spend_member_idx on public.hundredfold_spend (member_id, at desc);

-- What a deployed intake form or quoter actually catches.
--
-- Without this a "tool" is a picture of a tool. The member puts the quoter on
-- their own site, a customer fills it in, and the answer has to land somewhere
-- the owner will actually see. It lands here and it emails them.
create table if not exists public.hundredfold_tool_submissions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.hundredfold_systems(id) on delete cascade,
  member_id uuid not null references public.hundredfold_members(id) on delete cascade,

  -- Whatever the generated form collected. Free shape on purpose: the tool is
  -- written for that member's business and we do not get to pick its fields.
  payload jsonb not null default '{}'::jsonb,
  -- Pulled out of the payload when present, so the owner's list is a real list.
  name text,
  email text,
  phone text,

  referrer text,
  ip_hash text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hundredfold_tool_subs_member_idx
  on public.hundredfold_tool_submissions (member_id, created_at desc);
create index if not exists hundredfold_tool_subs_system_idx
  on public.hundredfold_tool_submissions (system_id, created_at desc);

alter table public.hundredfold_spend enable row level security;
alter table public.hundredfold_tool_submissions enable row level security;
-- No policies, same as 087. Every reader and writer is a server route on the
-- service key. The public submit endpoint validates the slug server-side and
-- writes with that key; anon never touches these tables directly.
