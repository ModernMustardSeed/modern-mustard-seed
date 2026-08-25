-- THE DEMO AGENT CAN ACTUALLY BOOK THE JOB NOW.
--
-- Every forged demo is sold on one sentence: "I answer your phone and I book
-- your jobs." Until today the second half was a lie in the demo itself. The
-- persona prompt in lib/outbound-demo.ts literally instructs the agent to
-- "capture the job details and book the appointment", and no booking tool was
-- ever attached, so the model improvised a deflection. On 2026-08-25 a test
-- caller asked three different forged agents for an appointment:
--
--   South Florida Roofing : "Let me get the owner to confirm that slot for you."
--   Vegas Auto Repair     : "...have the owner confirm availability?"
--   Angel's Care          : "...so the owner can confirm pricing and..."
--
-- Three trades, one failure, at the exact moment the demo was supposed to prove
-- its whole value. A prospect hears "the owner will confirm" and correctly
-- concludes the thing cannot book.
--
-- These are DEMO appointments and they are deliberately separate from
-- fo_appointments, which belongs to paying offices. A demo booking must never
-- land in a real client's calendar, must never fire a real client's
-- notifications, and must never be counted in a real client's numbers. Same
-- time maths (slotsFrom in lib/front-office/calendar.ts), different table.
--
-- ⚠️ `run_id` IS NOT A FOREIGN KEY, AND MUST NOT BECOME ONE.
--
-- The obvious thing was `references sidekick_runs(id)`, because that table existed
-- and its name says exactly what this points at. It was written that way first
-- and it would have rejected every insert this feature ever attempted.
--
-- That table (migration 036) was dead. Its own header called itself
-- "the OPTIONAL future upgrade to a real table"; the live store is
-- lib/demo-run-store.ts, which keeps each run as JSON in `app_state` under the
-- key `demo:run:<uuid>`. So the table is present, empty, and permanently so,
-- which is the worst possible shape for a foreign key: the schema applies
-- cleanly, the constraint is created, and then every booking fails at runtime
-- with a constraint error a caller experiences as "the owner will confirm".
--
-- Caught before shipping only because a double-booking test on real data
-- reported zero rows in a table that should have had one per forged demo.
--
-- So: a plain uuid column holding the run id from the call's `metadata.runId`,
-- validated as a uuid at the webhook and resolved through getRun(). If runs ever
-- move into a real table, add the constraint then, in its own migration.

create table if not exists demo_appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  run_id uuid not null,

  -- Which call booked it, so a transcript can be matched to its outcome.
  vapi_call_id text,

  customer_name text,
  customer_phone text,
  service text,
  address text,
  notes text,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  -- 'booked' is the only status the agent can write. The others exist so a
  -- prospect clicking around their command center demo can move one without
  -- needing a schema change.
  status text not null default 'booked'
);

-- ⚠️ THE DATABASE AWARDS THE SLOT, NOT THE MODEL.
--
-- Copied deliberately from migration 099's rule for real offices. It matters
-- even more here: a prospect who books, likes it, and immediately calls back to
-- show their business partner is TWO concurrent callers on the same demo, and a
-- check-then-insert has a race between the check and the insert wide enough to
-- hand both of them the same time. The agent is written to expect losing this
-- race and to offer another slot rather than apologise for an error.
create unique index if not exists demo_appointments_slot_once
  on demo_appointments (run_id, starts_at)
  where status in ('booked', 'confirmed');

-- The demo hub reads "what your agent booked while you were on the phone", and
-- the calendar reads busy times before offering any. Both go run + time.
create index if not exists demo_appointments_run_time
  on demo_appointments (run_id, starts_at desc);

alter table demo_appointments enable row level security;

-- No anon or authenticated policy on purpose. Everything that touches this
-- table goes through the service role: the Vapi webhook that books, and the
-- server-rendered hub that reads. A demo appointment carries a member of the
-- public's name and phone number, so it is never client-readable.
