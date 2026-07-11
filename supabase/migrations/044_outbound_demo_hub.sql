-- 044: The DEMO SUITE HUB, one shareable page per lead that fronts all three
-- forged demos (receptionist, website, business OS) plus the Mr. Mustard
-- welcome video and the prospect-facing Recovery Calculator. No table needed:
-- the hub renders live from the lead row, keyed by its own unguessable id so
-- the public URL never exposes the lead id.

alter table public.outbound_leads
  add column if not exists hub_demo_id uuid,
  add column if not exists hub_demo_url text;

create unique index if not exists outbound_leads_hub_demo_idx on public.outbound_leads (hub_demo_id) where hub_demo_id is not null;
