-- 082_outbound_script_v3.sql
-- THE HANDOFF SCRIPT. V2 (081) shipped but kept every card name and the whole
-- consultative shape, so the rail read as unchanged and Sarah hated it. V3 is
-- a different call, not a polish pass:
--   1. The spine: this is NOT a sales call, it is a delivery. The studio
--      forges the demo BEFORE the dial, so the opener is "I already built it,
--      I'm calling to ask where to send it." Nobody else can open that way.
--   2. One breath per card, say one thing then ask. Every body is shorter
--      than its V2 ancestor.
--   3. New card names on purpose. The rail must LOOK different, because it is.
--   4. feedback_sell_value_not_build_time (landed AFTER V2, which violated it):
--      no build-time brags ("twenty minutes"), never lead with "free" or call
--      the artifact a "demo" out loud. It is their receptionist, their website.
--      Money talk only when THEY raise it (catch/price objections may answer
--      honestly).
--   5. feedback-agents-are-not-people: the receptionist is AI and we say so
--      plainly; it "sounds nearly this human," it is never sold as a person.
--   6. Verified stats only (82% competitor-next, 52% AI-after-hours-is-better,
--      both CallRail 2025 per missed-call-stats-verified). Claims about the
--      prospect come ONLY off the ammo/audit cards (mms-claims-we-say-out-loud).
-- Cahill's 8 verbatim rows stay untouched. Square brackets are live tokens
-- only; parentheses are stage directions.

delete from public.outbound_scripts where source = 'MMS v2';

insert into public.outbound_scripts (name, niche, stage, body, is_verbatim, source, sort_order, lane)
values
  -- ── Openers: three doors, pick by what the deck and gold card show ───────
  ('Open: the handoff', null, 'opener',
   $mms$(The deck above shows something forged. Strongest card in the stack. Name the thing plainly: their receptionist, their new website, their command center.)
[First name]? It's Sarah. You don't know me, so here it is in one line. Before I dialed, my studio built the thing I'd normally be calling to pitch you. (Name it.) It's finished, and it has [Company]'s name on it. I'm not asking you to buy anything today. I just need to know where to send it.$mms$,
   false, 'MMS v3', 0, 'shared'),
  ('Open: their own customer', null, 'opener',
   $mms$(The gold card has a customer quote. Their customer opens the call, not you:)
[First name]? It's Sarah. I'm a stranger, so let me get out of the way and read you something one of your own customers wrote online. (Read the quote off the gold card, word for word. Beat.) That review is the entire reason I called you and not the shop down the street.$mms$,
   false, 'MMS v3', 1, 'shared'),
  ('Open: pure cold', null, 'opener',
   $mms$(No forge, no ammo. Honest and fast:)
[First name]? It's Sarah, and this is a cold call, so you're free to hang up. If you give me twenty seconds instead, I'll tell you the one number that made me start dialing [niche] businesses. Your call.$mms$,
   false, 'MMS v3', 2, 'shared'),

  -- ── Why I called ─────────────────────────────────────────────────────────
  ('Why I called: the 82 percent', null, 'hook_bad',
   $mms$Here it is. When a call to a business goes unanswered, 82 percent of those callers just dial a competitor next. CallRail measured that last year, it's not my number. A missed call doesn't feel like anything. It's just quietly somebody else's customer now.$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('Why I called: I looked you up', null, 'hook_bad',
   $mms$Before I dialed, I pulled up [Company] on my phone the way a customer would. (Now read what the audit card found. Say only what is on the card.) Nobody ever calls to tell you your website lost them. They just book with whoever looked more together.$mms$,
   false, 'MMS v3', 0, 'website'),
  ('Why I called (dental and medspa)', 'dental_medspa', 'hook_bad',
   $mms$Your front desk is good, and they still can't catch every ring. The calls that slip are mostly new patients trying to book, and a new patient who hits voicemail books the next office on the list. Those are the most expensive calls in the building to miss.$mms$,
   false, 'MMS v3', 0, 'voice'),

  -- ── What I build ─────────────────────────────────────────────────────────
  ('What I build: the receptionist', null, 'hook_good',
   $mms$I build an AI receptionist that answers in [Company]'s name every single time, day or night. It books the job and texts you what happened before you'd have even heard the voicemail. It never touches a call you answer. It only exists for the ones that were already gone.$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('What I build: the website', null, 'hook_good',
   $mms$I build the site your next customer is hoping to find. Fast on a phone, obvious what you do, one tap to call or book. And it feeds a command center, every lead, call, and follow-up on one screen you can run from your phone.$mms$,
   false, 'MMS v3', 0, 'website'),

  -- ── The gap question ─────────────────────────────────────────────────────
  ('Ask them: where do calls go', null, 'gap_question',
   $mms$Quick gut check, so I'm not talking at the wrong person. It's seven at night, or you're mid-job, and somebody calls [Company]. Where does that call actually go? (Whatever they say:) And the ones that end up in voicemail, how many of those folks you figure ever call back?$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('Ask them: googled yourself lately', null, 'gap_question',
   $mms$Quick question. Somebody hears your name at a ballgame and looks [Company] up on their phone. What do they find? (Beat.) When's the last time you googled yourself the way a stranger would?$mms$,
   false, 'MMS v3', 0, 'website'),

  -- ── The math (calculator card feeds the tokens) ──────────────────────────
  ('The math: name the leak', null, 'revenue_math',
   $mms$Put a real number on it with me, ten seconds. Ballpark, what's an average job worth? (Type it into the calculator while they talk.) So five missed calls a week, closing half, that's [monthly leak] a month going to whoever picked up. You're not losing work because you're bad at it. You're losing it because you were busy doing it.$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('The math: the invisible bounce', null, 'revenue_math',
   $mms$Rough math. A job's worth [avg job value], so it only takes two or three people a month bouncing off that first impression to be real money. And there's no log for it. Nobody records the folks who looked, shrugged, and called the next guy.$mms$,
   false, 'MMS v3', 0, 'website'),
  ('The math (dental and medspa)', 'dental_medspa', 'revenue_math',
   $mms$What's a new patient worth over their years with you? (Type it in.) Miss three booking calls a week and that's [monthly leak] a month, gone without a sound. This books them at nine on a Sunday night, and your front desk walks in Monday to a full book instead of a full voicemail box.$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('The math (real estate)', 'real_estate', 'revenue_math',
   $mms$In your world a lead is dead in five minutes. Miss the call during a showing and that buyer belongs to whoever calls back first. This answers instantly, qualifies them, and books the showing while they're still standing in the driveway.$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('The math (restaurant)', 'restaurant', 'revenue_math',
   $mms$Friday night, every ring you miss is a table or a to-go order, gone. This answers on the second ring, takes the booking, and fields the forty questions a night about hours and wait times while your people work the room.$mms$,
   false, 'MMS v3', 0, 'voice'),

  -- ── The close: the ask is a text, never a meeting ────────────────────────
  ('Close: text it now (already built)', null, 'close',
   $mms$(Anything forged on the deck? This is the whole close:)
[First name], remember the first thing I said. It's already built. No meeting, no paperwork, no decision today. What's the best cell to text it to? (Get it. Then:) Done, sent from me personally. When I call Thursday, the only thing I want to hear is what you'd change.$mms$,
   false, 'MMS v3', 0, 'shared'),
  ('Close: build it today', null, 'close',
   $mms$(Nothing forged yet:)
Here's all I want from today. When we hang up, my studio starts building [Company]'s version, and it lands in your texts today with a short video of me walking you through it. You look when it's quiet. Thursday I call, and you tell me what you'd change. Fair?$mms$,
   false, 'MMS v3', 1, 'shared'),

  -- ── Pocket scripts ───────────────────────────────────────────────────────
  ('Gatekeeper: get the name', null, 'gatekeeper',
   $mms$Hey, I'm hoping you can rescue me from the phone maze. Who makes the calls on the phones and the website there, is that [owner] or somebody else? (Get the name. Never pitch the gatekeeper.) Morning or afternoon better to catch them? (Beat.) You're a lifesaver, thanks.$mms$,
   false, 'MMS v3', 0, 'shared'),
  ('Voicemail (voice lane)', null, 'voicemail',
   $mms$(Forged on the deck:)
[First name], it's Sarah with Modern Mustard Seed. Strangest voicemail you'll get today: my studio built something with [Company]'s name on it and it's sitting here finished. Ninety seconds to look at. Call me at [number] and I'll text it over, or I'll try you again tomorrow. Thanks!

(Nothing forged yet:)
[First name], it's Sarah with Modern Mustard Seed. I build the AI receptionist that catches the calls [niche] businesses never hear about, and I want to build [Company]'s version so you can hear it answer in your own name. Call me at [number], or I'll try you tomorrow. Thanks!$mms$,
   false, 'MMS v3', 0, 'voice'),
  ('Voicemail (website lane)', null, 'voicemail',
   $mms$(Forged site on the deck:)
Hi [First name], it's Sarah with Modern Mustard Seed. I had my studio build what [Company]'s website could be, and honestly, it came out beautiful. It's finished and it takes ninety seconds to see. Call me at [number] and I'll text the link, or I'll try you again. Thanks!

(Nothing forged, but the audit card has findings:)
Hi [First name], it's Sarah with Modern Mustard Seed. I looked [Company] up the way a customer would, and I found a few specific things I'd fix the same week. I want to show you, not tell you. Call me at [number], or I'll try you again. Thanks!$mms$,
   false, 'MMS v3', 0, 'website'),

  -- ── Objection bench: one breath, end on a question where possible ────────
  ('Objection: not interested', null, 'objection',
   $mms$Totally fair, you get ten of these calls a week. One sentence and I'm gone. There's a finished piece of work with [Company]'s name on it sitting right here. (If nothing's forged: my studio will have it finished today.) Let me text it to you, and if it isn't excellent, you'll never hear from me again. Deal?$mms$,
   false, 'MMS v3', 0, 'shared'),
  ('Objection: I do not have time', null, 'objection',
   $mms$That's exactly why there's no meeting. One text, you look when it's quiet, and Thursday I call for one sentence of feedback. Can I send it?$mms$,
   false, 'MMS v3', 1, 'shared'),
  ('Objection: just send me an email', null, 'objection',
   $mms$An email from a stranger dies in the promotions tab and we both know it. Let me text you the finished thing instead. One link, ninety seconds. If it doesn't impress you, delete it and I'm gone. What's the best cell?$mms$,
   false, 'MMS v3', 2, 'shared'),
  ('Objection: I already have someone answering', null, 'objection',
   $mms$Keep them, they're catching the daylight. This is the net underneath: lunch rush, after close, both lines lit at once. It never takes a call your person answers. It's only there for the ones already headed to voicemail.$mms$,
   false, 'MMS v3', 3, 'voice'),
  ('Objection: is this a robot', null, 'objection',
   $mms$I'm real. Sarah, Montana, coffee going cold as we speak. The robot is the thing I build, not the thing calling you. Although fair warning, my receptionist sounds nearly this human. Want to hear it answer in [Company]'s name?$mms$,
   false, 'MMS v3', 4, 'shared'),
  ('Objection: people hate robots', null, 'objection',
   $mms$Some do. Here's the number that surprised me: 52 percent of consumers say AI answering after hours reads as BETTER service, not worse. CallRail, last year. What people actually hate is ringing out. Silence has lost more customers than any robot ever will.$mms$,
   false, 'MMS v3', 5, 'voice'),
  ('Objection: what is the catch', null, 'objection',
   $mms$No catch. Looking commits you to nothing. If you ever want it live, there's one flat number and you'll hear it before you decide anything. All I'm asking for today is ninety seconds of your screen time.$mms$,
   false, 'MMS v3', 6, 'shared'),
  ('Objection: how did you get my number', null, 'objection',
   $mms$It's your business line, straight off your public listing, and I'm not selling it to anybody. I called because I found something specific about [Company] worth a phone call. Twenty seconds and you can judge for yourself.$mms$,
   false, 'MMS v3', 7, 'shared'),
  ('Objection: I need to think about it', null, 'objection',
   $mms$You should. Just think about the real thing instead of my pitch. I'll text it over, you sleep on it, I call Thursday. And if one thing's giving you pause right now, say it. I can usually clear it in a sentence.$mms$,
   false, 'MMS v3', 8, 'shared'),
  ('Objection: how long does it take', null, 'objection',
   $mms$You'll see yours today. If you say go, you're live inside two weeks at a flat price we agree on before anything starts. Nothing about this drags.$mms$,
   false, 'MMS v3', 9, 'shared'),
  ('Objection: how do you make money', null, 'objection',
   $mms$Flat monthly, no contract, and you hear the exact number before you say yes to anything. The month it stops earning its keep, you cancel. That's the whole business model.$mms$,
   false, 'MMS v3', 10, 'shared'),
  ('Objection: we could build it ourselves', null, 'objection',
   $mms$You could. The question is whether you want to spend three weekends wiring it together, or run your business while I hand you one that already works. Look at mine first. Worst case, you'll know exactly what to copy.$mms$,
   false, 'MMS v3', 11, 'shared'),
  ('Objection: I could use Wix or Squarespace', null, 'objection',
   $mms$You could, and it'll eat a month of your nights and still look like everybody else's. Put mine next to what you'd make and pick. If yours wins, no hard feelings, and I'll tell you so.$mms$,
   false, 'MMS v3', 12, 'website'),
  ('Objection: I already have a website', null, 'objection',
   $mms$Then the only question is whether it's bringing you work or just existing. Put what I built next to it and look at both the way a customer would. If yours wins, keep it, and I'll say so myself.$mms$,
   false, 'MMS v3', 13, 'website'),
  ('Objection: what does the command center cost', null, 'objection',
   $mms$Nothing on top. Every call, customer, and follow-up on one screen, and it rides along with the build because it makes the thing you're paying for work better. One flat price covers all of it.$mms$,
   false, 'MMS v3', 14, 'shared')
on conflict (name) do update set
  body = excluded.body,
  niche = excluded.niche,
  stage = excluded.stage,
  is_verbatim = excluded.is_verbatim,
  source = excluded.source,
  sort_order = excluded.sort_order,
  lane = excluded.lane,
  updated_at = now();
