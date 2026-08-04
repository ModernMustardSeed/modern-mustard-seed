-- 081_outbound_script_v2.sql
-- THE 100-DIAL SCRIPT. Full rewrite of every adapted (non-verbatim) call card.
-- Sarah is dialing 100 leads a day; the old cards were consultative monologues
-- built for a 5-minute call. V2 doctrine:
--   1. Short beats. Say one thing, then ask. No card runs past one breath
--      before the prospect talks again.
--   2. Ammo first. If the gold review card has a customer quote, THAT is the
--      opener. If the audit card has findings, the website hook reads them.
--      (Stage directions in parentheses; square brackets are live tokens only.)
--   3. The close is a text, not a meeting. For forged leads the demo already
--      exists, so the whole close is "it's already built, best cell to text?"
--      The hub-open tracker + heat queue do the second call's work.
--   4. Verified numbers only: 82% call a competitor after an unanswered call,
--      52% say AI answering after hours signals BETTER service (CallRail 2025,
--      see memory missed-call-stats-verified). Cahill's hypothetical math stays
--      verbatim-only under "his words".
--   5. Claims rule (mms-claims-we-say-out-loud): nothing in a body asserts a
--      fact about the prospect unless it comes off the ammo/audit card.
-- Cahill verbatim rows are untouched. Names are stable where the content still
-- answers to them; the close is renamed because its old name lied.

-- The gap question goes lane-aware (a website-lane rep shouldn't ask about
-- after-hours calls first); the old shared row becomes the voice version.
update public.outbound_scripts set lane = 'voice', updated_at = now()
  where name = 'Gap question';

-- The old close name described the retired 30-day pilot pitch.
delete from public.outbound_scripts where name = 'Close: the free 30 days';

insert into public.outbound_scripts (name, niche, stage, body, is_verbatim, source, sort_order, lane)
values
  -- ── Stage 1: opener ──────────────────────────────────────────────────────
  ('Opener', null, 'opener',
   $mms$(Cold, no ammo:)
Hey, is this [First name]? ... [First name], my name's Sarah. I'll be honest with you, this is a cold call. You can hang up on me, or give me twenty seconds and then decide. Your call.$mms$,
   false, 'MMS v2', 0, 'shared'),
  ('Opener (review ammo)', null, 'opener',
   $mms$(If the gold card above has a customer quote, open with their customer instead of yourself:)
Hey [First name], my name's Sarah. Twenty seconds, then you decide. I was reading what customers write about [Company] online, and one review stopped me. Can I read you the line? ... (Read the quote off the gold card, word for word. Then:) They were trying to give you money. That review is the whole reason I called.$mms$,
   false, 'MMS v2', 1, 'shared'),

  -- ── Stage 2: why I'm calling ─────────────────────────────────────────────
  ('Bad news hook', null, 'hook_bad',
   $mms$Thanks. So here's why I'm calling. I build the AI receptionist that picks up for [niche] businesses when nobody else can. One number made me start dialing: when a call goes unanswered, 82 percent of those callers will just call a competitor next. That's CallRail's data from last year, not mine. Every ring that gets away is somebody else's customer now.$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('Why I''m calling (website)', null, 'hook_bad',
   $mms$Thanks. So before I dialed, I looked [Company] up the way a customer would, on my phone. That first look is where people quietly decide, and nobody ever calls to tell you your website lost them. They just book whoever looked more together. (Now read what the audit card found. Say only what's on the card.)$mms$,
   false, 'MMS v2', 0, 'website'),

  -- ── Stage 3: what we do ──────────────────────────────────────────────────
  ('Good news hook', null, 'hook_good',
   $mms$What I set up answers in [Company]'s name every single time, day or night. It sounds like a real person, books the job, and texts you the details before you'd have even heard the voicemail. It doesn't touch a call you already answer. It only catches the ones you were losing. And my command center, one screen with every call, customer, and follow-up on it, comes with it free.$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('What we do (website)', null, 'hook_good',
   $mms$I build the site your next customer is hoping to find. Fast on a phone, obvious what you do and where you do it, one tap to call or book. It's a flat price you'll know up front, it's done in weeks not months, and you own it. And my command center comes free with it, so every lead and message the site catches lands on one screen you can run from your phone.$mms$,
   false, 'MMS v2', 0, 'website'),

  -- ── Stage 4: the gap question ────────────────────────────────────────────
  ('Gap question', null, 'gap_question',
   $mms$Quick question so I'm not talking at the wrong person. When you're mid-job or it's seven at night, where does a call to [Company] actually go? ... (Whatever they say:) And the ones that hit voicemail, how many of those folks you figure ever call back?$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('Gap question (website)', null, 'gap_question',
   $mms$Quick question. When somebody hears about you and looks [Company] up on their phone, what do they find? ... When's the last time you googled yourself the way a stranger would?$mms$,
   false, 'MMS v2', 0, 'website'),

  -- ── Stage 5: the math (calculator card feeds the tokens) ─────────────────
  ('Revenue math', null, 'revenue_math',
   $mms$Let's put a real number on it, ten seconds. What's an average job worth for you, ballpark? ... (Type it into the calculator while they talk.) So five missed calls a week, closing half, that's [monthly leak] a month going to whoever answered. Not because you're bad at what you do. Because nobody could reach the phone.$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('The cost of a weak site', null, 'revenue_math',
   $mms$Rough math. If a job's worth [avg job value], it only takes two or three people a month bouncing off a bad first impression to be real money, and it's invisible. There's no missed-call log for the folks who looked you up, shrugged, and called the next guy. The demo I want to send is me fixing exactly what I just read you.$mms$,
   false, 'MMS v2', 0, 'website'),

  -- Niche variants (voice lane; they override the universal card on match)
  ('Bad news hook (dental and medspa)', 'dental_medspa', 'hook_bad',
   $mms$Thanks. So here's why I'm calling. Your front desk is good, and they still can't catch every ring. The calls that slip through are mostly new patients trying to book, and a new patient who hits voicemail just books the next office on the list. Those are the most expensive calls in the building to miss.$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('Revenue math (dental and medspa)', 'dental_medspa', 'revenue_math',
   $mms$What's a new patient worth over their years with you, [avg job value]? Miss three booking calls a week and that's [monthly leak] a month, gone quietly. This books them into your calendar at nine on a Sunday night, and your front desk walks in Monday to a full book instead of a full voicemail box.$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('Revenue math (real estate)', 'real_estate', 'revenue_math',
   $mms$In your world a lead is dead in five minutes. Miss the call while you're in a showing and that buyer belongs to whoever calls back first. This answers instantly, qualifies them, and books the showing while they're still standing in the driveway.$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('Revenue math (restaurant)', 'restaurant', 'revenue_math',
   $mms$Every ring you miss on a Friday night is a table or a to-go order, gone. This answers on the second ring, takes the booking, and handles the forty questions a night about hours and wait times, while your people work the room instead of the phone.$mms$,
   false, 'MMS v2', 0, 'voice'),

  -- ── Stage 6: the close (the ask is a text, not a meeting) ────────────────
  ('Close: text them the demo', null, 'close',
   $mms$(The deck above shows what's already forged. If a demo exists, this is the whole close:)
[First name], here's my favorite part. It's already built. Before I dialed, my studio put together a working demo with [Company]'s name on it. It cost you nothing and it commits you to nothing. What's the best cell to text the link to? ... Done, it's from me, Sarah. When I call you Thursday, all I want to hear is what you'd change.

(Nothing forged yet:)
Here's all I want from today. The minute we hang up, my studio starts building [Company] a free working demo. About twenty minutes later it lands in your texts with a short video of me walking you through it. You look when you've got two quiet minutes, and Thursday you tell me what you'd change. Fair?$mms$,
   false, 'MMS v2', 0, 'shared'),

  -- ── Pocket scripts ───────────────────────────────────────────────────────
  ('Gatekeeper', null, 'gatekeeper',
   $mms$Hey, hoping you can save me from the phone maze. Who makes the call on the phones and the website there, is that [owner] or somebody else? ... (Get the name. Never pitch the gatekeeper.) When's the best time to actually catch them, morning or afternoon? ... Appreciate you.$mms$,
   false, 'MMS v2', 0, 'shared'),
  ('Voicemail', null, 'voicemail',
   $mms$(If the deck shows a forged demo:)
[First name], it's Sarah with Modern Mustard Seed. My studio built something with [Company]'s name on it and it's sitting here finished. Took us twenty minutes, takes you ninety seconds to look at. Call me back at [number] and I'll send it over, or I'll just try you again tomorrow. Thanks!

(Nothing forged yet:)
[First name], it's Sarah with Modern Mustard Seed. I build the AI receptionist that catches the calls [niche] businesses miss, and I'd like to build [Company] a free demo of it. Call me back at [number], or I'll try you again tomorrow. Thanks!$mms$,
   false, 'MMS v2', 0, 'voice'),
  ('Voicemail (website)', null, 'voicemail',
   $mms$(If the deck shows a forged site:)
Hi [First name], it's Sarah with Modern Mustard Seed. I had my studio build a version of what [Company]'s website could be. It's finished, it's free to look at, and honestly it came out great. Call me back at [number] and I'll send the link, or I'll try you again. Thanks!

(Nothing forged yet:)
Hi [First name], it's Sarah with Modern Mustard Seed. I went looking for [Company] online the way a customer would, and I think there's real money being left there. I build sites for [niche] businesses and I'd like to build you a free demo. Call me back at [number], or I'll try you again. Thanks!$mms$,
   false, 'MMS v2', 0, 'website'),

  -- ── Objection bench (one breath each, end on a question when possible) ───
  ('Objection: what is the catch', null, 'objection',
   $mms$No catch. The demo's free because showing beats telling. If you ever want it live, it's one flat price you'll hear before you decide anything. If not, all it cost you was ninety seconds.$mms$,
   false, 'MMS v2', 0, 'shared'),
  ('Objection: how do you make money after', null, 'objection',
   $mms$Flat monthly price, you'll know the exact number before you say yes to anything, and no contract holding you hostage. The month it stops earning its keep, you stop. That's the whole model.$mms$,
   false, 'MMS v2', 1, 'shared'),
  ('Objection: I already have someone answering', null, 'objection',
   $mms$Good, keep them, they're catching the easy hours. This is the net underneath: lunch, after close, both lines lit. It never touches a call your person picks up. It only exists for the ones that were headed to voicemail anyway.$mms$,
   false, 'MMS v2', 2, 'voice'),
  ('Objection: just send me an email', null, 'objection',
   $mms$I'll do you one better than an email you'll never open. I'll text you an actual working demo with [Company]'s name on it, not a brochure. If it's not sharp, delete it and you'll never hear from me again. What's the best cell?$mms$,
   false, 'MMS v2', 3, 'shared'),
  ('Objection: we could build it ourselves', null, 'objection',
   $mms$You could. The real question is whether you want to spend three weekends wiring it up, or run your business while I hand you one that already works. Look at the demo first. If you still want to build it after that, you'll at least know what to copy.$mms$,
   false, 'MMS v2', 4, 'shared'),
  ('Objection: why is the command center free', null, 'objection',
   $mms$Because it makes the thing you're paying for work better, and it's the fastest way to show you what I do. You pay one flat price for the site or the receptionist. The command center rides along free.$mms$,
   false, 'MMS v2', 5, 'shared'),
  ('Objection: I do not have time right now', null, 'objection',
   $mms$That's exactly why I don't do meetings. Say the word and the demo lands in your texts. You look whenever you've got two quiet minutes, and I'll call you Thursday for one sentence of feedback. Can I send it?$mms$,
   false, 'MMS v2', 6, 'shared'),
  ('Objection: how long does it take', null, 'objection',
   $mms$You'll see the working demo today. If you say go, most builds are live inside two weeks. The price is flat and agreed up front, so there's no meter running and no reason for me to drag it out.$mms$,
   false, 'MMS v2', 7, 'shared'),
  ('Objection: I need to think about it', null, 'objection',
   $mms$It should be a yes you feel good about. So think about the real thing instead of my pitch: I'll send the working demo, you sleep on it, I'll call Thursday. And if one thing's giving you pause, tell me now. I can usually clear it up in a sentence.$mms$,
   false, 'MMS v2', 8, 'shared'),
  ('Objection: I could use Wix or Squarespace', null, 'objection',
   $mms$You could, and it would eat a month of your nights and still look like a template. Mine is built for [Company], built to bring in work, comes with the command center free, and you own it. Look at both side by side and pick. No hard feelings either way.$mms$,
   false, 'MMS v2', 9, 'website'),
  ('Objection: I already have a website', null, 'objection',
   $mms$That's a head start, plenty of folks don't. The question is whether it's bringing you work or just sitting there. Let me send you a free demo of what I'd build instead and you put them side by side. If yours wins, you keep it and I'll tell you so.$mms$,
   false, 'MMS v2', 10, 'website'),
  ('Objection: not interested', null, 'objection',
   $mms$Totally fair, you probably get ten of these calls a week. One sentence and I'm gone: my studio builds [Company] a free working demo, your name on it, no strings, and it explains me better than I do. Can I text you the link and leave you alone?$mms$,
   false, 'MMS v2', 11, 'shared'),
  ('Objection: is this a robot', null, 'objection',
   $mms$Nope, I'm Sarah, I'm real, and my coffee's going cold here in Montana. The AI is the thing I build, not the thing calling you. Fair warning though, my receptionist sounds about this good. That's kind of the point.$mms$,
   false, 'MMS v2', 12, 'shared'),
  ('Objection: how did you get my number', null, 'objection',
   $mms$It's your business line, it's public on your listing, and I'm not selling it to anybody. I called because I found something specific worth telling you about. Give me twenty seconds and judge for yourself.$mms$,
   false, 'MMS v2', 13, 'shared'),
  ('Objection: people hate talking to robots', null, 'objection',
   $mms$Some do, and here's the number that surprised me: 52 percent of consumers say a business using AI to answer after hours signals better service, not worse. That's CallRail, last year. What people actually hate is silence. Twelve rings and a full voicemail box loses more customers than any robot ever will.$mms$,
   false, 'MMS v2', 14, 'voice')
on conflict (name) do update set
  body = excluded.body,
  niche = excluded.niche,
  stage = excluded.stage,
  is_verbatim = excluded.is_verbatim,
  source = excluded.source,
  sort_order = excluded.sort_order,
  lane = excluded.lane,
  updated_at = now();

-- Sarah is committing to 100 dials a day; the dashboard rings should aim there.
update public.outbound_reps
  set daily_dial_goal = 100, daily_demo_goal = 5, updated_at = now()
  where name = 'Sarah';
