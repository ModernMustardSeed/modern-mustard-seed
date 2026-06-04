-- Modern Mustard Seed — proposal sign + pay + provisioning
-- Run once in the Supabase SQL Editor. Adds the shareable token, the typed
-- signature record, and a link to the provisioned project so an accepted
-- proposal can auto-populate a client and project on both sides.

alter table public.proposals
  add column if not exists share_token text,
  add column if not exists signed_at timestamptz,
  add column if not exists signed_name text,
  add column if not exists signed_ip text,
  add column if not exists project_id uuid;

-- Every proposal gets a hard-to-guess share token (used for the public URL).
alter table public.proposals
  alter column share_token set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

update public.proposals
  set share_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  where share_token is null;

create unique index if not exists proposals_share_token_idx on public.proposals (share_token);
