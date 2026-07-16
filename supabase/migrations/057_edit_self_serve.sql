-- 057: self-serve edits. The client previews the AI edit in their portal and ships
-- it themselves, and once their two free edits are used, buys more edits one at a time.
--
-- One flag: whether the in-flight edit was PAID (bought) or FREE (from the 2-edit
-- budget). It decides whether discarding refunds a free revision. Everything else
-- reuses the projects.edit_* columns and the draft/approval spine from 056.

alter table projects add column if not exists edit_paid boolean not null default false;
