/**
 * Sales training for a Modern Mustard Seed sales and marketing partner who is
 * newer to both selling and tech. Powers the in-admin Sales Training page
 * (components/admin/SalesTraining) and the printable PDF
 * (lib/sales-training-pdf). The internal Mr. Mustard also reads this so it can
 * coach on it.
 *
 * Three ways we sell: calls, posts (online), and walk-ins (in person, often
 * letting the live voice agent demo itself and sell the deal). The goal of every
 * touch is the same: a booked call or demo. We do not quote prices, we do not
 * need to be technical. Plain words, warm, no em dashes. {{BOOK}} is swapped for
 * the partner's personal booking link at render time.
 */

import { BOOK_TOKEN, personalize } from './outreach-playbook';

export { BOOK_TOKEN, personalize };

export const TRAINING_INTRO = {
  eyebrow: 'Sales training',
  title: 'How to sell, even if you have never done it',
  lede: 'Selling here is not slick or pushy. It is finding someone with a problem we fix, showing them it is fixable, and getting them to a call or a demo. That is a skill anyone can learn, and this is where you learn it.',
  body: 'You do not need to be technical and you do not need a sales background. You need to be genuinely curious about people\'s businesses and willing to start conversations. The product is excellent and often sells itself once someone sees it (especially the voice agent). Your job is to get it in front of them. Work through this, practice out loud, and you will be booking calls in your first week.',
};

/** The simple daily how-to. Keep it light and repeatable. */
export const DAILY_GUIDE = {
  title: 'Your simple daily game plan',
  intro: 'You do not need a complicated system. Do a little across all three channels every day and the bookings come. Aim for about an hour, in any order that fits your day.',
  blocks: [
    { time: '15 min', title: 'Post and engage', detail: 'Put up one helpful post or story, then leave a few genuine comments in groups and on local business pages. Be a friendly face, not an ad. Your booking link is in your bio.' },
    { time: '20 min', title: 'Reach out', detail: 'Message 5 to 10 people who fit (use the Outreach Playbook). Help first, then offer a call or a quick demo. Follow up with anyone warm from yesterday.' },
    { time: '20 min', title: 'Talk to people in person', detail: 'On errands or out and about, do one or two friendly walk-ins. Offer the 30-second voice agent demo (see the walk-in play). This is the highest-converting thing you can do.' },
    { time: '5 min', title: 'Tidy your follow-ups', detail: 'Jot down who you talked to and who to circle back with. A booked call on the calendar is the only thing that counts as done.' },
  ],
  northStar: 'Your one number that matters: booked calls and demos. Everything above exists to create those. Five real conversations a day beats one perfect post.',
};

/** Mindset for someone new and nervous. */
export const MINDSET = {
  title: 'First, the mindset',
  points: [
    { h: 'You are helping, not bothering', b: 'Every business you talk to is losing money somewhere: a tired website, missed calls, a messy process. You bring a fix. Offering help is a kindness, not an imposition.' },
    { h: 'The goal is the next step, not the sale', b: 'You are never trying to close on the spot. You are trying to earn a call or a demo. That takes all the pressure off. "Want to see it?" is the whole ask.' },
    { h: 'Listen more than you talk', b: 'The best salespeople ask questions and listen. Let them tell you the problem, then show you understood it. People buy from someone who gets them.' },
    { h: 'No is fine, and normal', b: 'Most people will say not right now. That is not rejection, it is a numbers game. A friendly no today can be a yes in three months. Thank them and move on.' },
    { h: 'You do not need the tech answers', b: 'When you do not know something technical, the honest answer is great: "Good question, that is exactly what the demo with Sarah is for." Never guess or oversell.' },
  ],
};

/** The universal sales arc. Works on a call, in a DM, or in person. */
export const SALES_ARC = {
  title: 'The simple arc behind every sale',
  intro: 'Whether you are on the phone, in a DM, or standing in someone\'s shop, it is the same four moves. Memorize these, not a script.',
  steps: [
    { n: 1, label: 'Connect', say: 'Be warm and human first. A real compliment or a friendly question about their business. People relax when you are a person, not a pitch.' },
    { n: 2, label: 'Find the problem', say: 'Ask about their world. "How do people usually find you?" "What happens to calls when you are slammed?" Listen for the pain. They will tell you what to sell.' },
    { n: 3, label: 'Show the fix', say: 'In one or two plain sentences, connect their problem to what we do. Better yet, show them (the live voice demo does this instantly). Do not list features, paint the result.' },
    { n: 4, label: 'Ask for the next step', say: 'Always end with a clear, easy ask: "Want me to set up a quick call to see if it fits?" or "Can I grab your number and book you a proper demo?" Then be quiet and let them answer.' },
  ],
};

/** The three channels. */
export type Channel = {
  key: string;
  name: string;
  tagline: string;
  tool: string;
  steps: string[];
};

export const CHANNELS: Channel[] = [
  {
    key: 'calls',
    name: 'Selling on calls',
    tagline: 'Booked discovery calls and demos, by phone or video.',
    tool: 'Your tool: the Script tab. Open it before and during every call.',
    steps: [
      'Most calls come from people you booked through a post, a DM, or a walk-in.',
      'Follow the call script: open warm, find the problem, reflect it back, show the Modern Mustard Seed way, then book the next step.',
      'You do not quote prices. For a build, you book Sarah to scope and quote. For a quick win, you can demo the voice agent live right on the call.',
      'Always confirm the next step on the calendar before you hang up.',
    ],
  },
  {
    key: 'posts',
    name: 'Selling with posts',
    tagline: 'Show up online so the right people come to you.',
    tool: 'Your tool: the Outreach Playbook (in your partner dashboard).',
    steps: [
      'Post helpful things, not ads: a tip, a before-and-after, a quick result. Useful beats promotional every time.',
      'Be active in local and small-business Facebook groups. Answer questions, be the helpful one. When it fits, offer a call or a demo.',
      'Keep your booking link in every bio so anyone interested can act in one tap.',
      'When someone reacts or replies, move it to a friendly DM. Talk first, send the link second.',
    ],
  },
  {
    key: 'walkins',
    name: 'Selling with walk-ins',
    tagline: 'In person, often letting the voice agent sell itself.',
    tool: 'Your tool: the live voice demo at modernmustardseed.com/voice-agents on your phone.',
    steps: [
      'Pick a street or plaza of local businesses (restaurants, salons, contractors, clinics, shops). Go in friendly and low-pressure.',
      'Your goal is not to sell on the spot. It is to do the 30-second voice agent demo and book a real appointment.',
      'The voice agent demo is your secret weapon: it shows, it does not tell, and it sells the deal for you (see the play below).',
      'Leave every place with either a booked demo, their number, or a friendly "come back later." All three are wins.',
    ],
  },
];

/** The signature walk-in play: let the voice agent demo itself. */
export const VOICE_DEMO_PLAY = {
  title: 'The walk-in voice agent play',
  intro: 'This is the highest-converting thing you can do, and the easiest, because the product does the selling. You walk in, get them talking to the live voice agent, and it shows them exactly what it can do for their business. Have modernmustardseed.com/voice-agents open on your phone before you walk in.',
  steps: [
    { label: 'Walk in friendly', script: 'Hi, I know you\'re busy, I\'ll be quick. I work with a local company that builds AI tools for businesses like yours. Can I show you something kind of cool? Takes about 30 seconds.' },
    { label: 'Set it up', script: 'This is an AI that can answer your phone 24/7, in a natural voice, and book appointments for you, even when you\'re slammed or closed. Here, talk to it like you\'re a customer calling in. Ask it anything, or ask it to book you an appointment.' },
    { label: 'Hand them your phone', script: '(Tap the talk button on /voice-agents and hand it over. Let them have a real back-and-forth. Stay quiet and let them be amazed. This is the moment that sells it.)' },
    { label: 'Bridge to their business', script: 'Imagine that answering YOUR phone, in your business\'s name, booking jobs while you\'re with a customer. You stop losing people to voicemail. And that\'s just one thing we build. We also do websites, online tools, and custom software.' },
    { label: 'Book the next step', script: 'I\'d love to set you up a proper demo where we show what it would look like for your shop specifically. Are mornings or afternoons better? (Or: can I grab your number and text you a time?)' },
    { label: 'If they are busy', script: 'No worries at all, I can tell you\'re slammed. Here\'s the quickest way to see it for yourself. (Hand them a card or text the link to /voice-agents.) Can I check back next week?' },
  ],
  tips: [
    'Practice the demo on yourself five times first so you are smooth and the button is second nature.',
    'Best times: mid-morning or mid-afternoon, never the lunch or dinner rush.',
    'Dress the part, smile, and keep it short. Curiosity opens the door, the demo does the rest.',
    'Always capture something: a booked demo, a phone number, or permission to come back.',
  ],
};

/** Plain-words talk tracks for each thing we sell. */
export const WHAT_WE_SELL: { name: string; isWhat: string; doesWhat: string; bringUp: string }[] = [
  {
    name: 'Websites',
    isWhat: 'A professional website that actually brings in business, built and live in about 30 days, and they own it.',
    doesWhat: 'Turns visitors into customers with a clear message, proof, and an easy way to contact or buy. Shows up on Google.',
    bringUp: 'When they say their site is old, embarrassing, DIY, or "brings in nothing," or they have no site at all.',
  },
  {
    name: 'AI assistant (chat)',
    isWhat: 'A helper on their website and messages that answers customers and follows up with leads around the clock.',
    doesWhat: 'Answers the same questions for them all day, captures leads at 2am, and stops people from slipping away.',
    bringUp: 'When they say they are buried in DMs, answering the same questions constantly, or leads go cold.',
  },
  {
    name: 'Voice agent',
    isWhat: 'A friendly AI voice that answers their phone 24/7 and books appointments, even after hours.',
    doesWhat: 'Never misses a call, books jobs while they work, and saves the customers they lose to voicemail.',
    bringUp: 'When they miss calls, have no one to answer the phone, or lose business after hours. This is the one to demo live.',
  },
  {
    name: 'Custom software / tools',
    isWhat: 'One clean tool built for exactly how their business runs, instead of five apps and a messy spreadsheet.',
    doesWhat: 'Replaces the duct-taped systems with something that fits, saving hours and mistakes.',
    bringUp: 'When they complain their tools do not talk, their spreadsheet is chaos, or no app does what they need.',
  },
];

/** Beginner-friendly objection handling. */
export const OBJECTIONS: { q: string; a: string }[] = [
  { q: '"How much does it cost?"', a: 'Great question, and it honestly depends on what you need. It is always a flat price agreed up front, no surprises. The demo is where we figure out the right fit and give you a real number. Want me to set one up?' },
  { q: '"I already have a website / guy for that."', a: 'That is great. A lot of the people we help did too, they just were not getting much from it. No pressure at all, want to see the voice agent for 30 seconds anyway? Most people are surprised.' },
  { q: '"I do not have time right now."', a: 'Totally get it, that is usually the whole reason this helps. It runs on its own once it is set up. Can I grab your number and text you a time that actually works for you?' },
  { q: '"I am not very techy."', a: 'You do not have to be. That is the whole point, we build it and run it, you just get the results. The demo is literally just talking to it like a normal phone call.' },
  { q: '"Send me some info."', a: 'Happy to. The fastest way to get it though is to see it live, it takes 30 seconds. (Show the demo, or text the /voice-agents link.) Can I follow up next week?' },
  { q: '"Is this one of those AI things that sounds like a robot?"', a: 'Fair worry. Here, listen for yourself. (Hand them the live demo.) It sounds like a real person, and it is trained on your business so it answers like your best employee would.' },
];

/** Activity goals so effort, not luck, drives results. */
export const ACTIVITY = {
  title: 'Your numbers, kept simple',
  intro: 'You cannot control who says yes. You can control how many people you talk to. Sales is a numbers game, so focus on activity and the bookings follow.',
  targets: [
    'About 5 to 10 real conversations a day (DMs, comments, or in person).',
    '1 to 2 walk-ins a day when you are out, with the voice demo.',
    'A handful of posts a week that help, not just promote.',
    'The scoreboard that matters: booked calls and demos. Aim for a few a week and grow from there.',
  ],
  note: 'You earn commission on the business you bring in, all tracked through your booking link. More conversations, more demos, more booked calls, more income. It is that direct.',
};

export const PRACTICE = {
  title: 'How to get good, fast',
  points: [
    'Practice out loud. Say the walk-in opener and the voice demo bridge until they feel natural, not memorized.',
    'Roleplay with Mr. Mustard. Use the "Ask Mr. Mustard" button and say "roleplay a cold walk-in with me, you be a busy restaurant owner." He will play the customer and coach you.',
    'Do the voice demo on yourself five times so the phone part is smooth.',
    'After each real conversation, note one thing that worked and one to tweak. You will improve every single day.',
    'When you are unsure what to say, the Script tab (calls) and the Outreach Playbook (online) have the words. This page is the why behind them.',
  ],
};
