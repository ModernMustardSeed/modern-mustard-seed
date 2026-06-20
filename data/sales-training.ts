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
  body: 'You do not need to be technical and you do not need a sales background. Some leads come to you warm (from your posts and your link). Most you will go find: businesses you cold call or walk into. Both are in here, with scripts. The product is excellent and often sells itself once someone sees it (especially the voice agent). Your job is to get it in front of them. Work through this, practice out loud, and you will be booking demos in your first week.',
};

/** The simple daily how-to. Keep it light and repeatable. */
export const DAILY_GUIDE = {
  title: 'Your simple daily game plan',
  intro: 'You do not need a complicated system. Do a little across the channels every day and the bookings come. Aim for about an hour on a normal day, in any order that fits.',
  blocks: [
    { time: '15 min', title: 'Post and engage', detail: 'Put up one helpful post or story, then leave a few genuine comments in groups and on local business pages. Be a friendly face, not an ad. Your booking link is in your bio.' },
    { time: '15 min', title: 'Find leads', detail: 'Add 10 to 20 new local businesses to your call list using Google Maps, Facebook, and the rest (see Finding Leads). A full list is what makes the next step easy.' },
    { time: '25 min', title: 'Reach out', detail: 'Work your list: a batch of cold calls plus a round of DMs. Help first, then offer a quick demo or a call. Follow up with anyone warm from yesterday.' },
    { time: '10 min', title: 'Get in front of people', detail: 'When you are out, pop into a business or two with the live voice demo. Tidy your follow-ups at the end: who to circle back with.' },
  ],
  bigPush: 'Some days, block 2 to 3 hours for a focused push instead: either a canvassing route (work a whole street or plaza business to business) or a call session (run your list back to back). These blocks are where the big numbers come from.',
  northStar: 'Your one number that matters: booked demos and calls. Everything above exists to create those. It is a numbers game, so talk to a lot of people. Twenty cold calls or ten doors beats one perfect post.',
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
    key: 'cold-calls',
    name: 'Cold calls',
    tagline: 'Call local businesses you found and book a demo.',
    tool: 'Your tools: the cold call script below and your lead list.',
    steps: [
      'Build a list of local businesses to call (see Finding Leads below).',
      'Work the list in batches. Keep each call short and friendly, aim for a booked demo.',
      'Lead with the voice agent: missed calls are lost money, and you can demo it live.',
      'Expect a lot of no\'s, that is normal. A few demos out of twenty calls is a great session.',
    ],
  },
  {
    key: 'posts',
    name: 'Posts (online)',
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
    name: 'Walk-ins',
    tagline: 'In person, opportunistic or a planned route.',
    tool: 'Your tool: the live voice demo at modernmustardseed.com/voice-agents on your phone.',
    steps: [
      'Two ways to do it: pop into a business while you are out, OR block 2 to 3 hours and work a whole street or plaza business to business (canvassing).',
      'For a canvassing session: pick an area, make a loose list, and set a goal (for example, ten doors, two booked demos).',
      'Your move every time is the 30-second voice agent demo, then book a real appointment (see the play below).',
      'Leave every place with a booked demo, their number, or a friendly "come back later." All three are wins.',
    ],
  },
];

/** Where to find businesses to cold call or walk into. */
export const LEAD_SOURCES = {
  title: 'Finding leads: who to call and where to find them',
  intro: 'Warm leads come to you. Cold leads you go find. Here is how to build a steady list of local businesses to call or visit, all free, no fancy tools.',
  where: [
    { name: 'Google Maps', how: 'Search your town plus a type of business ("Kalispell med spa", "Whitefish contractor"). Every result has a name, phone, website, and reviews. This is your main gold mine.' },
    { name: 'Facebook', how: 'Local business pages and community or buy-sell groups. You can see who is active and what they are struggling with.' },
    { name: 'Yelp and directories', how: 'Browse local categories for businesses and phone numbers. Chamber of commerce member lists are public too.' },
    { name: 'Instagram', how: 'Search local hashtags and location tags to find businesses near you, then find their number on their site.' },
    { name: 'Just look around', how: 'Note businesses on a street you want to canvass, then look them up later for the phone number. Drive-by today, call tomorrow.' },
    { name: 'Your own network', how: 'People you know who own businesses, or who know owners. A warm intro converts best of all.' },
  ],
  who: 'Best fits are businesses that live on the phone and on appointments, the ones that quietly lose money to missed calls: restaurants, salons and spas, contractors and trades, dentists and clinics, auto shops, gyms, real estate. Also anyone with an old or no website.',
  list: 'Keep a simple list (a spreadsheet or your notes): business name, phone, one thing you noticed (old site? no online booking?), and the date you reached out. That one habit is what makes you consistent instead of random.',
};

/** The cold call script (distinct from the warm discovery-call script). */
export const COLD_CALL = {
  title: 'The cold call script',
  intro: 'Cold calling sounds scary but it is just a quick, friendly chat. You will get a lot of no\'s and that is completely normal, it is a numbers game. Keep it short, smile (they can hear it), and aim for one thing: a booked demo. Stand up, warm up with a few easy ones, and do them in batches.',
  steps: [
    { label: 'Opener (ask permission)', script: 'Hi, is this [business name]? Hey, my name is [your name]. I\'ll be honest, this is a quick cold call, do you have 20 seconds before I let you go?', note: 'Admitting it is a cold call disarms people. The little permission ask earns you a moment instead of a hang-up.' },
    { label: 'The hook', script: 'Thanks, I appreciate it. I work with a company that builds AI tools for local businesses. The reason I\'m calling is we set up a system that answers your phone and books appointments around the clock, even when you\'re closed or slammed. A lot of [their type of business] lose customers to voicemail without realizing it.', note: 'Lead with the problem (missed calls are lost money) and the voice agent. It is the easiest thing for them to picture.' },
    { label: 'Find the problem', script: 'Quick question: when you\'re busy or after hours, what happens to your calls right now? Do they mostly go to voicemail?', note: 'Then be quiet and let them answer. Their answer is your opening, and most will admit they miss calls.' },
    { label: 'The offer (book the demo)', script: 'That\'s exactly what we fix, and the easiest way to get it is to see it. I\'d love to show you a quick live demo where you can actually talk to it and hear it. Takes about ten minutes. Would tomorrow morning or afternoon be better?', note: 'Offer two times instead of asking "are you interested." Assume the demo. Confidence is kind here.' },
    { label: 'Lock it in', script: 'Perfect. What\'s the best cell or email to send the details to? I\'ll book you for [time] and send a confirmation. Looking forward to it.', note: 'Get the contact, book it, and tell Sarah if it is a strong one so she is ready.' },
    { label: 'If they are hesitant', script: 'No pressure at all, I know I caught you out of the blue. Can I text you a link so you can hear the demo yourself whenever you have a sec? What\'s a good number?', note: 'A texted /voice-agents link keeps it alive even when they will not book on the spot.' },
  ],
  objections: [
    { q: '"We\'re not interested."', a: 'Totally fair, I caught you cold. Quick thing: is it that you\'ve got the phone side handled, or just a bad time? If you have it handled, mind if I text a link in case it is ever useful?' },
    { q: '"Just send me an email."', a: 'Happy to. So I send the right thing, what is the bigger headache, the phone, the website, or something else? And the best email? And honestly, ten minutes seeing it live beats any email, want me to hold a slot just in case?' },
    { q: '"How much does it cost?"', a: 'Good question. It depends on what you need and it is always a flat price, no surprises. The demo is where we figure out the fit and give you a real number. Want me to set one up?' },
    { q: 'Gatekeeper: "She\'s not available."', a: 'No problem. You might actually be the right person, are you who handles the phones and scheduling? If not, when is a good time to catch [owner]? I\'ll call back then.' },
    { q: '"We already have a website / system."', a: 'That\'s great. This is really about your phone getting answered and bookings happening 24/7. Worth a ten-minute look? Most people are surprised what it does.' },
  ],
  voicemail: 'Hi [name], this is [your name] with Modern Mustard Seed. I help local businesses make sure they never miss a call or a booking, even after hours. I\'d love to show you a quick demo, it is pretty cool. Call or text me back at [your number], or I\'ll try you again. Thanks!',
  tips: [
    'Best times to call: mid-morning (10 to 11:30) and mid-afternoon (2 to 4). Avoid the open, lunch, and closing rushes.',
    'Batch them: do 10 to 20 in one sitting. You find a rhythm and the no\'s stop stinging.',
    'Smile and stand up. Your energy carries right through the phone.',
    'Every call is a win if it ends in a booked demo, a "call me later," or a texted link. Track those, not just yes\'s.',
    'It is a numbers game. A handful of demos out of twenty calls is a great day. Do not take a no personally.',
    'Log every business in the Tracker tab as you work it, so we all see activity and never call the same place twice.',
  ],
  houseRule: 'A few rules that keep us clean and legal: we call BUSINESSES (their public business line), not personal cell numbers, and never numbers on the Do Not Call registry. Always say who you are and why you are calling. If someone asks to not be called again, apologize, mark them "Not interested" in the Tracker, and never call them again. We win by being helpful and welcome, not annoying.',
};

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
    isWhat: 'A professional website that actually brings in business, built and live in weeks, not months, and they own it.',
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
