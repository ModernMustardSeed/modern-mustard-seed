/**
 * Onboarding guide for a Modern Mustard Seed sales and marketing partner. The
 * content for the in-admin Onboarding Hub (components/admin/OnboardingHub) and
 * the printable PDF handbook (lib/onboarding-pdf).
 *
 * Audience: a commission-based partner whose job is sales and marketing (bring
 * in clients and promote us), NOT running the admin or operations. They get full
 * access so they understand how everything works and can speak to it honestly,
 * but the back office is Sarah's. Written plain, for someone newer to AI.
 *
 * No em dashes anywhere (Sarah's rule). Keep it accurate to the real admin.
 */

export type GuideLink = { label: string; url: string; external?: boolean };
export type GuideBlock = {
  heading?: string;
  body?: string;
  bullets?: string[];
  links?: GuideLink[];
};
export type GuideModule = {
  id: string;
  emoji: string;
  eyebrow: string;
  title: string;
  summary: string;
  minutes: number;
  blocks: GuideBlock[];
};

export const ONBOARDING_INTRO = {
  title: 'Welcome to Modern Mustard Seed',
  body: 'Welcome to the team. Your job here is sales and marketing: bring in clients and get the word out, and earn a commission on the business you bring in. You are not running the admin or the back office, that part is Sarah\'s. This guide gives you the full picture anyway, because the better you understand how everything works, the more honestly and confidently you can sell it. Work through the modules top to bottom, tick each one off, and come back any time. Nobody expects you to memorize it.',
};

export const MODULES: GuideModule[] = [
  // 1 ───────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    emoji: '🌱',
    eyebrow: 'Start here',
    title: 'Who we are and what we believe',
    summary: 'The mission, the standard, and what your first week looks like.',
    minutes: 6,
    blocks: [
      {
        heading: 'What Modern Mustard Seed is',
        body: 'Modern Mustard Seed (MMS) is a small, high-end product studio founded by Sarah Scarano. We build custom apps, websites, and specialty AI tools for businesses, and we ship them fast. The signature offer is "Idea to Product in 30 days." Fixed scope, fixed timeline, fixed price, agreed before any work starts. We take a handful of builds per quarter, on a waitlist, so quality never slips.',
      },
      {
        heading: 'Who Sarah is',
        body: 'Sarah is the founder and lead builder. She is a self-taught full-stack developer and AI systems architect, and she is Christian first, which shapes how we treat people: honestly, generously, and with care. She runs more than one venture, so your help protecting her time and keeping things moving is a real gift, not busywork.',
      },
      {
        heading: 'The standard we hold',
        bullets: [
          'We ship complete, polished work. No half-finished drafts handed to a client.',
          'Everything we make is designed to a very high bar. Think Apple and Linear, not a generic template.',
          'We are honest and clear. We do not hype, we do not hide the ball, and we quote before we build.',
          'We move fast but we never wing the things that matter (money, anything a client sees, anything public).',
        ],
      },
      {
        heading: 'What your first week looks like',
        body: 'Read these modules so you really get what we do and who it is for. Get your logins working, including your own partner link. Read the sales call script and the Outreach Playbook. Then start: a few posts, a few real conversations, and your first booked call. The goal of week one is not to learn our back office, it is to get comfortable enough with the offer that you can start bringing in business. There is a first-week checklist at the bottom of this guide.',
      },
    ],
  },

  // 2 ───────────────────────────────────────────────────────────────
  {
    id: 'what-we-sell',
    emoji: '🧰',
    eyebrow: 'The offer',
    title: 'What we actually sell',
    summary: 'So you can talk about it confidently with a lead on day one.',
    minutes: 7,
    blocks: [
      {
        heading: 'The one-line version',
        body: 'We build the custom website, app, or AI tool a business needs, and we ship it in about 30 days. Most agencies take months and disappear into meetings. We scope it tight, build it, and hand it over.',
      },
      {
        heading: 'What we build',
        bullets: [
          'Websites that actually sell (not just look nice): clear offer, proof, and an obvious next step.',
          'Custom web apps and internal tools: dashboards, CRMs, customer portals, booking systems.',
          'Specialty AI tools: things like an AI voice agent that answers the phone and books jobs, a tool that drafts proposals, or one that analyzes deals in seconds.',
          'The growth layer around all of it: SEO, lead magnets, funnels, automations, and ads.',
        ],
      },
      {
        heading: 'How we price',
        body: 'Every engagement is fixed scope and a fixed quote the client sees before anyone writes code. No surprise hourly bills. There is a 50 percent deposit to start and the balance on delivery. Some clients also pay a monthly amount for ongoing support and tools. You do not set prices. When a lead asks "how much," the answer is always "it depends on scope, and we quote you for free after a short discovery call."',
      },
      {
        heading: 'Who it is for',
        body: 'Founders and business owners who want it built right and shipped fast, and who do not have time to become technical themselves. We are not for someone hunting for a 300 dollar website or endless meetings. Knowing who we are NOT for is just as useful: it lets you politely qualify out a bad fit early.',
        links: [{ label: 'Read the full "how we work" page', url: '/work-with-us', external: false }],
      },
    ],
  },

  // 3 ───────────────────────────────────────────────────────────────
  {
    id: 'how-we-work',
    emoji: '🛠️',
    eyebrow: 'The process',
    title: 'How a project actually runs',
    summary: 'The same four steps every time, from first call to launch.',
    minutes: 6,
    blocks: [
      {
        heading: 'The four steps',
        bullets: [
          '1. Discovery. A short free call to understand the goal, the scope, and the deadline.',
          '2. Proposal. We send a fixed-scope, fixed-price proposal the client signs and pays a deposit on.',
          '3. Build. We design and build it, usually in about 30 days, keeping the client updated in their portal.',
          '4. Launch. We ship it, hand over logins and files, and the client pays the balance. A review request goes out a couple of days later.',
        ],
      },
      {
        heading: 'The client portal',
        body: 'Every client gets a login to their own portal on our site. They see their project progress, milestones, a launch countdown, their files, and a button to pay. There is even an AI guide inside it that answers their questions. You will help keep their project status and milestones up to date so the portal always tells the truth.',
      },
      {
        heading: 'Where your work happens',
        body: 'Sarah builds in code and runs the project once it is sold. You do not write code and you do not manage the build. Your world is out front: social, conversations, outreach, and discovery calls. You bring people to the door and book the call. Sarah scopes, quotes, builds, and delivers. Knowing this whole process cold just makes you better at selling it.',
      },
    ],
  },

  // 4 ───────────────────────────────────────────────────────────────
  {
    id: 'your-role',
    emoji: '💁',
    eyebrow: 'Your job',
    title: 'Your role here',
    summary: 'Sales and marketing. You bring in clients and you earn commission.',
    minutes: 6,
    blocks: [
      {
        heading: 'The shape of your job',
        body: 'You have one job with two halves: sales (start conversations with people who need what we build and get them on a call) and marketing (be visible so the right people find us). That is it. You are a commission partner, so the more good business you bring in, the more you earn. You are not an admin and you are not running operations.',
      },
      {
        heading: 'What is yours',
        bullets: [
          'Find and start conversations with potential clients, online and in your network.',
          'Share your personal booking link so the people you bring in get tracked to you.',
          'Post and promote: keep us visible and useful so leads come in.',
          'Book discovery calls, and run the ones you are comfortable with using the call script.',
          'Tell Sarah about a hot lead so she walks into the call already knowing them.',
        ],
      },
      {
        heading: 'What is NOT yours (it is Sarah\'s)',
        bullets: [
          'Running the back office: triaging the inbox, keeping the pipeline tidy, updating project statuses.',
          'Quoting prices and writing proposals. You point people to a free call, Sarah quotes.',
          'Building, delivering, or managing the actual projects.',
          'You can SEE all of it (you have full access), but do not feel you have to maintain it. Do not let admin work pull you off selling.',
        ],
      },
      {
        heading: 'Why you still get the full picture',
        body: 'You have access to everything and this whole guide on purpose. When you understand how we sell, build, and deliver, you can speak about it honestly and answer a prospect\'s real questions. That is what closes. Learn it so you can sell it, not so you can run it.',
      },
      {
        heading: 'How you get paid',
        body: 'You earn a commission on the business you bring in, tracked through your personal booking link (modernmustardseed.com/book?ref=YOURCODE). Your partner dashboard shows your clicks, your booked business, and what you have earned. Full details, your link, and the social playbook are in the partner welcome email and at /partners/hq.',
      },
      {
        heading: 'The golden rule',
        body: 'Anything that goes OUT to a client or the public should sound like us: warm, honest, on brand, no em dashes, never pushy. When in doubt, ask. And never quote a firm price or promise a feature on your own, that is always Sarah\'s call.',
      },
    ],
  },

  // 5 ───────────────────────────────────────────────────────────────
  {
    id: 'command-center',
    emoji: '🎛️',
    eyebrow: 'Good to understand',
    title: 'The admin command center, tab by tab',
    summary: 'You have full access. Here is what each tab does so the business is not a mystery.',
    minutes: 9,
    blocks: [
      {
        heading: 'Read this for context, not as a to-do list',
        body: 'You can reach the admin at /admin with your own login, and you can see everything. But running it is Sarah\'s job, not yours. This tour is so you understand how a lead becomes a client and can answer questions confidently. The tabs you will actually live in are Script (your call words) and your partner dashboard. The rest is here for context.',
      },
      {
        heading: 'How it is organized',
        body: 'Everything is keyed by the client or lead\'s email, so the same person\'s lead, proposal, project, and files all connect. The tabs across the top follow the funnel from first contact to delivery.',
      },
      {
        heading: 'Overview, Calendar, Pipeline',
        bullets: [
          'Overview: the dashboard. New leads, upcoming calls, and a daily AI brief. A good glance to see what is coming in.',
          'Calendar: upcoming discovery calls, with a join link. Useful for the calls you are running.',
          'Pipeline: every lead and what stage they are at. Sarah keeps this current. Look here to see who is in play.',
        ],
      },
      {
        heading: 'Script, Audit, Proposals, Projects',
        bullets: [
          'Script: the sales call script. THIS is your tool. Open it before and during any call.',
          'Audit: run a free website grade on any URL. A great warm opener to share with a prospect.',
          'Proposals: where Sarah builds and sends the fixed-price quote. You do not write these.',
          'Projects: the live builds and client portals. Sarah runs these. You can peek to see how delivery works.',
        ],
      },
      {
        heading: 'Reviews, Outreach, Partners, Onboarding',
        bullets: [
          'Reviews: published client reviews. Great social proof to point prospects to.',
          'Outreach: Sarah\'s prospect list with AI-drafted messages.',
          'Partners: the referral and partner program (that includes you).',
          'Onboarding: this guide. It lives right here so you can reopen it any time.',
        ],
      },
      {
        heading: 'Anytime you are unsure, ask Mr. Mustard',
        body: 'See the yellow "Ask Mr. Mustard" button in the bottom-right corner of every admin page. He knows our whole playbook and can explain anything here in plain English. Use him freely while you learn.',
      },
    ],
  },

  // 6 ───────────────────────────────────────────────────────────────
  {
    id: 'sales',
    emoji: '📈',
    eyebrow: 'Playbook',
    title: 'The sales playbook',
    summary: 'How we turn a new lead into a booked discovery call.',
    minutes: 8,
    blocks: [
      {
        heading: 'Your two main tools',
        body: 'For finding clients, your home base is the Outreach Playbook at /partners/hq (where to look, what to post, and DM scripts, all pre-filled with your link). For a call, your home base is the Script tab. This module is the why behind both.',
      },
      {
        heading: 'Speed is everything',
        body: 'The single biggest lever in sales is how fast you reply. Someone who hears back in five minutes is far more likely to book than one who waits a day. When a conversation gets warm, follow up fast, friendly, and human. Always send them your booking link so it tracks to you.',
      },
      {
        heading: 'The stages, so you can read the pipeline',
        bullets: [
          'New: just came in.',
          'Replied: we have reached out, waiting on them.',
          'Booked: discovery call is on the calendar (your goal).',
          'Won / Lost: closed one way or the other. Sarah keeps these current.',
        ],
      },
      {
        heading: 'A simple first-reply shape',
        body: 'Thank them, show you read what they wrote (reference their actual business or request), give one helpful sentence, and offer two specific times for a short call. Warm, brief, and human. Never a wall of text. Never pushy.',
      },
      {
        heading: 'Helpful openers we already have',
        bullets: [
          'The free website audit: run their URL, send the grade. It is a great reason to reach out and it shows value before we ask for anything.',
          'The free Launch Checklist and Bottleneck Breaker: point new business owners to these. They build trust and pull people back to us.',
        ],
        links: [
          { label: 'Website audit tool', url: '/website-audit', external: false },
          { label: 'Launch checklist tool', url: '/launch-checklist', external: false },
          { label: 'Bottleneck breaker', url: '/audit', external: false },
        ],
      },
      {
        heading: 'What to hand to Sarah',
        body: 'When a lead is qualified and ready to talk scope and price, that is Sarah\'s call (literally). Book it, prep a short summary of what you know, and let her take the pricing conversation until she tells you otherwise.',
      },
    ],
  },

  // 7 ───────────────────────────────────────────────────────────────
  {
    id: 'marketing',
    emoji: '📣',
    eyebrow: 'Playbook',
    title: 'The marketing playbook',
    summary: 'Where we show up, what we post, and the voice we use.',
    minutes: 8,
    blocks: [
      {
        heading: 'Where we are',
        bullets: [
          'X (Twitter): @sarahmscarano. Founder voice, building in public, sharp takes.',
          'LinkedIn: linkedin.com/in/sarahmscarano. Professional, founder-to-founder.',
          'Facebook and Instagram: @modernmustardseed. The business brand.',
          'We do NOT use TikTok. Do not post there.',
        ],
      },
      {
        heading: 'What we post',
        bullets: [
          'Proof of work: real builds, before and afters, results. This sells better than promotion.',
          'Useful plays: a tip a business owner can use today. Give value, then the work sells itself.',
          'Our free tools: the audit, the launch checklist, the bottleneck breaker. Every share is a lead magnet.',
          'The weekly newsletter: one short, genuinely useful email a week. Never fluff.',
        ],
      },
      {
        heading: 'The brand voice',
        body: 'Sharp, capable, founder to founder. Confident and specific, never salesy or jargon-heavy. Benefit-led: say what it does for them. Warm and honest. If a post sounds like a generic ad, rewrite it.',
      },
      {
        heading: 'The one writing rule you cannot miss',
        body: 'No em dashes. Ever. Use periods, commas, or parentheses instead. This is a hard rule across everything we write, public or private. (An em dash is the long dash, the one some apps auto-insert. A normal hyphen in a word is fine.)',
      },
      {
        heading: 'Approve before it goes out',
        body: 'Draft posts and emails, then get a quick approval before anything publishes. We have tools that make scheduling easy, but a human always okays the words first.',
      },
    ],
  },

  // 8 ───────────────────────────────────────────────────────────────
  {
    id: 'ai-basics',
    emoji: '🤖',
    eyebrow: 'New to AI? Start here',
    title: 'AI basics, in plain English',
    summary: 'What AI is in our world, how to use it well, and where the guardrails are.',
    minutes: 9,
    blocks: [
      {
        heading: 'You do not need to be technical',
        body: 'AI here is just a very capable assistant you talk to in plain English. You tell it what you want, it drafts it, you edit and approve. That is most of it. You will get good at this fast, and this whole company runs on it, so you are in the right place to learn.',
      },
      {
        heading: 'The tools you will actually use',
        bullets: [
          'A chat assistant (like Claude or ChatGPT) to draft replies, posts, summaries, and emails. You always edit and approve before sending.',
          'Mr. Mustard: our own AI agent that answers questions on the website and on the phone, and books calls. It works for us 24/7. You will see its conversations land in the admin.',
          'The tools built into the admin: the proposal drafter, the audit, the outreach drafter. Same idea: AI drafts, you review.',
        ],
      },
      {
        heading: 'How to get a good result (prompting)',
        bullets: [
          'Give context: who it is for, what you want, and the tone. The more you tell it, the better the draft.',
          'Show an example if you have one: "match the voice of this past post."',
          'Ask for options: "give me three subject lines" beats "write a subject line."',
          'Always read it back as a human. AI is a strong first draft, not the final word.',
        ],
      },
      {
        heading: 'Where the guardrails are',
        bullets: [
          'AI can be confidently wrong. Check any fact, price, name, or date before it goes out.',
          'Never paste passwords, card numbers, or private client secrets into a public AI tool.',
          'Anything outward-facing (client emails, social posts, anything public) gets a human okay first. AI drafts, people approve.',
        ],
      },
    ],
  },

  // 9 ───────────────────────────────────────────────────────────────
  {
    id: 'tools-accounts',
    emoji: '🔑',
    eyebrow: 'Your setup',
    title: 'Tools and accounts you will touch',
    summary: 'The logins to get set up in your first day or two.',
    minutes: 5,
    blocks: [
      {
        heading: 'Your logins',
        bullets: [
          'Admin command center: your own email and password at /admin (Sarah sets this up for you). Full access, so you can learn the whole business.',
          'Your partner dashboard at /partners/hq: your booking link, earnings, marketing kit, and the Outreach Playbook. You reach it from the one-click link in your partner welcome email.',
          'The social accounts and our posting tool, so you can schedule content.',
          'The calendar, so you can book and confirm discovery calls.',
        ],
      },
      {
        heading: 'Tools that run in the background',
        body: 'You do not need to master these, just know the names so they are not scary when you hear them. Supabase is our database (where leads and projects live). Resend sends our emails. Stripe handles payments. Vercel is where the website runs. Vapi powers the phone agent. If something looks broken in one of these, flag it to Sarah rather than poking it.',
      },
      {
        heading: 'Ask for access early',
        body: 'On day one, make a short list of anything you cannot get into and send it to Sarah in one message. Getting all your logins sorted up front saves a week of small blockers.',
      },
    ],
  },

  // 10 ──────────────────────────────────────────────────────────────
  {
    id: 'house-rules',
    emoji: '📐',
    eyebrow: 'How we operate',
    title: 'House rules and what to expect',
    summary: 'The handful of standards that keep our quality and trust high.',
    minutes: 5,
    blocks: [
      {
        heading: 'The non-negotiables',
        bullets: [
          'No em dashes in anything you write. Periods, commas, parentheses.',
          'Documents go out as PDF, never as a Word file.',
          'Anything client-facing or public gets a human approval before it sends.',
          'Ship complete work. If it is not done, it does not go out as if it is.',
          'Hold the design bar. Our stuff looks premium, never generic.',
        ],
      },
      {
        heading: 'Confidentiality',
        body: 'You will see client details, revenue, and private plans. Keep all of it inside the company. Do not share client names or numbers publicly, and do not post about a build before the client has launched it.',
      },
      {
        heading: 'What to expect from us',
        body: 'Clear direction, honest feedback, and room to grow fast. You will not be micromanaged. You will be trusted with real responsibility quickly, and the way to earn more of it is to follow through reliably and ask good questions.',
      },
      {
        heading: 'How to ask for help',
        body: 'Ask early and specifically. "I am stuck on X, I tried Y, what would you do?" is always welcome and is much better than guessing on something that matters. Nobody here expects you to know everything in week one.',
      },
    ],
  },
];

// First-day / first-week checklist (tickable in the hub).
export type FirstWeekItem = { id: string; label: string; detail: string };
export const FIRST_WEEK: FirstWeekItem[] = [
  { id: 'fw-login', label: 'Log in to the admin', detail: 'Confirm your /admin email and password work. You have full access to look around.' },
  { id: 'fw-link', label: 'Get your partner link', detail: 'Open your partner welcome email and click through to /partners/hq. Find your personal booking link (book?ref=YOURCODE).' },
  { id: 'fw-read', label: 'Read every module above', detail: 'Top to bottom. Mark each one done as you go.' },
  { id: 'fw-playbook', label: 'Read the Outreach Playbook and the call script', detail: 'The Outreach Playbook (in your partner dashboard) and the Script tab are your two main tools.' },
  { id: 'fw-tour', label: 'Skim the admin tabs', detail: 'Open each tab once so you understand the business. You do not run these, just know what they do.' },
  { id: 'fw-mustard', label: 'Ask Mr. Mustard a question', detail: 'Use the yellow button in the bottom-right of the admin. Get comfortable leaning on your in-house guide.' },
  { id: 'fw-social', label: 'Make your first post', detail: 'On brand and on voice, no em dashes. Share something useful with your booking link.' },
  { id: 'fw-convos', label: 'Start three real conversations', detail: 'Use the Outreach Playbook to find and message people who fit. Help first, link second.' },
  { id: 'fw-call', label: 'Book your first discovery call', detail: 'Get one prospect onto the calendar. That is the whole game.' },
];

// Plain-English glossary of terms she will hear.
export type GlossaryTerm = { term: string; def: string };
export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Lead', def: 'A potential customer who has shown interest. Our job is to turn leads into booked calls.' },
  { term: 'Pipeline', def: 'The list of all leads and what stage each is at, from new to won or lost.' },
  { term: 'Discovery call', def: 'The first short call with a lead to understand what they need before we quote.' },
  { term: 'Proposal', def: 'The document that lays out scope and a fixed price for a client to sign and pay a deposit on.' },
  { term: 'Deposit and balance', def: 'Clients pay half up front (deposit) to start and the rest (balance) on delivery.' },
  { term: 'CRM', def: 'Customer Relationship Manager. The system that tracks leads and clients. Our admin is our CRM.' },
  { term: 'SDR', def: 'Sales Development Rep. The person (or AI agent) who does first outreach and qualifies leads.' },
  { term: 'Lead magnet', def: 'A free, useful thing (a checklist, an audit) we give away to attract leads and capture their email.' },
  { term: 'Funnel', def: 'The path a stranger takes from first seeing us to becoming a paying client.' },
  { term: 'Conversion', def: 'When someone takes the action we wanted, like booking a call or buying.' },
  { term: 'MRR', def: 'Monthly Recurring Revenue. Income that repeats every month from ongoing plans.' },
  { term: 'SEO', def: 'Search Engine Optimization. Making our pages show up on Google.' },
  { term: 'GEO', def: 'Getting cited inside AI answers (ChatGPT, Perplexity), where more people now search.' },
  { term: 'Portal', def: 'The private logged-in area where a client tracks their own project.' },
  { term: 'Deploy / ship', def: 'To put a website or change live on the internet. "We shipped it" means it is live.' },
  { term: 'API', def: 'A way for two software tools to talk to each other automatically.' },
  { term: 'Prompt', def: 'The instructions you type to an AI to get what you want.' },
  { term: 'Automation', def: 'A task set up to run by itself when something happens (a new lead triggers a reply).' },
];

export const TOTAL_MINUTES = MODULES.reduce((sum, m) => sum + m.minutes, 0);
