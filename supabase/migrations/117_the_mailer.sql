-- THE MAILER: the channel that cannot bounce.
--
-- Why this exists. On 2026-08-30 the funnel read: 9,730 leads, 246 built demos,
-- 8 order rows, ONE real prospect who ever reached a live Stripe checkout, and
-- $14.99 of lifetime live revenue. Every path to a card ran through cold email,
-- and cold email is dead here (5.2% hard bounce, the "clicks" were security
-- gateways, hello@ does not exist). Six leads in the whole table carry a
-- consent record, so Mr. Mustard has nothing legal to dial.
--
-- Mail is the one channel with no spam filter, no bounce, no consent gate and
-- no sender reputation. Its job is NOT to close. Its job is to manufacture
-- consent at scale: a business owner gets a postcard showing their own new
-- website, visits their personal URL, and that visit is a real inbound hand
-- raise the existing call/SMS/demo machine is already built to work.
--
-- One piece of mail per lead per campaign, enforced in the database, because a
-- duplicate drop costs real postage and reads as spam on a doormat.

-- ---------------------------------------------------------------------------
-- Lead columns the mailer owns
-- ---------------------------------------------------------------------------

alter table public.outbound_leads
  -- The short code printed on the card: modernmustardseed.com/y/<code>.
  -- Permanent per lead, so a card mailed in March still works in July.
  add column if not exists mail_code text,
  -- Deliverability of the postal address, set by the ZIP backfill.
  -- unknown | mailable | undeliverable
  add column if not exists mail_address_status text,
  add column if not exists mail_last_sent_at timestamptz,
  add column if not exists mail_send_count integer not null default 0,
  -- First time a human loaded /y/<code>. THIS is the hand raise: it is what
  -- promotes a cold row into something the acquisition engine may call.
  add column if not exists mail_first_view_at timestamptz,
  add column if not exists mail_view_count integer not null default 0;

create unique index if not exists outbound_leads_mail_code_key
  on public.outbound_leads (mail_code) where mail_code is not null;

create index if not exists outbound_leads_mailable_idx
  on public.outbound_leads (mail_address_status, lead_score desc)
  where mail_address_status = 'mailable';

-- ---------------------------------------------------------------------------
-- mail_pieces: one row per physical card, cradle to grave
-- ---------------------------------------------------------------------------

create table if not exists public.mail_pieces (
  id uuid primary key default gen_random_uuid(),
  outbound_lead_id uuid not null references public.outbound_leads(id) on delete cascade,
  campaign text not null,
  mail_code text not null,

  -- Frozen at render time. The lead row can change; what went in the envelope
  -- cannot, and a support call six weeks later has to be answerable.
  business_name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,

  -- What the recipient sees at /y/<code>. Frozen for the same reason: the card
  -- shows a picture of this exact preview and the page must match the paper.
  preview jsonb not null default '{}'::jsonb,

  -- queued | rendered | sent | delivered | returned | canceled | failed
  status text not null default 'queued',
  provider text,
  provider_id text,
  cost_cents integer,
  error text,

  rendered_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The money guard. Postage is spent the instant a send succeeds and cannot be
-- refunded, so "mail this lead twice in one campaign" is prevented in the
-- database rather than in whichever caller happens to remember.
create unique index if not exists mail_pieces_one_per_campaign
  on public.mail_pieces (outbound_lead_id, campaign);

create index if not exists mail_pieces_status_idx on public.mail_pieces (status, created_at desc);
create index if not exists mail_pieces_campaign_idx on public.mail_pieces (campaign, status);
create index if not exists mail_pieces_code_idx on public.mail_pieces (mail_code);

-- ---------------------------------------------------------------------------
-- The order a card produces
-- ---------------------------------------------------------------------------
--
-- demo_orders already accepts a null hub_demo_id and a null outbound_lead_id,
-- so a mailed order reuses the whole existing lifecycle: the same webhook
-- branch flips it to paid, marks the lead won, opens the front office and
-- sends both emails. The only thing it needs is a way home to the card that
-- caused it.
alter table public.demo_orders
  add column if not exists mail_code text,
  add column if not exists mail_piece_id uuid references public.mail_pieces(id);

create index if not exists demo_orders_mail_code_idx on public.demo_orders (mail_code);

alter table public.mail_pieces enable row level security;

-- Service role only. Nothing here is ever read from the browser: the public
-- page looks a lead up by mail_code through the server.
drop policy if exists mail_pieces_service_all on public.mail_pieces;
create policy mail_pieces_service_all on public.mail_pieces
  for all to service_role using (true) with check (true);
