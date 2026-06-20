/**
 * The MMS sales / discovery call script. Lives at /admin/call-script so whoever
 * is running a booked call (Polly, Sarah) can pull it up live. Pairs with the
 * Call companion (/admin/intake-call): run the script, capture scope there, then
 * build the proposal straight from it.
 *
 * Voice: warm, calm, founder-to-founder, no jargon, no em dashes. The goal of
 * every call is one thing: understand the problem, show we can fix it, and leave
 * with a clear next step (a proposal). We do not freestyle prices on the call.
 */

export const CALL_GOAL =
  'Understand their problem, show them we can fix it, and leave with one clear next step: a proposal. You are not closing on the call. You are earning the right to send the plan.';

export const BEFORE_CALL = {
  title: 'Sixty seconds before you dial',
  items: [
    'Open the lead in Pipeline and skim how they found us and what they asked for.',
    'Glance at their website or business so you can mention something specific.',
    'Open the Call companion in another tab to capture notes as you go.',
    'Take a breath. You are a helpful expert having a conversation, not a telemarketer reading lines.',
  ],
};

/** The arc of the call, in order. Each step has words to say + why it works. */
export type CallStep = {
  label: string;
  goal: string;
  say: string[];
  note: string;
};

export const CALL_STEPS: CallStep[] = [
  {
    label: 'Open warm, set the frame',
    goal: 'Put them at ease and tell them how the call will go.',
    say: [
      'Hi [name], this is Polly with Modern Mustard Seed. Thanks for booking, good to meet you. Can you hear me okay?',
      'So you do not feel like you are being sold to: this is just a quick conversation. I want to understand what you are dealing with, and if we can help I will put together a plan for you. If we are not the right fit, I will tell you straight. Sound good?',
      'Tell me a little about your business and what is going on.',
    ],
    note: 'Setting the frame ("no pitch, just a conversation, I will tell you straight") lowers their guard and makes everything after it feel honest. Then you go quiet and let them talk.',
  },
  {
    label: 'Discover the real problem',
    goal: 'Find the pain, why it matters now, and what it is costing them.',
    say: [
      'What made you reach out right now, as opposed to a month ago or next year?',
      'Walk me through how that works today. Where does it break down?',
      'What is that costing you, in time, money, or missed customers?',
      'If we waved a wand and fixed this, what would be different for you?',
    ],
    note: 'Let them talk twice as much as you. "Why now" and "what is it costing you" are the two most important questions on the whole call. Write their exact words in the Call companion, you will use them in the proposal.',
  },
  {
    label: 'Match it to what we build',
    goal: 'Quietly map their problem to one of our four lanes.',
    say: [
      'Got it, that is a really common one and it is very fixable.',
      'The way we would approach this is [name the lane in plain words].',
    ],
    note: 'You are listening for which lane this is (see the cheat sheet below). Do not list all four at them. Name the one that fits, in plain words. Never say "agent" or tech jargon. Say what it does.',
  },
  {
    label: 'Reflect it back',
    goal: 'Prove you listened and lock in the problem before you talk solution.',
    say: [
      'So let me make sure I have this right. Today [their situation], which means [the cost], and what you really want is [their desired outcome]. Did I get that?',
      'Anything I missed?',
    ],
    note: 'When you say their problem back better than they said it, they trust you can solve it. Get a clear "yes, that is it" before you move on.',
  },
  {
    label: 'Show the Modern Mustard Seed way',
    goal: 'Give them confidence in how we work, without overselling.',
    say: [
      'Here is how we work. We build it for you, usually idea to launched in weeks, not months. It is a flat price agreed up front, no surprises and no hourly meter. And you own it at the end, the site, the tool, all of it.',
      'We are founder-led, so you are not handed off to a call center. You work with real people who actually build the thing.',
      'For something like yours, we would [one or two sentences on the approach].',
    ],
    note: 'Three things land every time: fast (weeks, not months), flat price (no surprises), you own it. Say those plainly. Keep the "how" short, they care about the outcome, not the tech.',
  },
  {
    label: 'The money talk',
    goal: 'Set expectations without freestyling a number you might regret.',
    say: [
      'In terms of investment, projects like this usually land in the [low] to [high] range depending on scope. I would not want to guess on the call and be wrong.',
      'What I will do is put together a clear proposal with the exact scope and a flat price, so you know the real number before you decide anything. No obligation.',
      'Do you have a budget in mind so I can shape the plan to fit it?',
    ],
    note: 'Never invent a firm price live. Give a soft range if they push, then steer to the proposal. Asking their budget is not rude, it lets you scope to what they can do. If they dodge, that is fine, move on.',
  },
  {
    label: 'Close to the next step',
    goal: 'Leave with a concrete commitment, not "let me think about it."',
    say: [
      'Here is what I would suggest. Let me put together that proposal and get it to you [today / by tomorrow]. It will have the scope, the flat price, and the timeline.',
      'When is a good time for us to talk through it, say [day] or [day]?',
      'Great. I will send it over and we will talk [day]. Anything else you want me to make sure I cover in there?',
    ],
    note: 'Always book the follow-up before you hang up. A proposal with a scheduled review closes far more than a proposal sent into the void. Then log the call and build the proposal the same day while it is warm.',
  },
];

/** Quick lane cheat sheet: what they say -> what we build (plain words). */
export const LANE_CHEATSHEET: { lane: string; theySay: string; youSay: string }[] = [
  {
    lane: 'Website',
    theySay: 'My site is outdated, I built it myself, it brings in nothing.',
    youSay: 'A website that actually brings you business, live in weeks, not months, and you own it.',
  },
  {
    lane: 'AI assistant',
    theySay: 'Same questions all day, buried in DMs, leads go cold, can\'t keep up.',
    youSay: 'A helper that answers your messages and follows up with leads around the clock.',
  },
  {
    lane: 'Voice agent',
    theySay: 'I keep missing calls, no one to answer the phone, voicemail eats my leads.',
    youSay: 'A friendly voice that answers your phone and books appointments, even after hours.',
  },
  {
    lane: 'Custom software',
    theySay: 'My apps don\'t talk, the spreadsheet is a mess, no tool does it all.',
    youSay: 'One clean tool built for exactly how you work, instead of five that almost fit.',
  },
];

/** Objections, with a calm answer and the move that follows. */
export const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: '"How much does it cost?" (early, before scope)',
    a: 'Great question, and the honest answer is it depends on what you need, which is exactly what I want to nail down so I do not give you a wrong number. It is always a flat price agreed up front. Let me ask a couple more things and I will put a real number in the proposal.',
  },
  {
    q: '"That is more than I expected."',
    a: 'Totally fair. Two things: it is a one-time flat price, not a meter that keeps running, and you own it at the end. If the budget is tight, tell me what you can do and I will scope a version one that fits and grows later. I would rather get you started right than oversell you.',
  },
  {
    q: '"I need to think about it."',
    a: 'Of course, this should be a yes you feel good about. So I can be useful while you think: what is the one thing you are weighing? Often I can clear it up right now. Either way I will get you the proposal so you have the real details in front of you.',
  },
  {
    q: '"I need to talk to my partner / spouse / team."',
    a: 'Makes total sense. Let me send the proposal so you have everything in writing to share with them. Want to grab a time for the three of us, or for you to come back to me once you have talked? I will hold a spot.',
  },
  {
    q: '"Can\'t I just do this myself with [Wix / ChatGPT / a template]?"',
    a: 'You could, and for some folks that is the right call. The difference is you get it done right and done fast, without it eating your nights for three months, and it is built to actually bring in business, not just exist. Your time is worth something too. If after the proposal you feel DIY is better, no hard feelings.',
  },
  {
    q: '"How do I know you can deliver?"',
    a: 'Fair to ask. We are founder-led, we work in about 30 day cycles so you see progress fast, and you can see our work and what clients say. The proposal spells out exactly what you get and when. And it is a flat price, so our incentive is to ship, not to drag it out.',
  },
  {
    q: '"Why not a big agency?"',
    a: 'With a big agency you are a ticket number and you pay for their overhead. With us you work directly with the people building it, you get it faster, and you own it outright. Smaller, sharper, and you actually get us on the phone.',
  },
  {
    q: '"Send me some info / I am busy right now."',
    a: 'Absolutely, I will send the proposal so you have it. Honestly it is the fastest way to see if this fits. When is a calmer moment this week to talk it through for ten minutes?',
  },
];

export const AFTER_CALL = {
  title: 'The minute after you hang up',
  items: [
    'Open the Call companion and capture the scope while it is fresh: problem, outcome, must-haves, budget, timeline.',
    'Build the proposal straight from those notes and send it the same day. Warm leads cool fast.',
    'Make sure the follow-up call is on the calendar.',
    'If it is clearly a fit and they are ready, loop Sarah in so she can help close.',
  ],
};

export const DO_LIST = [
  'Let them talk twice as much as you do',
  'Use their exact words back to them',
  'Always ask "why now" and "what is it costing you"',
  'Steer money questions to the written proposal',
  'Book the follow-up before you hang up',
  'Tell them straight if we are not the right fit',
];

export const DONT_LIST = [
  'Freestyle a firm price on the call',
  'Say "agent" or any tech jargon',
  'Pitch all four things at once',
  'Talk over them to fill silence',
  'Promise a timeline or feature you are unsure of',
  'Let them leave with a vague "I\'ll think about it"',
];
