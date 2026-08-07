-- 088_hundredfold_assets.sql
-- Real artifacts, attached to the build that produced them.
--
-- Until now hundredfold_systems was a QUEUE: a row said what should exist and a
-- human moved it along. Sarah, 2026-08-07: "i want the members to see real stuff
-- appear." So a build now carries what it actually made.
--
-- assets: [{ kind: 'image'|'text', url?, text?, title, at }]
-- Images live at fal's CDN urls; text lands inline because it is small and the
-- member wants to copy it, not download it.

alter table public.hundredfold_systems
  add column if not exists assets jsonb not null default '[]'::jsonb,
  -- What the member (or the coach) asked for, kept so a rerun is reproducible.
  add column if not exists brief text,
  -- Set when a member approves a build that spends money, so the approval is a
  -- fact on the row rather than a status we have to infer.
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  -- Cost actually spent on this build, in cents. The per-member meter sums this.
  add column if not exists spend_cents int not null default 0,
  add column if not exists error text;

create index if not exists hundredfold_systems_status_idx on public.hundredfold_systems (status);
