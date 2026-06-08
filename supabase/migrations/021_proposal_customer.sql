-- Store the Stripe customer for a subscription so the client can open the
-- Stripe billing portal (manage card, cancel) from their portal.
alter table public.proposals
  add column if not exists stripe_customer_id text;
