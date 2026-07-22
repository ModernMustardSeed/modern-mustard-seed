/**
 * THE CHIEF. Mr. Mustard as your personal chief of staff.
 *
 * The Sidekick answers your customers. THE CHIEF works for YOU. A proactive,
 * agentic assistant you call, text, or type to any hour, trained on your
 * business and your life. He runs your calendar, drafts and sends your email,
 * makes calls and books things for you, researches anything, runs sales
 * role-play before your big pitch, builds your lead list, and wakes you up
 * with a verse and the three things that matter today. His command center
 * lives in your portal.
 *
 * The positioning is a promise: you thought a personal assistant was expensive.
 * A human chief of staff runs four to eight thousand a month. Not anymore.
 *
 * PRICE LIVES HERE, IN CENTS, AND NOWHERE ELSE. Checkout builds inline Stripe
 * price_data from these cents (same pattern as data/sidekick.ts), so the number
 * on the page IS the number Stripe charges. Every plan is hard-capped on voice
 * minutes and fails closed at the cap (he drops to text and takes a message,
 * never an overage bill), per the never-leak-revenue rule.
 */

export const CHIEF = {
  name: 'The Chief',
  wordmark: '[ THE CHIEF ]',
  tagline: 'Your chief of staff. On call, day and night.',
  promise:
    'He sounds like Mr. Mustard and works like a six-thousand-dollar-a-month executive assistant. Call him, text him, or type to him any hour. He already knows your business, your calendar, and your goals, and he handles the rest so you can build.',
  // The whole offer in one line: the price anchor Sarah asked to lead with.
  anchor:
    'You thought a personal assistant was expensive. A human chief of staff runs $4,000 to $8,000 a month. Yours starts at $597.',
  metaTitle: 'The Chief. A Personal AI Chief of Staff You Can Call Anytime',
  metaDescription:
    'Meet The Chief: a proactive AI chief of staff from Modern Mustard Seed. Call, text, or type any hour. He runs your calendar, drafts and sends email, makes calls, researches anything, runs sales role-play, builds your lead list, and wakes you with scripture and your day. Trained on your business, with a command center included. From $597/mo, a fraction of a human assistant.',
  phoneLineNote: 'He answers in Mr. Mustard’s voice, the same AI who runs our own front desk at (406) 312-1223. Call and hear him yourself.',
} as const;

/**
 * The tier. `minutesCap` is the monthly voice ceiling; at the cap The Chief
 * drops to text and message-taking, never a surprise bill (fail closed).
 */
export type ChiefTier = {
  slug: 'chief' | 'chief-executive' | 'cabinet';
  name: string;
  chip: string;
  setupCents: number;
  monthlyCents: number;
  minutesCap: number;
  /** One-line who-it-is-for. */
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

/** Display helper, so no surface invents its own formatting. */
export function chiefUsd(cents: number): number {
  return Math.round(cents / 100);
}

/** What a comparable human hire costs, for the anchor math. Annual, in dollars. */
export const humanAssistantYear = { low: 52000, high: 96000 } as const;

export const chiefTiers: ChiefTier[] = [
  {
    slug: 'chief',
    name: 'CHIEF',
    chip: '[ YOUR RIGHT HAND ]',
    setupCents: 49700,
    monthlyCents: 59700,
    minutesCap: 500,
    pitch: 'The assistant you always needed, on call for you around the clock.',
    includes: [
      'Call, text, or type to him any hour, in his own voice',
      'Trained on your business, your calendar, and your goals',
      '500 assistant-minutes a month (voice), unlimited text and chat',
      'Runs your calendar: books, moves, and protects your time',
      'Drafts and sends email in your voice, with your yes',
      'Researches anything and hands you a one-page brief',
      'A morning briefing with scripture, weather, and your day',
      'Your command center in the portal, one login for all of it',
      'Live within 7 days, set up by hand. Cancel anytime.',
    ],
    cta: 'Hire The Chief',
  },
  {
    slug: 'chief-executive',
    name: 'CHIEF EXECUTIVE',
    chip: '[ RUNS YOUR WEEK ]',
    setupCents: 99700,
    monthlyCents: 99700,
    minutesCap: 1200,
    pitch: 'For the operator whose day is full. He calls you awake and coaches your close.',
    includes: [
      'Everything in CHIEF',
      '1,200 assistant-minutes a month (voice)',
      'A daily wake-up CALL, not just a text: your verse and your day, out loud',
      'Sales role-play: he plays the tough buyer and drills your pitch',
      'A lead-gen engine: finds people who match your best client, enriched',
      'Makes calls and books things for you (vendors, reservations, errands)',
      'Priority setup and same-day persona edits',
    ],
    cta: 'Hire the Executive',
    featured: true,
  },
  {
    slug: 'cabinet',
    name: 'THE CABINET',
    chip: '[ FOR YOU AND YOUR TEAM ]',
    setupCents: 199700,
    monthlyCents: 199700,
    minutesCap: 3000,
    pitch: 'A chief of staff for you and a small team, trained deep and tuned weekly.',
    includes: [
      'Everything in CHIEF EXECUTIVE',
      '3,000 assistant-minutes a month (voice), pooled across your team',
      'Up to five people, each with their own line and briefing',
      'White-glove training: we load your world with you, by hand',
      'A weekly 30-minute strategy call with Sarah to sharpen him',
      'First in line for every new capability he learns',
    ],
    cta: 'Build The Cabinet',
  },
];

export function getChiefTier(slug: string): ChiefTier | undefined {
  return chiefTiers.find((t) => t.slug === slug);
}

/**
 * "A Day With Your Chief" (the signature moment). The scrubber walks a single
 * day from wake-up to wind-down; each stop is one real thing he handled. Times
 * are display-only. `prop` maps to the illustrated card for that moment.
 */
export type ChiefMoment = {
  time: string;
  /** minutes since midnight, for the scrubber position */
  at: number;
  tag: string;
  title: string;
  line: string;
  prop: 'sunrise' | 'inbox' | 'calendar' | 'research' | 'followup' | 'roleplay' | 'leads' | 'errand' | 'brief' | 'moon';
};

export const chiefDay: ChiefMoment[] = [
  {
    time: '6:30a',
    at: 390,
    tag: 'The wake-up',
    title: 'He calls you awake.',
    line: 'A verse for the day, the weather, and the three things that actually matter before noon. Not an alarm. A briefing.',
    prop: 'sunrise',
  },
  {
    time: '7:15a',
    at: 435,
    tag: 'The inbox',
    title: 'Overnight email, already triaged.',
    line: 'The noise is filed. Three replies are drafted in your voice and waiting on a single yes. Nothing needs you that he could handle himself.',
    prop: 'inbox',
  },
  {
    time: '8:00a',
    at: 480,
    tag: 'The calendar',
    title: 'Your day, arranged around your best work.',
    line: 'He booked the two meetings, moved the one that conflicted, and walled off your deep-work block so no one steals it.',
    prop: 'calendar',
  },
  {
    time: '9:30a',
    at: 570,
    tag: 'The research',
    title: 'A brief on the desk before the meeting.',
    line: 'One page on the person you are about to meet: their company, their last move, the three questions worth asking. Pulled and written overnight.',
    prop: 'research',
  },
  {
    time: '11:00a',
    at: 660,
    tag: 'The follow-ups',
    title: 'Six warm leads, followed up in your voice.',
    line: 'He wrote and sent them, logged every reply, and flagged the two who wrote back ready. The pipeline moved while you were on a call.',
    prop: 'followup',
  },
  {
    time: '12:30p',
    at: 750,
    tag: 'The role-play',
    title: 'A twelve-minute drill before the big pitch.',
    line: 'He played the skeptical buyer, threw the price objection twice, and told you which answer landed and which one wobbled. You walk in sharp.',
    prop: 'roleplay',
  },
  {
    time: '2:00p',
    at: 840,
    tag: 'The outreach',
    title: 'Eighteen new leads that look like your best client.',
    line: 'He found them, enriched them, and queued the intros for your yes. Your best customer, cloned eighteen times.',
    prop: 'leads',
  },
  {
    time: '4:00p',
    at: 960,
    tag: 'The errands',
    title: 'The calls you keep not making, made.',
    line: 'He rang the vendor, rescheduled the dentist, and confirmed the reservation. The small stuff that eats an afternoon, gone in his hands.',
    prop: 'errand',
  },
  {
    time: '5:30p',
    at: 1050,
    tag: 'The recap',
    title: 'The whole day, closed out clean.',
    line: 'What got done, what moved, the two things that need you tomorrow. You leave the desk knowing exactly where everything stands.',
    prop: 'brief',
  },
  {
    time: '9:00p',
    at: 1260,
    tag: 'The wind-down',
    title: 'Tomorrow, already set.',
    line: 'The morning call is scheduled, the calendar is squared, and there is a verse waiting for the quiet. Rest. He has the watch.',
    prop: 'moon',
  },
];

/** What he does, for the capability grid. */
export const chiefCapabilities = [
  { icon: '☎️', name: 'Calls and texts', desc: 'He makes calls and sends texts for you, and you can reach him the same way, any hour.' },
  { icon: '📅', name: 'Runs your calendar', desc: 'Books, moves, and protects your time. Your day arranged around your best work, not against it.' },
  { icon: '✍️', name: 'Drafts and sends email', desc: 'Writes in your voice, waits for your yes, then sends. Your inbox stops running you.' },
  { icon: '🔎', name: 'Researches anything', desc: 'A person, a market, a decision. He digs overnight and hands you one clean page.' },
  { icon: '🎯', name: 'Trains your pitch', desc: 'Live sales role-play. He plays the tough buyer, drills your close, and tells you what landed.' },
  { icon: '🧲', name: 'Builds your lead list', desc: 'Finds people who match your best client, enriched and queued for your yes.' },
  { icon: '🌅', name: 'Wakes you with the Word', desc: 'A morning briefing with scripture, the weather, and the three things that matter today.' },
  { icon: '🖥️', name: 'Your command center', desc: 'Everything he handles, on one board in your portal. Calls, briefings, leads, and your day.' },
];

/** Honest boundary. The line between an assistant and a liability. */
export const chiefBoundaries = {
  handles: [
    'Anything you can ask a great assistant to do: calls, texts, email, calendar, research, booking, follow-up, prep',
    'Learns your business, your people, your calendar, and your voice, and gets sharper the more you use him',
    'Runs on approve-first: he drafts and proposes, you say the word, then he acts. Flip on autopilot for the routine when you trust him',
    'Speaks in Mr. Mustard’s voice on a real line you can call, text, or type to at any hour',
  ],
  wont: [
    'Spend your money or make a purchase without your explicit go-ahead',
    'Send anything on full autopilot until you turn autopilot on, task by task',
    'Give medical, legal, tax, or financial advice (he takes it to the right human)',
    'Touch anything you did not give him. Your data is yours, encrypted, never trained into anyone else’s Chief',
  ],
} as const;

export const chiefFaq = [
  {
    q: 'How is this different from the AI receptionist (Sidekick)?',
    a: 'Opposite direction. The Sidekick answers your customers, an inbound front desk for your business. The Chief works for you. He is your outbound, proactive right hand: your calendar, your email, your calls, your research, your prep, your morning briefing. One picks up the phone when the world calls in. The other runs your week.',
  },
  {
    q: 'How does he learn my business and my life?',
    a: 'We set him up by hand in your first week. You tell him about your business, your people, your calendar, your goals, and how you like things done, the same way you would brief a new chief of staff. He is trained on that, and only that, and he gets sharper every time you use him. Your world stays yours: encrypted, private, never mixed into anyone else’s Chief.',
  },
  {
    q: 'Can he actually send email and make calls, or just draft them?',
    a: 'Both, and you hold the switch. Out of the gate he runs approve-first: he drafts the email or lines up the call and waits for your yes. As you learn to trust him, you turn on autopilot for the routine, one task at a time. He will never send or spend on his own until you tell him he can.',
  },
  {
    q: 'What happens when I hit my monthly minutes?',
    a: 'He shifts to text and message-taking for voice, and keeps going everywhere else. You never get a surprise bill. Text, chat, email, and his command center do not stop. If you keep hitting the voice cap, that is a good sign you have outgrown the tier, and moving up takes one message.',
  },
  {
    q: 'Is he really cheaper than a human assistant?',
    a: 'By a wide margin. A capable human executive assistant or chief of staff runs $52,000 to $96,000 a year, before benefits, and works one shift. The Chief starts at $597 a month, works every hour, never calls in sick, and remembers everything. Run the numbers on the page: most owners keep tens of thousands and get more done.',
  },
  {
    q: 'What is the wake-up call?',
    a: 'Your choice of a morning call or a text, on your schedule. On CHIEF it is a briefing text with your verse, your weather, and your three priorities. On CHIEF EXECUTIVE and up, he calls you awake in his own voice and reads it to you. Scripture, encouragement, or just the plan, however you want to start the day.',
  },
  {
    q: 'Is there a contract?',
    a: 'Month to month, cancel anytime. The setup fee is one time and covers the hand-training that makes him yours. No trials, because the free demo call is the trial: hear him and talk to him before you pay a cent.',
  },
  {
    q: 'Who is Mr. Mustard?',
    a: 'The AI who runs Modern Mustard Seed’s own front desk at (406) 312-1223, built by Sarah on the same stack she is handing you. Your Chief is his voice and his manners, trained on your world instead of ours. Call him and hear it for yourself.',
  },
] as const;
