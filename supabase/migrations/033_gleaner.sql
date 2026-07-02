-- 033_gleaner.sql
-- Gleaner: the autonomous revenue-recovery engine.
-- Verticals (scouted industry intelligence), runs (one lever pull = one run),
-- events (the live terminal feed), demos (forged voice-concierge assets).
-- Bridges harvest_prospects (007) and build_requests (022) into one closed loop.

create table if not exists public.gleaner_verticals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'candidate',        -- candidate | scouted | active | retired
  demo_template text,                              -- restaurant | home-services | painting | medspa | custom
  clone_source text,                               -- proven repo the demo factory clones
  search_terms text,                               -- comma-separated harvest discovery terms
  leak_summary text,                               -- one line: why this vertical leaks revenue
  intelligence jsonb not null default '{}'::jsonb, -- scout output: leak math, chains, pricing rec
  score int,                                       -- 0-100 vertical attractiveness
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gleaner_runs (
  id uuid primary key default gen_random_uuid(),
  vertical_slug text not null,                     -- 'auto' lets the scout pick
  geo text not null default '',
  status text not null default 'queued',           -- queued | scouting | fielding | forging | courting | gated | done | failed | canceled
  stage_detail text,
  config jsonb not null default '{}'::jsonb,       -- { maxProspects, maxDemos, skipScout }
  stats jsonb not null default '{}'::jsonb,        -- { discovered, audited, qualified, demos, drafts, leakMonthly }
  error text,
  worker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.gleaner_events (
  id bigint generated always as identity primary key,
  run_id uuid references public.gleaner_runs(id) on delete cascade,
  level text not null default 'info',              -- info | ok | warn | error | gate
  source text not null default 'system',           -- scout | field | forge | court | gate | system
  message text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gleaner_demos (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.gleaner_runs(id) on delete set null,
  prospect_id uuid references public.harvest_prospects(id) on delete set null,
  build_request_id uuid references public.build_requests(id) on delete set null,
  vertical_slug text,
  brand_name text not null,
  status text not null default 'queued',           -- queued | forging | ready | live | failed
  demo_url text,
  phone text,
  dashboard_url text,
  repo_url text,
  vapi_assistant_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gleaner_runs_status_idx on public.gleaner_runs (status);
create index if not exists gleaner_runs_created_idx on public.gleaner_runs (created_at desc);
create index if not exists gleaner_events_run_idx on public.gleaner_events (run_id, id);
create index if not exists gleaner_demos_run_idx on public.gleaner_demos (run_id);
create index if not exists gleaner_demos_status_idx on public.gleaner_demos (status);

drop trigger if exists update_gleaner_verticals_updated_at on public.gleaner_verticals;
create trigger update_gleaner_verticals_updated_at before update on public.gleaner_verticals
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_gleaner_runs_updated_at on public.gleaner_runs;
create trigger update_gleaner_runs_updated_at before update on public.gleaner_runs
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_gleaner_demos_updated_at on public.gleaner_demos;
create trigger update_gleaner_demos_updated_at before update on public.gleaner_demos
  for each row execute function public.update_updated_at_column();

alter table public.gleaner_verticals enable row level security;
alter table public.gleaner_runs enable row level security;
alter table public.gleaner_events enable row level security;
alter table public.gleaner_demos enable row level security;

-- Seed the four proven verticals (the demos already exist and answer their phones).
insert into public.gleaner_verticals (slug, name, status, demo_template, clone_source, search_terms, leak_summary, score)
values
  ('restaurant', 'Restaurants + fast casual', 'active', 'restaurant', '~/newks-voice-concierge',
   'restaurant,cafe,fast casual restaurant',
   'Lunch-rush calls ring out. Catering orders (the highest-ticket call) go to voicemail.', 82),
  ('home-services', 'Plumbing + HVAC + home services', 'active', 'home-services', '~/franklin-voice-concierge',
   'plumber,hvac,electrician',
   'After-hours emergencies are the most valuable calls and the least answered. One missed emergency is a $400+ job lost.', 90),
  ('painting', 'Painting + exterior contractors', 'active', 'painting', '~/certapro-voice-concierge',
   'painter,painting contractor',
   'Estimate requests go unanswered while crews are on ladders. Slow callback means the competitor books it.', 78),
  ('medspa', 'MedSpas + aesthetics', 'active', 'medspa', '~/serabella-medspa-concierge',
   'med spa,medical spa,aesthetics clinic',
   'Front desk juggles treatments and phones. Consult requests (lifetime value $2K+) leak nights and weekends.', 88)
on conflict (slug) do nothing;
