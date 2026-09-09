-- 123_posting_their_words.sql
-- THEIR WORDS, OUR EDIT. A submission is what the client wants to say, in
-- their own text, with any photos or graphics they have. We adapt it per
-- platform. They can ask for a graphic, and a person makes it before the post
-- goes. Nothing is written for them from a bank.
--
-- Run once. Idempotent.

alter table public.posting_materials drop constraint if exists posting_materials_kind_check;
alter table public.posting_materials
  add constraint posting_materials_kind_check check (kind in ('post', 'photo', 'brand'));
alter table public.posting_materials alter column url drop not null;
alter table public.posting_materials add column if not exists text text;             -- what they want to say, their words
alter table public.posting_materials add column if not exists wants_graphic boolean not null default false;
alter table public.posting_materials add column if not exists graphic_brief text;    -- what the graphic should show
alter table public.posting_materials add column if not exists graphic_done_at timestamptz;
alter table public.posting_materials add column if not exists graphic_by text;
