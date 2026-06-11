/**
 * New hire onboarding guide. The content for the in-admin Onboarding Hub
 * (components/admin/OnboardingHub) and the printable PDF handbook
 * (lib/onboarding-pdf). Written for a new assistant doing sales and marketing
 * who is new to AI. Plain language, specific to how Modern Mustard Seed works.
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
  body: 'This is your home base. Work through these modules top to bottom and you will know what we do, how we do it, and exactly what your job is. Tick each one off as you finish. Take your time, and ask questions any time. Nobody expects you to memorize this. It lives here so you can come back to it whenever you need it.',
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
        body: 'Read these modules. Shadow Sarah on a couple of real tasks. Get your logins working. Start handling the easy, repeatable things (sorting new leads, drafting replies for approval, scheduling, prepping social posts). By the end of week one you should be able to run the morning routine on your own. There is a first-week checklist at the bottom of this guide.',
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
        heading: 'Where the work happens',
        body: 'Sarah builds in code (this is not a drag-and-drop website builder shop). You do not need to write code. Your world is the admin command center, email, social, and the documents and lists that keep projects and leads moving.',
      },
    ],
  },

  // 4 ───────────────────────────────────────────────────────────────
  {
    id: 'your-role',
    emoji: '💁',
    eyebrow: 'Your job',
    title: 'Your role here',
    summary: 'Assistant, sales, and marketing. What you own day to day.',
    minutes: 6,
    blocks: [
      {
        heading: 'The shape of your job',
        body: 'You wear three hats: assistant (protect Sarah\'s time and keep things moving), sales (catch every lead and move them toward a booked call), and marketing (keep us visible and bringing in new leads). The thread through all three is follow-through: nothing falls through the cracks on your watch.',
      },
      {
        heading: 'Assistant: what you own',
        bullets: [
          'The inbox and the calendar: triage, schedule, confirm, remind.',
          'Keeping the admin tidy: lead statuses current, projects updated, nothing stale.',
          'Prepping things for Sarah to approve quickly (drafts, summaries, options).',
        ],
      },
      {
        heading: 'Sales: what you own',
        bullets: [
          'Every new lead gets a fast, warm first reply (speed matters, see the sales module).',
          'Qualify gently, then push toward a booked discovery call.',
          'Keep the pipeline honest so we always know who needs a nudge.',
        ],
      },
      {
        heading: 'Marketing: what you own',
        bullets: [
          'Keep a steady drumbeat of social posts and the weekly newsletter going out.',
          'Promote our free tools (they are lead magnets that feed sales).',
          'Stay on brand and on voice in everything public.',
        ],
      },
      {
        heading: 'The golden rule',
        body: 'When in doubt, draft it and ask. You are trusted to do a lot on your own, but anything that goes OUT to a client or the public gets a quick human approval first. That one habit keeps us safe and keeps the bar high.',
      },
    ],
  },

  // 5 ───────────────────────────────────────────────────────────────
  {
    id: 'command-center',
    emoji: '🎛️',
    eyebrow: 'Your main tool',
    title: 'The admin command center, tab by tab',
    summary: 'This is where you will spend most of your day. Here is every tab.',
    minutes: 9,
    blocks: [
      {
        heading: 'How it is organized',
        body: 'You reach it at /admin with your own login. Everything is keyed by the client or lead\'s email, so the same person\'s lead, proposal, project, and files all connect. The tabs across the top follow the funnel from first contact to delivery.',
      },
      {
        heading: 'Overview',
        body: 'The dashboard. New leads, upcoming calls, client messages, and a daily AI brief that tells you what to focus on. Start your day here. (Revenue figures may be hidden on your login, that is normal.)',
      },
      {
        heading: 'Calendar and Pipeline',
        bullets: [
          'Calendar: upcoming discovery calls, with a join link and an add-to-calendar button.',
          'Pipeline: every lead. Click one to open the drawer with their details, status, your private notes, and the full timeline. This is your sales home base.',
        ],
      },
      {
        heading: 'Audit, Proposals, Projects',
        bullets: [
          'Audit: run a free website grade on any URL to send a lead as a warm opener.',
          'Proposals: build a fixed-scope quote, draft the wording with AI, and send it for signature and deposit. (Sarah usually owns pricing here, you help prep and send.)',
          'Projects: create a client and start their project, set status, progress, milestones, and the launch date. Clients see all of this in their portal.',
        ],
      },
      {
        heading: 'Reviews, Outreach, Partners, Onboarding',
        bullets: [
          'Reviews: approve client reviews to publish them on the site.',
          'Outreach: a prospect list with AI-drafted messages for you to review and approve.',
          'Partners: people who refer business to us.',
          'Onboarding: this guide. It lives right here so you can reopen it any time.',
        ],
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
        heading: 'Speed is everything',
        body: 'The single biggest lever in sales is how fast we reply. A lead who hears back in five minutes is far more likely to book than one who waits a day. When a new lead comes in, your first job is a fast, friendly, human first touch. Draft it, get a quick okay if it is your first week, and send.',
      },
      {
        heading: 'The pipeline stages',
        bullets: [
          'New: just came in, needs a first reply.',
          'Replied: we have reached out, waiting on them.',
          'Booked: discovery call is on the calendar (the goal).',
          'Won / Lost: closed one way or the other. Keep these honest.',
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
          'Admin command center: your own email and password at /admin (Sarah sets this up for you).',
          'Company email on the modernmustardseed.com domain (Google Workspace).',
          'The social accounts and our posting tool, so you can schedule content.',
          'Read access to the calendar so you can book and confirm calls.',
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
  { id: 'fw-login', label: 'Log in to the admin', detail: 'Confirm your /admin email and password work, and change your password if asked.' },
  { id: 'fw-email', label: 'Get your company email working', detail: 'Send a test email from your you@modernmustardseed.com address.' },
  { id: 'fw-read', label: 'Read every module above', detail: 'Top to bottom. Mark each one done as you go.' },
  { id: 'fw-access', label: 'Send your access list', detail: 'One message to Sarah listing anything you still cannot log into.' },
  { id: 'fw-tour', label: 'Click through every admin tab', detail: 'Open each tab once so nothing is a mystery. Do not change anything yet.' },
  { id: 'fw-lead', label: 'Draft one practice lead reply', detail: 'Pick a real new lead, draft a first reply, and show Sarah before sending.' },
  { id: 'fw-social', label: 'Draft one social post', detail: 'On brand and on voice, no em dashes. Get a quick okay before it posts.' },
  { id: 'fw-calls', label: 'Book or confirm one call', detail: 'Practice the calendar flow end to end with a real or test booking.' },
  { id: 'fw-routine', label: 'Run the morning routine solo', detail: 'By the end of week one: check overview, triage new leads, update statuses, prep the day.' },
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
