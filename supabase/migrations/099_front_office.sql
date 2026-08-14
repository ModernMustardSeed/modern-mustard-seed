-- ============================================================================
-- 099  THE AI FRONT OFFICE
-- ============================================================================
-- What a customer actually receives when they buy the voice agent.
--
-- Client Factory (095) is the OUTBOUND product: it goes and finds a tenant's
-- prospects. This is the INBOUND one: it answers their phone, remembers who
-- called, books the work, and hands the call to a human when it should.
-- Different products, deliberately different tables, one shared identity.
--
-- TENANCY IS THE CLIENT EMAIL. Not a new tenant id. The portal has
-- authenticated by client email since 003_client_portal.sql and `clients` is
-- already the row that makes the portal recognize somebody. Minting a parallel
-- tenant identity here would mean two answers to "whose office is this", and
-- the wrong one would eventually win.
--
-- WHAT LIVES WHERE
--   fo_offices       the office itself: number, hours, greeting, voice, rules
--   fo_contacts      THEIR customers. The CRM.
--   fo_calls         every call, what was said, what it was about
--   fo_appointments  the native calendar
--   fo_transfers     the humans a call can be handed to
--   fo_events        the audit trail
-- ============================================================================

begin;

/* ─────────────────────────────── the office ─────────────────────────────── */

create table if not exists fo_offices (
  id uuid primary key default gen_random_uuid(),

  -- Tenancy. The client email is the tenant, and one client gets one office.
  client_email text not null unique references clients(email) on delete cascade,

  -- Where it came from, so a Front Office can always be traced to the sale.
  outbound_lead_id uuid references outbound_leads(id) on delete set null,
  demo_order_id uuid references demo_orders(id) on delete set null,
  project_id uuid references projects(id) on delete set null,

  business_name text not null,
  status text not null default 'provisioning'
    check (status in ('provisioning', 'configuring', 'testing', 'live', 'paused', 'cancelled')),

  /* ── the phone ──
     forward_from is THEIR existing number. We never take it over: they forward
     to us, which means they can undo the whole thing from their carrier in five
     minutes without asking us. That is the stewardship promise made concrete. */
  agent_phone text,
  agent_phone_provider text,
  vapi_phone_number_id text,
  vapi_assistant_id text,
  forward_from text,
  forward_mode text not null default 'after_hours'
    check (forward_mode in ('all_calls', 'after_hours', 'overflow', 'voicemail_only')),

  /* ── how it sounds ──
     voice_gender is the customer's choice, made at intake and changeable in
     the portal forever. Stored as gender rather than a raw voiceId so a
     provider swap does not orphan every office. */
  voice_gender text not null default 'female' check (voice_gender in ('male', 'female')),
  voice_id text,
  agent_name text not null default 'your receptionist',
  greeting text,
  tone text not null default 'warm' check (tone in ('warm', 'professional', 'brisk', 'folksy')),

  /* ── languages ──
     English always. Spanish is a switch, not a rebuild, because half of the
     trades we sell to take Spanish-language calls every week and a receptionist
     that hangs up on them is worse than voicemail. */
  languages text[] not null default array['en']::text[],

  /* ── hours and behaviour ── */
  timezone text not null default 'America/Denver',
  hours jsonb not null default '{}'::jsonb,
  services text[] not null default array[]::text[],
  service_area text,
  booking_enabled boolean not null default true,
  transfers_enabled boolean not null default true,
  takes_payment boolean not null default false,
  after_hours_message text,

  /* ── what it must never do ──
     Free text, in the owner's words, injected into the agent's instructions.
     Every trade has a sentence like "never quote a price over the phone", and
     an agent that ignores it costs them a job. */
  never_do text[] not null default array[]::text[],
  escalate_on text[] not null default array[]::text[],

  notes text,
  settings jsonb not null default '{}'::jsonb,

  provisioned_at timestamptz,
  live_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fo_offices_status_idx on fo_offices (status);
create index if not exists fo_offices_lead_idx on fo_offices (outbound_lead_id);

/* ───────────────────────────── their customers ──────────────────────────── */

create table if not exists fo_contacts (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references fo_offices(id) on delete cascade,

  name text,
  phone text,
  phone_digits text,
  email text,
  address text,

  -- What we learned across every call, not just the last one.
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  call_count integer not null default 0,
  is_customer boolean not null default false,
  tags text[] not null default array[]::text[],
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A caller is one person per office. Matching on digits rather than the
-- formatted string, because "(406) 555-0143" and "4065550143" are the same
-- human and two rows would split their history in half.
create unique index if not exists fo_contacts_office_phone_idx
  on fo_contacts (office_id, phone_digits) where phone_digits is not null;
create index if not exists fo_contacts_office_seen_idx on fo_contacts (office_id, last_seen_at desc);

/* ──────────────────────────────── the calls ─────────────────────────────── */

create table if not exists fo_calls (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references fo_offices(id) on delete cascade,
  contact_id uuid references fo_contacts(id) on delete set null,

  vapi_call_id text unique,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  from_number text,
  to_number text,

  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_sec integer,
  ended_reason text,

  -- What the call was actually about. The whole product in four columns.
  intent text,
  urgency text check (urgency in ('emergency', 'urgent', 'routine', 'info')),
  summary text,
  transcript text,
  language text default 'en',

  booked boolean not null default false,
  appointment_id uuid,
  transferred boolean not null default false,
  transferred_to text,
  needs_human boolean not null default false,
  handled_well boolean,

  recording_url text,
  cost_cents integer,
  raw jsonb,

  created_at timestamptz not null default now()
);

create index if not exists fo_calls_office_time_idx on fo_calls (office_id, started_at desc);
create index if not exists fo_calls_needs_human_idx on fo_calls (office_id) where needs_human = true;

/* ───────────────────────────── the calendar ─────────────────────────────── */

create table if not exists fo_appointments (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references fo_offices(id) on delete cascade,
  contact_id uuid references fo_contacts(id) on delete set null,
  call_id uuid references fo_calls(id) on delete set null,

  title text not null,
  service text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  address text,
  notes text,

  status text not null default 'booked'
    check (status in ('booked', 'confirmed', 'completed', 'cancelled', 'no_show')),
  booked_by text not null default 'agent' check (booked_by in ('agent', 'owner', 'customer')),

  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fo_appointments_office_time_idx on fo_appointments (office_id, starts_at);

-- Two agents must never book the same slot for the same office. A partial
-- unique index on live appointments does what an application check cannot.
create unique index if not exists fo_appointments_no_double_booking
  on fo_appointments (office_id, starts_at)
  where status in ('booked', 'confirmed');

alter table fo_calls
  add constraint fo_calls_appointment_fk
  foreign key (appointment_id) references fo_appointments(id) on delete set null;

/* ──────────────────────────── who to hand it to ─────────────────────────── */

create table if not exists fo_transfers (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references fo_offices(id) on delete cascade,

  name text not null,
  role text,
  phone text not null,
  -- When this person is the right destination, in the owner's words:
  -- "emergencies after 6pm", "anything about a commercial roof".
  when_to_transfer text,
  priority smallint not null default 1,
  active boolean not null default true,
  -- Outside these hours the call goes to the next person rather than ringing
  -- somebody's bedside table at 3am, which is how a customer cancels.
  available_hours jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists fo_transfers_office_idx on fo_transfers (office_id, priority) where active = true;

/* ──────────────────────────────── the trail ─────────────────────────────── */

create table if not exists fo_events (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references fo_offices(id) on delete cascade,
  type text not null,
  label text not null,
  detail jsonb,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists fo_events_office_time_idx on fo_events (office_id, created_at desc);

/* ─────────────────────── the sale remembers the office ──────────────────── */

alter table outbound_leads add column if not exists front_office_id uuid references fo_offices(id) on delete set null;
-- Chosen on the demo call or at intake, carried into the office so the agent
-- they bought sounds like the agent they tried.
alter table outbound_leads add column if not exists voice_gender text check (voice_gender in ('male', 'female'));

alter table demo_orders add column if not exists voice_gender text check (voice_gender in ('male', 'female'));
alter table demo_orders add column if not exists front_office_id uuid references fo_offices(id) on delete set null;

commit;
