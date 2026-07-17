/**
 * Campaign playbooks for the Campaigns module of the forged BUSINESS OS demo.
 * Universal plays that read as trade-native through interpolation: {job} is the
 * trade's job word, {city} the lead's town, {biz} the business. Numbers shown in
 * the demo are deterministic sample projections derived from the trade's average
 * ticket, honestly labeled. The real build runs these for real.
 */

export type OsCampaignStep = {
  /** What the OS does at this step, in one line. */
  title: string;
  /** The channel chip: Text, Email, Ads, Social, Calls. */
  channel: 'Text' | 'Email' | 'Ads' | 'Social' | 'Calls';
};

export type OsCampaignPlay = {
  key: string;
  name: string;
  /** The one-line promise on the card. */
  hook: string;
  /** Who it reaches, shown as the audience line. */
  audience: string;
  steps: OsCampaignStep[];
  /** Sample first message, interpolated and shown during the build theater. */
  sampleMessage: string;
  /** Bookings the sample projection claims, scaled against avg ticket. */
  projectedBookings: number;
  /** Days the play runs. */
  days: number;
};

export const CAMPAIGN_PLAYS: OsCampaignPlay[] = [
  {
    key: 'reactivation',
    name: 'Wake the past-customer list',
    hook: 'The cheapest {job} you will ever book is from someone who already trusts you.',
    audience: 'Past customers, no contact in 12+ months',
    steps: [
      { title: 'Pull every customer who has gone quiet and scrub the do-not-text list', channel: 'Text' },
      { title: 'Send a personal check-in in your voice, spaced over 4 mornings', channel: 'Text' },
      { title: 'Replies land in Customers; the AI books them straight onto the calendar', channel: 'Calls' },
    ],
    sampleMessage:
      'Hi {firstName}, it is {biz} in {city}. It has been a while since your last {job} and we had you on our mind. Want us to take a look this month? Reply YES and we will find you a time.',
    projectedBookings: 9,
    days: 10,
  },
  {
    key: 'slow_days',
    name: 'Fill the slow days',
    hook: 'Empty slots on the calendar become offers before they become losses.',
    audience: 'Recent inquiries that never booked',
    steps: [
      { title: 'The OS watches your week and flags the two emptiest days', channel: 'Calls' },
      { title: 'Quoted-but-unbooked leads get first claim on those slots by text', channel: 'Text' },
      { title: 'Unclaimed slots go to the email list the night before', channel: 'Email' },
    ],
    sampleMessage:
      '{firstName}, a spot opened up this Thursday at {biz}. You asked about a {job} a while back; want it? First reply takes it.',
    projectedBookings: 6,
    days: 7,
  },
  {
    key: 'review_engine',
    name: 'Review engine sprint',
    hook: 'Two weeks of finished {job}s turned into a wall of five-star proof.',
    audience: 'Every customer with work finished in the last 90 days',
    steps: [
      { title: 'Every finished {job} triggers the review ask, timed to the happy moment', channel: 'Text' },
      { title: 'New reviews get a personal reply drafted for you the same day', channel: 'Social' },
      { title: 'The best lines become ready-to-run ad copy in the Ad studio', channel: 'Ads' },
    ],
    sampleMessage:
      'Thanks again for trusting {biz} with your {job}! If we earned it, this link goes straight to Google and takes about 20 seconds. It means the world to a {city} shop.',
    projectedBookings: 4,
    days: 14,
  },
  {
    key: 'neighborhood',
    name: 'Neighborhood domination',
    hook: 'Every finished {job} becomes ten neighbors who know your name.',
    audience: 'The streets around every job you finish',
    steps: [
      { title: 'Each finished {job} drops a pin; the OS builds the surrounding audience', channel: 'Ads' },
      { title: '"We just did a {job} on your street" ads run to that pocket for 10 days', channel: 'Social' },
      { title: 'Callers mention the street; the AI tags them so you see what worked', channel: 'Calls' },
    ],
    sampleMessage:
      'Your neighbors on {street} just had a {job} done by {biz}. Same crew, same week, neighbor pricing while we are close.',
    projectedBookings: 5,
    days: 21,
  },
  {
    key: 'seasonal',
    name: 'Beat the season',
    hook: 'The busy season books out before it starts. This play gets you there first.',
    audience: 'Past customers + the whole email list',
    steps: [
      { title: 'A get-ahead offer goes to past customers before the rush hits', channel: 'Email' },
      { title: 'Openers who do not book get one friendly text nudge', channel: 'Text' },
      { title: 'The last seats become a countdown ad the final week', channel: 'Ads' },
    ],
    sampleMessage:
      '{firstName}, the {city} rush is coming and the {biz} calendar is filling. Book your {job} this week and skip the season-price scramble.',
    projectedBookings: 8,
    days: 18,
  },
];
