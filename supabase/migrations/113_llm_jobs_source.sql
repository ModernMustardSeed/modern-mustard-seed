-- THE QUEUE LEARNS WHO EACH ANSWER IS FOR.
--
-- `llm_jobs` (092) is the universal work order between Vercel and the
-- subscription, and it was written to be about the PROMPT: a system message, a
-- user message, a schema, an answer. That is everything a drainer needs to do
-- the work and nothing anyone needs to deliver it.
--
-- It cost real reports. `auditPreferringWorker` is handed `sourceTable` and
-- `sourceId` at every call site, because 080's `audit_jobs` had columns for
-- them, and then drops both on the floor when the work actually goes through
-- this table. So a website audit that finished after its request had given up
-- landed in `result_json` belonging to nobody. Between 2026-08-25 and 26 that
-- happened four times in two days: Rosa's Pizza, Roof Life Jax, Blake Brothers
-- and K-Ram Roofing were all graded, and all four leads read `audit_at = NULL`
-- while a finished report sat in this table.
--
-- `lib/audit-delivery.mjs` closed the hole by parsing the hostname out of the
-- label and matching it against `outbound_leads.website`. That works, and it
-- rescued the four, but it is inference: it has to decline whenever two leads
-- share a domain, and it can only ever deliver to one table. These two columns
-- are the fact the inference was standing in for.
--
-- Nullable on purpose. Plenty of work has no owner: the public /website-audit
-- page, Mr. Mustard's chat composer, anything a visitor triggers. A null source
-- means "nobody is waiting for this row", which is exactly true.
--
-- Same shape and same types as 080, deliberately. Three queues that behave
-- identically are one thing to learn and one thing to debug.

alter table public.llm_jobs
  add column if not exists source_table text,
  add column if not exists source_id uuid;

comment on column public.llm_jobs.source_table is
  'Which table the answer belongs to (e.g. outbound_leads). Null when nobody is waiting for it.';
comment on column public.llm_jobs.source_id is
  'The row in source_table this answer should be filed onto.';

-- The delivery pass reads exactly this: finished work for one owner, newest
-- first. Partial, because the overwhelming majority of rows have no source and
-- there is no reason to carry them in this index.
create index if not exists llm_jobs_source_idx
  on public.llm_jobs (source_table, source_id, finished_at desc)
  where source_id is not null;
