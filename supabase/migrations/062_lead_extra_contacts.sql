-- 062: additional contacts per lead.
--
-- A lead has one primary contact_name/phone/email on the row. Real businesses have
-- more than one way in: an owner's cell, the front desk, a billing email, a second
-- decision maker. Store those as a small labelled list on the lead itself (jsonb),
-- so editing them is the same PATCH as everything else and the cockpit needs no extra
-- fetch. Each entry is { label, name, phone, email }.
alter table outbound_leads add column if not exists extra_contacts jsonb not null default '[]'::jsonb;
