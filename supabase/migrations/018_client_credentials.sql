-- Secure credentials vault. Secrets are encrypted at rest (AES-256-GCM) by the
-- server before insert; only the ciphertext + iv + auth tag are stored. Decryption
-- happens server-side, returned only to the admin or to the client whose email
-- matches the row. Never emailed.
create table if not exists public.client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  label text not null,
  username text,
  url text,
  secret_ciphertext text not null,
  secret_iv text not null,
  secret_tag text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_credentials_email_idx on public.client_credentials (client_email);

-- RLS on. Reached only through the server service role, which scopes every query
-- by email. The anon key can never read ciphertext.
alter table public.client_credentials enable row level security;
