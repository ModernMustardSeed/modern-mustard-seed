/**
 * THE ONE-PERSON COMPANY BOOTCAMP: the marketing kit. The admin desk at
 * /admin/bootcamp renders every entry here with a Copy button, and the
 * go-to-market in docs/bootcamp-gtm.md runs on this calendar.
 *
 * Facts, prices and dates come from data/bootcamp.ts and are never retyped
 * in a way that could drift: $97 / $297 / $497 tickets, $4,997 for The
 * Operator Program, masterclass Tuesday January 26, 2027 at 1:00 PM Mountain,
 * sessions February 2, 4 and 9, 1:00 to 2:30 PM Mountain, cohort starts
 * February 16, 2027. Cold Meta ads carry no price (the price angle runs to
 * warm audiences only, see its note). Every ad ends on the free masterclass.
 *
 * Voice: Sarah, first person, builder to builder. No em dashes. Nothing
 * billed by time. The office is SeedSide.
 */

export type Copy = {
  id: string;
  title: string;
  channel: 'meta' | 'linkedin' | 'instagram' | 'email' | 'x' | 'host' | 'press' | 'script';
  body: string;
  note?: string;
};

export const MASTERCLASS_URL = 'https://modernmustardseed.com/bootcamp/masterclass';
export const BOOTCAMP_URL = 'https://modernmustardseed.com/bootcamp';
export const HOST_URL = 'https://modernmustardseed.com/bootcamp/host';

/** Six primary texts for Meta, each a different angle, each ending on the free masterclass. */
export const META_PRIMARY: Copy[] = [
  {
    id: 'meta-office',
    title: 'The live office tour',
    channel: 'meta',
    body: `Modern Mustard Seed is an AI product studio with one person at the desk. The rest of the staff is a crew of Claude agents: twenty laws they obey, forty-six skills they run, ten hooks they cannot get past, and 321 memory notes they read before they touch anything. Forty-plus products have shipped out of that office.

On January 26 I am opening it on screen. Not slides. The live phone agent answering our line, the org chart, the morning briefing with the decisions waiting for my yes, and what the whole thing costs a month.

If you run a business and you are still the one everything goes through, this is the room to be in.

The masterclass is free. Tuesday, January 26, 1:00 PM Mountain. Register at the link.`,
    note: 'Cold audiences. Creative: a screen recording of the morning briefing, no price anywhere.',
  },
  {
    id: 'meta-directors',
    title: 'Directors of ideas',
    channel: 'meta',
    body: `We are all directors of ideas now.

The work left for a person is deciding what should exist and saying yes. Everything after the yes, the research, the draft, the build, the follow-up, the report, can be done by an agent with a charter and a rule it cannot break.

I run an entire AI product studio that way. One person. A crew of Claude agents. Forty-plus products shipped.

Most owners I meet use AI every day and are still the bottleneck, because they are prompting a chat window instead of directing a crew. The difference is the setup, and the setup can be taught.

On January 26 I am teaching it, free, live, from the desk that runs the studio. Tuesday, 1:00 PM Mountain. Register at the link.`,
    note: 'Cold audiences. Creative: Sarah at the desk, one line of type: We are all directors of ideas now.',
  },
  {
    id: 'meta-builders',
    title: 'The trade room: builders',
    channel: 'meta',
    body: `Builders: every plan request you did not follow up on was a site walk you did not book.

In the bootcamp, builders get their own room. We put a real builder's website on screen, read it the way an agent does, and build the pre-construction pipeline live: an agent that follows up every plan request, qualifies the job and books the walk on your calendar. Then you build your own, for your company, before the session ends.

That is the difference from every other AI class. Your business goes on screen, and you leave with agents working, not a folder of prompts.

It starts with a free masterclass on Tuesday, January 26, 1:00 PM Mountain, where I open the studio that runs on this. Register at the link.`,
    note: 'Interest targeting: custom home builders, remodelers, general contractors. Creative: a plan set on a tailgate with a phone on top.',
  },
  {
    id: 'meta-clinics-home',
    title: 'The trade room: clinics and home services',
    channel: 'meta',
    body: `Clinics and home services run on the same leak: the call that came in after close, the form nobody answered until Thursday, the cancellation slot that stayed empty.

In the bootcamp you build the agent that fixes it, live, for your own business. A front desk that answers the missed call or the form, qualifies the patient or the homeowner, and books the appointment. Then a second agent that reads your site, your listings and your reviews every week and files the fixes.

Clinics get a room. Home services get a room. Each one works on real businesses in it.

The free masterclass on Tuesday, January 26 at 1:00 PM Mountain shows the whole method on a company that already runs this way. Register at the link.`,
    note: 'Interest targeting: dental, med spa, chiropractic, PT, HVAC, plumbing, roofing, cleaning. Creative: a front desk with the lights off and the phone lit.',
  },
  {
    id: 'meta-guarantee',
    title: 'The guarantee and the price',
    channel: 'meta',
    body: `The One-Person Company Bootcamp is three live sessions, February 2, 4 and 9, 1:00 to 2:30 PM Mountain. General Admission is $97. Every ticket includes two working agents built for your business on Day 3, your own SeedSide office with the first month included, and replays.

The guarantee is simple. Attend Day 1 live, do the work, and if the first session was not worth more than the ticket, email us by 11:59 PM Mountain that night and we refund every dollar. No form, no call.

Enrollment closes the night of Day 1.

Start with the masterclass. It is free, Tuesday, January 26, 1:00 PM Mountain, and the whole method is on screen before you spend a dollar. Register at the link.`,
    note: 'WARM AUDIENCES ONLY, from January 19: site visitors, the list, video viewers. Never cold. This is the one text that carries a price.',
  },
  {
    id: 'meta-host',
    title: 'The host angle for agency owners',
    channel: 'meta',
    body: `Agency owners: you have a list of clients who ask you about AI every week. Host the bootcamp for them.

Host a Room means you run The One-Person Company Bootcamp for your own audience, under your name. You keep 100% of every ticket you sell. You earn 20% of every Operator Program seat your people take. Bring a hundred and you get your own trade room on Day 2, with your name on the door.

The first 25 hosts are founding hosts and keep the same terms on all four 2027 launches. Swipe copy, graphics, your link and a live dashboard are ready the day you are approved.

Watch the free masterclass first, Tuesday, January 26, 1:00 PM Mountain, and see what your clients would see. Register at the link.`,
    note: 'Targeting: marketing and web design agency owners, 2 to 25 staff. Landing: /bootcamp/masterclass with ?via=host in the URL so the follow-up names Host a Room.',
  },
];

/** Eight headlines, each under 40 characters. */
export const META_HEADLINES: string[] = [
  'Watch a Real Company Run on Agents',
  'We Are All Directors of Ideas Now',
  'One Person. A Whole Studio.',
  'Leave With Two Agents Working',
  'Your Business, On Screen, Live',
  'Free Masterclass, January 26',
  'Not Prompts. Working Agents.',
  'Run Your Trade on a Crew',
];

/** Three LinkedIn posts in Sarah's first person. One line per paragraph, at most three hashtags. */
export const LINKEDIN_POSTS: Copy[] = [
  {
    id: 'li-one-person',
    title: 'The one-person company',
    channel: 'linkedin',
    body: `I run an AI product studio with one person at the desk. Me.

The rest of the staff is a crew of Claude agents.

Twenty laws they obey. Forty-six skills they run. Ten hooks they cannot get past. 321 memory notes they read before they touch anything. Forty-plus products shipped.

A phone agent answers the studio line. A presence agent reads our site and listings every week and files the fixes. A morning briefing tells me what ran overnight and which three decisions are waiting for a yes.

My job is the yes.

We are all directors of ideas now. The work left for a person is deciding what should exist. Everything after that can be briefed, charted, guarded and run by a crew.

Most owners I talk to use AI every day and are still the bottleneck. They are prompting a window instead of directing a crew. The difference is the setup, and the setup can be taught.

On Tuesday, January 26 at 1:00 PM Mountain I am opening the office on screen, free, live, from the desk that runs it. The live call, the org chart, the laws, the briefing, the money.

Register here: ${MASTERCLASS_URL}

#OnePersonCompany #AIAgents #SmallBusiness`,
    note: 'Sarah personal, then reshare from the MMS page the next morning.',
  },
  {
    id: 'li-charters',
    title: 'What changed when the agents got charters',
    channel: 'linkedin',
    body: `The day my agents got charters was the day I stopped reading every line they wrote.

Before that, an agent could do anything a prompt allowed, which meant I checked everything. A drip once marked a lead as contacted because it had sent an email. Nobody had spoken to that person. That is now law number one in the studio: contacted means a person.

A charter is one job, written down, with the lines it cannot cross. The presence agent reads and files. It does not send. The front desk answers and books. It does not quote a custom job.

The hooks are the other half. A hook is not a request, it is a wall. Every outbound call goes through one phone library or it does not dial. Every email goes through one logged sender or it does not leave. Ten of those walls run the studio, and none of them can be talked past.

Charters plus hooks turned a clever assistant into a staff I can leave alone.

That is what the bootcamp teaches, with your business on screen.

Free masterclass Tuesday, January 26, 1:00 PM Mountain: ${MASTERCLASS_URL}

#AIAgents #Operations`,
    note: 'Sarah personal. Post Thursday, January 14.',
  },
  {
    id: 'li-why-teach',
    title: 'Why I am teaching it',
    channel: 'linkedin',
    body: `Every week someone asks me to build them a crew of agents. Fifty of those builds is what the studio can take this launch, so I am also teaching the method.

The One-Person Company Bootcamp is three live sessions, February 2, 4 and 9.

Day 1, you watch a real company run: the live phone agent, the org chart, the twenty laws, the memory, the morning briefing, the money.

Day 2, the room splits by trade. Builders, clinics, home services and agencies each get their own room, and real businesses in the room go on screen.

Day 3, you build two agents for your own business, live, and leave with them working inside your own SeedSide office.

Then there are three doors: keep building yourself, join The Operator Program for eight weeks, or have us build it. I say that out loud because I would rather you choose with your eyes open.

The ticket starts at $97 and the guarantee covers Day 1 in full.

It opens with a free masterclass, Tuesday, January 26 at 1:00 PM Mountain, where the whole office goes on screen.

Save a seat: ${MASTERCLASS_URL}

#OnePersonCompany #Bootcamp`,
    note: 'Sarah personal, then the MMS page. Post Tuesday, January 19.',
  },
];

/** Twelve weekly posts for @sarahscaranobuilds, one real thing from the method each, ending on the masterclass. */
export const TRADE_SECRETS_POSTS: Copy[] = [
  {
    id: 'ts-01-law',
    title: 'A law: contacted means a person',
    channel: 'instagram',
    body: `Law number one in my studio: contacted means a person.

No drip, no cron, no auto-reply is allowed to mark a lead contacted. Only a human who spoke to them. An agent once flipped that status because it sent an email, and I nearly lost a client over it.

Write the law. Every agent reads it first.

I am teaching the whole method live on January 26. Link in bio.`,
    note: '2026-10-13',
  },
  {
    id: 'ts-02-hook',
    title: 'A hook is a wall, not a request',
    channel: 'instagram',
    body: `Asking an agent nicely is not a safety plan.

A hook is a wall. In my studio every email goes through one logged sender or it does not leave. Every outbound call goes through one phone library or it does not dial. Ten of those walls, and no agent can talk its way past one.

Rules are for people. Hooks are for agents.

Free masterclass January 26, link in bio.`,
    note: '2026-10-20',
  },
  {
    id: 'ts-03-skill',
    title: 'A skill is a playbook, written once',
    channel: 'instagram',
    body: `A skill is a written playbook an agent loads when the job calls for it.

How I quote a job. How I answer a review. How I write in my own voice. Written once, followed the same way every time. My crew runs forty-six of them.

Your first skill is the thing you explain to every new hire. Write that down today.

The bootcamp builds you ten. Link in bio.`,
    note: '2026-10-27',
  },
  {
    id: 'ts-04-memory',
    title: 'Memory: never explain the business twice',
    channel: 'instagram',
    body: `My agents read 321 memory notes before they do anything.

Each note is one true thing: a client's price, a trap we hit, a rule Sarah set on a date. New session, same business, nothing re-explained.

The rule under the rule: probe, never quote from memory. Memory tells the agent where to look. The live system tells it what is true.

Masterclass January 26, link in bio.`,
    note: '2026-11-03',
  },
  {
    id: 'ts-05-briefing',
    title: 'The morning briefing',
    channel: 'instagram',
    body: `I do not open my inbox first. I open the briefing.

What ran overnight. What broke. The three decisions waiting for a yes, each with the draft already written. I read it, I say yes or no, and the crew gets back to work.

Fifteen minutes. That is the job of a director.

See a real one on screen January 26. Link in bio.`,
    note: '2026-11-10',
  },
  {
    id: 'ts-06-charter',
    title: 'One agent, one job, one charter',
    channel: 'instagram',
    body: `An agent that can do anything needs watching all day.

So every agent in my studio has a charter: one job, written down, with the lines it cannot cross. The presence agent reads and files. It never sends. The front desk answers and books. It never quotes a custom job.

Narrow agents are trustworthy agents.

The bootcamp writes your first two charters with you. Link in bio.`,
    note: '2026-11-17',
  },
  {
    id: 'ts-07-idea-engine',
    title: 'The idea engine',
    channel: 'instagram',
    body: `The best thing my crew does is bring me ideas I did not ask for.

Every week agents read the market, the reviews, the numbers and my own notes, then propose three ideas and argue for each one. I kill two. The third gets a brief.

Your agents can be trained to do this for your business. It is a skill, not magic.

Watch it run live on January 26. Link in bio.`,
    note: '2026-12-01',
  },
  {
    id: 'ts-08-build-week',
    title: 'Build Week',
    channel: 'instagram',
    body: `Build Week is one idea, scoped Monday, live Friday, with the crew doing the building.

A one-page spec. An acceptance test. The order of work. Then agents build while I direct, and on Friday a real thing ships: a tool, a site, a system.

Forty-plus products came out of that rhythm. One person at the desk.

The Operator Program has a Build Week in it. Masterclass first, January 26. Link in bio.`,
    note: '2026-12-08',
  },
  {
    id: 'ts-09-brief',
    title: 'The brief an agent can build from',
    channel: 'instagram',
    body: `An idea is not a brief.

A brief is one page: what it is, who it is for, what done looks like, and the one test that proves it. Give an agent a brief and it builds. Give it an idea and it guesses.

Director of ideas is the title. The brief is the craft.

The bootcamp pre-work turns one of your ideas into a brief. Free masterclass January 26, link in bio.`,
    note: '2027-01-05',
  },
  {
    id: 'ts-10-skeptic',
    title: 'The skeptic agent',
    channel: 'instagram',
    body: `One agent in my studio has a single job: attack the others' conclusions.

It returns CONFIRMED, REFUTED or UNPROVEN, and it defaults to UNPROVEN unless it watched the thing work itself. Nothing ships to a client until the skeptic signs.

Trust in a crew is built by one agent whose job is to not trust.

Masterclass in three weeks, January 26. Link in bio.`,
    note: '2027-01-12',
  },
  {
    id: 'ts-11-phone',
    title: 'The phone agent answers the studio line',
    channel: 'instagram',
    body: `Call my studio and an agent answers. Mr. Mustard.

He knows the offers, books the call, hangs up on robocallers on his first turn, and caps outbound dials so no one can run up the bill. Every rule he follows is written in a file I can read.

That is what a working agent looks like. Not a chatbot bubble.

Hear a live call open the masterclass, January 26. Link in bio.`,
    note: '2027-01-19',
  },
  {
    id: 'ts-12-today',
    title: 'Today at 1:00 PM Mountain',
    channel: 'instagram',
    body: `Today at 1:00 PM Mountain I open the office on screen.

A live call to the phone agent. The org chart. The twenty laws. The memory. The morning briefing. The money. Then two live demos on a volunteer's business.

One person, a crew of agents, forty-plus products. Free, sixty minutes, replay to everyone who registers.

Link in bio. See you at one.`,
    note: '2027-01-26',
  },
];

/** Swipe copy for approved hosts. {Your name} and {your link} are the only blanks. */
export const HOST_SWIPE: Copy[] = [
  {
    id: 'host-email',
    title: 'Host email to their list',
    channel: 'host',
    body: `Subject: I am hosting a room at this

I am hosting a room at The One-Person Company Bootcamp, and I want you in it.

Here is what it is. Sarah Scarano runs an entire AI product studio with one person at the desk and a crew of Claude agents: twenty laws, forty-six skills, ten safety hooks, 321 memory notes, forty-plus products shipped. Over three live sessions in February she opens that office on screen, then every attendee builds two working agents for their own business and leaves with them running in their own office. Not prompts. Agents, working.

It starts with a free masterclass on Tuesday, January 26 at 1:00 PM Mountain. That is the one to see first. The live call to the phone agent, the org chart, the morning briefing, and two live demos on a volunteer's business.

Register through my link so you land in my room: {your link}

If you have ever said "I should be using AI for this" and then gone back to doing it yourself, this is where it changes. Come watch a real company run.

{Your name}`,
    note: 'Send Tuesday, January 12 and again Monday, January 25.',
  },
  {
    id: 'host-social',
    title: 'Host social post',
    channel: 'host',
    body: `I am hosting a room at The One-Person Company Bootcamp this February.

One person runs an entire AI product studio with a crew of Claude agents. Twenty laws, forty-six skills, ten safety hooks, forty-plus products shipped. Three live sessions: you watch that office run, your business goes on screen, and you build two working agents for your own company before it ends.

It opens with a free masterclass on Tuesday, January 26 at 1:00 PM Mountain.

Register through my link and you are in my room: {your link}`,
    note: 'Post the day you are approved, then again Monday, January 25.',
  },
  {
    id: 'host-dm',
    title: 'Host DM',
    channel: 'host',
    body: `Hey, quick one. I am hosting a room at a bootcamp in February where you watch a real company run on a crew of AI agents, then build two working agents for your own business. It opens with a free masterclass on January 26 at 1:00 PM Mountain. I think it is exactly your thing. Register through my link so you land in my room: {your link}`,
    note: 'One to one. Never paste to more than one person without changing the first line.',
  },
  {
    id: 'host-story',
    title: 'Host story text',
    channel: 'host',
    body: `Watch a real company run on AI agents. Live.
Free masterclass, Jan 26, 1:00 PM Mountain.
Register through my link. Swipe up.`,
    note: 'Three lines for a story frame. Put the link sticker on the third line.',
  },
  {
    id: 'host-room',
    title: 'Room announcement, for hosts who bring 100',
    channel: 'host',
    body: `We have our own room.

A hundred of you registered through my link, which means on Day 2 of The One-Person Company Bootcamp, Thursday, February 4, our group gets its own trade room with my name on the door. Real businesses from this room go on screen, get read by an agent, and get their first fix built live.

If you are in, be in the room on February 4 at 1:00 PM Mountain. If you are not registered yet, this is the link: {your link}

Bring the business you actually run. That is the one we put on screen.`,
    note: 'Send the day the dashboard shows 100 registrations.',
  },
];

/** The sixty-minute masterclass, twenty beats. `minute` is the start of the beat. */
export const MASTERCLASS_SCRIPT: { minute: number; beat: string; onScreen: string }[] = [
  { minute: 0, beat: 'Cold open: dial the studio line on speaker. Let the phone agent answer, say what we do, and book the follow-up. Do not talk over it.', onScreen: 'Phone on screen, live captions of the call' },
  { minute: 3, beat: 'Who is on the call: one person at the desk, a crew of Claude agents, forty-plus products shipped. The thesis in one line: we are all directors of ideas now.', onScreen: 'Sarah on camera, one line of type' },
  { minute: 6, beat: 'The org chart. Every agent, its one job, who it reports to, what it runs on a schedule. Point at the phone agent that just answered.', onScreen: 'The SeedSide crew panel, live' },
  { minute: 10, beat: 'Charters. Read one out loud: the presence agent reads and files, never sends. Why narrow agents are the ones you can leave alone.', onScreen: 'One charter file, full screen' },
  { minute: 13, beat: 'The twenty laws, and the one incident that wrote each of three of them: contacted means a person, every dial through one phone library, never quote a price from memory.', onScreen: 'The laws file, scrolling, three highlighted' },
  { minute: 17, beat: 'Hooks. Try to make an agent send an email outside the logged sender and watch it refuse. A hook is a wall, not a request.', onScreen: 'Terminal, the refusal in red' },
  { minute: 20, beat: 'Memory. Open the 321 notes. Show one about a client, one about a trap. The rule: probe, never quote from memory.', onScreen: 'The memory index' },
  { minute: 23, beat: 'The morning briefing. Read this morning\'s: what ran overnight, what broke, the three decisions waiting. Say yes to one on screen.', onScreen: 'Today\'s briefing, a yes clicked live' },
  { minute: 27, beat: 'The money. What this office costs per month, line by line, and what it replaced. No rounding.', onScreen: 'One slide, the monthly bill' },
  { minute: 30, beat: 'Live demo one. A volunteer gives their website. The presence agent reads it, the listings and the reviews, and files the top three fixes with the first one drafted.', onScreen: 'Volunteer site on the left, agent output on the right' },
  { minute: 37, beat: 'Live demo two. The idea engine reads the same business and proposes three ideas, each with the case for it. The volunteer picks one. Show the brief it writes.', onScreen: 'Three ideas, then the one-page brief' },
  { minute: 43, beat: 'Your map. The three questions every owner answers tonight: which job becomes an agent first, what is its charter, what is the one wall it needs.', onScreen: 'Three questions, blank lines' },
  { minute: 45, beat: 'The bootcamp. Three live sessions, February 2, 4 and 9, 1:00 to 2:30 PM Mountain. Day 1 the office, Day 2 your trade, Day 3 you build.', onScreen: 'The three days, dated' },
  { minute: 48, beat: 'Day 2 trade rooms: builders, clinics, home services, agencies. Real businesses in the room go on screen. Hosts who bring a hundred have their own door.', onScreen: 'Four rooms, four doors' },
  { minute: 50, beat: 'What you leave with: two working agents, the presence agent and the front desk, running in your own SeedSide office with the first month included.', onScreen: 'A fresh SeedSide office with two agents working' },
  { minute: 52, beat: 'Tiers. General Admission, VIP, Platinum, with what each adds. Platinum front row gets their business built on screen on Day 2.', onScreen: 'The three tiers from /bootcamp' },
  { minute: 54, beat: 'The guarantee, read word for word. Attend Day 1 live, do the work, email by 11:59 PM Mountain that night, every dollar back. Enrollment closes the night of Day 1.', onScreen: 'The guarantee, full screen' },
  { minute: 55, beat: 'The link, the dates, and the three doors after Day 3 said out loud: build it yourself, The Operator Program, or have us build it.', onScreen: 'modernmustardseed.com/bootcamp' },
  { minute: 56, beat: 'Q&A. Take the trade questions first, the technical ones second. Keep every answer under a minute.', onScreen: 'Questions panel' },
  { minute: 59, beat: 'Close. One ask: take a seat before Day 1. The replay goes out this afternoon to everyone registered.', onScreen: 'The link, and the date February 2' },
];

/** Press blurb, 120 words, the one place third person is allowed. */
export const PRESS_BLURB: Copy = {
  id: 'press-blurb',
  title: 'Press blurb',
  channel: 'press',
  body: `Modern Mustard Seed, an independent AI product studio in Kalispell, Montana, is opening its office on screen. The One-Person Company Bootcamp is three live sessions on February 2, 4 and 9, 2027, taught live by founder Sarah Scarano from the desk that runs the studio: one person, a crew of Claude agents, twenty laws, forty-six skills, ten safety hooks and forty-plus products shipped to date. Attendees watch the company run, then build two working agents for their own business and leave with them running in their own SeedSide office. Tickets are $97, $297 and $497. An eight-week Operator Program follows on February 16 at $4,997. A free masterclass opens the run on Tuesday, January 26 at 1:00 PM Mountain, at modernmustardseed.com/bootcamp/masterclass.`,
};

/** Three subject options per drip step. Under 55 characters, no exclamation marks, no fake urgency. */
export const EMAIL_SUBJECTS: Record<string, string[]> = {
  'mc-confirm': [
    'Your seat for January 26 is saved',
    'Confirmed: the masterclass, Tuesday January 26',
    'You are in. Here is your calendar invite',
  ],
  'mc-24h': [
    'Tomorrow at 1:00 PM Mountain: the live office',
    'The masterclass is tomorrow. Here is the link',
    'One day out: what we will put on screen',
  ],
  'mc-1h': [
    'We go live in sixty minutes',
    'Starting at 1:00 PM Mountain. Your link inside',
    'The phone agent answers at 1:00. Join here',
  ],
  'mc-replay': [
    'The replay, and what comes next',
    'Today\'s masterclass replay is up',
    'If you missed the live call, watch this',
  ],
  'mc-offer-2': [
    'Two agents, built for your business, February 9',
    'What you leave the bootcamp with',
    'The guarantee, in full, before you decide',
  ],
  'mc-offer-3': [
    'Enrollment closes Tuesday night, February 2',
    'Last word before Day 1',
    'Day 1 is Tuesday. Your seat is still open',
  ],
  'ticket-welcome': [
    'You are in. Here is your pre-work',
    'Welcome to the bootcamp: dates, invites, pre-work',
    'Your seat, your SeedSide office, your three dates',
  ],
  'kickoff-24h': [
    'Kickoff is tomorrow at 1:00 PM Mountain',
    'Monday: setup done together, so Day 1 starts fast',
    'Tomorrow we set up your office. Bring your laptop',
  ],
  'day1-24h': [
    'Day 1 is tomorrow: inside the office',
    'Tomorrow at 1:00 PM Mountain, the whole studio',
    'Day 1 tomorrow. The live call opens it',
  ],
  'day1-1h': [
    'Day 1 starts in sixty minutes',
    'Doors open at 1:00 PM Mountain. Link inside',
    'Sixty minutes to Day 1. Here is your room',
  ],
  'day2-24h': [
    'Day 2 is tomorrow: your trade room',
    'Tomorrow the room splits by trade. Find yours',
    'Thursday at 1:00: your business on screen',
  ],
  'day3-24h': [
    'Day 3 is tomorrow: you build',
    'Tomorrow you hire your first two agents',
    'Tuesday at 1:00 PM Mountain, we build',
  ],
  'day3-replay': [
    'Your two agents are working. Here is the replay',
    'Day 3 replay, and the three doors',
    'What to do with your office this week',
  ],
  'op-2': [
    'The Operator Program: eight weeks, in a cohort',
    'From two agents to a whole crew',
    'Week by week: what the cohort builds',
  ],
  'op-3': [
    'The cohort starts Tuesday, February 16',
    'Last note on The Operator Program',
    '250 seats, cohort starts February 16',
  ],
  'op-welcome': [
    'Welcome to the cohort. Week 1 is February 16',
    'You are in The Operator Program',
    'Your seat, your office, your first Tuesday',
  ],
  'host-received': [
    'We have your Host a Room application',
    'Received: your application to host',
    'Your host application is in. Next steps',
  ],
  'host-approved': [
    'You are a host. Your link and dashboard',
    'Approved: here is your room',
    'Your Host a Room kit is ready',
  ],
};
