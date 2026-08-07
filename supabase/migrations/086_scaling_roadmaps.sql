-- 086_scaling_roadmaps.sql
-- THE HUNDREDFOLD ROADMAP: one row per generated scaling roadmap.
--
-- The public tool at /scaling-roadmap takes a website URL, reads the business,
-- and writes a personalized scaling plan (constraint, offer, money model, lead
-- engine, four phases, scoreboard). Every run is a lead: the row exists before
-- an email is ever captured, so the admin desk at /admin/roadmaps can see
-- demand even from visitors who never fill in the save form.
--
-- Rows are also the share page. `slug` is the public permalink at
-- /scaling-roadmap/r/<slug>, which doubles as the viral loop and as SEO surface
-- for "scaling roadmap for <industry>" queries.

create table if not exists public.scaling_roadmaps (
  id uuid primary key default gen_random_uuid(),

  -- Public permalink. Host-derived, collision-suffixed by the writer.
  slug text not null unique,

  -- What was read.
  url text not null,
  host text not null,
  business_name text,
  industry text,

  -- Optional context the visitor volunteered on the form. Makes the roadmap
  -- materially better, so it is asked for but never required.
  context jsonb not null default '{}'::jsonb,

  -- The full report. Shape is documented in lib/scaling-roadmap.ts.
  report jsonb not null,

  -- Denormalized for the admin list and the share page's metadata, so neither
  -- has to parse the whole report to sort or render a card.
  scale_score int,
  stage text,
  headline text,
  constraint_type text,

  -- Lead capture. Null until the visitor asks for the emailed copy.
  email text,
  name text,
  phone text,

  -- 'public' | 'admin' | 'seed'. Seeded rows (ours) never count as leads.
  source text not null default 'public',

  -- Featured rows render on the public index as worked examples.
  featured boolean not null default false,

  views int not null default 0,
  ip_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scaling_roadmaps_created_idx on public.scaling_roadmaps (created_at desc);
create index if not exists scaling_roadmaps_host_idx on public.scaling_roadmaps (host);
create index if not exists scaling_roadmaps_email_idx on public.scaling_roadmaps (email) where email is not null;
create index if not exists scaling_roadmaps_featured_idx on public.scaling_roadmaps (featured) where featured;

alter table public.scaling_roadmaps enable row level security;
-- No policies on purpose. Every reader and writer is a server route on the
-- service key (the share page reads server-side too). Anon gets nothing.
