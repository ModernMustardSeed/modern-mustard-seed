-- Monthly subscription billing for a proposal's recurring total. The one-time
-- deposit/balance fields stay as they are; this adds the recurring plan state.
alter table public.proposals
  add column if not exists subscription_status text not null default 'none',  -- none | link_sent | active | canceled | past_due
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_session_id text,
  add column if not exists subscription_url text,
  add column if not exists subscription_started_at timestamptz;
