-- 139_llm_attachments.sql
-- FILES ON A WORK ORDER.
--
-- `llm_jobs` has carried two strings since 092, because everything this app
-- asked a model was text. The Command Center's tray changes that: an owner
-- drops a photograph of a napkin with six names on it, a screenshot of a
-- text message, a supplier list as a PDF, and expects the names to end up in
-- their contact book.
--
-- A photograph is not a string. The two ways to read one are a vision API on
-- a metered key, which this codebase deliberately does not have, or putting
-- the file on the disk of the machine that runs the CLI, which can read an
-- image with its own Read tool. This column is the second way: the job
-- carries public URLs, and the drainer downloads them before it starts.
--
-- Shape: [{ "url": "https://...", "name": "napkin.jpg", "type": "image/jpeg" }]
-- Null and empty both mean a plain text job, which is nearly all of them.

alter table public.llm_jobs
  add column if not exists attachments jsonb;

comment on column public.llm_jobs.attachments is
  'Files the drainer downloads to its own disk before running the prompt: [{url, name, type}]. Read by lib/llm-files.mjs. Null for a text-only job.';
