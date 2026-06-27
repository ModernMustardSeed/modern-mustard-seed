/**
 * Single source for the AI Voice Agent whitepaper. Rendered by the web page
 * (app/voice-agents/whitepaper) and the downloadable PDF
 * (scripts/make-whitepaper-pdf.mjs). House voice: sharp, founder-to-founder, no
 * em dashes.
 */

export const WHITEPAPER = {
  slug: 'ai-voice-agents',
  title: 'The Always-On Voice Agent',
  subtitle:
    'How an AI phone agent answers every call, remembers every caller, speaks 100+ languages, and books real business 24/7, so your phone becomes your best salesperson instead of your biggest leak.',
  author: 'Sarah Scarano, Modern Mustard Seed',
  dateISO: '2026-06-27',
  dateLabel: 'June 2026',
  readingMinutes: 8,
  intro:
    'Most businesses lose more revenue at the phone than anywhere else, and they never see it happen. A call comes in while you are on a job, with a client, or asleep. It rolls to voicemail. The caller hangs up and dials the next name on the list. That lost call is not a missed message, it is a lost customer, and it happens all day, every day. This paper lays out a different answer: a voice agent that picks up every call in a natural human voice, knows who is calling, speaks their language, and turns the conversation into a booking, an order, or a qualified lead, around the clock.',

  sections: [
    {
      heading: 'The leak no one is measuring',
      body: [
        'Speed wins. Reach a new lead within five minutes and you are up to 100 times more likely to connect than at thirty minutes. Most buyers simply go with the first business that answers. Voicemail loses to the competitor who picked up.',
        'The math is brutal and invisible. Every after-hours call, every lunch-rush call you could not grab, every Friday-night flood of orders that rolled to voicemail, those are sales that quietly went somewhere else. You never get a report on the customers you never knew called.',
      ],
    },
    {
      heading: 'Meet the agent',
      body: [
        'A Modern Mustard Seed voice agent answers your phone in a natural human voice, instantly, every hour of every day. It is not a phone tree and not a recording. It holds a real conversation, handles the moment, and gets the outcome: a booked appointment, a captured order, a qualified lead, or a true emergency routed straight to you.',
        'You can hear ours right now. Mr. Mustard is the same kind of agent we build for clients, live on our site. Talk to him, in the language of your choice, and he will answer like the receptionist you wish you had.',
      ],
    },
    {
      heading: 'It remembers',
      body: [
        'Most automated systems treat every call like the first. Ours does not. The agent has persistent memory: it recognizes a returning caller by their number (or email on the web), recalls what you talked about last time, greets them by name, and picks up the thread instead of starting cold.',
        'For a customer, that is the difference between a machine and a relationship. The agent already knows their name, their business, what they were interested in, and whether they have booked before, so every call feels like talking to someone who knows them.',
      ],
    },
    {
      heading: 'It speaks their language',
      body: [
        'The agent speaks more than 100 languages. It detects the language a caller is speaking and replies in kind, and it can switch mid-conversation. English, Spanish, French, Portuguese, German, Mandarin, Russian, and dozens more, in a native-sounding voice.',
        'For a business with Spanish-speaking or multilingual customers, that means serving everyone with no second phone line and no bilingual hire. The competitor who only answers in English just lost that caller to you.',
      ],
    },
    {
      heading: 'It is a full sales rep, not just a receptionist',
      body: [
        'The same agent that answers your inbound calls can also go on offense. It works as a tireless SDR across three jobs at once:',
      ],
      bullets: [
        { title: 'Answers inbound, 24/7', text: 'Every call, every hour, including the nights, weekends, and overflow that go to voicemail today.' },
        { title: 'Speed-to-lead return calls', text: 'The moment someone fills out a form or runs your website audit, the agent calls them back within seconds, while they are still thinking about you.' },
        { title: 'Outbound campaigns', text: 'It works a list and opens with a real, personalized hook (even a quick audit of the prospect\'s own website), then books the demo. A hundred dials without burning out a single rep.' },
      ],
    },
    {
      heading: 'It books, sends, and follows up',
      body: [
        'The agent books real appointments against your live calendar while the caller is on the line, then sends the confirmation by email or text. If the caller is not ready, it captures the lead and drops it into your CRM with notes, and follows up automatically so nothing dies from neglect.',
      ],
    },
    {
      heading: 'It takes the order, and fires it to the kitchen',
      body: [
        'For restaurants and any order-taking business, the agent reads your menu, takes the full takeout or delivery order, repeats it back to the caller, and sends it straight to your kitchen or POS, with a pay link or card capture if you want payment up front. When the dinner rush hits, it answers every line at once, so the whole Friday-night flood gets handled instead of rolling to voicemail.',
      ],
    },
    {
      heading: 'It upsells, qualifies, and protects your time',
      body: [
        'A good rep does more than take the order. The agent suggests the natural add-on, asks the qualifying questions that matter, and captures the details you need. It also knows its limits: a real emergency rings straight through to you, on the rules you set, and anything it cannot answer it captures cleanly instead of guessing.',
      ],
    },
    {
      heading: 'Everything is captured',
      body: [
        'Every call is logged with a full transcript of both sides, a short summary, and the outcome, all in one place. You can read exactly how a call went, coach from real conversations, and see what is converting. Nothing happens in a black box.',
      ],
    },
    {
      heading: 'It is honest by design',
      body: [
        'The agent opens by saying it is an AI and notes when a call may be recorded. That honesty is a feature, not a weakness: callers are hearing the exact product you could deploy for them, and transparency keeps you on the right side of state calling and recording laws. It honors do-not-call requests on the spot.',
      ],
    },
    {
      heading: 'How it works',
      body: [
        'Three steps, and it is live on your number in about two weeks. First, we learn your business: your services, hours, FAQs, the way you talk, and exactly what counts as an emergency. Second, we build and train the agent with a custom voice, your script, and your calendar and CRM wired in, tested against real call flows before it ever picks up. Third, it answers from day one, fully yours, with every call captured from the first ring.',
      ],
    },
    {
      heading: 'The economics',
      body: [
        'A voice agent costs less than a part-time receptionist and never sleeps, never quits, never calls in sick, and never puts a caller on hold. It scales to answer ten calls at once as easily as one. The real return is the revenue you stop leaking: the after-hours bookings, the rush-hour orders, and the speed-to-lead calls that used to go to whoever answered first.',
      ],
    },
    {
      heading: 'Who it is for',
      body: [
        'Any business that lives on the phone. Home services (HVAC, plumbing, electrical, roofing, landscaping) that miss calls on the job. Restaurants drowning in the dinner rush. Medspas, salons, dental, chiropractic, and veterinary clinics with a slammed front desk. Real estate, law, and insurance offices where every missed call is a real opportunity. If a caller going to voicemail costs you money, this pays for itself.',
      ],
    },
  ],

  cta: {
    heading: 'Hear it, then put it to work',
    body: 'Talk to Mr. Mustard live on our voice-agents page, in any language, then book a short call and we will scope an agent to your business and your call volume.',
  },
};

export type Whitepaper = typeof WHITEPAPER;
