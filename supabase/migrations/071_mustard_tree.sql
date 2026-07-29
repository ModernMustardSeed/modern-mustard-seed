-- THE MUSTARD TREE waitlist (the Founding Grove).
-- One row per planted seed. Referral boosts are display-only queue movement,
-- computed at read time; nothing here spends money, so capture fails OPEN
-- (the API also records a plain lead) while anything billable stays elsewhere.

create table if not exists mustard_tree_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  seed_idea text,
  ref_code text not null unique,
  referred_by text,
  referral_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mustard_tree_waitlist_ref_idx on mustard_tree_waitlist (ref_code);
create index if not exists mustard_tree_waitlist_created_idx on mustard_tree_waitlist (created_at);

alter table mustard_tree_waitlist enable row level security;
-- No public policies: service-role access only, same posture as the other inbox tables.

-- Atomic referral bump so concurrent signups never lose a count.
create or replace function increment_mustard_tree_referral(code text)
returns void
language sql
security definer
set search_path = public
as $$
  update mustard_tree_waitlist
     set referral_count = referral_count + 1
   where ref_code = code;
$$;
