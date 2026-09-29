-- ============================================================================
-- YIELD LEARNS.
--
-- office_lessons  What the floor has learned. Sower writes one to five after
--                 every mission debrief (what converted, what flopped, which
--                 words got replies), each with the evidence behind it. Every
--                 future plan Sower writes carries the active ones, so the
--                 office gets sharper with each mission instead of starting
--                 cold. Sarah can pin a lesson (always carried first) or
--                 retire it (never carried again).
-- ============================================================================

create table if not exists public.office_lessons (
  id uuid primary key default gen_random_uuid(),
  lesson text not null,
  area text not null default 'general'
    check (area in ('general', 'outreach', 'offer', 'content', 'visuals', 'build', 'pricing', 'ops')),
  evidence text,
  mission_id uuid references public.office_missions(id) on delete set null,
  pinned boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists office_lessons_active_idx on public.office_lessons (active, pinned desc, created_at desc);

alter table public.office_lessons enable row level security;
