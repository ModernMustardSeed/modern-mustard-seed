-- 066_outbound_script_lanes.sql
-- Two-lane Call Cockpit. A `lane` on outbound_scripts lets the cockpit pitch the
-- right product per lead: the WEBSITE lane for leads with no site or a weak one,
-- the VOICE lane for leads that have a site but miss calls. The opener, gap
-- question, close, objections, voicemail, and gatekeeper are lane-agnostic
-- ('shared') and show in both. Only hook_bad / hook_good / revenue_math split.

alter table public.outbound_scripts
  add column if not exists lane text not null default 'voice'
  check (lane in ('shared', 'voice', 'website'));

-- The lane-agnostic cards become shared (the three middle pitch cards stay voice).
update public.outbound_scripts
  set lane = 'shared'
  where is_verbatim = false
    and stage in ('opener', 'gap_question', 'close', 'objection', 'voicemail', 'gatekeeper');

-- Cahill's verbatim rows are all the receptionist/voice pitch; keep them in voice
-- so they never surface as "his words" under a website-lane card.
update public.outbound_scripts set lane = 'voice' where is_verbatim = true;

-- WEBSITE lane: the three pitch cards, universal, same live tokens as voice.
insert into public.outbound_scripts (name, niche, stage, body, is_verbatim, source, sort_order, lane)
values
  ('Why I''m calling (website)', null, 'hook_bad',
   $mms$Thanks, I appreciate it. The reason I'm calling is I build websites for [niche] businesses, and before I dialed I went looking for yours. Here's the thing most owners don't see: almost everyone who hears about you pulls out their phone and looks you up before they call. If there's nothing there, or it's dated and clunky on a phone, a good chunk of them quietly decide you're not the one and go with someone else. You never even know it happened.$mms$,
   false, 'MMS adapted', 0, 'website'),
  ('What we do (website)', null, 'hook_good',
   $mms$What I do is build you a site that actually brings in business, not just a placeholder with your hours on it. It loads fast, looks right on a phone, makes it obvious what you do and where, and makes it dead simple to call or book you. I can usually have it up in weeks, not months, it's a flat price with no surprises, and you own it at the end. And it's the front door everything else hangs off, so once it's right, the rest gets easier.$mms$,
   false, 'MMS adapted', 0, 'website'),
  ('The cost of a weak site', null, 'revenue_math',
   $mms$Here's the way I'd think about it. Say a typical job for you is worth [avg job value]. It doesn't take many people bouncing off a bad first impression before that's real money gone every month, and the rough part is it's invisible. There's no missed-call log for the folks who looked you up, weren't sure, and moved on. A site that looks like you're the real deal turns those same people into calls instead of losing them quietly.$mms$,
   false, 'MMS adapted', 0, 'website')
on conflict (name) do update set
  body = excluded.body,
  niche = excluded.niche,
  stage = excluded.stage,
  is_verbatim = excluded.is_verbatim,
  source = excluded.source,
  sort_order = excluded.sort_order,
  lane = excluded.lane,
  updated_at = now();
