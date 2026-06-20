/**
 * The Outreach Handbook — single source of truth for the partner field guide.
 *
 * Powers both the gated web page (`/partners/playbook`) and the generated PDF
 * (`lib/outreach-playbook-pdf.ts`). The whole job: find people who need a build,
 * start a real conversation, and get a call booked on Sarah's calendar. Partners
 * earn 50% of every build they send. Their personal money link is
 * `modernmustardseed.com/book?ref=CODE`, written as `{{BOOK}}` below and swapped
 * in per partner at render time.
 *
 * House voice: sharp, founder-to-founder, no jargon, no em dashes. Never say
 * "agent" or "AI agent" out loud to a prospect. Say what it does.
 */

export const BOOK_TOKEN = '{{BOOK}}';

/** Swap the {{BOOK}} placeholder for this partner's tracked booking link. */
export function personalize(text: string, bookUrl: string): string {
  return text.split(BOOK_TOKEN).join(bookUrl);
}

export const PLAYBOOK_INTRO = {
  eyebrow: 'Start here',
  title: 'Your job, in one line',
  lede: 'Find people who need what we build, start a real conversation, and get a call on the calendar for Sarah. That is the whole job.',
  body: 'You are not selling and you are not building. You open the door, Sarah closes the deal. Every conversation you start has one destination: a booked call on Sarah\'s calendar. You earn 50 percent of every build that call turns into. Open enough doors and this pays better than almost anything else you can do part time.',
  moneyLine: 'Your money link is your booking link. Send people to it everywhere.',
};

/** The four build lanes. Builds lead now, products are the side door. */
export type Lane = {
  key: string;
  name: string;
  blurb: string;
  soundLike: string[];
};

export const LANES: Lane[] = [
  {
    key: 'websites',
    name: 'Websites',
    blurb: 'Sites that bring in business, not just sit there looking fine. Idea to launched in weeks, not months, and they own it.',
    soundLike: ['"My site is outdated."', '"Built it myself, hate it."', '"It brings in nothing."', '"I need a real website."'],
  },
  {
    key: 'assistants',
    name: 'AI Assistants',
    blurb: 'A helper that answers messages, books appointments, and follows up with leads around the clock, so nothing slips.',
    soundLike: ['"Same questions all day."', '"Buried in DMs."', '"Leads go cold on me."', '"Can\'t keep up."'],
  },
  {
    key: 'voice',
    name: 'Voice Agents',
    blurb: 'A friendly voice that answers the phone, qualifies callers, and books them straight onto the calendar, even after hours.',
    soundLike: ['"Phone rings off the hook."', '"Missing calls means missing money."', '"No one to answer."', '"Voicemail eats my leads."'],
  },
  {
    key: 'software',
    name: 'CRMs & Custom Software',
    blurb: 'One clean tool built for exactly how they work, instead of five apps that almost fit and a spreadsheet holding it together.',
    soundLike: ['"Apps don\'t talk."', '"Spreadsheet is a mess."', '"No tool does it all."', '"I need a real system."'],
  },
];

export const JARGON_RULE =
  'Never say "agent" or any tech jargon out loud. Say what it does. "A helper that answers your messages" lands. "An AI agent" does not.';

/** Five rules that keep a partner\'s social account alive. */
export const SAFETY_RULES: { n: number; title: string; detail: string }[] = [
  { n: 1, title: 'Never paste the same words twice', detail: 'Identical text across posts and groups is the exact thing platforms flag. Reword every single time. Change a few words.' },
  { n: 2, title: 'Help first, mention us second', detail: 'Answer the person\'s actual question like a real human. The offer comes after, and only if it fits.' },
  { n: 3, title: 'Read the group rules before posting', detail: 'Some groups ban promo. In those you only answer questions, you never post an offer. Breaking rules gets you removed.' },
  { n: 4, title: 'Link goes in the first comment, never the post', detail: 'Posts with outside links get buried. Put the message in the post, drop the link in your own first comment a few seconds later.' },
  { n: 5, title: 'One post per group per day, max', detail: 'And no copy-paste DMs to strangers. Talk first, link second.' },
];

export const SEARCH_HOWTO =
  'Type a phrase into the search bar at the top. Hit enter. On the left, click Posts, then set it to Recent Posts. You can filter to a specific group, or use a group\'s own search box. Check your saved phrases once a day.';

export const SEARCH_PHRASES: { lane: string; phrases: string[] }[] = [
  {
    lane: 'For websites',
    phrases: ['need a website', 'website recommendations', 'who builds websites', 'web designer', 'new website', 'my website is outdated', 'update my website', 'hate my website', 'Wix', 'Squarespace', 'GoDaddy website', 'no one finds my site'],
  },
  {
    lane: 'For AI assistants',
    phrases: ['answering the same questions', 'too many DMs', 'can\'t keep up', 'missing leads', 'follow up with leads', 'need to automate', 'auto reply', 'booking system', 'online scheduling', 'drowning in admin', 'customer service help'],
  },
  {
    lane: 'For voice agents',
    phrases: ['missing phone calls', 'no one to answer the phone', 'after hours calls', 'need a receptionist', 'phone keeps ringing', 'answering service', 'too many calls', 'voicemail full'],
  },
  {
    lane: 'For CRMs & software',
    phrases: ['is there an app for', 'looking for software that', 'no tool does what I need', 'spreadsheet is a mess', 'need a system for', 'custom CRM', 'manage my clients', 'manage inventory', 'build me a tool', 'software for my business', 'tired of using'],
  },
];

export const GROUP_TYPES = [
  'Local business owner groups: "[your area] small business," "[city] entrepreneurs"',
  'Realtors and real estate professionals',
  'Contractors, trades, and home service businesses',
  'E-commerce and Shopify sellers',
  'Coaches, consultants, and course creators',
  'Med spas, salons, clinics, and appointment-based businesses',
  'Nonprofit and ministry leaders',
  'Christian and faith-driven business owners',
  '"I have an idea," startup, and solopreneur groups',
];

export const GROUP_FIND =
  'Search a phrase like "small business owners" or "Montana entrepreneurs" in the top bar, then click Groups on the left. Join the active ones. Be a real, active member of 8 to 12 good groups. Better to be known in 10 than silent in 50.';

export const GROUP_SPOT = ['New posts every day', 'Members actually commenting', 'Rules allow promo days or helpful answers', 'Skip dead groups and ones that delete every comment'];

export const THREE_PLACES: { tag: string; title: string; detail: string }[] = [
  { tag: 'A', title: 'Comments on problem posts', detail: 'Your best move and the safest. Someone posts a problem, you reply helpfully and bridge to a call. Lowest ban risk, highest trust.' },
  { tag: 'B', title: 'Your own promo post', detail: 'Only in groups that allow it, on promo days or "what do you do" threads. Message in the post, link in the first comment. One to two per week total.' },
  { tag: 'C', title: 'Direct messages', detail: 'Only after someone comments on or reacts to a post. Talk first. Send the link only once they reply. Never cold-DM a link.' },
];

/** Helpful comments. No link, no mention of us. Build the name. 3:1 ratio. */
export const HELPFUL_COMMENTS: { lane: string; cards: { context: string; text: string }[] }[] = [
  {
    lane: 'Website lane',
    cards: [
      { context: 'Someone asks for a web recommendation', text: 'Whatever you go with, make sure you own the site and the domain at the end. A lot of people get locked into a builder they can never leave. That one thing saves a ton of headache later.' },
      { context: 'Frustrated with their site', text: 'The fastest win is usually the homepage. If a visitor can\'t tell what you do and how to reach you in five seconds, nothing else matters yet. I\'d fix that before a full rebuild.' },
      { context: 'Frustrated with a DIY builder', text: 'Those builders are fine to start. The trick is the very top of the page: one clear line on what you do, one button to book or buy. Most DIY sites bury that and wonder why nobody acts.' },
    ],
  },
  {
    lane: 'AI assistant & voice lane',
    cards: [
      { context: 'Buried in messages', text: 'One thing that helps fast: set up saved replies for your three most-asked questions so you\'re not retyping the same answer all day. Buys you breathing room while you sort out a bigger fix.' },
      { context: 'Leads going cold', text: 'Speed beats everything with leads. Even a quick "got your message, here\'s a time to chat" in the first few minutes wins more than a perfect reply an hour later. Most leads are lost to slow, not price.' },
      { context: 'Missing phone calls', text: 'A missed call is a missed sale in most businesses. Even a simple text-back when you can\'t pick up keeps the lead warm until you can call them. People just want to know they were heard.' },
    ],
  },
  {
    lane: 'Software & CRM lane',
    cards: [
      { context: 'Looking for the right tool', text: 'Map your actual steps on paper first. Once you can see the real workflow, it\'s easier to tell whether you need a new tool or just need two of your current ones connected. Saves buying five things that half-work.' },
      { context: 'Spreadsheet is a mess', text: 'When a spreadsheet gets out of hand, the fix usually isn\'t a fancier spreadsheet. It\'s one source of truth everything feeds into. Even just deciding which sheet is "the real one" helps before you build anything.' },
    ],
  },
  {
    lane: 'Be a good member (any post, builds your name)',
    cards: [
      { context: 'Someone shares a win', text: 'Love this. Congrats on shipping it. The hardest part is putting it out there at all.' },
      { context: 'Someone\'s nervous or stuck', text: 'Great question, and you\'re in the right place asking it. The fact that you\'re already thinking about this puts you ahead of most.' },
    ],
  },
];

export const COMMENT_RHYTHM =
  'Aim for three helpful comments for every one that offers a call. No links on the helpful ones, ever. When a helpful comment earns a like or a reply, that is your moment to move to a friendly DM.';

/** Comments that offer a call. Answer the question first, then add one. */
export const CALL_OFFER_COMMENTS: { lane: string; cards: string[] }[] = [
  {
    lane: 'Website lane',
    cards: [
      'A site that just sits there doing nothing is the worst. The team I work with at Modern Mustard Seed builds sites that actually bring people in, usually live in weeks, not months, and you own it. I can grab you a quick call to see if it\'s a fit. Link below.',
      'This is fixable. We build websites that bring in business instead of just looking nice. Happy to set you up with a short call so you can see what it would take. I\'ll drop the link.',
    ],
  },
  {
    lane: 'AI assistant & voice lane',
    cards: [
      'If you\'re answering the same questions all day, that\'s exactly the kind of thing we take off your plate. We build a helper that replies to customers and follows up with leads for you, around the clock. Want me to set up a quick call? Link below.',
      'Missing calls is missing money. We can set up a helper that answers the phone, books people in, and never sleeps. I can grab you a time to see if it fits. Link below.',
    ],
  },
  {
    lane: 'Software & CRM lane',
    cards: [
      'Five apps that don\'t talk to each other is a real headache. We build one tool that does exactly what your business does, so you stop working around software that almost fits. Happy to set up a call. Link below.',
      'If your whole process lives in spreadsheets and sticky notes, we can build you one clean system for it. I can set up a quick call to see if it\'s a fit. Link below.',
    ],
  },
];

export const FIRST_COMMENT = `Here\'s where you can book a quick call and see examples: ${BOOK_TOKEN}. Pick any time that works, no pressure at all.`;

/** Posts and DM scripts. */
export const PROMO_POST = `Four things we build for small businesses: websites that bring you business, a helper that answers your messages and follows up with leads, a voice that answers your phone and books appointments, and custom tools built for exactly how you work. Idea to launched in weeks, not months, flat price, you own it. If one of these is a headache for you right now, comment or DM me and I\'ll grab you a quick call. Link in the comments.`;

export const DM_SCRIPTS: { context: string; text: string }[] = [
  { context: 'DM opener (after they comment or react)', text: 'Hey [name], saw your post about [their problem]. That\'s right in what we do at Modern Mustard Seed. Mind if I grab you a quick 15-minute call with our founder to see if it\'s a fit? No pressure at all.' },
  { context: 'DM bridge to booking (after they reply)', text: `Perfect. Easiest way is to grab a time here: ${BOOK_TOKEN}. Pick whatever works and you\'ll be on the calendar. It\'s about 15 minutes and you\'ll know right away if it\'s a fit.` },
  { context: 'If they\'re hesitant', text: `No rush at all. Here\'s the link so you can see the kind of work first: ${BOOK_TOKEN}. Whenever you\'re ready, grab any time that works.` },
];

export const COMMON_QUESTIONS: { q: string; a: string }[] = [
  { q: '"How much does it cost?"', a: 'Depends on the project, which is exactly what the call is for. It\'s a flat price agreed up front, no surprises, and you\'ll know the number before you commit to anything. Want me to grab you a time?' },
  { q: '"Who are you? Is this spam?"', a: 'Fair question. I help Modern Mustard Seed connect with people who need websites, helpers for their messages, a voice for their phone, or custom tools. Saw your post and thought it was a fit. No pressure, just figured it might help.' },
  { q: '"Do you do [specific thing]?"', a: 'Good question, and the best person to answer it is on the call. If it\'s not a fit, she\'ll tell you straight. Want me to set one up?' },
];

/**
 * NEW — the phone script. For when a conversation moves to a real call, or you
 * catch a warm lead on the phone. The only goal is a booked appointment with
 * Sarah. You qualify, you build trust, you book. You do not quote or close.
 */
export const PHONE_SCRIPT = {
  intro: 'Sometimes a DM turns into "just call me," or you catch a warm lead on the phone. Stay relaxed. You are not selling, you are setting up a quick call with our founder. Smile, slow down, and follow the rail. The whole call is two to four minutes.',
  steps: [
    {
      label: 'Open',
      script: 'Hey [name], it\'s [your name] with Modern Mustard Seed. You\'d mentioned [their problem]. Is now still a good two minutes? Great, I won\'t keep you long.',
      note: 'Use their words back to them. Confirm it is a good time before you launch in.',
    },
    {
      label: 'Find the lane',
      script: 'So I can point you the right way, tell me what\'s been the bigger headache lately: the website itself, keeping up with messages and leads, missing phone calls, or the tools and spreadsheets you run on?',
      note: 'Let them talk. Whatever they say is the lane. Do not pitch all four.',
    },
    {
      label: 'Reflect and validate',
      script: 'Yeah, that one comes up a lot, and it\'s very fixable. That\'s actually the exact kind of thing the team builds, [websites that bring people in / a helper that handles your messages / a voice that answers your phone / one clean tool for your whole process].',
      note: 'Name it in plain words. Never say "agent" or any tech term.',
    },
    {
      label: 'The ask (book the call)',
      script: 'Best next step is a quick 15-minute call with Sarah, our founder. She\'ll look at your situation and tell you straight whether it\'s a fit and what it would take. No charge and no pressure. Want me to get you on her calendar?',
      note: 'This is the only thing you are trying to win. Ask plainly, then be quiet and let them answer.',
    },
    {
      label: 'Book it on the spot',
      script: 'Perfect. Are mornings or afternoons easier for you? Great, I\'m sending you the link right now, it\'s modernmustardseed.com slash book. Go ahead and pick the time that works and you\'ll be locked in. You\'ll get a confirmation by email.',
      note: `Text or email them ${BOOK_TOKEN} while you are still on the phone. Booked-while-warm beats "I\'ll do it later" every time.`,
    },
    {
      label: 'Confirm and close',
      script: 'You\'re all set. Sarah will be ready for you at [time]. She\'s genuinely great and you\'ll know right away if it makes sense. Thanks [name], talk soon.',
      note: 'If they booked, you are done. Your job ends at the booked call.',
    },
  ],
  objections: [
    { q: '"How much is it?"', a: 'Totally depends on what you need, which is exactly what the call sorts out. It\'s a flat price agreed up front, no surprises. Sarah will give you a real number before you commit to anything.' },
    { q: '"I need to think about it."', a: 'Of course, no rush. The call is just a look, free and no pressure. Want me to hold a spot so it\'s there if you want it? You can always move it.' },
    { q: '"Send me some info first."', a: 'Happy to. I\'ll text you the link with examples right now. Honestly though, 15 minutes with Sarah will tell you more than any brochure. Want me to grab you a time too, just in case?' },
    { q: '"I\'m too busy right now."', a: 'Totally get it, that\'s usually the whole reason this helps. The call is quick and on your schedule. Even a slot next week keeps it moving without taking your time now.' },
  ],
  voicemail:
    'Hi [name], it\'s [your name] with Modern Mustard Seed. You\'d mentioned [their problem], and that\'s right in what we do. I\'d love to grab you a quick 15-minute call with our founder, no charge and no pressure. I\'ll text you a link to pick a time, or call me back at [your number]. Talk soon.',
};

/**
 * NEW — the social strategy. Bigger than Facebook groups: how a partner shows up
 * everywhere so warm people come to them, and every road ends at the booking link.
 */
export const SOCIAL_STRATEGY = {
  intro: 'Groups are where you hunt. Your own profile is where trust compounds. Spend most of your time being genuinely helpful in groups, and let a light, steady presence on your own feed make you someone people want to refer to. Every path ends at the same place: your booking link.',
  oneRule: 'One rule above all: every profile, post, and bio points to your booking link. If someone wants to act, the next step is always one tap away.',
  setup: [
    'Set your profile bio to one clear line: what you help with and a link to book. Example: "I help small businesses get websites, AI helpers, and custom tools that actually work. Book a quick call below."',
    'Put your booking link in every bio that allows one: Facebook intro, Instagram link, LinkedIn featured, X bio.',
    'Use a real, friendly photo. People book calls with people, not logos.',
    'Pin one post that explains what you do and how to book.',
  ],
  channels: [
    { name: 'Facebook groups', role: 'Your main hunting ground. Helpful comments daily, one to two promo posts a week where allowed. This is where most booked calls come from.' },
    { name: 'Your personal Facebook', role: 'Post a win, a before-and-after, or a quick tip once or twice a week. Friends and local connections are warm leads who already trust you.' },
    { name: 'Instagram', role: 'Show, don\'t tell. Before-and-after site shots, short screen recordings, a quick "look what this does" reel. Link in bio goes to booking.' },
    { name: 'LinkedIn', role: 'Best for B2B and local pros. Share a short story or result once a week, comment on local business owners\' posts, and connect with intent.' },
    { name: 'Local and niche', role: 'Nextdoor, Alignable, chamber groups, and any niche forum where your buyers gather. Same playbook: help first, book second.' },
  ],
  pillars: [
    { name: 'Problem and fix', detail: 'Name a problem your audience has and the simple first step to fix it. Builds you as the helpful expert.' },
    { name: 'Proof', detail: 'Before-and-after shots, a quick result, a happy client line. Proof does the selling so you don\'t have to.' },
    { name: 'Behind the scenes', detail: 'A peek at a build in progress or a tool in action. People love seeing how it works.' },
    { name: 'Soft invite', detail: 'Once a week, a plain invite: "If your site, phone, or system is a headache, I can grab you a quick call. Link below." Low key, no hype.' },
  ],
  cadence: [
    'Daily: 6 to 8 helpful comments in groups, plus reply to anyone who engaged.',
    'Weekly: 3 to 4 posts across your own profiles, 1 to 2 group promo posts where allowed.',
    'Always: every post and bio has a clear path to your booking link.',
  ],
  dmFunnel: [
    'Someone reacts or comments. That is your green light to DM.',
    'Open warm, reference their post, ask one question. Talk first, link second.',
    'When they reply and there\'s a fit, bridge to the booking link.',
    'If they go quiet, one friendly follow-up a few days later, then let it rest.',
  ],
};

export const ROUTINE: { time: string; title: string; detail: string }[] = [
  { time: '10 min', title: 'Hunt', detail: 'Run your saved searches and scan 4 to 5 groups for new problem posts.' },
  { time: '20 min', title: 'Help', detail: 'Leave 6 to 8 genuinely helpful comments. Bridge to a call only where it fits.' },
  { time: '10 min', title: 'Reach out', detail: 'Send 4 to 5 DMs to people who commented or reacted to a post.' },
  { time: '5 min', title: 'Follow up', detail: 'Check replies on the comments you left earlier so warm threads don\'t go cold.' },
];

export const ROUTINE_NOTE = 'Weekly: one to two promo posts total, only in groups that allow it. A few posts on your own profile to keep your presence warm.';

export const JOB_ENDS = {
  title: 'Your job ends at the booked call',
  body: 'You don\'t track anyone or log anything. Once someone books on the calendar, Sarah takes it from there and you earn 50 percent of any build it becomes. The only time to reach out: if someone seems really ready, shoot Sarah a quick message with their name and what they need, so she walks into the call already knowing them.',
};

export const DO_LIST = [
  'Read each group\'s rules before posting',
  'Help first, mention us second',
  'Reword your message every single time',
  'Reply within a few hours while it\'s warm',
  'Send people to your booking link and let them book',
  'Always tell people you earn a commission. It keeps this trustworthy.',
];

export const DONT_LIST = [
  'Paste the same text twice',
  'Put links in the post body',
  'Say "agent" or any tech jargon',
  'Cold-DM a link with no conversation',
  'Quote a price or try to close. That is Sarah\'s call.',
  'Argue with anyone. Just thank them and move on.',
];
