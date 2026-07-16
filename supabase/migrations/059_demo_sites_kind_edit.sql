-- 059: outbound_demo_sites.kind must allow 'edit'.
--
-- Migration 052 constrained kind to ('demo','rebuild'). Migration 056 then began
-- queueing edits as kind='edit' (reforge-from-prompt for a lead's demo, and the client
-- self-serve edits) WITHOUT widening this constraint. So every edit UPDATE/INSERT hit
-- outbound_demo_sites_kind_check and failed loudly — the "reforge Chipman's site"
-- incident. The edit's editSiteWithApi was verified against the model, but never through
-- a real queue write, which is why the constraint slipped through.
--
-- Widen it to the full set the forge queue actually writes: demo (the default forged
-- site), rebuild (real site from intake assets), edit (a one-change reforge).
alter table outbound_demo_sites drop constraint if exists outbound_demo_sites_kind_check;
alter table outbound_demo_sites
  add constraint outbound_demo_sites_kind_check
  check (kind in ('demo', 'rebuild', 'edit'));
