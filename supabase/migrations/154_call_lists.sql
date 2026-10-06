-- CALL LISTS: THE COLD-CALL SHEETS, ONE ROW PER BUSINESS TO DIAL.
--
-- A call list is a batch of businesses that just opened (New Doors: dated by
-- their first Google review), ranked strongest first into three groups:
-- no_site (Google lists no website), page_only (the listing points to a
-- booking page, a social profile or a near-empty site) and has_site (new and
-- owner-run with a real site). Whoever dials marks the outcome on the row, so
-- /admin/call-lists is the live version of the PDF sheet.
--
-- Rows are loaded by scripts/call-lists-seed.mjs from data/call-lists/*.json.
-- A business appears once per list (list_slug + phone). Only the service role
-- reads or writes it.

create table if not exists public.call_list_rows (
  id uuid primary key default gen_random_uuid(),
  list_slug text not null,
  list_title text not null,
  position int not null,
  grp text not null check (grp in ('no_site', 'page_only', 'has_site')),
  business_name text not null,
  category text,
  town text,
  phone text not null,
  opened text,
  finding text,
  website text,
  maps_url text,
  place_id text,
  outcome text not null default 'new'
    check (outcome in ('new', 'no_answer', 'voicemail', 'call_back', 'not_interested', 'yes', 'wrong_number')),
  notes text,
  called_by text,
  called_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_slug, phone)
);

create index if not exists call_list_rows_list_position_idx on public.call_list_rows (list_slug, position);

alter table public.call_list_rows enable row level security;
