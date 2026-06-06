-- Modern Mustard Seed — client-submitted reviews need moderation context.
-- Run once in the Supabase SQL Editor. Reviews submitted from the client portal
-- land as status='pending' and must be approved in the admin before publishing.

alter table public.testimonials
  add column if not exists email text,
  add column if not exists source text;  -- e.g. 'portal' | 'admin'
