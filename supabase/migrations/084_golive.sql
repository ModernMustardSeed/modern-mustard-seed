-- 084_golive.sql
-- GO-LIVE runbooks: one row per project, the interactive "are we done" list.
--
-- Born on Cornerstone (2026-08-06): its in-repo /golive page proved the shape
-- (groups of items, each tagged You/Claude/Client/Done, links inline), but
-- localStorage checkboxes die on device changes and agents cannot flip them.
-- This table is the durable version. The `golive` skill scans a repo, writes
-- the runbook here via scripts/golive-upsert.mjs (service key, local), and the
-- admin hub at /admin/golive renders it. Sarah toggles in the UI; agents
-- toggle via scripts/golive-check.mjs when they finish a Claude item.

create table if not exists public.golive_runbooks (
  slug text primary key,
  title text not null,
  subtitle text,
  repo_path text,
  prod_url text,

  -- groups: [{ name, note?, items: [{ id, who, what, how?, href?, label? }] }]
  -- who: 'You' (Sarah) | 'Claude' | 'Client' | 'Done' (pre-completed at scan time)
  data jsonb not null default '[]'::jsonb,

  -- item id -> { at: iso, by: email-or-'claude' }. Kept separate from data so a
  -- rescan can replace the plan without clobbering what is already checked off.
  done jsonb not null default '{}'::jsonb,

  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.golive_runbooks enable row level security;
-- No policies on purpose: every reader/writer is an admin server route or a
-- local agent script, both on the service key. Anon gets nothing.
