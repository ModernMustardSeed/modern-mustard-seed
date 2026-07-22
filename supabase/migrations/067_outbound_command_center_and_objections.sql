-- 067_outbound_command_center_and_objections.sql
-- Two things:
--  1) The new offer: the command center is now INCLUDED FREE with any website or
--     voice agent. Fold it into both "What we do" cards.
--  2) A deeper objection bench (lane-aware), plus a website-lane voicemail so the
--     pocket scripts fit whichever pitch the rep is on.

-- 1) Command center is free: append it to the voice "What we do" card.
update public.outbound_scripts
  set body = $mms$What I do is set it up so every one of those calls gets answered in your business's name, day or night. It sounds like a real person, it books the job, and it texts you the details before you're back at your desk. It doesn't change how you answer calls now. It just catches everything that would have gone to voicemail. And here's the part I'm proudest of: our command center that ties it all together, every call, customer, and follow-up in one place you can actually see, comes included free. No extra charge.$mms$,
      updated_at = now()
  where name = 'Good news hook';

-- ...and the website "What we do" card.
update public.outbound_scripts
  set body = $mms$What I do is build you a site that actually brings in business, not just a placeholder with your hours on it. It loads fast, looks right on a phone, makes it obvious what you do and where, and makes it dead simple to call or book you. I can usually have it up in weeks, not months, it's a flat price with no surprises, and you own it at the end. And I now include our command center free with any site I build, so every lead and message the site brings in lands in one place you can run from your phone. No extra charge.$mms$,
      updated_at = now()
  where name = 'What we do (website)';

-- 2a) Lane-tag the objections and voicemail that are pitch-specific.
update public.outbound_scripts set lane = 'voice', updated_at = now()
  where name in ('Objection: I already have someone answering', 'Voicemail');

-- 2b) New objections + a website voicemail. Universal ones are 'shared'.
insert into public.outbound_scripts (name, niche, stage, body, is_verbatim, source, sort_order, lane)
values
  ('Objection: why is the command center free', null, 'objection',
   $mms$No catch, honestly. The command center comes free with any site or receptionist I build, because it makes everything else work better and it's the fastest way for you to see the value. You only ever pay for the website or the receptionist itself, and that's a flat price. The command center is just included.$mms$,
   false, 'MMS adapted', 5, 'shared'),
  ('Objection: I do not have time right now', null, 'objection',
   $mms$Totally fair, you're running a business. That's the whole reason I build the demo for you instead of making you sit through a pitch. Give me the word, I'll have it in your inbox in about twenty minutes, and you can look whenever you've got two quiet minutes. No meeting required.$mms$,
   false, 'MMS adapted', 6, 'shared'),
  ('Objection: how long does it take', null, 'objection',
   $mms$Faster than you'd think. Weeks, not months, and you'll see the working demo today. Once you say go, most builds are live within a week or two. It's a flat price agreed up front, so there's no meter running and no reason for me to drag it out.$mms$,
   false, 'MMS adapted', 7, 'shared'),
  ('Objection: I need to think about it', null, 'objection',
   $mms$Of course, it should be a yes you feel good about. Let me make thinking easier: I'll send you the actual working demo, so you're deciding on the real thing and not a promise. If there's one thing giving you pause, tell me now and I can usually clear it up in a sentence.$mms$,
   false, 'MMS adapted', 8, 'shared'),
  ('Objection: I could use Wix or Squarespace', null, 'objection',
   $mms$You totally could, and for some folks that's the right call. The difference is you'd spend your nights wrestling a template for a month, and it would look like a template. I hand you one built for your business that actually brings in work, plus the command center free, and you own it. Your time is worth something too. If after you see it you'd rather do it yourself, no hard feelings.$mms$,
   false, 'MMS adapted', 9, 'website'),
  ('Objection: I already have a website', null, 'objection',
   $mms$That's good, a lot of folks don't. The real question is whether it's bringing you business or just sitting there. Does it load fast on a phone, does it show up when people search you, does it make it easy to call or book you? Let me build you a demo of what it could be, free, and you can put them side by side. If yours wins, you keep it.$mms$,
   false, 'MMS adapted', 10, 'website'),
  ('Voicemail (website)', null, 'voicemail',
   $mms$Hi [First name], it's Sarah with Modern Mustard Seed. I build websites for [niche] businesses, and I took a look at how yours shows up online. I've got a couple of quick ideas to help you get found and booked, and I actually put together a demo for [Company] you can look at. Call or text me back at [number] and I'll send it over, or I'll try you again. Thanks!$mms$,
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
