-- 049_demo_delivery.sql
--
-- THE DELIVERY SPINE FOR THE DEMO FUNNEL.
--
-- Before this, a demo buyer was written to demo_orders (plus the lead tables) and
-- NOTHING ELSE. They never became a `client` and never got a `project`, and the
-- portal renders a client's projects. So a paying customer who signed in landed on
-- the guest empty state: no portal, no way to send us a logo, no revision count,
-- no thread. The system of record was Sarah's inbox. With ads pointing at /demos,
-- that is the thing that breaks first.
--
-- Four changes, all additive:
--   1. demo_orders learns which client + project it produced.
--   2. projects carry a REVISION BUDGET, because the offer promises "2 free edits
--      before it goes live" and that concept did not exist anywhere in the codebase.
--   3. client_requests become two-way: Sarah's reply lands back IN the portal
--      instead of only in the client's email, which is what "seamless between all
--      of us" actually requires.
--   4. claim_revision(): spends a revision ATOMICALLY, the same posture as
--      claim_forge_slot. It fails CLOSED, so the third "free" edit is never free
--      by accident, no matter how many tabs are open.

-- 1. Order -> client -> project.
alter table demo_orders add column if not exists client_email text;
alter table demo_orders add column if not exists project_id uuid references projects(id) on delete set null;
create index if not exists demo_orders_client_email_idx on demo_orders (client_email);

-- 2. The revision budget. Default 0 so nothing else in the system suddenly grants
--    free edits; the demo-order provisioner sets 2 explicitly.
alter table projects add column if not exists revisions_included integer not null default 0;
alter table projects add column if not exists revisions_used integer not null default 0;
-- Which forged demo this project is being built FROM (outbound_demo_sites.id).
alter table projects add column if not exists demo_site_id uuid;
alter table projects add column if not exists demo_order_id uuid;

-- 3. Two-way requests. 'revision' joins the existing source vocabulary.
alter table client_requests drop constraint if exists client_requests_source_check;
alter table client_requests
  add constraint client_requests_source_check
  check (source in ('note', 'chatbot', 'launch_date', 'revision'));
alter table client_requests add column if not exists reply_body text;
alter table client_requests add column if not exists replied_at timestamptz;
alter table client_requests add column if not exists replied_by text;
alter table client_requests add column if not exists revision_number integer;

-- 4. Spend a revision atomically.
--
-- The check and the increment must be ONE statement. Read-then-write would let two
-- concurrent submits both see "1 of 2 used" and both proceed, handing over a third
-- edit for free. The WHERE clause is the lock: only a row that still has budget can
-- be updated, so exactly one caller wins.
--
-- Returns the 1-based number of the revision just claimed, or -1 when the budget is
-- exhausted (or the project does not exist). Never throws; callers treat -1 as "out
-- of free edits, this one is billable" and must not silently do the work anyway.
create or replace function claim_revision(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  update projects
     set revisions_used = revisions_used + 1,
         updated_at = now()
   where id = p_project_id
     and revisions_used < revisions_included
  returning revisions_used into v_used;

  return coalesce(v_used, -1);
end;
$$;

revoke all on function claim_revision(uuid) from public, anon, authenticated;
