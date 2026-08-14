-- ============================================================================
-- 100  NOTHING GOES LIVE UNTIL IT IS PAID FOR AND PROVEN
-- ============================================================================
-- Two gates in front of buying a phone line and pointing a real business's
-- calls at an AI, both of Sarah's, both worth writing into the schema rather
-- than trusting to a habit:
--
--   1. THEY ARE A LIVE PAYING CUSTOMER. Not "they checked out once". A number
--      costs money every month it exists, and buying one for somebody whose
--      first payment bounced is a bill we keep paying after they are gone.
--
--   2. THE AGENT HAS BEEN TESTED. Somebody rang it and listened. An untested
--      receptionist on a contractor's real line does not fail quietly; it
--      fails in front of their customer, at the worst moment of that
--      customer's day, in the business's own name.
--
-- Both are recorded here rather than inferred at read time, because "has this
-- been tested" must survive a page refresh and mean the same thing to the
-- admin screen, the go-live button, and anybody reading the row in a year.
-- ============================================================================

begin;

alter table fo_offices
  -- Set from the Stripe webhooks that already track this on the order, so the
  -- office does not have to re-derive subscription state from a join every
  -- time somebody loads the board.
  add column if not exists billing_status text not null default 'unknown'
    check (billing_status in ('unknown', 'active', 'past_due', 'cancelled')),
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_checked_at timestamptz,

  -- The test call. `passed` is deliberately three-state: null means nobody has
  -- judged it yet, which is not the same as somebody having judged it and said
  -- no, and a two-state boolean would quietly read "not yet tested" as "failed"
  -- or, far worse, default to true.
  add column if not exists test_call_at timestamptz,
  add column if not exists test_call_passed boolean,
  add column if not exists test_call_by text,
  add column if not exists test_call_notes text,
  add column if not exists test_call_id text,

  -- The line we bought for them, and what it costs us. Recorded so a released
  -- number is auditable and a monthly bill can always be traced to an office.
  add column if not exists phone_purchased_at timestamptz,
  add column if not exists phone_monthly_cents integer,
  add column if not exists phone_released_at timestamptz;

-- A test result is meaningless once the agent has changed underneath it, so
-- this is what lets the readiness check say "tested, but you have edited the
-- agent since" rather than treating a stale pass as current.
alter table fo_offices add column if not exists agent_synced_at timestamptz;

create index if not exists fo_offices_billing_idx on fo_offices (billing_status);

commit;
