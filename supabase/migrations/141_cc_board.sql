-- 141_cc_board.sql
-- THE BOARD, AND THE WORK THAT WATCHES IT.
--
-- What the Command Center could not see. A lead row is a moment: somebody
-- filled in a form on a Tuesday. A custom home is eight to fourteen months
-- between that moment and a contract, through a qualifying call, a site
-- visit, a paid design agreement, a budget, and a signature. Buildertrend
-- picks the job up at the signature and runs it beautifully from there. The
-- months BEFORE the signature live nowhere at all, which is exactly where a
-- one and a half million dollar build goes quiet for three weeks and nobody
-- notices until the homeowner has signed with somebody else.
--
-- So: a row per opportunity, from inquiry to contract, carrying the number
-- that matters (what it is worth), the state it is in, who owns it, and the
-- one next thing and when. Everything else on this board is downstream of
-- those four facts.
--
-- WHY NOT EXTEND client_leads. A lead is what arrived; a job is what it
-- became. One lead can become two jobs (the main house and the shop), two
-- leads can be one job (he filled in the form, she called), and plenty of
-- jobs never were a website lead at all: a realtor's introduction, a past
-- client, a conversation at a chamber lunch. Squeezing all of that onto the
-- arrival row would lose the difference between a thing that happened once
-- and a thing that is still happening.

create table if not exists public.client_jobs (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,

  -- What they call it out loud: "Kestrel Ridge new build", "Whitefish remodel".
  name text not null,

  -- Who it is for. Kept on the row rather than only as a link, because a job
  -- outlives the lead it came from and often has two people on it.
  contact_name text,
  contact_phone text,
  contact_email text,

  -- Where it came from, when it came from somewhere in this system.
  lead_id uuid references public.client_leads (id) on delete set null,
  contact_id uuid references public.client_contacts (id) on delete set null,

  -- The stages a custom builder actually moves through. Their words.
  --   inquiry   somebody asked
  --   talking   qualifying calls, budget and timeline being felt out
  --   visit     a site walk or a meeting is set or done
  --   design    a paid design agreement is signed, drawings under way
  --   estimate  drawings priced, budget with the homeowner
  --   contract  signed. From here Buildertrend runs the job.
  --   building  under construction, kept for the number and the photographs
  --   complete  handed over, in warranty
  --   hold      real, but not now. The eighteen month "we are thinking about it".
  --   lost      gone, with a reason, because the reasons are the lesson.
  stage text not null default 'inquiry'
    check (stage in ('inquiry','talking','visit','design','estimate','contract','building','complete','hold','lost')),

  -- What the finished build is worth, in cents. Null while nobody can honestly
  -- say. A guessed number on a board is worse than a blank one, because it
  -- gets summed.
  value_cents bigint,
  confidence text not null default 'guess' check (confidence in ('guess','rough','firm')),

  kind text not null default 'new-build' check (kind in ('new-build','remodel','addition','shop','other')),
  site text,          -- the lot or the address, as they say it
  town text,

  -- How it really arrived. For a luxury builder this is the most valuable
  -- column on the table: it says which realtor, architect or past client to
  -- take to lunch.
  source text,
  source_contact_id uuid references public.client_contacts (id) on delete set null,

  -- Who at the desk owns it, by the same keys the lead desk uses.
  owner_key text,
  owner_name text,

  -- The one next thing, and when. Not a task list: a builder keeps one next
  -- step per job in their head, and this is that, written down.
  next_step text,
  next_step_on date,

  -- When the stage last changed, so "sat in estimate for 40 days" is a fact
  -- rather than a feeling.
  stage_changed_at timestamptz not null default now(),
  -- When a person last did anything on it. The silence detector reads this.
  last_touch_at timestamptz not null default now(),

  notes text,
  lost_reason text,
  -- The Buildertrend job this became, written by hand after the hand-off.
  bt_job text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_jobs_client_idx on public.client_jobs (client_email, stage, next_step_on);
create index if not exists client_jobs_touch_idx on public.client_jobs (client_email, last_touch_at desc);
create index if not exists client_jobs_lead_idx on public.client_jobs (lead_id);

alter table public.client_jobs enable row level security;

/**
 * Everything that has happened on a job, in order. Same shape as the lead
 * trail in 137, and deliberately not the same table: a lead's trail ends when
 * it becomes a job, and a job's trail runs for a year.
 */
create table if not exists public.client_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.client_jobs (id) on delete cascade,
  client_email text not null,
  kind text not null check (kind in ('note','call','meeting','email','stage','won','lost','created','agent')),
  body text,
  -- The stage move this event records, when it is one.
  from_stage text,
  to_stage text,
  author_key text,
  author_name text,
  created_at timestamptz not null default now()
);
create index if not exists client_job_events_job_idx on public.client_job_events (job_id, created_at desc);
alter table public.client_job_events enable row level security;

/**
 * BRIEFS: what the standing work produced, waiting on a decision.
 *
 * The difference between software that answers questions and software that
 * does the job is who starts the conversation. A brief is the machine going
 * first: a new inquiry researched and drafted before anyone has called back,
 * a job that has gone quiet with the check-in already written, Monday's board
 * read and ranked.
 *
 * Every brief ends in a decision a person makes. `actions` carries what the
 * buttons do, and NOTHING in it runs until somebody presses one. That is not
 * caution about the model, it is the difference between a tool a business
 * trusts with its name and one it turns off in week two.
 */
create table if not exists public.client_briefs (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,

  --   qualify  a new inquiry, read and drafted
  --   quiet    an open job nobody has touched
  --   monday   the weekly board read
  --   risk     something that needs a person this week
  kind text not null check (kind in ('qualify','quiet','monday','risk')),

  -- What it is about, so a second run does not make a second copy.
  subject_type text not null check (subject_type in ('lead','job','board')),
  subject_id uuid,

  title text not null,
  -- The body, in short paragraphs. Written from rows; the model only phrases it.
  body text not null,
  -- [{ kind, label, ...payload }] The buttons. Nothing here runs on its own.
  actions jsonb not null default '[]'::jsonb,

  status text not null default 'new' check (status in ('new','done','dismissed')),
  -- The queued LLM job, while the words are still being written.
  llm_job_id uuid,

  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);

-- One open brief per thing. A second Monday does not stack a second card, and
-- a job that is still quiet next week updates rather than multiplies.
create unique index if not exists client_briefs_open_idx
  on public.client_briefs (client_email, kind, subject_type, coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'new';

create index if not exists client_briefs_client_idx on public.client_briefs (client_email, status, created_at desc);
alter table public.client_briefs enable row level security;

comment on table public.client_jobs is
  'The pre-construction pipeline: inquiry to contract, the months Buildertrend does not cover. See lib/cc-jobs.ts.';
comment on table public.client_briefs is
  'Standing work waiting on a decision. Nothing in actions runs until a person presses it. See lib/cc-briefs.ts.';
