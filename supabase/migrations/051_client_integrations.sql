-- 051_client_integrations.sql
--
-- OAUTH. There was none. Not one flow, not one token, not one provider, anywhere in
-- this repo. The substitute was `client_credentials` (018): a vault where Sarah pastes
-- a client's Google password by hand, which does not scale past a handful of clients
-- and asks people to hand over a password, which is the wrong thing to ask.
--
-- A client connects their own Google account and we hold a scoped, revocable token
-- instead. That is what lets us read their Google Business Profile (the single highest
-- leverage local-search asset a small business owns), see their Analytics, and read
-- their calendar for the receptionist, without ever holding their password.
--
-- SECRETS AT REST: access and refresh tokens are AES-256-GCM encrypted (lib/crypto.ts),
-- exactly like the credentials vault. A stolen database row is useless without
-- CREDENTIALS_SECRET, which lives only in the server environment.
--
-- Tenancy is by email, like every other client-facing table here (003_client_portal).

create table if not exists client_integrations (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  provider text not null check (provider in ('google')),

  -- Which account they actually connected. Shown back to them so nobody wonders
  -- whether they linked the right one.
  account_email text,
  account_name text,

  -- What they granted. Scopes are stored because a user can approve a subset, and
  -- assuming we got a scope we did not get is how integrations fail silently.
  scopes text,

  access_ciphertext text,
  access_iv text,
  access_tag text,
  access_expires_at timestamptz,

  -- The refresh token is the durable one. Google only hands it over on the FIRST
  -- consent (or with prompt=consent), so if it is ever missing we must re-consent
  -- rather than pretend we are connected.
  refresh_ciphertext text,
  refresh_iv text,
  refresh_tag text,

  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  error text,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One live connection per provider per client. Reconnecting updates in place.
  unique (client_email, provider)
);

create index if not exists client_integrations_email_idx on client_integrations (client_email);

-- Same posture as every table here that holds client secrets: RLS on, NO policies.
-- The service role (every server route in this app) bypasses it; any other key,
-- including a leaked anon key, gets nothing at all.
alter table client_integrations enable row level security;
