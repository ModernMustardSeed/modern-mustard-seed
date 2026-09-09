-- 121_posting.sql
-- DAILY POSTING, THE WHOLE LOOP. A client drops photos and a line in their
-- portal; the planner writes tomorrow's post the evening before; the publisher
-- puts it on every connected platform at the client's hour; what cannot be
-- posted by API lands on Sarah's desk as a copy-ready sheet. Plus the lead
-- table every client site posts into (/api/client-lead).
--
-- Run once. Idempotent.

-- ── Connected accounts: client_integrations grows beyond Google ──────────────
alter table public.client_integrations drop constraint if exists client_integrations_provider_check;
alter table public.client_integrations
  add constraint client_integrations_provider_check
  check (provider in ('google', 'facebook', 'instagram', 'x', 'linkedin'));
alter table public.client_integrations add column if not exists external_id text;     -- page id, ig user id, x user id, org urn, gbp location
alter table public.client_integrations add column if not exists meta jsonb not null default '{}'::jsonb;

-- ── What we know about the business, per client ─────────────────────────────
create table if not exists public.posting_settings (
  client_email text primary key,
  business_name text not null,
  site_url text,
  phone text,
  towns text[] not null default '{}',          -- lead towns first
  services text[] not null default '{}',
  facts text,                                  -- free text the writer may use
  tone text,                                   -- how the business talks
  hard_nos text,                               -- what a post must never do
  platforms text[] not null default '{facebook,instagram,linkedin,x,gbp,houzz}',
  post_hour_mt int not null default 9 check (post_hour_mt between 0 and 23),
  auto_publish boolean not null default true,
  weekly_summary boolean not null default true,
  notify_emails text[] not null default '{}',  -- who gets the weekly summary
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.posting_settings disable row level security;

-- ── Material: what the client drops in ──────────────────────────────────────
create table if not exists public.posting_materials (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  url text not null,                            -- public JPEG, the one every platform receives
  kind text not null default 'photo' check (kind in ('photo', 'brand')),  -- brand = evergreen pool, reused
  note text,                                    -- what it is, where, anything to say
  uploaded_by text,                             -- portal email or 'admin'
  status text not null default 'fresh' check (status in ('fresh', 'used', 'archived')),
  used_count int not null default 0,
  last_used_on date,
  created_at timestamptz not null default now()
);
create index if not exists posting_materials_client_idx on public.posting_materials (client_email, status, created_at);
alter table public.posting_materials disable row level security;

-- ── Posts: one per client per day ───────────────────────────────────────────
create table if not exists public.posting_posts (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  scheduled_for date not null,
  publish_at timestamptz not null,
  material_id uuid references public.posting_materials (id) on delete set null,
  image_url text,
  headline text,
  captions jsonb not null default '{}'::jsonb,  -- {facebook, instagram, x, linkedin, gbp, houzz}
  source text not null default 'material' check (source in ('material', 'evergreen', 'manual')),
  evergreen_key text,
  status text not null default 'writing'
    check (status in ('writing', 'scheduled', 'held', 'publishing', 'published', 'partial', 'failed', 'skipped')),
  results jsonb not null default '{}'::jsonb,   -- {platform: {ok, id, url, error, at, manual}}
  llm_job_id uuid,
  written_by text,                              -- 'claude' | 'template' | 'person'
  edited_by text,
  sheet_sent_at timestamptz,                    -- the hand-post sheet to Sarah
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_email, scheduled_for)
);
create index if not exists posting_posts_due_idx on public.posting_posts (status, publish_at);
alter table public.posting_posts disable row level security;

-- ── Leads from a client's own site (forms, chat) ────────────────────────────
create table if not exists public.client_leads (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  project text not null,
  source text not null check (source in ('contact', 'intake', 'refer', 'chat', 'questionnaire')),
  name text,
  phone text,
  email text,
  town text,
  project_type text,
  land text,
  message text,
  page text,
  referrer_name text,
  referrer_phone text,
  answers jsonb,                                -- the first-week questionnaire, [{q, a}]
  sources text[] not null default '{}',         -- every door this person came through, in order
  ip_hash text,
  ua text,
  notified jsonb not null default '{}'::jsonb,  -- {sms: {ok, sid|error}, email: {ok, id|error}}
  created_at timestamptz not null default now()
);
create index if not exists client_leads_client_idx on public.client_leads (client_email, created_at desc);
alter table public.client_leads disable row level security;
