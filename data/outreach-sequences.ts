// Reusable cold-outreach sequences surfaced in the admin Outreach page so Sarah
// (and the team) can grab a proven multi-touch sequence, personalize the tokens,
// and send. These are templates, separate from the per-prospect AI drafter.
// MMS voice: sharp, founder-to-founder, benefit-led, no em dashes.

export type OutreachTouch = {
  day: number;
  channel: 'DM' | 'Email';
  subject?: string;
  body: string;
};

export type OutreachSequence = {
  id: string;
  name: string;
  audience: string;
  goal: string;
  tokens: string[];
  touches: OutreachTouch[];
};

export const outreachSequences: OutreachSequence[] = [
  {
    id: 'restaurants',
    name: 'Restaurants: phone orders + missed-call revenue',
    audience: 'Independent restaurant owners and GMs (single location or small group).',
    goal: 'Book a discovery call, or get them onto /for/restaurants and the leak calculator.',
    tokens: ['{{firstName}}', '{{restaurant}}', '{{city}}'],
    touches: [
      {
        day: 0,
        channel: 'DM',
        body:
          "Hi {{firstName}}, came across {{restaurant}} and the menu looks great. Quick one: when you're slammed at dinner, who's actually answering the phone? I build AI phone agents for restaurants that take the order, book the table, and fire it to your POS so the rush never rolls to voicemail. Worth a 2-minute look?",
      },
      {
        day: 2,
        channel: 'Email',
        subject: "{{restaurant}}'s phone during the dinner rush",
        body:
          'Hi {{firstName}},\n\n' +
          'Quick math most {{city}} restaurants never run: 15 missed calls a week at a $32 average ticket is about $1,900 a month walking out the door. During the rush, those are takeout orders and tables going to the place that picked up.\n\n' +
          'I build AI voice agents that answer every call in a natural voice, take the full order and fire it to your POS (Toast, Square, Clover), book reservations, and recover the calls you miss. Live in about two weeks, on your own number.\n\n' +
          'Here is how it works for restaurants: https://modernmustardseed.com/for/restaurants\n\n' +
          'If it is worth 15 minutes, grab a time here: https://modernmustardseed.com/book\n\n' +
          'Either way, the calculator on that page shows your own number in 30 seconds.\n\n' +
          'Sarah\nModern Mustard Seed',
      },
      {
        day: 5,
        channel: 'DM',
        body:
          "{{firstName}}, no pressure on my note. One thing that might help either way: a 30-second calculator that shows what missed calls cost a restaurant your size. https://modernmustardseed.com/for/restaurants . If the number stings, I can plug the leak in about two weeks.",
      },
      {
        day: 9,
        channel: 'Email',
        subject: 'Last one, {{firstName}}',
        body:
          'Hi {{firstName}},\n\n' +
          "I will leave it here so I am not cluttering your inbox. If the dinner-rush phone ever becomes the bottleneck, the door is open: https://modernmustardseed.com/for/restaurants\n\n" +
          'Rooting for {{restaurant}} either way.\n\n' +
          'Sarah',
      },
    ],
  },
];
