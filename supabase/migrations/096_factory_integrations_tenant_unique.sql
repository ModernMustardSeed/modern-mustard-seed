-- Integrations are TENANT-level, not per-Factory (2026-08-13).
--
-- 095 put the unique constraint on (tenant_id, factory_id, provider). Two
-- problems with that. First, preflight and the connector registry both ask
-- "can this TENANT send email", never "can this factory", because the sending
-- account is the tenant's and the per-Factory part (which address it sends
-- FROM) already lives in the blueprint. Second, and worse: factory_id is
-- nullable, and in Postgres two rows with a NULL in a unique index are not
-- considered equal, so the upsert that connects a tenant-level integration
-- would have silently inserted a duplicate row on every reconnect.
--
-- factory_id stays as optional annotation. It just no longer decides identity.
--
-- Safe to re-run.

-- Collapse any duplicates a null factory_id may already have allowed through,
-- keeping the newest row per (tenant, provider).
delete from public.factory_integrations a
using public.factory_integrations b
where a.tenant_id = b.tenant_id
  and a.provider = b.provider
  and a.created_at < b.created_at;

alter table public.factory_integrations
  drop constraint if exists factory_integrations_tenant_id_factory_id_provider_key;

create unique index if not exists factory_integrations_tenant_provider_key
  on public.factory_integrations (tenant_id, provider);
