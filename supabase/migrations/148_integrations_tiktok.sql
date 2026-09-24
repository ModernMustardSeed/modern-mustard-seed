-- TikTok becomes a posting feed (2026-09-24). Its OAuth connection lives in
-- client_integrations like X and LinkedIn, so the provider check admits it.
alter table client_integrations drop constraint if exists client_integrations_provider_check;
alter table client_integrations add constraint client_integrations_provider_check
  check (provider = any (array['google', 'facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'buildertrend', 'gmail', 'calendar-ics']) or provider like 'mail:%');
