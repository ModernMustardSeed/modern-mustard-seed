-- 064: partner payout details.
-- How each partner wants to be paid, filled in by the partner from their own
-- dashboard (/partners/hq), so a payable commission never waits on a text
-- thread asking "where do I send this?". Shown in admin next to Mark paid.
alter table affiliates add column if not exists payout_method text;
alter table affiliates add column if not exists payout_details text;
alter table affiliates add column if not exists payout_updated_at timestamptz;
