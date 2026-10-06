/**
 * THE CLOSER COPY FOR THE COMPARE AND BEST PAGES.
 *
 * Pages about answering calls get the ring box (variant 'ring'): the visitor
 * hears an AI receptionist on their own phone, and the number is the lead.
 * Pages about websites and builds get a booking prompt (variant 'book') worded
 * to the question that page answers, because a voice-agent demo would answer
 * the wrong question there.
 *
 * Two placements per page: `answer` sits right after the hero answer, `faq`
 * sits right before the FAQ. No prices, ever (CLAUDE.md conventions).
 */

export type CloserCopy = {
  variant: 'ring' | 'book';
  answer: { heading: string; lede: string };
  faq: { heading: string; lede: string };
  bookLabel?: string;
};

const RING_DEFAULT: CloserCopy = {
  variant: 'ring',
  answer: {
    heading: 'Hear an AI receptionist answer you.',
    lede: 'Type your number and ours calls you in about ten seconds. Ask what your customers ask, then decide.',
  },
  faq: {
    heading: 'Still deciding? Let it take a call.',
    lede: 'Drop your number, tell him your trade, and he answers the way your own receptionist would.',
  },
};

export const compareCloser: Record<string, CloserCopy> = {
  'ai-receptionist-vs-answering-service': {
    variant: 'ring',
    answer: {
      heading: 'Hear the AI side of this comparison.',
      lede: 'Type your number and our AI receptionist calls you in about ten seconds. Ask it what a caller would ask an answering service, and compare the call.',
    },
    faq: RING_DEFAULT.faq,
  },
  'ai-receptionist-vs-voicemail': {
    variant: 'ring',
    answer: {
      heading: 'Hear what callers get instead of a beep.',
      lede: 'Type your number and our AI receptionist calls you in about ten seconds. Play the customer who would have hung up on your voicemail.',
    },
    faq: RING_DEFAULT.faq,
  },
  'freelancer-vs-studio': {
    variant: 'book',
    answer: {
      heading: 'Not sure a freelancer can carry your project?',
      lede: 'Tell us what you are building and we will tell you honestly whether you need a studio or a single good freelancer.',
    },
    faq: {
      heading: 'Get a straight answer on your project.',
      lede: 'One call, your scope on the table, and a set package price if we are the right fit.',
    },
  },
  'web-agency-vs-product-studio': {
    variant: 'book',
    answer: {
      heading: 'Agency or studio: which one is your project?',
      lede: 'Bring the idea. We will tell you which kind of team it needs, even when the answer is not us.',
    },
    faq: {
      heading: 'Talk through your build.',
      lede: 'One call, your scope on the table, and a set package price if we are the right fit.',
    },
  },
  'wix-squarespace-vs-custom-website': {
    variant: 'book',
    answer: {
      heading: 'Outgrowing your website builder?',
      lede: 'Tell us what the site has to do. If a template will carry it, we will say so.',
    },
    faq: {
      heading: 'Find out what a custom site would do for you.',
      lede: 'One call about your business, and a set package price if a custom site is the right move.',
    },
  },
  'gohighlevel-vs-custom-build': {
    variant: 'book',
    answer: {
      heading: 'Is your stack built for your business, or are you built around it?',
      lede: 'Walk us through your workflow and we will tell you whether a platform or a custom build fits.',
    },
    faq: {
      heading: 'Map your workflow with us.',
      lede: 'One call, your tools on the table, and a set package price if a build is the better path.',
    },
  },
  'bubble-no-code-vs-custom-app': {
    variant: 'book',
    answer: {
      heading: 'No-code or custom: which does your app need?',
      lede: 'Tell us what the app has to do. If no-code will carry it, we will say so.',
    },
    faq: {
      heading: 'Get an honest read on your app.',
      lede: 'One call about the idea, and a set package price if a custom build is the right move.',
    },
  },
  'in-house-developer-vs-product-studio': {
    variant: 'book',
    answer: {
      heading: 'Hire a developer or hire a studio?',
      lede: 'Tell us what you need built and how long it has to live. We will tell you which path fits.',
    },
    faq: {
      heading: 'Talk it through before you hire.',
      lede: 'One call, your plans on the table, and a set package price if a studio is the better path.',
    },
  },
};

export const bestCloser: Record<string, CloserCopy> = {
  'ai-receptionists-for-contractors': {
    variant: 'ring',
    answer: {
      heading: 'Hear one answer a job-site call.',
      lede: 'Type your number and our AI receptionist calls you in about ten seconds. Ask it about an emergency, a quote, or a booking, the way your customers do.',
    },
    faq: RING_DEFAULT.faq,
  },
  'ways-to-answer-calls-on-the-job': {
    variant: 'ring',
    answer: {
      heading: 'Hear the option that answers while you work.',
      lede: 'Type your number and our AI receptionist calls you in about ten seconds. Ask it what a customer asks while your hands are full.',
    },
    faq: RING_DEFAULT.faq,
  },
  'ways-to-get-a-website-montana-small-business': {
    variant: 'book',
    answer: {
      heading: 'Want an honest read on your options?',
      lede: 'Tell us about your business and we will point you to the right option on this list, even when it is not us.',
    },
    faq: {
      heading: 'Talk it through with a Montana studio.',
      lede: 'One call about your business, and a set package price if a custom site is the right fit.',
    },
  },
  'ways-for-non-technical-founders-to-build-a-product': {
    variant: 'book',
    answer: {
      heading: 'Have an idea and no team?',
      lede: 'Tell us the idea. We will tell you the fastest honest path to a working product.',
    },
    faq: {
      heading: 'Turn the idea into a plan.',
      lede: 'One call, the idea on the table, and a set package price if we build it.',
    },
  },
  'ways-to-get-recommended-by-chatgpt-and-google-ai': {
    variant: 'book',
    answer: {
      heading: 'Want to know where you stand in AI search?',
      lede: 'Tell us your business and we will tell you what ChatGPT and Google can read about you today.',
    },
    faq: {
      heading: 'Get found by the answer engines.',
      lede: 'One call about your business, and a set package price for the work if it is worth doing.',
    },
  },
};

export const ringDefault = RING_DEFAULT;
