-- 156: tailor the welcome intake to the business.
--
-- clients.intake_tailor holds what Sarah sets by hand for one client:
--   { "kind": "physical-therapy", "intro": "...", "questions": [{ "label": "...", "placeholder": "...", "long": true }] }
-- Every key is optional. With no kind, lib/intake-profiles.ts detects one from
-- the company name, the lead and the project, so a client never sees the
-- trade form just because nobody set this.
alter table public.clients add column if not exists intake_tailor jsonb;

comment on column public.clients.intake_tailor is
  'Welcome intake tailoring: { kind?, intro?, questions?[] }. See lib/intake-profiles.ts.';
