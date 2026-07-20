/**
 * THE RIGHT HAND PROGRAM. The Modern Mustard Seed new-hire academy.
 *
 * This is not a document to skim. It is a real program: six phases, each one
 * earns a rank, that take someone from day one to the operational right hand of
 * the business. They learn the mission, the whole offer ladder, how to sell,
 * how to call, how the machine runs, and the first steps toward building.
 *
 * Powers the in-admin program (components/admin/OnboardingHub) and the printable
 * PDF handbook (lib/onboarding-pdf). Written for someone new to sales but never
 * made to feel new. Plain words, high octane, warm. No em dashes (Sarah's rule).
 * Keep it accurate to the real admin and the real offers (prices verified against
 * data/sidekick, pictures, press, geo, programs, products, pricing, proposal-menu).
 */

export type GuideLink = { label: string; url: string; external?: boolean };
export type GuideBlock = {
  heading?: string;
  body?: string;
  bullets?: string[];
  callout?: string;
  links?: GuideLink[];
};
/** A concrete do-this-now action that closes a module. Makes it a program, not a read. */
export type Mission = { do: string; why?: string };
export type GuideModule = {
  id: string;
  emoji: string;
  eyebrow: string;
  title: string;
  summary: string;
  minutes: number;
  blocks: GuideBlock[];
  mission?: Mission;
};
export type Phase = {
  id: string;
  num: number;
  codename: string;
  emoji: string;
  name: string;
  tagline: string;
  goal: string;
  /** The rank you earn by finishing this phase. */
  rank: string;
  modules: GuideModule[];
};

// ─── The program frame ────────────────────────────────────────────

export const PROGRAM = {
  name: 'The Right Hand Program',
  eyebrow: 'Modern Mustard Seed Academy',
  promiseTitle: 'From day one to right hand of the business',
  promise:
    'This is your training to become the operational right hand of Modern Mustard Seed. Not a folder of PDFs. A real program you play through, level by level. You will learn the mission, every single thing we sell, how to sell it, how to pick up the phone and book real business, how the whole machine runs, and how to start building yourself. Work a level a day and you are dangerous inside two weeks.',
  personalLead:
    'You are not the new person. You are the person Sarah is building the next chapter of this company around. Everyone starts somewhere in sales. Nobody who works this program stays a beginner for long. Read like it is already yours, because it is.',
};

/** The rank ladder. Rank[0] is the starting rank; each phase earns the next. */
export type Rank = { level: number; name: string; chip: string; blurb: string };
export const RANKS: Rank[] = [
  { level: 0, name: 'Rookie', chip: '[ LEVEL 00 ]', blurb: 'Badge on, keys in hand. The climb starts here.' },
  { level: 1, name: 'Insider', chip: '[ LEVEL 01 ]', blurb: 'You know why we exist and what we stand for. You belong in the room.' },
  { level: 2, name: 'Specialist', chip: '[ LEVEL 02 ]', blurb: 'You know everything we sell, cold. You can talk offers with anyone.' },
  { level: 3, name: 'Closer', chip: '[ LEVEL 03 ]', blurb: 'You understand the sale. You know how a stranger becomes a client.' },
  { level: 4, name: 'Rainmaker', chip: '[ LEVEL 04 ]', blurb: 'You can pick up the phone, walk in a door, and book real business.' },
  { level: 5, name: 'Operator', chip: '[ LEVEL 05 ]', blurb: 'You can read and run the whole machine, end to end.' },
  { level: 6, name: 'Right Hand', chip: '[ LEVEL 06 ]', blurb: 'Certified. You know the business as well as anyone, and building is next.' },
];

// ─── Personalization: who is signed in ───────────────────────────
// Keyed by admin login email (lowercased). Falls back to a generic partner.

export type Rep = {
  firstName: string;
  code: string;
  bookPath: string;
  territory: string;
  cities: string;
  domainEmail?: string;
  /** A one-line note that greets this specific person. */
  note: string;
};

export const REPS: Record<string, Rep> = {
  'thompsonpolly71@gmail.com': {
    firstName: 'Polly',
    code: 'POLLYTHOCN3X',
    bookPath: '/book?ref=POLLYTHOCN3X',
    territory: 'Montana',
    cities: 'Kalispell, Whitefish, Columbia Falls, Bozeman, Billings, Missoula, Helena, and Great Falls',
    domainEmail: 'polly.thompson@modernmustardseed.com',
    note: 'Polly, this whole program was built for you. Your territory is already loaded, your link already works, and your name is already in our signature. Let us go.',
  },
  'wildhopehouse@gmail.com': {
    firstName: 'Chloe',
    code: 'CHLOESANROPW',
    bookPath: '/book?ref=CHLOESANROPW',
    territory: 'Tulsa and Tampa',
    cities: 'Tulsa, Oklahoma and Tampa, Florida',
    note: 'Chloe, your markets are loaded and your link is live. Work the program, then work the phones.',
  },
};

export function getRep(email?: string): Rep | null {
  if (!email) return null;
  return REPS[email.toLowerCase().trim()] ?? null;
}

// ─── The offer ladder (Phase 2 visual + reference) ───────────────
// Verified against the live data files. This is the shape of the whole business:
// free hook at the bottom, recurring at the top, with a "we build it for you OR
// we teach you to build it" fork running the whole way up.

export type LadderRung = {
  rung: number;
  band: string;
  price: string;
  title: string;
  detail: string;
  examples: string[];
};

export const OFFER_LADDER: LadderRung[] = [
  {
    rung: 1,
    band: 'The hook',
    price: 'Free',
    title: 'Free tools and demos',
    detail: 'Every stranger meets us here. These are your weapons in the field. They cost nothing and they show value before we ask for a dime.',
    examples: ['Sidekick receptionist demo', 'Pictures Screen Test', 'Press proof', 'Website / AI audit'],
  },
  {
    rung: 2,
    band: 'First yes',
    price: '$47 to $97',
    title: 'Digital goods, instant',
    detail: 'A small, easy first purchase that builds trust and marks someone as a real buyer. One-time, delivered on the spot.',
    examples: ['Store playbooks ($47 to $67)', 'Press "The Piece" ($97, instant)'],
  },
  {
    rung: 3,
    band: 'The wow',
    price: '$197 to $997',
    title: 'Productized offers',
    detail: 'A finished, impressive thing at a set price. This is where the monthly plans start too, which is how the business earns while it sleeps.',
    examples: ['Pictures commercial ($197 / $497)', 'Sidekick ($397 setup + $297/mo)', 'GEO Fix Pack ($297)'],
  },
  {
    rung: 4,
    band: 'Learn to build',
    price: '$497',
    title: 'Flagship programs',
    detail: 'The "teach you to build it yourself" branch. Self-serve education plus a live tool. People who want to do it themselves live here.',
    examples: ['Idea to Spec ($497)', 'The Terminal ($497)', 'Mustard Mode ($197 / $397)'],
  },
  {
    rung: 5,
    band: 'We build it',
    price: '$750 to $35,000',
    title: 'Done-for-you builds',
    detail: 'The "we build it for you" branch and the big tickets. Always quoted after a free call, never priced on the spot. This is what most of your booked calls turn into.',
    examples: ['Seed Site (about a week)', 'Full business build', 'Idea to Product ($15k to $35k)'],
  },
  {
    rung: 6,
    band: 'The recurring top',
    price: 'Monthly, ongoing',
    title: 'Retainers and subscriptions',
    detail: 'The top of the ladder and the dream: income that repeats every month. A shipped project rolls into a plan that keeps paying.',
    examples: ['Fractional AI Partner', 'Build & Operate retainer', 'Care Plans, plus every /mo plan above'],
  },
];

// ─── The phases ───────────────────────────────────────────────────

export const PHASES: Phase[] = [
  // ══ PHASE 1 ══════════════════════════════════════════════════════
  {
    id: 'foundations',
    num: 1,
    codename: 'Roots',
    emoji: '🌱',
    name: 'Foundations',
    tagline: 'Who we are and why it matters.',
    goal: 'Understand the mission, the standard, and your seat at the table.',
    rank: 'Insider',
    modules: [
      {
        id: 'who-we-are',
        emoji: '🌱',
        eyebrow: 'Start here',
        title: 'Who we are and what we believe',
        summary: 'The mission, the founder, and the standard everything is held to.',
        minutes: 6,
        blocks: [
          {
            heading: 'What Modern Mustard Seed is',
            body: 'Modern Mustard Seed (MMS) is a small, high-end AI studio founded by Sarah Scarano. We build custom apps, websites, AI tools, and self-serve products for businesses, and we ship them fast. We take a handful of big builds at a time so quality never slips, and we sell a growing shelf of productized tools that anyone can buy in a click. We punch far above our size because we run the whole thing on AI, and because we hold a standard most studios do not.',
          },
          {
            heading: 'Who Sarah is',
            body: 'Sarah is the founder and lead builder. Self-taught full-stack developer and AI systems architect, and Christian first, which shapes how we treat people: honestly, generously, and with real care. She runs more than one venture, so a right hand who can take real weight off her is not a nice-to-have. It is the whole point of your role.',
          },
          {
            heading: 'The standard we hold, always',
            bullets: [
              'We ship complete, polished work. Never a half-finished draft handed to anyone.',
              'Everything looks premium. Think Apple and Linear, never a generic template.',
              'We are honest and clear. We do not hype, we do not hide the ball, we quote before we build.',
              'We move fast, but we never wing the things that matter: money, anything a client sees, anything public.',
            ],
          },
          {
            callout:
              '"If you have faith as small as a mustard seed, nothing will be impossible for you." That is the name, and it is the posture. Small seed, outsized result. That is what we do for every business we touch, and it is what this program does for you.',
          },
        ],
        mission: { do: 'In one sentence, write down what MMS does, in your own words, like you are telling a friend.', why: 'If you can say it simply, you understand it. That sentence is the seed of every pitch you will ever give.' },
      },
      {
        id: 'the-shift',
        emoji: '🚀',
        eyebrow: 'The big idea',
        title: 'The shift: AI staff for Main Street',
        summary: 'Where the business is pointed now, and why it changes everything for you.',
        minutes: 6,
        blocks: [
          {
            heading: 'The one sentence that runs the company',
            body: 'Here is where we are pointed: we put AI staff to work for Main Street businesses, starting with the 24/7 receptionist you can hear answering your own phone sixty seconds from now. Read that again. That is the whole strategy in a line. Big agencies sell six-month projects to big companies. We give the corner salon, the roofer, and the med spa an AI team they can hear working, today, for the price of a slow week.',
          },
          {
            heading: 'Why this matters to your job',
            bullets: [
              'The front door is now a free demo, not a sales pitch. You let the product amaze them, then you book the call. That is a far easier job than talking someone into something.',
              'We lead with the receptionist because every business with a phone loses money to missed calls, and they can hear the fix in one minute. It is the easiest thing on earth to show.',
              'The money is increasingly monthly. A one-time build is great. A tool a client pays for every month is the dream. You will hear the word "recurring" a lot, and it is why the business is durable.',
              'Free tools and productized offers do the heavy lifting of trust. By the time you talk to someone, the work has already spoken for us.',
            ],
          },
          {
            callout:
              'The old story was "we build custom software." The new story is "we put AI staff to work for you, and you can hear it right now." Same studio, sharper spear. You are joining at the exact moment it gets easy to sell.',
          },
        ],
        mission: { do: 'Go to /sidekick, and let Mr. Mustard forge a receptionist for a made-up business. Talk to it out loud.', why: 'This is the single most important thing we make right now. You cannot sell the wow until you have felt it yourself.' },
      },
      {
        id: 'your-seat',
        emoji: '🤝',
        eyebrow: 'This is about you',
        title: 'Your seat at the table',
        summary: 'You are the right hand. What that means, how you get paid, and the rules.',
        minutes: 7,
        blocks: [
          {
            heading: 'You are the right hand, not a temp',
            body: 'Most companies would hand a new hire one narrow job and a short leash. We are doing the opposite. You get the owner keys and the full picture on purpose, because the plan is for you to grow into running large parts of this business. Today your focus is selling and calling, because that is what moves the needle first and it is where you will win fastest. But nothing here is off-limits to you. As you master each piece, you take more of it off Sarah\'s plate. That is the arc of this whole program: sell, then run the floor, then build.',
          },
          {
            heading: 'What is yours right now',
            bullets: [
              'Start real conversations with businesses that need what we build. Online, on the phone, in person.',
              'Book discovery calls and demos. That booked call is the whole game.',
              'Be visible and useful so the right people come to us.',
              'Learn the machine so you can speak to any of it honestly, and so you can take more of it over.',
            ],
          },
          {
            heading: 'What is still Sarah\'s (for now)',
            body: 'Sarah sets the prices, writes the proposals, and runs the builds. You do not quote a firm price or promise a feature on your own, ever. You point people to a free call and let Sarah give the number. This is not a limit on you, it is how we protect the client and keep the quote honest. As you learn, more of this becomes shared. The rule that never changes: anything going out to a client or the public gets a human okay first.',
          },
          {
            heading: 'How you get paid',
            body: 'You earn commission on the business you bring in, tracked automatically through your personal booking link. Your Partner HQ shows your clicks, your booked business, and your running total. Your exact rate and your link live there. More real conversations, more demos, more booked calls. It is that direct.',
            links: [{ label: 'Your Partner HQ', url: '/partners/hq', external: false }],
          },
          {
            callout:
              'Every email this company sends closes with a hand-drawn heart. That heart is the promise behind all of it, and now you carry it too. You are not being onboarded to a company. You are being written into it.',
          },
        ],
        mission: { do: 'Open your Partner HQ, find your personal booking link, and save it somewhere you will use it a hundred times.', why: 'That link is your paycheck. Every person you send through it is tracked to you, forever.' },
      },
    ],
  },

  // ══ PHASE 2 ══════════════════════════════════════════════════════
  {
    id: 'arsenal',
    num: 2,
    codename: 'The Arsenal',
    emoji: '🧰',
    name: 'The Arsenal',
    tagline: 'Everything we sell, cold.',
    goal: 'Know the whole ladder so you can talk offers with anyone, on day one.',
    rank: 'Specialist',
    modules: [
      {
        id: 'the-ladder',
        emoji: '🪜',
        eyebrow: 'The whole picture',
        title: 'The ladder, in one look',
        summary: 'Six rungs from a free demo to monthly income, and the fork that runs through it.',
        minutes: 7,
        blocks: [
          {
            heading: 'It is a ladder, and everything has a rung',
            body: 'Do not memorize a price sheet. Understand the shape. Everything we sell climbs from a free hook at the bottom to recurring monthly income at the top. A stranger meets us with something free, buys something small, then something bigger, and the best ones end up on a monthly plan. Your job lives mostly at the bottom two rungs: get them in with a free demo, and book the call. The ladder does the rest.',
          },
          {
            heading: 'The fork: build it for you, or teach you to build it',
            body: 'Running up the whole ladder is one choice we offer everyone: we can build it for you (done-for-you, the big tickets), or we can teach you to build it yourself (our programs and Mustard Mode). Most people want it built. Some want to learn. We win either way, and knowing both branches makes you sound like you actually get their situation.',
          },
          {
            callout:
              'The full ladder is laid out visually right here, just below. Do not just read it. Picture where each conversation you have could climb.',
          },
        ],
        mission: { do: 'Look at the six-rung ladder in this phase and pick the rung you think you will sell the most of at first.', why: 'Spoiler: it is the free receptionist demo on rung one. Knowing where you fish keeps you focused.' },
      },
      {
        id: 'the-storefront',
        emoji: '🎪',
        eyebrow: 'Your field weapons',
        title: 'The four Mr. Mustard machines',
        summary: 'The free-demo products you lead with, and what it costs to keep each one.',
        minutes: 9,
        blocks: [
          {
            body: 'These four are the heart of the new business. Each one gives a free wow starring our mascot, Mr. Mustard, then turns into a paid product. These are what you demo in the field. Know the free hook and the entry price for each, and you can start any conversation.',
          },
          {
            heading: 'The Sidekick, a 24/7 AI receptionist  ·  /sidekick',
            bullets: [
              'The free wow: it forges a personalized AI receptionist for their business in about 60 seconds, and they talk to it live.',
              'To keep him: $397 to set up plus $297 a month (250 answered minutes). The Pro is $597 plus $497 a month (600 minutes, caller memory, booking, a monthly tune-up with Sarah).',
              'Say it like this: "An AI that answers your phone 24/7 in a natural voice and books appointments, even when you are closed or slammed."',
            ],
          },
          {
            heading: 'Mustard Pictures, an AI commercial  ·  /pictures',
            bullets: [
              'The free wow: a "Screen Test," a six-shot storyboard, three taglines, and one cinematic frame for their business, on the spot.',
              'To make it real: $197 for a finished 30-second commercial (The Spot). $497 for a voiced, talking version (The Premiere). $197 a month for a fresh spot every month (Season Pass).',
              'Say it like this: "Your business as a real cinematic commercial, directed by our AI. Watch a preview of yours free."',
            ],
          },
          {
            heading: 'Mustard Press, print-ready collateral  ·  /press',
            bullets: [
              'The free wow: paste a menu or price list and it typesets a print-ready page instantly, delivered as a watermarked proof.',
              'To keep it: $97 to lift the watermark, right now (The Piece). $297 for a matching set of flyer, card, and window piece (The Kit). $497 for Sarah at the press, by hand (The Hand Press).',
              'Say it like this: "Your prices and menu, typeset like they actually matter. See a proof of yours free."',
            ],
          },
          {
            heading: 'GEO Desk, get found by AI  ·  /website-audit',
            bullets: [
              'The free wow: it grades how findable their business is inside AI answers (ChatGPT, Perplexity, Google AI).',
              'To fix it: $297 for every missing signal written for their business, ready to paste (The Fix Pack). $497 with 90 days of proof. $97 a month to keep watch.',
              'Say it like this: "When someone asks AI for a business like yours, are you the answer? We make sure you are." Never promise rankings, only that we install and monitor the signals.',
            ],
          },
          {
            heading: 'And one more: Mustard Mode  ·  /mustard-mode',
            body: 'Our coaching arcade. Mr. Mustard is a personal AI coach who teaches anyone to build with Claude, in levels, with missions and XP (a lot like this program). Free first session, then Player at $197, Builder at $397, or the Founders Cabinet at $97 a month. This is the "learn to build it yourself" door, and it is also how YOU will start becoming a builder later in this program.',
          },
        ],
        mission: { do: 'Visit all four free demos (/sidekick, /pictures, /press, /website-audit) and run one of each on a real local business you can think of.', why: 'You will sell these every day. You should be able to run each one in your sleep before you show a stranger.' },
      },
      {
        id: 'the-builds',
        emoji: '🏗️',
        eyebrow: 'The big tickets',
        title: 'The builds, and the golden rule of price',
        summary: 'The done-for-you work your booked calls turn into, and why you never quote.',
        minutes: 7,
        blocks: [
          {
            heading: 'What we build for people',
            bullets: [
              'Websites that actually sell: a clear offer, real proof, an obvious next step. Live in weeks, and they own it.',
              'Full business systems: a site plus a CRM, an AI assistant, and the back office, all working together.',
              'Custom apps and AI tools: the one clean tool built for exactly how their business runs.',
              'Voice and chat agents: the receptionist and the website helper, built and tuned for their business.',
            ],
          },
          {
            heading: 'The ranges, so numbers do not scare you',
            body: 'A simple site starts small and ships in about a week. A full business build runs one to two weeks. A serious custom product (Idea to Product) runs roughly $15,000 to $35,000. You do not need these numbers to sell. You need them so a big figure never rattles you on a call. Every one of these is a flat, agreed price, with a 50 percent deposit to start.',
          },
          {
            heading: 'The golden rule: you never quote',
            body: 'When someone asks "how much," the answer is always the same warm line: "It depends on exactly what you need, and it is always a flat price with no surprises. The free call is where we figure out the fit and give you a real number." Then you book the call. You never invent a price, never promise a feature, never discount. That is Sarah\'s call, literally. This rule protects the client and protects you.',
          },
          {
            heading: 'Who it is for, and who it is not',
            body: 'Best fits are owners who want it built right and shipped fast and do not have time to become technical. Businesses that live on the phone and on appointments (salons, trades, clinics, auto, gyms, restaurants, real estate) and anyone with an old or missing website. We are not for the person hunting a 300 dollar site or endless meetings. Knowing who we are NOT for lets you politely qualify out a bad fit early, which is a pro move.',
          },
        ],
        mission: { do: 'Say the "how much does it cost" answer out loud three times until it feels natural.', why: 'It is the single most common question you will get, and a smooth answer to it is worth more than any other line you learn.' },
      },
    ],
  },

  // ══ PHASE 3 ══════════════════════════════════════════════════════
  {
    id: 'craft',
    num: 3,
    codename: 'The Craft',
    emoji: '🎯',
    name: 'The Craft of Selling',
    tagline: 'Turn a stranger into a booked call.',
    goal: 'Learn the actual craft of selling, the honest way, and the tools you will live in.',
    rank: 'Closer',
    modules: [
      {
        id: 'the-mindset',
        emoji: '🧠',
        eyebrow: 'First, the head',
        title: 'How selling actually works here',
        summary: 'Selling the MMS way is helping, not pushing. The mindset that makes it easy.',
        minutes: 6,
        blocks: [
          {
            body: 'Selling here is not slick or pushy, and it is a skill anyone can learn. It is finding someone with a problem we fix, showing them it is fixable, and getting them to a call or a demo. That is it. Here is the mindset that makes it feel natural.',
          },
          {
            heading: 'The five truths',
            bullets: [
              'You are helping, not bothering. Every business you talk to is losing money somewhere. You bring a fix. Offering it is a kindness.',
              'The goal is the next step, not the sale. You are never closing on the spot. You are earning a call or a demo. "Want to see it?" is the whole ask, and that takes all the pressure off.',
              'Listen more than you talk. Let them tell you the problem, then show you heard it. People buy from someone who gets them.',
              'No is fine, and normal. Most people say not right now. That is a numbers game, not a rejection. A no today can be a yes in three months.',
              'You do not need the tech answers. "Good question, that is exactly what the demo is for" is a perfect, honest answer. Never guess, never oversell.',
            ],
          },
          {
            heading: 'The four moves behind every sale',
            body: 'Whether you are on the phone, in a DM, or standing in a shop, it is the same arc: Connect (be a warm human first), Find the problem (ask about their world and listen), Show the fix (one plain sentence, or better, the live demo), Ask for the next step (a clear, easy "want me to set up a quick call?"). Memorize the four moves, not a script. The Training tab has the full version.',
            links: [{ label: 'Full sales training', url: '/admin/sales-training', external: false }],
          },
        ],
        mission: { do: 'Use the "Ask Mr. Mustard" button and say: "Roleplay a cold walk-in with me. You be a busy salon owner." Then practice.', why: 'Mr. Mustard will play the customer and coach you. Ten minutes of this beats an hour of reading.' },
      },
      {
        id: 'the-funnel',
        emoji: '⚡',
        eyebrow: 'How it flows',
        title: 'The funnel, and why speed wins',
        summary: 'How a stranger becomes a client, the pipeline stages, and the one lever that matters most.',
        minutes: 6,
        blocks: [
          {
            heading: 'The path a stranger takes',
            body: 'Someone sees us or you reach out. They try a free demo or tool. They get curious. You book them a call. Sarah scopes and quotes. They pay a deposit and we build. They launch, pay the balance, and often roll onto a monthly plan. Your part is the front of that path: get them in, and get the call booked.',
          },
          {
            heading: 'Speed is the whole game',
            body: 'The single biggest lever in sales is how fast you reply. Someone who hears back in five minutes is far more likely to book than someone who waits a day. When a conversation gets warm, follow up fast, friendly, and human, and always send your booking link so it tracks to you. If you remember one thing from this whole phase, remember: speed wins.',
          },
          {
            heading: 'The pipeline stages, so you can read the board',
            bullets: [
              'New: just came in.',
              'Replied: we reached out, waiting on them.',
              'Booked: the call or demo is on the calendar. This is your goal.',
              'Won or Lost: closed one way or the other.',
            ],
          },
          {
            callout:
              'Your one number that matters is booked demos and calls. Everything else exists to create those. It is a numbers game, so talk to a lot of people. Twenty cold calls beats one perfect post.',
          },
        ],
        mission: { do: 'Open the Pipeline tab and find one lead at each stage. See how a real person moves from New to Booked.', why: 'Reading the live board makes the funnel real instead of theoretical. It is your scoreboard.' },
      },
      {
        id: 'your-toolkit',
        emoji: '🧰',
        eyebrow: 'What you live in',
        title: 'Your daily toolkit',
        summary: 'The handful of tabs and tools you will actually use every day.',
        minutes: 7,
        blocks: [
          {
            heading: 'The four you will open daily',
            bullets: [
              'Tracker: your list of businesses to call and visit. Log every one you work so we all see activity and never call the same place twice.',
              'Script: the word-for-word for a booked call. Open it before and during any call.',
              'Training: the sales training and cold-call scripts. Your practice ground.',
              'Outbound: the calling floor, where your leads, their audits, and ready-made call scripts come together.',
            ],
          },
          {
            heading: 'Free tools are your best openers',
            body: 'The free demos and audits are not just products, they are the best reason to reach out. Run someone\'s website through the audit and send the grade. Forge them a receptionist and text the link. You showed value before you asked for anything, which is exactly how trust starts.',
            links: [
              { label: 'Website audit', url: '/website-audit', external: false },
              { label: 'Sidekick demo', url: '/sidekick', external: false },
            ],
          },
          {
            heading: 'Your territory is already loaded',
            body: 'This is the part people do not usually get on day one: your calling list is already built. Real local businesses in your territory, with real phone numbers, are waiting in the Tracker. You do not start from a blank page. You start from a full one.',
          },
          {
            callout:
              'Anytime you are unsure how something works, use the yellow "Ask Mr. Mustard" button in the corner of any admin page. He knows our whole playbook and answers in plain English. Lean on him hard while you learn.',
          },
        ],
        mission: { do: 'Open the Tracker, filter to your own leads, and pick the first ten businesses you will call.', why: 'A named list of ten turns "I should make calls" into "I am calling these ten." That is the difference between busy and effective.' },
      },
    ],
  },

  // ══ PHASE 4 ══════════════════════════════════════════════════════
  {
    id: 'phones',
    num: 4,
    codename: 'The Phones',
    emoji: '📞',
    name: 'On the Phones',
    tagline: 'Where the real business gets booked.',
    goal: 'Get comfortable calling and walking in, and book your first demo for real.',
    rank: 'Rainmaker',
    modules: [
      {
        id: 'the-cold-call',
        emoji: '☎️',
        eyebrow: 'The core skill',
        title: 'The cold call',
        summary: 'It is just a quick, friendly chat with one goal: a booked demo.',
        minutes: 7,
        blocks: [
          {
            body: 'Cold calling sounds scary and it is not. It is a short, friendly chat, and you will get a lot of no\'s, which is completely normal. Keep it short, smile so they can hear it, and aim for one thing: a booked demo. Stand up, warm up with a few easy ones, and do them in batches of ten to twenty.',
          },
          {
            heading: 'The shape of the call',
            bullets: [
              'Opener, ask permission: "Hi, my name is [you]. I will be honest, this is a quick cold call, do you have 20 seconds before I let you go?" Admitting it disarms people.',
              'The hook: "Here is the one question I ask every owner: do you want your business to thrive? Because the ones that do never let a call go unanswered." Then bridge to the receptionist.',
              'Find the problem: "When you are slammed or after hours, what happens to your calls? Do they go to voicemail?" Then be quiet and listen.',
              'Book the demo: "That is exactly what we fix, and the easiest way is to see it. Would tomorrow morning or afternoon be better?" Offer two times, do not ask if they are interested.',
              'Lock it in: get the best cell or email, book it, and tell Sarah if it is a strong one.',
            ],
          },
          {
            heading: 'The full script lives in Training',
            body: 'Every line above, plus voicemail scripts, the gatekeeper move, and best-times-to-call, is in the Training tab, personalized with your booking link. This module is the why. That page is the words.',
            links: [{ label: 'Open the full cold-call script', url: '/admin/sales-training', external: false }],
          },
          {
            callout:
              'A handful of demos out of twenty calls is a great session. Every call that ends in a booked demo, a "call me later," or a texted link is a win. Track those, not just the yes\'s, and the no\'s stop stinging.',
          },
        ],
        mission: { do: 'Make three real calls from your Tracker list using the script. Just three. Log each one.', why: 'The first three are the hardest you will ever make. After them, it is just reps. Do them today, not tomorrow.' },
      },
      {
        id: 'the-walk-in-play',
        emoji: '🚪',
        eyebrow: 'The signature move',
        title: 'The walk-in voice-agent play',
        summary: 'The highest-converting thing you can do, because the product does the selling.',
        minutes: 6,
        blocks: [
          {
            body: 'This is our signature field move and the easiest, because the demo sells itself. You walk into a business, get them talking to the live voice agent on your phone, and it shows them exactly what it does for a business like theirs. Have modernmustardseed.com/voice-agents open before you walk in.',
          },
          {
            heading: 'How it goes',
            bullets: [
              'Walk in friendly: "I know you are busy, I will be quick. Can I show you something kind of cool? Takes about 30 seconds."',
              'Set it up: "This is an AI that answers your phone 24/7 and books appointments. Here, talk to it like you are a customer calling in."',
              'Hand them your phone. Let them have a real back-and-forth. Stay quiet. This is the moment that sells it.',
              'Bridge to them: "Imagine that answering YOUR phone, in your name, booking jobs while you are with a customer."',
              'Book the next step: "I would love to set you up a proper demo for your shop specifically. Mornings or afternoons?"',
            ],
          },
          {
            callout:
              'Practice the demo on yourself five times first so the button is second nature and you are smooth. Curiosity opens the door. The demo does the rest.',
          },
        ],
        mission: { do: 'Do the voice demo on yourself five times, then do it for one real person (a friend, a neighbor, one business).', why: 'This is the highest-converting thing we have. The only way to get smooth is reps on real humans.' },
      },
      {
        id: 'objections-and-rules',
        emoji: '🛡️',
        eyebrow: 'Handle anything',
        title: 'Objections and the house rules',
        summary: 'The handful of answers that handle almost everything, and how we stay clean.',
        minutes: 6,
        blocks: [
          {
            heading: 'The answers that cover most of it',
            bullets: [
              '"How much?" → "It depends on what you need, and it is always a flat price, no surprises. The demo is where we give you a real number."',
              '"I already have a website / a guy." → "That is great. This is really about your phone getting answered 24/7. Worth a 30-second look?"',
              '"I do not have time." → "Totally get it, that is usually the whole reason this helps. Can I text you a link and a time that works for you?"',
              '"I am not very techy." → "You do not have to be. We build it and run it, you just get the results."',
              '"Is it a robot voice?" → "Fair worry. Here, listen for yourself." Then hand them the live demo.',
            ],
          },
          {
            heading: 'The house rules that keep us clean and legal',
            body: 'We call businesses on their public business line, never personal cells, and never numbers on the Do Not Call registry. Always say who you are and why you are calling. If someone asks not to be called again, apologize, mark them "Not interested" in the Tracker, and never call them again. We win by being welcome, not annoying.',
          },
          {
            heading: 'Log everything',
            body: 'Every business you work goes in the Tracker as you go: contacted, booked, not interested. That is how Sarah sees your activity, how we never double-call a place, and how your effort turns into a visible track record.',
          },
        ],
        mission: { do: 'Pick the two objections you think you will hear most, and practice your answer to each out loud.', why: 'You will freeze the first time an objection catches you off guard. Rehearsed, you will not even blink.' },
      },
    ],
  },

  // ══ PHASE 5 ══════════════════════════════════════════════════════
  {
    id: 'machine',
    num: 5,
    codename: 'The Machine',
    emoji: '🎛️',
    name: 'Command of the Machine',
    tagline: 'See the whole system, then run it.',
    goal: 'Understand every part of the admin and how a lead flows through it, end to end.',
    rank: 'Operator',
    modules: [
      {
        id: 'the-admin-tour',
        emoji: '🗺️',
        eyebrow: 'The full tour',
        title: 'The command center, tab by tab',
        summary: 'You have the owner keys. Here is what every tab does, grouped so it makes sense.',
        minutes: 9,
        blocks: [
          {
            body: 'There are a lot of tabs, and that is a good thing. It means this small studio runs like a big one. You do not run all of these today, but a right hand should know what each is. Here they are, grouped by what they are for.',
          },
          {
            heading: 'See the business',
            bullets: [
              'Overview: the dashboard. New leads, upcoming calls, and a daily AI brief.',
              'Calendar: your booked calls and demos, with join links.',
              'Pipeline: every lead and its stage, from new to won.',
              'Reviews: published client reviews. Great proof to point prospects to.',
            ],
          },
          {
            heading: 'Find and work leads (your world)',
            bullets: [
              'Tracker: your list of businesses to call and visit.',
              'Outbound: the calling floor. Leads, audits, and scripts in one place.',
              'Gleaner: revenue recovery, surfacing leads worth another touch.',
              'Callers: the AI voice agent\'s call history and memory.',
            ],
          },
          {
            heading: 'Reach out',
            bullets: [
              'Script: the warm discovery-call script.',
              'Training: your sales training and cold-call scripts.',
              'Audit: run a free website grade on any URL, a great opener.',
              'Campaigns, Texting, Ads, Outreach: the marketing engines. Sarah runs these; know they exist.',
            ],
          },
          {
            heading: 'Close and deliver (Sarah, for now)',
            bullets: [
              'Call: capture notes during a booked call.',
              'Proposals: where the fixed-price quote is built and sent.',
              'Projects and Builds: the live client work and portals.',
              'Approvals and Inbox: what is waiting on a human okay, and the correspondence from leads and clients.',
            ],
          },
          {
            callout:
              'You can see all of it. You do not have to maintain all of it. Do not let admin work pull you off selling. But the more of this you quietly master, the more of it becomes yours.',
          },
        ],
        mission: { do: 'Open every tab once, just to see it. Then close the ones that are not yours yet and get back to selling.', why: 'A quick tour kills the fear of the unknown. Now nothing in this admin is a mystery to you.' },
      },
      {
        id: 'how-a-lead-flows',
        emoji: '🔄',
        eyebrow: 'The closed loop',
        title: 'Follow one lead all the way through',
        summary: 'The single story that ties every tab together.',
        minutes: 6,
        blocks: [
          {
            heading: 'One business, start to finish',
            body: 'A roofer misses calls. You forge them a receptionist demo at a walk-in and text the /voice-agents link. You log them in the Tracker as demoed. You book a call, and they show up in the Pipeline and on the Calendar. Sarah runs the call, notes go in Call, and a fixed quote goes out from Proposals. They pay a deposit, and it becomes a live Project with a client Portal. They launch, leave a Review, and their replies land in the Inbox. Later, Gleaner reminds us to check in about a monthly plan.',
          },
          {
            heading: 'Why the loop matters to you',
            body: 'Everything is keyed to the same person\'s email, so their demo, lead, call, proposal, project, and messages all connect. When you understand that one loop, the whole admin stops being twenty tabs and becomes one story you can follow. That is what an operator sees that a beginner does not.',
          },
          {
            callout:
              'You touched the first three steps of that story (demo, log, book). The rest happens because you did. Never forget that the whole machine starts with a conversation you began.',
          },
        ],
        mission: { do: 'Pick one real lead in the Pipeline and click through every place their name appears.', why: 'Seeing one person move through the system is worth more than reading about it ten times.' },
      },
      {
        id: 'the-ai-stack',
        emoji: '🤖',
        eyebrow: 'Our AI, and yours',
        title: 'The AI stack, and how to use it well',
        summary: 'The AI that works for us 24/7, and how to get great results from it yourself.',
        minutes: 7,
        blocks: [
          {
            heading: 'The AI already working for us',
            bullets: [
              'Mr. Mustard on the phone: answers calls and books jobs 24/7. His conversations land in Callers and the Inbox.',
              'Mr. Mustard on the site: the chat helper and the free demos that amaze people before we ever talk.',
              'The audit engine: reads any website and grades it in seconds.',
              'The correspondence inbox: syncs real email replies from leads so nothing gets lost.',
            ],
          },
          {
            heading: 'How to get a great result from AI',
            bullets: [
              'Give context: who it is for, what you want, and the tone. The more you tell it, the better the draft.',
              'Ask for options: "give me three subject lines" beats "write a subject line."',
              'Always read it back as a human. AI is a strong first draft, never the final word.',
              'Check any fact, price, name, or date before it goes out. AI can be confidently wrong.',
            ],
          },
          {
            callout:
              'This whole company runs on AI, and you will get good at it fast. Anything outward-facing still gets a human okay first. AI drafts, people approve. That never changes.',
          },
        ],
        mission: { do: 'Ask Mr. Mustard to draft a short, friendly follow-up text to a business you demoed. Then edit it to sound like you.', why: 'This is the exact loop you will run a hundred times: AI drafts, you make it human, you send. Practice it once here.' },
      },
    ],
  },

  // ══ PHASE 6 ══════════════════════════════════════════════════════
  {
    id: 'forge',
    num: 6,
    codename: 'The Forge',
    emoji: '⚒️',
    name: "The Builder's Path",
    tagline: 'The horizon: start becoming a builder.',
    goal: 'Take the first real steps toward building, and get certified as the right hand.',
    rank: 'Right Hand',
    modules: [
      {
        id: 'ai-basics',
        emoji: '💡',
        eyebrow: 'No tech background needed',
        title: 'AI and building, in plain English',
        summary: 'What building actually means here, and why it is closer than you think.',
        minutes: 6,
        blocks: [
          {
            heading: 'Building is not what you think it is',
            body: 'When Sarah builds, she is not typing cryptic code alone in the dark. She is directing AI in plain English: telling it what to build, checking its work, and shipping. That is a skill, not a gift, and it is a skill you can learn. The gap between "I sell this" and "I can build a small version of this" is much smaller than it looks from the outside.',
          },
          {
            heading: 'The three things every builder does',
            bullets: [
              'Describe clearly: say exactly what you want, for whom, and what "done" looks like. This is the same clarity that makes you good on a call.',
              'Direct the AI: give it the task, review what it makes, and ask for changes. It is a conversation, not a command line.',
              'Ship and check: put it out, look at it like a stranger would, fix what is off. Nothing is precious, everything is fixable.',
            ],
          },
          {
            callout:
              'You already do step one every day when you scope a prospect\'s problem. Building just points that same clarity at a tool instead of a person. You are more than halfway there and you did not know it.',
          },
        ],
        mission: { do: 'Write three clear sentences describing a tiny tool you wish existed for your own work. Who it is for, what it does, what "done" looks like.', why: 'That is a spec. It is the first thing a builder writes. You just did it.' },
      },
      {
        id: 'your-first-step',
        emoji: '🛠️',
        eyebrow: 'Hands on',
        title: 'How we build, and your first real step',
        summary: 'A peek at the stack, and the on-ramp that turns you from seller to builder.',
        minutes: 6,
        blocks: [
          {
            heading: 'How we build, at a glance',
            body: 'Do not memorize this, just recognize the names. Our sites and apps run on Next.js. Our data lives in Supabase. Payments run through Stripe. It all goes live on Vercel. The phone agent runs on Vapi. When you hear these words, you now know what they are: the parts of the machine, nothing scary.',
          },
          {
            heading: 'Your on-ramp: Mustard Mode',
            body: 'Remember Mustard Mode from the Arsenal, our coaching arcade? That is literally the door we sell to people who want to learn to build, and it is your door too. It coaches you through four tracks (Code, Design, Cowork, Ideate) with missions and XP, using nothing but a Claude subscription. Your first free session is on the page. This program made you the right hand. Mustard Mode is how you start becoming a builder.',
            links: [{ label: 'Play your free Mustard Mode session', url: '/mustard-mode', external: false }],
          },
          {
            heading: 'Small real steps you can take now',
            bullets: [
              'Run a full audit and read the whole report. Understand what "good" looks like.',
              'Forge a few Sidekick demos and notice how the same tool adapts to each business.',
              'Play your free Mustard Mode session and ship the first tiny mission.',
            ],
          },
          {
            callout:
              'Nobody expects you to build a client\'s app next week. The point is that the door is open and you are walking toward it. Sell first, master the machine, then build. That is the path, and you are on it.',
          },
        ],
        mission: { do: 'Play your first free Mustard Mode session and complete mission one.', why: 'This is the actual first brick of the builder in you. Lay it, and the identity starts to shift from "I sell it" to "I can make it."' },
      },
      {
        id: 'the-road-ahead',
        emoji: '🏁',
        eyebrow: 'The finish, and the start',
        title: 'The road ahead',
        summary: 'The house rules to carry forever, how to ask for help, and your certification.',
        minutes: 5,
        blocks: [
          {
            heading: 'The non-negotiables, to carry forever',
            bullets: [
              'No em dashes in anything you write. Periods, commas, parentheses.',
              'Documents go out as PDF, never a Word file.',
              'Anything client-facing or public gets a human okay before it sends.',
              'You never quote a firm price or promise a feature on your own.',
              'Ship complete work, hold the design bar, keep everything you see confidential.',
            ],
          },
          {
            heading: 'How to ask for help',
            body: 'Ask early and specifically. "I am stuck on X, I tried Y, what would you do?" is always welcome and beats guessing on something that matters. Use Mr. Mustard for how-things-work questions any time. Nobody here expects you to know everything, and asking a sharp question is a sign of an operator, not a rookie.',
          },
          {
            heading: 'The whole arc, in one line',
            body: 'Rookie to Insider to Specialist to Closer to Rainmaker to Operator to Right Hand. You are climbing a real ladder to a real role. Sell first, because it wins fastest. Master the machine, because a right hand can run it. Then build, because that is where this goes. This program is the beginning, not the end.',
          },
          {
            callout:
              'Finish all six phases and you are a certified Right Hand of Modern Mustard Seed. That is not a participation trophy. It means you know this business as well as almost anyone alive, and you are ready to help run it. Go earn it.',
          },
        ],
        mission: { do: 'Book your first real discovery call or demo. That is graduation. Everything before it was practice.', why: 'The whole program exists to get one prospect onto the calendar. Do that, and you are not learning the job anymore. You are doing it.' },
      },
    ],
  },
];

// Flat list of every module, in order. Used by the PDF and progress math.
export const MODULES: GuideModule[] = PHASES.flatMap((p) => p.modules);

// ─── Field missions: the first ten days on the floor ─────────────
export type FieldMission = { id: string; day: string; label: string; detail: string };
export const FIELD_MISSIONS: FieldMission[] = [
  { id: 'fm-login', day: 'Day 1', label: 'Get in and get set up', detail: 'Confirm your /admin login works, open your Partner HQ, and save your personal booking link.' },
  { id: 'fm-feel', day: 'Day 1', label: 'Feel the wow', detail: 'Forge a Sidekick receptionist at /sidekick and talk to it out loud. This is what you sell.' },
  { id: 'fm-p1p2', day: 'Day 2', label: 'Clear Foundations and the Arsenal', detail: 'Work Phases 1 and 2. You should be able to explain the mission and the ladder to anyone.' },
  { id: 'fm-demos', day: 'Day 3', label: 'Run all four free demos', detail: 'Sidekick, Pictures, Press, and the audit, each on a real local business you can picture.' },
  { id: 'fm-craft', day: 'Day 4', label: 'Learn the craft', detail: 'Work Phase 3, then roleplay a cold walk-in with Mr. Mustard until it feels natural.' },
  { id: 'fm-list', day: 'Day 5', label: 'Pick your first ten', detail: 'Open the Tracker, filter to your leads, and choose the first ten businesses you will call.' },
  { id: 'fm-post', day: 'Day 5', label: 'Make your first post', detail: 'On brand, no em dashes, genuinely useful, with your booking link in your bio.' },
  { id: 'fm-calls', day: 'Day 6', label: 'Make your first three calls', detail: 'Use the script from Training. Just three. Log each one in the Tracker. The first three are the hardest.' },
  { id: 'fm-walkin', day: 'Day 7', label: 'Do one live walk-in demo', detail: 'Practice on yourself five times, then hand the live voice demo to one real person.' },
  { id: 'fm-machine', day: 'Days 8-9', label: 'Master the machine', detail: 'Work Phase 5, and follow one real lead through every tab it appears in.' },
  { id: 'fm-build', day: 'Day 9', label: 'Lay the first builder brick', detail: 'Play your free Mustard Mode session and ship mission one.' },
  { id: 'fm-booked', day: 'Day 10', label: 'Book your first call', detail: 'Get one prospect onto the calendar. This is graduation. This is the whole game.' },
];

// ─── Plain-English glossary ───────────────────────────────────────
export type GlossaryTerm = { term: string; def: string };
export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Lead', def: 'A potential customer who has shown interest. Your job is to turn leads into booked calls.' },
  { term: 'Pipeline', def: 'The list of all leads and what stage each is at, from new to won or lost.' },
  { term: 'Discovery call', def: 'The first short call with a lead to understand what they need before we quote.' },
  { term: 'Demo', def: 'Showing the product live, usually the voice receptionist. The fastest way to sell it.' },
  { term: 'Forge', def: 'What the Sidekick does: it builds a personalized AI receptionist for a business in about 60 seconds.' },
  { term: 'Screen Test', def: 'The free Mustard Pictures preview: a storyboard, taglines, and one cinematic frame for a business.' },
  { term: 'Proof', def: 'The free, watermarked version of a Mustard Press typeset page, before they pay to keep it.' },
  { term: 'GEO', def: 'Getting your business cited inside AI answers (ChatGPT, Perplexity), where more people now search.' },
  { term: 'SEO', def: 'Search Engine Optimization. Making pages show up on Google.' },
  { term: 'Productized offer', def: 'A finished thing sold at a set price (like the $197 commercial), instead of a custom quote.' },
  { term: 'Recurring / subscription', def: 'Income that repeats every month from an ongoing plan. The top of the ladder and the goal.' },
  { term: 'Setup fee', def: 'A one-time charge to stand up a product (like the $397 to set up a Sidekick), often credited toward a bigger build.' },
  { term: 'Retainer', def: 'A monthly fee for ongoing work or support, usually after a project ships.' },
  { term: 'Proposal', def: 'The document that lays out scope and a fixed price for a client to sign and pay a deposit on.' },
  { term: 'Deposit and balance', def: 'Clients pay half up front (deposit) to start and the rest (balance) on delivery.' },
  { term: 'Speed to lead', def: 'How fast you reply to a new lead. The single biggest lever in whether they book.' },
  { term: 'Objection', def: 'A reason someone gives for not moving forward. Most have a simple, honest answer you can learn.' },
  { term: 'DNC', def: 'The Do Not Call registry. We never call numbers on it, and never personal cells.' },
  { term: 'CRM', def: 'Customer Relationship Manager. The system that tracks leads and clients. Our admin is our CRM.' },
  { term: 'SDR', def: 'Sales Development Rep. The person (or AI agent) who does first outreach and qualifies leads.' },
  { term: 'Lead magnet', def: 'A free, useful thing (a demo, an audit, a checklist) we give away to attract leads and capture their email.' },
  { term: 'Funnel', def: 'The path a stranger takes from first seeing us to becoming a paying client.' },
  { term: 'Conversion', def: 'When someone takes the action we wanted, like booking a call or buying.' },
  { term: 'MRR', def: 'Monthly Recurring Revenue. Income that repeats every month from ongoing plans.' },
  { term: 'Portal', def: 'The private logged-in area where a client tracks their own project.' },
  { term: 'Deploy / ship', def: 'To put a website or change live on the internet. "We shipped it" means it is live.' },
  { term: 'Prompt', def: 'The instructions you type to an AI to get what you want. Clear in, good out.' },
  { term: 'Spec', def: 'A clear written description of what to build. The first thing a builder writes.' },
];

// ─── Certification ────────────────────────────────────────────────
export const CERT = {
  eyebrow: 'Certified',
  title: 'Right Hand of Modern Mustard Seed',
  body: 'All six phases complete. You know the mission, the whole offer ladder, how to sell, how to call, how the machine runs, and where the builder path leads. You are not the new person anymore.',
  line: 'One seed. 100x the output.',
};

export const TOTAL_MINUTES = MODULES.reduce((sum, m) => sum + m.minutes, 0);
export const TOTAL_MODULES = MODULES.length;
