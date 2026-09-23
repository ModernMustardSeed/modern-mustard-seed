-- 144_trades_bench.sql
-- THE BENCH: the trades a builder actually builds with, and the certificate
-- that quietly expires.
--
-- A custom home is built by twenty other companies. The builder holds all of
-- them in their head: who frames fast, who cleans up, who has not answered a
-- call since March, what each one charges, and, the one that matters at three
-- in the morning, whether their liability insurance is still in date.
--
-- THE CERTIFICATE IS THE WHOLE REASON THIS TABLE EXISTS. A subcontractor
-- working a one and a half million dollar house on a lapsed policy is a
-- liability that lands on the builder, and it lapses silently: no email, no
-- warning, and the day anybody checks is the day somebody has already fallen
-- off a roof. It is tracked nowhere. Not in Buildertrend's contact list, not
-- in a spreadsheet anybody keeps current, and certainly not in the head of a
-- man who is currently pouring concrete.
--
-- WHY NOT A TAG ON client_contacts. The book holds people: realtors, past
-- clients, the woman at the title company. A trade is a working relationship
-- with a rate, a licence, a certificate and a date it was last on a job, and
-- hanging those five columns on every contact in the book to serve a fifth of
-- them is how a contact table becomes unreadable. The row points AT a contact
-- when there is one, so a phone number is still kept in one place.

create table if not exists public.client_trades (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,

  -- The company, as they say it: "Glacier Metalwork", "Dave's Excavation".
  company text not null,
  -- What they do, in the builder's own words: framing, excavation, tile,
  -- cabinets. Free text on purpose; a dropdown of trades is a dropdown
  -- somebody's actual trade is missing from.
  trade text,

  -- The person, when there is one in the book already.
  contact_id uuid references public.client_contacts (id) on delete set null,
  contact_name text,
  phone text,
  email text,

  -- What they charge, however the builder thinks of it: an hourly number, a
  -- square foot rate, "bids each job". Text, because it is never one number.
  rate text,

  -- THE DATES. Both nullable, because a blank is honest and a guessed date is
  -- worse than nothing on a compliance field.
  insurance_expires date,
  license_expires date,
  license_no text,

  -- When they were last on one of these jobs. Set by hand or by the board.
  last_used_on date,

  -- How the builder feels about them, which is a real fact about a trade.
  rating text check (rating in ('first-call', 'fine', 'last-resort', 'never-again')),

  notes text,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_trades_client_idx on public.client_trades (client_email, active, company);
-- The hot path for the watch: whose certificate runs out next.
create index if not exists client_trades_insurance_idx on public.client_trades (client_email, insurance_expires)
  where insurance_expires is not null;

alter table public.client_trades enable row level security;

comment on table public.client_trades is
  'Subcontractors and suppliers, with the insurance certificate date nobody else tracks. See lib/cc-trades.ts.';

/**
 * TWO MORE THINGS THE STANDING WORK CAN RAISE.
 *
 * `cert`     a certificate about to lapse, or lapsed, with the call to make
 * `handover` a house that reached Complete, with the review ask and the
 *            project page ready to go in one press
 *
 * Both are briefs like any other: they arrive having done the reading and they
 * wait on a person.
 */
alter table public.client_briefs drop constraint if exists client_briefs_kind_check;
alter table public.client_briefs add constraint client_briefs_kind_check
  check (kind in ('qualify', 'quiet', 'monday', 'risk', 'cert', 'handover'));

alter table public.client_briefs drop constraint if exists client_briefs_subject_type_check;
alter table public.client_briefs add constraint client_briefs_subject_type_check
  check (subject_type in ('lead', 'job', 'board', 'trade'));
