-- 045_team_members.sql
-- One identity per teammate. A single row that ties together a person's admin
-- login, their partner (affiliate) code, and their outbound (dial-floor) rep, so
-- Sarah manages the whole team from the admin instead of editing an env var.
--
-- Login: email + password (scrypt hash in password_hash as "salt:hash" hex).
-- The env owner (ADMIN_EMAIL) and any legacy ADMIN_TEAM entries keep working as
-- a fallback; this table is checked in addition to them.

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null default 'staff',       -- 'owner' (full) | 'staff' (scoped)
  title text,                                -- human label, e.g. 'Founder', 'Partner + Caller'
  password_hash text,                        -- scrypt "salt:hash" (hex); null = cannot log in yet
  active boolean not null default true,
  affiliate_code text,                       -- their partner code (affiliates.code)
  rep_name text,                             -- their outbound rep (outbound_reps.name)
  notify_email text,                         -- extra inbox for owner notifications (owners)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_active_idx on team_members (active);
create index if not exists team_members_affiliate_code_idx on team_members (affiliate_code);

-- Service-role only (same posture as affiliates/commissions). RLS stays off.
alter table team_members disable row level security;
