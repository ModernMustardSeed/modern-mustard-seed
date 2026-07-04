/**
 * The AI Prompt Playbook. Ready-to-paste prompts for people who want to use AI
 * (Claude, ChatGPT, whatever) but have never actually done it. Every prompt is
 * customized to the reader's niche, so it reads like it was written for their
 * exact business, not a generic template.
 *
 * Powers three surfaces:
 *  - the public interactive lead magnet (app/prompt-playbook)
 *  - the branded PDF the reader emails themselves (lib/prompt-playbook-pdf)
 *  - the /playbooks featured card that points at the tool
 *
 * Prompts are built by a function per item so niche variables substitute
 * cleanly. [BRACKETED CAPS] are the blanks the reader fills in themselves.
 * No em dashes anywhere. House style, always.
 */

export type NicheId =
  | 'general'
  | 'solopreneur'
  | 'trades'
  | 'ecom'
  | 'wellness'
  | 'realestate'
  | 'coach'
  | 'creator'
  | 'ministry';

/** The words that get slotted into every prompt so it sounds like the reader. */
export type NicheVars = {
  /** How the reader describes themselves to the AI. Starts with "I". */
  role: string;
  /** How the reader refers to their operation. Possessive, e.g. "my store". */
  business: string;
  /** Who they serve. */
  audience: string;
  /** Their core thing to sell. */
  offer: string;
  /** Where they show up. */
  channel: string;
};

export type Niche = {
  id: NicheId;
  label: string;
  emoji: string;
  blurb: string;
  examples: string;
  vars: NicheVars;
};

export const NICHES: Niche[] = [
  {
    id: 'general',
    label: 'Anything / Just curious',
    emoji: '🌱',
    blurb: 'Never used AI and not sure where it fits yet? Start here. A smart default for any kind of work.',
    examples: 'Any business, side project, or personal use.',
    vars: {
      role: 'I run a small business',
      business: 'my business',
      audience: 'my customers',
      offer: 'my main product or service',
      channel: 'email, social media, and my website',
    },
  },
  {
    id: 'solopreneur',
    label: 'Solopreneur & Small Business',
    emoji: '💼',
    blurb: 'One person wearing every hat. AI becomes the teammate you cannot afford to hire yet.',
    examples: 'Freelancers, one-person shops, small local businesses.',
    vars: {
      role: 'I am a solopreneur running my own business',
      business: 'my business',
      audience: 'my ideal customers',
      offer: 'my core offer',
      channel: 'email and social media',
    },
  },
  {
    id: 'trades',
    label: 'Trades & Home Services',
    emoji: '🔧',
    blurb: 'You are in the field, not at a desk. These write the messages and posts you never have time for.',
    examples: 'Landscaping, HVAC, cleaning, contractors, plumbing, handyman, auto.',
    vars: {
      role: 'I own a home services and trades business',
      business: 'my home services business',
      audience: 'local homeowners',
      offer: 'a seasonal service or repair',
      channel: 'Facebook, Nextdoor, and Google',
    },
  },
  {
    id: 'ecom',
    label: 'Retail & Ecommerce',
    emoji: '🛍️',
    blurb: 'Product descriptions, launches, and a month of content, written while you pack orders.',
    examples: 'Online stores, boutiques, apparel and product brands.',
    vars: {
      role: 'I run an online store',
      business: 'my store',
      audience: 'online shoppers',
      offer: 'my bestselling product',
      channel: 'Instagram, TikTok, and email',
    },
  },
  {
    id: 'wellness',
    label: 'Health, Beauty & Wellness',
    emoji: '💆',
    blurb: 'Fill the book and keep clients close, with content and messages that sound like you.',
    examples: 'Salons, spas, gyms, studios, coaches, practitioners.',
    vars: {
      role: 'I run a health, beauty, or wellness business',
      business: 'my studio',
      audience: 'clients who want to look and feel their best',
      offer: 'a signature treatment or package',
      channel: 'Instagram and email',
    },
  },
  {
    id: 'realestate',
    label: 'Real Estate & Sales',
    emoji: '🏡',
    blurb: 'Listings, follow-ups, and outreach that used to eat your evenings, handled in minutes.',
    examples: 'Agents, brokers, loan officers, sales pros.',
    vars: {
      role: 'I am a real estate agent',
      business: 'my real estate business',
      audience: 'buyers and sellers in my market',
      offer: 'a free home valuation or buyer consult',
      channel: 'email, Instagram, and my listings',
    },
  },
  {
    id: 'coach',
    label: 'Coaches & Consultants',
    emoji: '🎯',
    blurb: 'Turn your expertise into content, proposals, and programs without the blank-page dread.',
    examples: 'Coaches, consultants, advisors, agencies, service pros.',
    vars: {
      role: 'I am a coach and consultant',
      business: 'my practice',
      audience: 'the clients I help',
      offer: 'my signature program',
      channel: 'email, LinkedIn, and my newsletter',
    },
  },
  {
    id: 'creator',
    label: 'Creators & Marketers',
    emoji: '🎨',
    blurb: 'Never stare at an empty caption box again. Ideas, hooks, and posts on tap.',
    examples: 'Content creators, marketers, influencers, personal brands.',
    vars: {
      role: 'I am a creator and marketer',
      business: 'my brand',
      audience: 'my audience',
      offer: 'my content, product, or service',
      channel: 'Instagram, TikTok, YouTube, and email',
    },
  },
  {
    id: 'ministry',
    label: 'Ministry & Nonprofit',
    emoji: '✝️',
    blurb: 'Reach your community with warmth and clarity, and get hours of admin back for the mission.',
    examples: 'Churches, ministries, nonprofits, community groups.',
    vars: {
      role: 'I help run a church and nonprofit',
      business: 'our ministry',
      audience: 'our community and members',
      offer: 'an event, service, or program',
      channel: 'email, our website, and social media',
    },
  },
];

export const nicheById = (id: string): Niche => NICHES.find((n) => n.id === id) || NICHES[0];

export type Category = {
  id: string;
  title: string;
  eyebrow: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { id: 'start', title: 'Start here', eyebrow: 'Warm up', blurb: 'Two minutes to go from never having used AI to knowing exactly what to type.' },
  { id: 'write', title: 'Write anything, fast', eyebrow: 'Category 1', blurb: 'The emails, replies, and messages you keep putting off, done in a single paste.' },
  { id: 'market', title: 'Marketing and content', eyebrow: 'Category 2', blurb: 'A week of posts, a newsletter, a caption that sells. Your content problem, solved.' },
  { id: 'sell', title: 'Win the customer', eyebrow: 'Category 3', blurb: 'Proposals, objections, and outreach that turn interest into paying work.' },
  { id: 'run', title: 'Run the business', eyebrow: 'Category 4', blurb: 'Summarize the long thing, write the SOP, plan the week. Get your time back.' },
  { id: 'decide', title: 'Get smart and decide', eyebrow: 'Category 5', blurb: 'Learn anything, weigh your options, and get honest feedback before you hit send.' },
];

export type PromptItem = {
  id: string;
  category: string;
  title: string;
  /** One line on what this prompt does for them. */
  what: string;
  /** Builds the ready-to-paste prompt, customized to the niche. */
  build: (v: NicheVars) => string;
  /** Optional pro tip shown under the prompt. */
  tip?: string;
};

export const PROMPTS: PromptItem[] = [
  // ───────────────────────── Start here ─────────────────────────
  {
    id: 'first-message',
    category: 'start',
    title: 'Your very first message',
    what: 'Paste this first. It teaches the AI who you are so every answer after it is written for your business.',
    build: (v) =>
      `You are my helpful assistant for the day. Here is context to remember for everything I ask: ${v.role}. ${cap(v.business)} mostly serves ${v.audience}, and what we offer is ${v.offer}. When I ask for something, keep it practical, specific, and written in plain, warm language with no jargon and no hype. If you need one more detail to do a great job, ask me before you guess. Ready? Say yes and I will give you my first task.`,
    tip: 'This gives the AI a memory for the whole chat. You only paste it once, then everything you ask afterward comes back tailored to you.',
  },

  // ───────────────────────── Write anything, fast ─────────────────────────
  {
    id: 'email-you-put-off',
    category: 'write',
    title: 'The email you keep putting off',
    what: 'Describe it in one line, get a finished, ready-to-send email back.',
    build: (v) =>
      `Write a friendly, professional email from ${v.business}. Context: ${v.role}. The email is to [WHO IT IS TO] and the goal is to [WHAT YOU WANT TO HAPPEN]. Keep it under 150 words, warm but clear, with one obvious call to action. Give me two versions, one a little more formal and one a little more casual, plus three subject line options.`,
    tip: 'Fill the two [BRACKETS] with your details. Do not overthink them. Half a sentence each is plenty.',
  },
  {
    id: 'tricky-reply',
    category: 'write',
    title: 'Reply to a tricky message',
    what: 'Paste what they sent, get a calm, professional reply that protects the relationship.',
    build: (v) =>
      `Help me reply to this message. Context: ${v.role}, and this is from ${v.audience}. Here is what they wrote:\n\n"[PASTE THEIR MESSAGE]"\n\nI want to [WHAT YOU WANT: keep them happy / politely say no / fix the problem]. Write a calm, kind, professional reply. Give me a short version and a longer version so I can pick.`,
    tip: 'Great for refunds, complaints, and awkward asks. You stay in control of the tone, the AI just gets you started.',
  },
  {
    id: 'notes-to-polished',
    category: 'write',
    title: 'Turn rough notes into something polished',
    what: 'Dump your messy thoughts, get back a clean, professional version in your voice.',
    build: (v) =>
      `Turn these rough notes into a clear, well-organized [EMAIL / POST / DOCUMENT]. Keep my meaning, fix the grammar, and make it sound like a real person from ${v.business}, not a robot. Here are my notes, messy is fine:\n\n[DUMP YOUR NOTES HERE]`,
  },

  // ───────────────────────── Marketing and content ─────────────────────────
  {
    id: 'week-of-posts',
    category: 'market',
    title: 'A week of social posts in one go',
    what: 'Seven ready-to-post captions with hashtags, built around your offer.',
    build: (v) =>
      `Act as a social media marketer for ${v.business}. ${cap(v.role)}, my audience is ${v.audience}, and we post on ${v.channel}. Give me 7 posts for this week to promote ${v.offer}. Mix it up: some helpful tips, some behind the scenes, one that asks a question, one clear promotion. For each, give me the caption and 3 relevant hashtags. Keep the voice warm and human.`,
    tip: 'Do not like post number three? Say "rewrite number three shorter and punchier." You are allowed to be picky. It never gets tired.',
  },
  {
    id: 'sell-not-salesy',
    category: 'market',
    title: 'The post that sells without being salesy',
    what: 'Promote something without the ick. Three styles to choose from.',
    build: (v) =>
      `Write a social post for ${v.channel} that promotes ${v.offer} to ${v.audience} without sounding pushy. Lead with something they actually care about, paint the outcome or tell a tiny story, then invite them to [WHAT YOU WANT THEM TO DO]. End with a soft, confident call to action. Give me 3 options in different styles.`,
  },
  {
    id: 'newsletter',
    category: 'market',
    title: 'Your newsletter, written for you',
    what: 'A short, warm email to your list that gives value and gently sells.',
    build: (v) =>
      `Write a short, friendly email newsletter from ${v.business} to ${v.audience}. Topic: [WHAT IT IS ABOUT]. Structure it as a warm hook, one genuinely useful idea they can use today, and a gentle mention of ${v.offer} at the end. Keep it under 250 words and give me 3 subject line options.`,
  },

  // ───────────────────────── Win the customer ─────────────────────────
  {
    id: 'proposal',
    category: 'sell',
    title: 'A quote or proposal that wins',
    what: 'A clean, persuasive one-pager that makes it easy to say yes.',
    build: (v) =>
      `Help me write a simple, persuasive proposal from ${v.business} for [CUSTOMER OR PROJECT]. Context: ${v.role}. They need [WHAT THEY NEED] and I offer ${v.offer}. Lay it out as: the outcome they want, what I will do, what it costs ([YOUR PRICE]), and why me. Confident, clear, no jargon, one page.`,
  },
  {
    id: 'objection',
    category: 'sell',
    title: 'Handle the "it is too expensive" moment',
    what: 'Three honest, non-defensive ways to respond to the price objection.',
    build: (v) =>
      `${cap(v.role)}. A potential customer said: "[THEIR OBJECTION]". Give me 3 honest, non-defensive ways to respond that focus on the real value ${v.audience} get from ${v.offer}. Kind and confident, never desperate.`,
    tip: 'Swap in any objection, not just price. "I need to think about it" and "I found someone cheaper" both work here.',
  },
  {
    id: 'outreach',
    category: 'sell',
    title: 'Reach out to someone new',
    what: 'A personal-feeling message that makes one small, easy ask.',
    build: (v) =>
      `Write a short, genuine outreach message from ${v.business} to [WHO YOU WANT TO REACH]. Goal: [WHAT YOU WANT]. It should feel personal, not like a template, mention something specific about them, and make one small easy ask. Give me a version for email and a version for [DM OR TEXT].`,
  },

  // ───────────────────────── Run the business ─────────────────────────
  {
    id: 'summarize',
    category: 'run',
    title: 'Summarize anything long',
    what: 'Paste the wall of text, get the three things that matter and what to do.',
    build: (v) =>
      `Summarize the following in plain language for the busy owner of ${v.business}. Give me the 3 main points, anything I need to act on, any deadlines or risks, and a one-sentence bottom line. Here it is:\n\n[PASTE THE LONG TEXT, ARTICLE, CONTRACT, OR EMAIL THREAD]`,
    tip: 'Works on contracts, long threads, reports, even a call transcript. Ask "what should I be worried about here?" for a gut check.',
  },
  {
    id: 'sop',
    category: 'run',
    title: 'Write the SOP so someone else can do it',
    what: 'Turn a task in your head into steps a new helper can follow.',
    build: (v) =>
      `Turn this task into a clear, numbered step-by-step SOP that a brand-new helper at ${v.business} could follow without asking me questions. The task is: [DESCRIBE THE TASK]. Call out anything that is easy to get wrong, and keep it simple.`,
  },
  {
    id: 'plan',
    category: 'run',
    title: 'Plan the week or the project',
    what: 'A realistic, prioritized plan for one busy person, not a fantasy.',
    build: (v) =>
      `Help me make a simple plan. ${cap(v.role)} and I want to [YOUR GOAL] by [WHEN]. Break it into weekly steps I can actually do while still running ${v.business}, put the most important thing first, and flag anything I should not skip. Keep it realistic for one busy person.`,
  },

  // ───────────────────────── Get smart and decide ─────────────────────────
  {
    id: 'explain',
    category: 'decide',
    title: 'Explain it like I am brand new',
    what: 'Any confusing topic, in plain words, with what you actually need to do.',
    build: (v) =>
      `Explain [THE THING YOU DO NOT UNDERSTAND] to me like I run ${v.business} and have never dealt with this before. Use plain language and a real-world example, then tell me the one or two things I actually need to decide or do about it.`,
    tip: 'This is the fastest way to stop feeling behind. Taxes, contracts, ad platforms, anything. No question is too basic for it.',
  },
  {
    id: 'compare',
    category: 'decide',
    title: 'Compare my options',
    what: 'An honest pros and cons for a business like yours, with a real recommendation.',
    build: (v) =>
      `${cap(v.role)} deciding between [OPTION A] and [OPTION B] for ${v.business}. Lay out the real pros and cons of each for a business like mine, what it would cost me in time and money, and which one you would lean toward and why. Be honest, not wishy-washy.`,
  },
  {
    id: 'feedback',
    category: 'decide',
    title: 'Get feedback before you hit send',
    what: 'A friendly but honest second set of eyes, plus the improved version.',
    build: (v) =>
      `Be a friendly but honest advisor to ${v.business}. Here is something I am about to [SEND / POST / PUBLISH]:\n\n[PASTE IT HERE]\n\nTell me what is strong, what is confusing or weak, and exactly how to make it better for ${v.audience}. Then give me the improved version.`,
  },
];

/** Capitalize the first letter of a slotted phrase when it starts a sentence. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ───────────────────────── Helpers ─────────────────────────

export type ResolvedPrompt = Omit<PromptItem, 'build'> & { text: string };
export type ResolvedCategory = Category & { prompts: ResolvedPrompt[] };

/** Every prompt with its text built for the chosen niche. */
export function promptsForNiche(nicheId: NicheId): ResolvedPrompt[] {
  const { vars } = nicheById(nicheId);
  return PROMPTS.map(({ build, ...rest }) => ({ ...rest, text: build(vars) }));
}

/** Categories populated with their resolved prompts. */
export function playbookForNiche(nicheId: NicheId): ResolvedCategory[] {
  const resolved = promptsForNiche(nicheId);
  return CATEGORIES.map((c) => ({ ...c, prompts: resolved.filter((p) => p.category === c.id) })).filter(
    (c) => c.prompts.length > 0,
  );
}

export function totalPrompts(): number {
  return PROMPTS.length;
}

/** The one-time teaching block: the 4 parts of a great prompt. */
export const PROMPT_FORMULA: { part: string; tell: string; example: string }[] = [
  { part: 'Role', tell: 'Tell it who to be.', example: '"Act as a marketer for my business."' },
  { part: 'Context', tell: 'Tell it about you.', example: '"I run a bakery. My customers are local families."' },
  { part: 'Task', tell: 'Say exactly what you want.', example: '"Write 7 Instagram captions for this week."' },
  { part: 'Format', tell: 'Say how to answer.', example: '"Each under 200 characters, with 3 hashtags."' },
];
