-- 048_demo_orders_rls.sql
-- demo_orders holds buyer PII (name, email, phone) and their intake answers.
-- 046 shipped it with RLS disabled, which means anon/authenticated keys could
-- read it if one were ever used against this table. Enable RLS with NO policies:
-- the service role (every server route here) bypasses RLS entirely, so app code
-- is unchanged, while any other key gets nothing. Same posture as outbound_*.

alter table demo_orders enable row level security;
