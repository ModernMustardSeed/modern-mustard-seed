-- YIELD, TWO ENGINES.
--
-- Every task on the floor now names the brain that runs it. claude is Claude
-- Code on the Max plan (the default); codex is the Codex CLI on the ChatGPT
-- plan, which Studio runs on for its built-in image generation. When one
-- engine hits its usage cap mid-task, the worker moves the task to the other
-- and records the move here.

alter table public.office_tasks
  add column if not exists engine text not null default 'claude';

alter table public.office_tasks
  drop constraint if exists office_tasks_engine_check;
alter table public.office_tasks
  add constraint office_tasks_engine_check check (engine in ('claude', 'codex'));

-- The engine the session_id belongs to. A session can only be resumed by the
-- engine that opened it, so a handoff starts a fresh session on the other one.
alter table public.office_tasks
  add column if not exists session_engine text;
