-- 090_hundredfold_brand.sql
-- THE BRAND KIT, and the version history that makes an edit safe.
--
-- Sarah, 2026-08-08: "i do want all the things that are built or generated to
-- match the colors and aesthetic and have ability to makes changes if needed
-- from client or admin side ... we always want it hyper customized."
--
-- Two gaps, both real. The factory told the model "pick a palette that fits the
-- trade", so it guessed fresh on every build and two assets for the same member
-- did not match each other. And nothing could be changed: the only control was
-- "Build another", which re-rolls from scratch and throws away the good parts.

create table if not exists public.hundredfold_brand (
  member_id uuid primary key references public.hundredfold_members(id) on delete cascade,

  -- The palette every generated artifact is BOUND to, not merely told about.
  -- Injected as CSS custom properties into generated documents so the model
  -- cannot pick its own colours even if it wants to.
  ink text,          -- darkest text
  paper text,        -- page background
  accent text,       -- the one colour a customer would name
  accent_soft text,  -- tints, fills, hovers
  line text,         -- hairlines and borders

  -- Typography as a stack the document can actually render offline. Generated
  -- artifacts are self-contained and must not fetch a font from a third party,
  -- so this is a font-family value, not a Google Fonts name.
  display_font text,
  body_font text,

  logo_url text,
  logo_dark_url text,

  -- Art direction for stills, so three separate image builds look like one
  -- shoot rather than three stock libraries.
  photo_direction text,

  -- How they talk. Distinct from the offer's promise: this is register, not
  -- content ("plainspoken, never clinical, first person plural").
  voice text,
  -- Things to never say or show. The most valuable field here, and the one an
  -- owner fills in fastest, because everybody knows their own forbidden list.
  avoid text,

  -- What every artifact needs in its footer and no generator should invent.
  contact jsonb not null default '{}'::jsonb,   -- { phone, email, address, booking_url, hours }
  legal text,                                    -- disclaimers, licence numbers

  -- 'extracted' (read off their live site), 'member', 'admin', 'default'
  source text not null default 'default',
  extracted_from text,
  extracted_at timestamptz,

  updated_at timestamptz not null default now(),
  updated_by text
);

-- Every build and every revision writes one row here BEFORE it replaces what is
-- live, so a bad edit is one click from undone.
--
-- ⚠️ This is what makes revision safe to offer at all. Without it, "change the
-- headline" is a coin flip that can destroy an artifact the member has already
-- pasted onto their own website.
create table if not exists public.hundredfold_versions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.hundredfold_systems(id) on delete cascade,
  member_id uuid not null references public.hundredfold_members(id) on delete cascade,

  n int not null,
  assets jsonb not null default '[]'::jsonb,
  artifact_html text,
  -- The authored structure behind a PDF, so a revision edits the document
  -- rather than re-writing it from the prompt.
  doc jsonb,

  -- What produced this version: 'build' or the revision instruction itself.
  note text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists hundredfold_versions_system_idx
  on public.hundredfold_versions (system_id, n desc);

-- The authored source for a PDF lives on the row too, so the newest version can
-- always be revised without reaching into history.
alter table public.hundredfold_systems
  add column if not exists doc jsonb,
  add column if not exists version int not null default 0;

alter table public.hundredfold_brand enable row level security;
alter table public.hundredfold_versions enable row level security;
-- No policies, same as 087/089: every reader and writer is a server route on
-- the service key, and the member portal reads server-side scoped to session.
