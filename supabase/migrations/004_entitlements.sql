-- Modern Mustard Seed — program entitlements
-- Run once in the Supabase SQL Editor. Grants gated access to the $497 program
-- HQs (The Terminal, Idea to Spec). Written by the Stripe webhook on purchase
-- and by the affiliate engine (free access for approved affiliates).

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_slug text not null,        -- 'the-terminal' | 'idea-to-spec'
  source text,                       -- 'purchase' | 'affiliate' | 'manual'
  created_at timestamptz default now(),
  unique (email, product_slug)
);

create index if not exists entitlements_email_idx on public.entitlements (email);

alter table public.entitlements disable row level security;
