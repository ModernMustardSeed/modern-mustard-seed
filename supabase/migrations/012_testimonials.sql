-- Modern Mustard Seed — testimonials / reviews
-- Run once in the Supabase SQL Editor. Read publicly via the server (service
-- role), managed in the admin. RLS on so the anon key cannot touch it.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  company text,
  quote text not null,
  outcome text,            -- short result line, e.g. "30% more booked jobs"
  rating int not null default 5,
  featured boolean not null default false,
  sort int not null default 0,
  status text not null default 'published',  -- published | hidden
  created_at timestamptz default now()
);

create index if not exists testimonials_status_idx on public.testimonials (status, sort);

alter table public.testimonials enable row level security;
