/**
 * Partner promo kit content. Ready-to-post swipe copy for each headline offer,
 * in the three formats a creator actually posts in. The {{LINK}} token is
 * replaced client-side with the partner's own tracked link (their ref code on
 * the right destination), so a partner can copy, lightly reword, and post the
 * same day. Voice: honest, warm, no hype, no em dashes, commission always
 * disclosed (it is the trust).
 */

export type SwipeOffer = {
  key: string;
  name: string;
  /** What the partner earns, in one line (shown on the card). */
  earn: string;
  /** The page their ref link points at. */
  linkPath: string;
  /** Who this offer is for (helps the partner pick). */
  bestFor: string;
  swipes: {
    /** Short X / Threads post. */
    x: string;
    /** Instagram / Facebook / LinkedIn caption. */
    social: string;
    /** Newsletter / email blurb. */
    email: string;
  };
};

export const SWIPE_OFFERS: SwipeOffer[] = [
  {
    key: 'builder-bundle',
    name: 'The Builder Bundle',
    earn: 'You earn ~$98 per sale (50% of $197)',
    linkPath: '/store',
    bestFor: 'Audiences that want to build with AI (Claude Code, Shopify, brand systems).',
    swipes: {
      x: `If you want to actually build with AI (not just talk about it), Modern Mustard Seed put their whole build stack into one bundle: Claude Code, a real Shopify build, a brand system, and AI search. It is what I point people to. (Affiliate link, I earn a cut.) {{LINK}}`,
      social: `A lot of you ask me where to start building with AI. Honestly? The Builder Bundle from Modern Mustard Seed.\n\nIt is four playbooks: shipping apps with Claude Code, building a real Shopify store, a full brand system, and getting found in AI search. No fluff, all production-tested.\n\nI use this stuff, so I am comfortable recommending it. Full transparency, the link is an affiliate link and I earn a commission if you grab it. Link below.\n\n{{LINK}}`,
      email: `One resource I keep coming back to: the Builder Bundle from Modern Mustard Seed. It is four playbooks (Claude Code, Shopify with Claude Code, a brand system, and AI search) for people who want to build real things with AI instead of just reading about it. Every command is production-tested. It is $197 for all four, and to be upfront, the link below is an affiliate link, so I earn a commission if you buy. I only share things I have actually used. Here it is: {{LINK}}`,
    },
  },
  {
    key: 'foundations-bundle',
    name: 'The Foundations Bundle',
    earn: 'You earn ~$48 per sale (50% of $97)',
    linkPath: '/store',
    bestFor: 'Solopreneurs and operators building a lean, AI-powered business.',
    swipes: {
      x: `The clearest "here is how to build an AI-native business" resource I have found: the Foundations Bundle from Modern Mustard Seed. Scope your first AI product, design the business, and build the sales system. (Affiliate link, I earn a cut.) {{LINK}}`,
      social: `If you are trying to build a lean business with AI doing the heavy lifting, start here.\n\nThe Foundations Bundle from Modern Mustard Seed is three playbooks: find your AI product, design the business around it, and build the sales system that fills it. It is the stuff I wish I had when I started.\n\nBeing straight with you: affiliate link below, I earn a commission if you grab it. Would not share it if I did not rate it.\n\n{{LINK}}`,
      email: `If "build an AI-native business" feels vague, the Foundations Bundle from Modern Mustard Seed makes it concrete: scope your first high-impact AI product, design the business, and build an automated sales system. Three playbooks, $97. Transparency note, the link is an affiliate link and I earn a commission on any sale. I share it because it is genuinely good. {{LINK}}`,
    },
  },
  {
    key: 'geo-playbook',
    name: 'The GEO & AI Commerce Playbook',
    earn: 'You earn ~$33.50 per sale (50% of $67)',
    linkPath: '/store',
    bestFor: 'Store owners and marketers who need to be found and cited by AI.',
    swipes: {
      x: `SEO is not enough anymore. If you sell online, you need to get cited inside ChatGPT, Perplexity, and Google AI. The GEO & AI Commerce Playbook from Modern Mustard Seed is the clearest guide I have seen. (Affiliate link.) {{LINK}}`,
      social: `Your customers are asking ChatGPT and Perplexity what to buy. Are you showing up in the answer?\n\nThe GEO & AI Commerce Playbook from Modern Mustard Seed breaks down exactly how to get found, cited, and sold by AI: the content framework, product data, and AI shopping setup. If you run a store or a content site, this is timely.\n\nHeads up, affiliate link below, I earn a commission. Sharing because it is the real playbook, not theory.\n\n{{LINK}}`,
      email: `AI search is quietly rewriting how people find products, and almost nobody has a strategy for it. The GEO & AI Commerce Playbook from Modern Mustard Seed is the fix: how to get cited in ChatGPT, Perplexity, and Google AI, plus how to set your store up for AI shopping. $67, and yes the link is an affiliate link (I earn a commission). I would not send it if it were not worth your time. {{LINK}}`,
    },
  },
  {
    key: 'ai-receptionist',
    name: 'The AI Receptionist (recurring)',
    earn: 'You earn 25% of their bill, every month, for a year',
    linkPath: '/sidekick',
    bestFor: 'Anyone with local or service-business owners in their audience.',
    swipes: {
      x: `Know a business that misses calls? Modern Mustard Seed builds a 24/7 AI receptionist that answers, books, and takes messages on their own number. You can hear a demo of your own in 60 seconds. (I earn a referral cut if you sign up.) {{LINK}}`,
      social: `Every missed call is a lost customer. If you run a service business (or you know someone who does), this is worth 60 seconds.\n\nModern Mustard Seed builds a 24/7 AI receptionist that answers your phone, books jobs, and takes messages, live on your own number in about a week. You can literally hear a demo of yours answering before you decide anything.\n\nFull transparency: I earn a referral commission if you become a customer. I only put my name on things that actually work, and this one does.\n\n{{LINK}}`,
      email: `A recommendation for the business owners on this list: Modern Mustard Seed builds a 24/7 AI receptionist that answers your phone, books appointments, and never misses an after-hours call, on your own number, live in about a week. You can hear a personalized demo answer in 60 seconds before you spend a dime. Disclosure: I earn a referral commission if you sign up. I share it because missed calls are real money and this fixes them. {{LINK}}`,
    },
  },
  {
    key: 'custom-build',
    name: 'A Custom Build',
    earn: 'You earn 10% of the project (up to 20% as a Producer)',
    linkPath: '/book',
    bestFor: 'Bigger clients who need a real site, app, voice agent, or software.',
    swipes: {
      x: `If you know a business that needs a real build (a site, an AI assistant, a voice agent, custom software), Modern Mustard Seed ships them fast and does not overcharge. Happy to intro. (I earn a referral fee on builds.) {{LINK}}`,
      social: `Every so often someone in my audience needs a real build, not a template. A proper website, an AI assistant, a voice agent, custom software.\n\nI send them to Modern Mustard Seed. Sarah and her team ship genuinely good work, fast, at a fair price. If that is you, book a call through the link.\n\nTransparency: I earn a referral fee if a build closes. I only refer people I trust with my audience.\n\n{{LINK}}`,
      email: `For the few of you who need something built (a site, an AI assistant, a voice agent, or custom software), I point people to Modern Mustard Seed. They ship real, production-grade work quickly and price it fairly. Book a call through the link if that is you. Disclosure: I earn a referral fee on any build that closes. {{LINK}}`,
    },
  },
];
