-- 035_outbound.sql
-- Outbound Revenue Rescue Cockpit: the internal lead-gen and cold-calling tool
-- Polly and Sarah use to work missed-call revenue-rescue deals.
-- Tables are prefixed outbound_* because a public.leads CRM table already
-- exists (001) with a different shape. Service-role only, like 033/034.

create table if not exists public.outbound_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null default 'primary',            -- primary | player-coach
  daily_dial_goal int not null default 50,
  daily_demo_goal int not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outbound_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text not null,
  email text,
  website text,
  niche text not null default 'other' check (niche in ('home_service', 'dental_medspa', 'real_estate', 'restaurant', 'other')),
  city text,
  state text,
  avg_job_value numeric,
  est_missed_calls_week int,
  close_rate_pct numeric,                          -- calculator saves all three inputs back on blur
  status text not null default 'new' check (status in ('new', 'contacted', 'callback', 'demo_booked', 'pilot_live', 'won', 'lost', 'dnc')),
  source text,
  owner_rep_id uuid references public.outbound_reps(id) on delete set null,
  dnc_checked boolean not null default false,
  next_action_at timestamptz,                      -- denormalized from the latest callback log, drives the dashboard queue
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outbound_leads_status_idx on public.outbound_leads (status);
create index if not exists outbound_leads_niche_idx on public.outbound_leads (niche);
create index if not exists outbound_leads_owner_idx on public.outbound_leads (owner_rep_id);
create index if not exists outbound_leads_phone_idx on public.outbound_leads (phone);
create index if not exists outbound_leads_next_action_idx on public.outbound_leads (next_action_at);

create table if not exists public.outbound_call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.outbound_leads(id) on delete cascade,
  rep_id uuid not null references public.outbound_reps(id) on delete cascade,
  called_at timestamptz not null default now(),
  outcome text not null check (outcome in ('no_answer', 'gatekeeper', 'voicemail', 'conversation', 'demo_booked', 'not_interested', 'callback')),
  duration_sec int,
  disposition text,
  next_action text,
  next_action_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists outbound_call_logs_rep_time_idx on public.outbound_call_logs (rep_id, called_at desc);
create index if not exists outbound_call_logs_lead_idx on public.outbound_call_logs (lead_id, called_at desc);

create table if not exists public.outbound_pilots (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.outbound_leads(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '30 days'),
  calls_caught int not null default 0,
  revenue_recovered numeric not null default 0,
  pricing_model text not null default 'convert_to_setprice' check (pricing_model in ('convert_to_setprice', 'rev_share')),
  convert_price numeric,
  rev_share_pct numeric default 15,
  monthly_floor numeric,                           -- rev-share floor so a slow month never nets zero
  status text not null default 'running' check (status in ('running', 'won', 'lost')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outbound_pilots_status_idx on public.outbound_pilots (status);
create index if not exists outbound_pilots_lead_idx on public.outbound_pilots (lead_id);

create table if not exists public.outbound_scripts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  niche text check (niche in ('home_service', 'dental_medspa', 'real_estate', 'restaurant', 'other')),  -- null = universal
  stage text not null check (stage in ('opener', 'hook_bad', 'hook_good', 'gap_question', 'revenue_math', 'close', 'objection', 'voicemail', 'gatekeeper')),
  body text not null,
  is_verbatim boolean not null default false,
  source text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outbound_scripts_stage_idx on public.outbound_scripts (stage, sort_order);

-- Per rep per day (America/Denver): dials, conversations, demos booked.
create or replace view public.outbound_daily_rep_stats as
select
  rep_id,
  (called_at at time zone 'America/Denver')::date as day,
  count(*)::int as dials,
  (count(*) filter (where outcome in ('conversation', 'demo_booked')))::int as conversations,
  (count(*) filter (where outcome = 'demo_booked'))::int as demos_booked
from public.outbound_call_logs
group by rep_id, (called_at at time zone 'America/Denver')::date;

drop trigger if exists update_outbound_reps_updated_at on public.outbound_reps;
create trigger update_outbound_reps_updated_at before update on public.outbound_reps
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_outbound_leads_updated_at on public.outbound_leads;
create trigger update_outbound_leads_updated_at before update on public.outbound_leads
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_outbound_pilots_updated_at on public.outbound_pilots;
create trigger update_outbound_pilots_updated_at before update on public.outbound_pilots
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_outbound_scripts_updated_at on public.outbound_scripts;
create trigger update_outbound_scripts_updated_at before update on public.outbound_scripts
  for each row execute function public.update_updated_at_column();

alter table public.outbound_reps enable row level security;
alter table public.outbound_leads enable row level security;
alter table public.outbound_call_logs enable row level security;
alter table public.outbound_pilots enable row level security;
alter table public.outbound_scripts enable row level security;
-- Service-role only (the site's server routes); no anon policies on purpose.

-- The two reps.
insert into public.outbound_reps (name, role, daily_dial_goal, daily_demo_goal)
values
  ('Polly', 'primary', 70, 3),
  ('Sarah', 'player-coach', 25, 2)
on conflict (name) do nothing;

-- MMS adapted scripts (the primary read) plus Connor Cahill's real words
-- (is_verbatim = true, source = Cahill l7eJfXmaCjc, transcript in
-- docs/source-transcript-cahill.txt). Cahill rows render as "his words".
insert into public.outbound_scripts (name, niche, stage, body, is_verbatim, source, sort_order)
values
  -- Universal flow (MMS adapted)
  ('Opener', null, 'opener',
   $mms$Hey, is this [First name]? ... [First name], one quick question before you decide whether to talk to me: you want the good news or the bad news first?$mms$,
   false, 'MMS adapted', 0),
  ('Bad news hook', null, 'hook_bad',
   $mms$Fair. The bad news is you're losing money every week and you can't see it happening. Most [niche] owners I look at are missing 20 to 40% of their calls. After hours, mid-job, lunch rush. Those people don't leave a voicemail, they call the next guy. Want the good news?$mms$,
   false, 'MMS adapted', 0),
  ('Good news hook', null, 'hook_good',
   $mms$Smart. The good news is I can probably put an extra [$5,000 to $8,000] a month back in your pocket, and it won't cost you a dollar to find out. The bad news, and there is some, is that right now you're losing most of it. Let me show you where in about 20 seconds.$mms$,
   false, 'MMS adapted', 0),
  ('Gap question', null, 'gap_question',
   $mms$When a call comes in and you're tied up, where's it going right now? Voicemail, a cell, an answering service?$mms$,
   false, 'MMS adapted', 0),
  ('Revenue math', null, 'revenue_math',
   $mms$So say you miss even 5 calls a week and a job's worth [avg job value]. That's around [monthly leak] a month walking to a competitor because nobody picked up. I build an AI that answers every call in two rings, sounds like it works for [Company], books the job, and texts you the details. 24/7, never sick, never at lunch.$mms$,
   false, 'MMS adapted', 0),
  ('Close: the free 30 days', null, 'close',
   $mms$Here's why it's a no-brainer. I build it, plug it in, and run it free for 30 days. You don't pay me anything up front. At the end of the month we look at exactly what it caught and what those jobs were worth. If it made you money, we keep it going. If it didn't, you owe me nothing and I'm gone. I just need 15 minutes to set it up right. Thursday at 10 or Friday at 2?$mms$,
   false, 'MMS adapted', 0),

  -- Niche variants (MMS adapted)
  ('Bad news hook (dental and medspa)', 'dental_medspa', 'hook_bad',
   $mms$The bad news is your front desk can't catch every call, and the ones they miss are usually new patients calling to book. Those are worth the most, and they call the next office. Want the good news?$mms$,
   false, 'MMS adapted', 0),
  ('Revenue math (dental and medspa)', 'dental_medspa', 'revenue_math',
   $mms$A new patient is worth what, [avg job value] over their lifetime? Miss three booking calls a week and that is real money. Mine books them straight into your calendar, day or night.$mms$,
   false, 'MMS adapted', 0),
  ('Revenue math (real estate)', 'real_estate', 'revenue_math',
   $mms$Leads go cold in the first five minutes. Miss the call while you're in a showing and that lead is gone to whoever called back first. Mine answers instantly, qualifies, and books the showing while they're still warm.$mms$,
   false, 'MMS adapted', 0),
  ('Revenue math (restaurant)', 'restaurant', 'revenue_math',
   $mms$Every call you miss at a Friday rush is a table or a to-go ticket gone. Across your locations that adds up fast, and I can roll it out one store at a time.$mms$,
   false, 'MMS adapted', 0),

  -- Objections (MMS adapted)
  ('Objection: what is the catch', null, 'objection',
   $mms$No catch. I don't get paid unless it works. That's the whole point. My bet is that your phone starts making you money.$mms$,
   false, 'MMS adapted', 0),
  ('Objection: how do you make money after', null, 'objection',
   $mms$Once it's proven it pays for itself, it's a flat monthly price. You will have a full month of receipts before you decide anything. No guessing.$mms$,
   false, 'MMS adapted', 1),
  ('Objection: I already have someone answering', null, 'objection',
   $mms$Love that, and this is not a replacement. It's backup for when they're slammed, at lunch, or it's 9pm. It catches the overflow so those calls never become voicemails. Your person keeps doing what they do.$mms$,
   false, 'MMS adapted', 2),
  ('Objection: just send me an email', null, 'objection',
   $mms$Happy to, and I get it, emails from strangers are easy to ignore. So I'll do one better. I'll build the demo answering as [Company] and text you a 60-second recording. If it's not sharp, delete it. Best number for that?$mms$,
   false, 'MMS adapted', 3),
  ('Objection: we could build it ourselves', null, 'objection',
   $mms$You could. The question is whether you want to spend three weekends wiring up a phone system or run your business while I hand you one that already works. A generic bot loses trust in one sentence. Mine answers like it works there.$mms$,
   false, 'MMS adapted', 4),

  -- Gatekeeper and voicemail (MMS adapted)
  ('Gatekeeper', null, 'gatekeeper',
   $mms$Hey, hoping you can point me the right way. Who handles the phones and new tech for the shop, is that [owner] or someone else?$mms$,
   false, 'MMS adapted', 0),
  ('Voicemail', null, 'voicemail',
   $mms$Hey [First name], Sarah with Modern Mustard Seed. I build the AI that answers your missed calls and books the jobs, and I put together a quick example for [Company]. Call me back at [number] and I'll send it over, or I'll try you Thursday. Thanks.$mms$,
   false, 'MMS adapted', 0),

  -- Connor Cahill, verbatim from the source call (ASR-clean, his words kept)
  ('Cahill opener', null, 'opener',
   $mms$Hey, is this Bruce? ... Hey Bruce, you have a roofing company in Austin, Texas, yeah? ... Sweet. My name's Connor, Connor Cahill. You want the good news or the bad news?$mms$,
   true, 'Cahill l7eJfXmaCjc', 10),
  ('Cahill bad news', null, 'hook_bad',
   $mms$So, I called your roofing company three times yesterday and didn't get anyone on the phone once. ... Well, that's not the bad news. The bad news is that if that happens every day and you're missing even just three calls per day, that's 90 calls per month. And if 30% of the people who call your business would actually become a client of yours, and assuming your average sale price is $1,000, which is obviously extremely conservative, you're missing out on almost $30,000 a month in revenue. That's the bad news.$mms$,
   true, 'Cahill l7eJfXmaCjc', 10),
  ('Cahill good news', null, 'hook_good',
   $mms$The good news is I'll come into your business, I'll install an AI receptionist, something you don't currently have, something that will take calls every time you are not there to take the call, or you're at lunch, or it's 5:00 p.m. and you turned off your work phone and they're just going to voicemail. It's going to recapture all the calls. It's not going to steal the calls that you would be picking up. But the calls that you're missing, it's going to capture all of that, warm them up, get them to book some sort of quote with you, get their information and send you an internal message to call them back, or it'll schedule an appointment with you and the prospect.$mms$,
   true, 'Cahill l7eJfXmaCjc', 10),
  ('Cahill revenue math', null, 'revenue_math',
   $mms$You're missing even just three calls per day, that's 90 calls per month. If 30% of the people who call your business would actually become a client of yours, and assuming your average sale price is $1,000, you're missing out on almost $30,000 a month in revenue. And if you extrapolate that out, that can become a quite exponential factor after 365 days.$mms$,
   true, 'Cahill l7eJfXmaCjc', 10),
  ('Cahill close', null, 'close',
   $mms$What my company does is we will take a look at the last 12 months of your business, your revenue, and see where you're at. And then we will work for you completely free for 30 days. And 30 days from now we will reassess, and we'll see how much extra revenue you brought in because of us being that new variable in your business, and then we'll take a very, very minuscule percentage of that. If the results are positive, then we can talk again in 30 days and have some sort of longer-term retainer and partnership together. And if we don't, then we part ways and you tried something that could be super beneficial to your business, and you didn't really lose anything.$mms$,
   true, 'Cahill l7eJfXmaCjc', 10),
  ('Cahill demo book', null, 'close',
   $mms$Here's what we'll do. We can book a call in like two or three hours, a quick Zoom meeting. In those two hours I'll take your current website and I'll put it through my AI, so that AI voice agent will know everything about your business. Then we hop on a call, you can demo the AI, we can call it together, and if you like it, we move forward.$mms$,
   true, 'Cahill l7eJfXmaCjc', 11),
  ('Cahill on keeping the human', null, 'objection',
   $mms$I totally agree with that, to be honest. If I was in your shoes and I ran a business that was service-based, I would still have someone who's taking the phone calls. But what I would definitely do is have some sort of AI system set up to recapture all the leads that fall through the cracks. Because that would just be dumb not to, right? If someone's going to call you and you're not going to answer the phone, why not have a safety net there that recaptures that lead, reengages them, and lets them know, hey, we'll call you as soon as possible.$mms$,
   true, 'Cahill l7eJfXmaCjc', 10),
  ('Cahill scale probe', null, 'gap_question',
   $mms$Are you not looking to scale or take on more clients? ... Everyone likes more money, that's why we're in business in the first place, right? And I get it, maybe you don't want more jobs, but if you had more jobs to choose from, would you not be able to charge more?$mms$,
   true, 'Cahill l7eJfXmaCjc', 10)
on conflict (name) do nothing;
