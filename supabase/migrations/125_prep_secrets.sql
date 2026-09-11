-- 125_prep_secrets.sql
-- A vendor handing over accounts will type passwords into the form. Answers
-- are emailed to Sarah in full, so a password in an ordinary answer would sit
-- in an inbox in plain text forever, and in a database row in plain text
-- beside it. Neither is acceptable.
--
-- Secrets travel in their own field, are encrypted with the same AES-GCM
-- helper the OAuth tokens use (lib/crypto.ts), and are never put in an email.
-- The notification says how many arrived and links to the admin; the value is
-- decrypted only when a person opens it, and is marked used once rotated.
--
-- Run once. Idempotent.

create table if not exists public.prep_secrets (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid references public.prep_intakes (id) on delete cascade,
  project text not null,
  client_email text not null,
  label text not null,                  -- "Namecheap account", "Facebook page login"
  ciphertext text not null,
  iv text not null,
  tag text not null,
  submitted_by text,
  rotated_at timestamptz,               -- set by a person once the credential has been changed
  rotated_by text,
  created_at timestamptz not null default now()
);

create index if not exists prep_secrets_client_idx on public.prep_secrets (client_email, created_at desc);
alter table public.prep_secrets disable row level security;
