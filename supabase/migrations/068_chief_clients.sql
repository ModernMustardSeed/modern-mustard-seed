-- 068_chief_clients.sql
-- THE CHIEF: the per-client roster that powers proactive morning briefings and
-- the fail-closed voice-minute cap. A row is created at onboarding (after the
-- Stripe webhook grants the 'chief' entitlement). The briefing cron reads active
-- rows; claim_chief_minutes enforces the never-leak-revenue cap on voice usage.

create table if not exists chief_clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  business text,
  phone text,
  tier text not null default 'chief',              -- chief | chief-executive | cabinet
  briefing_channel text not null default 'sms',    -- sms | call | email | off
  minutes_cap int not null default 500,            -- monthly voice ceiling
  minutes_used int not null default 0,
  period_start timestamptz not null default now(),
  active boolean not null default true,
  last_briefed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chief_clients_active_idx on chief_clients (active);
create index if not exists chief_clients_email_idx on chief_clients (email);

-- Atomic voice-minute claim. Does the rolling-window reset, the check, and the
-- increment in ONE row-locked statement. Returns the new used total on success,
-- or -1 when the client is inactive, missing, or over the cap (fail closed, so a
-- maxed-out plan degrades to text instead of billing an overage). Same discipline
-- as claim_care_edit (migration 058) and claim_forge_slot (migration 047).
create or replace function claim_chief_minutes(p_email text, p_minutes int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_used int;
  v_cap int;
  v_start timestamptz;
  v_active boolean;
begin
  select minutes_used, minutes_cap, period_start, active
    into v_used, v_cap, v_start, v_active
    from chief_clients
    where email = lower(p_email)
    for update;

  if not found or v_active = false then
    return -1;                                       -- no active plan: fail closed
  end if;

  if v_start is null or now() - v_start >= interval '30 days' then
    v_used := 0;                                     -- rolling window reset
    v_start := now();
  end if;

  if v_used + p_minutes <= v_cap then
    v_used := v_used + p_minutes;
    update chief_clients
      set minutes_used = v_used, period_start = v_start, updated_at = now()
      where email = lower(p_email);
    return v_used;
  end if;

  -- Over the cap: persist any window reset, but grant nothing.
  update chief_clients set period_start = v_start where email = lower(p_email);
  return -1;
end;
$$;

-- Service-role only. Never reachable from the browser.
revoke all on function claim_chief_minutes(text, int) from public, anon, authenticated;
