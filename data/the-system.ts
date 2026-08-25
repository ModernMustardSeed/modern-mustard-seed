/**
 * THE SYSTEM (/the-system).
 *
 * The one page that shows the whole ecosystem as a single running loop: the
 * lead is found, reached, answered, booked, sold, built, run, and grown, and
 * the growth feeds the next lead. Every station below maps to something the
 * studio actually ships. Nothing here is aspirational copy; if a station is
 * listed, it exists or is built to order under a set package price.
 *
 * Prices are never typed here. The offer section reads them from
 * lib/demo-order.ts, lib/hundredfold.ts, and data/pricing.ts.
 */

export type Station = {
  code: string;
  verb: string;
  title: string;
  blurb: string;
  runsOn: string;
  proof: string;
};

/** The loop, in order. Station 8 feeds station 1; that is the whole point. */
export const STATIONS: Station[] = [
  {
    code: '01',
    verb: 'Found',
    title: 'The lead is found before they know you exist.',
    blurb:
      'A lead finder built for your trade scans the businesses and people who fit, grades every contact, and files them in your pipeline with the reason they qualify.',
    runsOn: 'Lead Finder, Pipeline',
    proof: 'Every lead lands with a source, a grade, and a next step already set.',
  },
  {
    code: '02',
    verb: 'Reached',
    title: 'The first message is specific, and it is already written.',
    blurb:
      'Campaigns go out from your domain in your voice, one lead at a time, paced under a sending governor so your reputation never takes a hit. Every open, click, and reply comes back to the board.',
    runsOn: 'Campaign Builder, Outbound Governor',
    proof: 'Bounces halt a send day automatically. Replies file to the contact.',
  },
  {
    code: '03',
    verb: 'Answered',
    title: 'The phone rings and your agent picks up on the first ring.',
    blurb:
      'A voice agent trained on your business answers at noon and at two in the morning, follows the caller into Spanish, takes the message when it must, and books the job when it can.',
    runsOn: 'Voice Agent, The Talking Website',
    proof: 'Every call transcribed, summarized, and filed to the lead that made it.',
  },
  {
    code: '04',
    verb: 'Booked',
    title: 'The appointment lands on your calendar without you touching it.',
    blurb:
      'The agent checks real availability, holds the slot, confirms by text and email, and sends the reminder. You get a one-line note: who, when, what they want.',
    runsOn: 'Calendar, Reminders',
    proof: 'No double bookings, no "did anyone call them back."',
  },
  {
    code: '05',
    verb: 'Sold',
    title: 'The proposal is built, signed, and paid in one sitting.',
    blurb:
      'A branded proposal generated from the call notes, signed on screen, paid by card or ACH through Stripe. The deal moves itself from quoted to won and the kickoff packet goes out.',
    runsOn: 'Proposal Builder, Deal Tracking, Stripe',
    proof: 'One link. Read, sign, pay. Deal tracked from first touch to invoice.',
  },
  {
    code: '06',
    verb: 'Built',
    title: 'The thing they bought gets built while they watch.',
    blurb:
      'The website, the app, the automation, the intake form, the interview flow: built on infrastructure you own, deployed to your domain, with the repo and the credentials in your name.',
    runsOn: 'The Build, Custom Software, Automations',
    proof: 'You own the code, the deploys, the docs. Live in weeks, not months.',
  },
  {
    code: '07',
    verb: 'Run',
    title: 'One board runs the whole business.',
    blurb:
      'Calls, leads, deals, jobs, invoices, reviews, campaigns, and social, on one screen the AI can see. Ask it anything about the business. Hand it the writing. Approve with one tap.',
    runsOn: 'The Command Center',
    proof: 'The brain the website, the agent, and every automation report to.',
  },
  {
    code: '08',
    verb: 'Grown',
    title: 'The finished job goes and finds the next one.',
    blurb:
      'Review requests fire when the job closes. Social posts get written and scheduled from the work you just did. Referral asks go out on a timer. The next lead is already being found.',
    runsOn: 'Review Chase, Social Scheduler, Referral Drip',
    proof: 'Station 08 hands off to station 01. The loop closes on its own.',
  },
];

export type Capability = {
  name: string;
  what: string;
  replaces: string;
  icon: string;
};

/** Everything inside the system, one card each. */
export const CAPABILITIES: Capability[] = [
  { icon: '🌐', name: 'Website', what: 'Built to be found on Google and to greet whoever lands on it. Reads its own tour out loud.', replaces: 'The template site that never got updated' },
  { icon: '🎙', name: 'Voice Agent', what: 'Answers every call, books the job, takes the message, transfers when it matters.', replaces: 'Voicemail, and the six calls a week that went there' },
  { icon: '🧠', name: 'Command Center', what: 'Every lead, call, deal, job, and dollar on one screen, with an AI that can see all of it.', replaces: 'Four tabs, two spreadsheets, and your memory' },
  { icon: '📈', name: 'Deal Tracking', what: 'Every opportunity moves quoted, won, built, live, paid. Nothing stalls unseen.', replaces: 'The CRM nobody logged into' },
  { icon: '🔎', name: 'Lead Finder', what: 'Finds and grades the businesses and people who fit your trade, then files them.', replaces: 'Buying a list and hoping' },
  { icon: '✉️', name: 'Campaign Builder', what: 'Multi-step sequences written in your voice, paced by a governor, tracked to the reply.', replaces: 'Mailchimp blasts and the spam folder' },
  { icon: '📅', name: 'Social Scheduler', what: 'Posts written from the work you actually did, scheduled across every channel.', replaces: 'The Sunday night content panic' },
  { icon: '📝', name: 'Form Builder', what: 'Intake, quote, application, and onboarding forms that file straight to the board.', replaces: 'PDFs nobody sends back' },
  { icon: '🎤', name: 'Interview Creator', what: 'Structured interviews for hiring, discovery, and customer research, with synthesis on the other end.', replaces: 'Unstructured calls and lost notes' },
  { icon: '⚙️', name: 'Automations', what: 'Missed-call rescue, follow-up, review requests, invoicing, the busywork running itself.', replaces: 'The list of things you meant to do' },
  { icon: '🛠️', name: 'Custom Software', what: 'Full apps, stores, portals, and agentic tools designed for how your operation actually works.', replaces: 'Bending your business around off-the-shelf software' },
  { icon: '🔐', name: 'Owned Infrastructure', what: 'Your repo, your database, your deploys, your keys. Documented, handed over, yours on launch day.', replaces: 'Renting your own business back from a vendor' },
];

export type DayBeat = {
  time: string;
  station: string;
  beat: string;
};

/** One illustrated day on the system. Illustrative, not a client log. */
export const A_DAY: DayBeat[] = [
  { time: '5:40 AM', station: '01', beat: 'The lead finder files 14 new contacts in your trade, graded, with the reason each one qualifies.' },
  { time: '7:02 AM', station: '02', beat: 'Campaign step two goes out to 38 people. Three open it before you finish coffee.' },
  { time: '9:15 AM', station: '03', beat: 'A caller from the campaign phones in. Your agent answers on the first ring and asks the four questions you would have asked.' },
  { time: '9:19 AM', station: '04', beat: 'The slot is booked for Thursday at 10. Confirmation text sent. You get one line: name, address, what they want.' },
  { time: '11:30 AM', station: '05', beat: 'You finish the call. The proposal is built from the notes, sent, signed, and paid before lunch.' },
  { time: '1:00 PM', station: '06', beat: 'The build starts. The intake form, the customer portal, and the automation they bought are live by end of week.' },
  { time: '4:45 PM', station: '07', beat: 'You ask the board what changed today. It tells you, and drafts the two follow-ups that need your voice.' },
  { time: '6:30 PM', station: '08', beat: 'A job closes. The review request fires, the social post is drafted, and the referral ask is scheduled for Friday.' },
];

export const SYSTEM_FAQ = [
  {
    q: 'What is "the system," in one sentence?',
    a: 'It is your website, your voice agent, your command center, and every automation between them, built as one thing off one brain, so a lead found on Monday is a paid job on Thursday without anyone re-typing anything.',
  },
  {
    q: 'Do I have to buy all of it at once?',
    a: 'No. Every door opens with a free build. Most businesses start with The Talking Website, add automations as the pain shows up, and grow into custom software when the off-the-shelf version stops fitting. The loop is designed to be entered at any station.',
  },
  {
    q: 'Who builds it?',
    a: 'Sarah Scarano, a self-taught full-stack engineer and AI systems architect in Kalispell, Montana, with 40 plus shipped products. The person who scopes it is the person who ships it.',
  },
  {
    q: 'Do I own it?',
    a: 'Yes. The repo, the database, the deploys, the phone number, the documentation, every credential. Stewardship over extraction: we build assets you can run without us.',
  },
  {
    q: 'What does it cost?',
    a: 'Set package prices, fixed before work starts. The productized doors carry a setup fee and a monthly. Custom builds are quoted after a free 30-minute call. Changes to what we built are included; there are no change orders.',
  },
  {
    q: 'How fast?',
    a: 'A free demo is built for your business in about an hour. A productized door goes live within a week. A custom build ships in two to four weeks. HUNDREDFOLD runs twelve months on gates.',
  },
];
