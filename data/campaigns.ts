// Outreach campaigns: named B2B sales pushes to land specific enterprise /
// multi-unit accounts on a Modern Mustard Seed product. Distinct from the
// generic Outreach pipeline (creator/partner recruiting) and the Tracker
// (local SMB cold-call list). Each campaign here is one target account, fully
// loaded so the team can run it the day it lands: the live demo asset, the
// pricing, the real decision-makers, and a ready-to-send email per person.
//
// This is the single source of truth for the /admin/campaigns command center.
// Everyone in the company can see it. The named `lead` owns running it.

export type CampaignStatus = 'live' | 'building' | 'paused' | 'won' | 'lost';

export type Asset = {
  label: string;
  href: string;
  kind: 'demo' | 'dashboard' | 'phone' | 'proposal' | 'whitepaper' | 'tool' | 'link';
  note?: string;
};

export type PriceTier = {
  name: string;
  price: string;
  cadence?: string;
  setup?: string;
  includes: string[];
  recommended?: boolean;
};

export type PreloadedEmail = {
  subject: string;
  body: string;
};

export type Contact = {
  id: string;
  name: string;
  title: string;
  company: string;
  /** Best reach channel we can verify today. LinkedIn is real; email is the
   *  likely corporate pattern and must be confirmed before sending. */
  linkedin?: string;
  emailGuess?: string;
  emailStatus: 'verified' | 'guess' | 'unknown';
  /** Why this person, and the angle the email below is written to. */
  angle: string;
  priority: 1 | 2 | 3;
  email: PreloadedEmail;
};

export type PlaybookStep = { title: string; detail: string };

export type Campaign = {
  slug: string;
  brand: string;
  product: string;
  /** Who on our team runs this account. */
  lead: { name: string; role: string };
  status: CampaignStatus;
  headquarters: string;
  footprint: string;
  /** The one-line reason this account buys. */
  hook: string;
  /** The numbers that make the case. */
  theStory: string[];
  assets: Asset[];
  pricing: PriceTier[];
  contacts: Contact[];
  talkingPoints: string[];
  objections: { objection: string; answer: string }[];
  linkedinDm: string;
  voicemail: string;
  playbook: PlaybookStep[];
  accent: string; // tailwind gradient for the hub card
};

// ── Shared signature, swapped per rep at render time via {{REP}} / {{BOOK}} ──
const SIG = (demoNumber: string, demoSite: string) =>
  `{{REP}}
Modern Mustard Seed
Book a 15-minute look: {{BOOK}}
Call the live demo yourself: ${demoNumber}
See it run: ${demoSite}`;

// ============================================================================
// NEWK'S EATERY  —  AI Voice Concierge
// ============================================================================

const NEWKS_DEMO_NUMBER = '(803) 879-1356';
const NEWKS_DEMO_SITE = 'newks-voice-concierge.vercel.app';

const newks: Campaign = {
  slug: 'newks',
  brand: "Newk's Eatery",
  product: 'AI Voice Concierge',
  lead: { name: 'Polly Thompson', role: 'Account lead' },
  status: 'live',
  headquarters: 'Ridgeland, Mississippi',
  footprint: 'Fast-casual, corporate + franchise, 15 states',
  hook: 'Every call to a Newk’s answered 24/7. No more guests sent to voicemail, no more lost catering orders.',
  theStory: [
    'Fast-casual restaurants miss a large share of calls during the lunch and catering rush, exactly when the kitchen is slammed and nobody can pick up.',
    'Catering is high-ticket for Newk’s. A single missed catering call can be a four-figure order that walks to the next deli down the road.',
    'The Voice Concierge answers every call, in the guest’s language, takes to-go and catering orders into the POS, captures catering leads, and never sends a caller to voicemail.',
    'It recognizes returning guests (“the usual?”), which compounds Newk’s Rewards instead of competing with it.',
    'A fleet dashboard rolls up recovered revenue per location, so corporate sees the dollars the system saved across all 15 states.',
    'It is live right now. Call the demo number and order. Then look at the operator dashboard and watch the order land.',
  ],
  assets: [
    { label: 'Live pitch + ROI calculator', href: 'https://newks-voice-concierge.vercel.app', kind: 'demo', note: 'Send this link. It is the pitch.' },
    { label: 'Call the live demo', href: 'tel:+18038791356', kind: 'phone', note: NEWKS_DEMO_NUMBER + ' · order a sandwich, it works' },
    { label: 'Operator dashboard', href: 'https://newks-voice-concierge.vercel.app/dashboard', kind: 'dashboard', note: 'Fleet rollup, recovered revenue, call log' },
    { label: 'Wall / TV mode', href: 'https://newks-voice-concierge.vercel.app/wall', kind: 'dashboard' },
    { label: 'Branded proposal', href: 'https://newks-voice-concierge.vercel.app/proposal', kind: 'proposal', note: 'Print to PDF from the page' },
    { label: 'Platform whitepaper', href: 'https://newks-voice-concierge.vercel.app/whitepaper', kind: 'whitepaper' },
  ],
  pricing: [
    {
      name: 'Single location',
      price: '$549',
      cadence: '/mo',
      setup: '$750 setup',
      includes: ['1,200 answered calls / mo', 'To-go + catering ordering', 'Catering lead capture', 'Returning-guest recognition', 'Operator dashboard', '$0.45 / call over 1,200'],
    },
    {
      name: 'Multi-location',
      price: '$499',
      cadence: '/mo per location',
      setup: 'Setup waived at 25+ locations',
      recommended: true,
      includes: ['Everything in Single', 'Fleet rollup dashboard', 'Per-location 86 board + specials push', 'Multilingual (100+ languages)', 'Daily GM briefing', 'Priority support'],
    },
    {
      name: 'Enterprise / system-wide',
      price: 'Custom',
      includes: ['Corporate + franchise rollout', 'POS integration (Olo / Toast)', 'Loyalty + rewards tie-in', 'Brand-trained voice + guardrails', 'Dedicated success manager', 'Quarterly business review'],
    },
  ],
  contacts: [
    {
      id: 'pedini',
      name: 'Denise Pedini',
      title: 'Chief Marketing Officer',
      company: "Newk's Eatery",
      linkedin: 'https://www.linkedin.com/in/denise-pedini',
      emailGuess: 'dpedini@newks.com',
      emailStatus: 'verified',
      angle: 'Owns all consumer touchpoints + IT, launched Newk’s Rewards. The concierge protects the brand experience on every call and feeds loyalty. Primary buyer.',
      priority: 1,
      email: {
        subject: "Every call to Newk's, answered (you can call the demo right now)",
        body: `Hi Denise,

I run client work at Modern Mustard Seed and I built something for Newk's that I think you will want to hear, literally.

Call this number and order a sandwich, or ask about catering: ${NEWKS_DEMO_NUMBER}

That is a 24/7 AI Voice Concierge wearing Newk's colors. It answers every call in the guest's language, takes to-go and catering orders, captures catering leads, and never sends a guest to voicemail. It even recognizes a returning caller and offers "the usual," so it compounds Newk's Rewards instead of fighting it.

You own every consumer touchpoint across 15 states. The phone is the one touchpoint that still drops guests on the floor during the lunch and catering rush. This closes that gap, and a fleet dashboard shows corporate the recovered revenue per location.

The whole thing is live: ${NEWKS_DEMO_SITE}

Worth 15 minutes? I will walk you through the dashboard and the franchise rollout math.

${SIG(NEWKS_DEMO_NUMBER, NEWKS_DEMO_SITE)}`,
      },
    },
    {
      id: 'karveller',
      name: 'Adam Karveller',
      title: 'Chief Technology Officer',
      company: "Newk's Eatery",
      linkedin: 'https://www.linkedin.com/in/adam-karveller',
      emailGuess: 'akarveller@newks.com',
      emailStatus: 'verified',
      angle: 'Owns the stack. Sell the integration: POS adapter (Olo/Toast), no hallucinated menu or prices, PCI-safe pay links, clean rollout. Technical buyer.',
      priority: 2,
      email: {
        subject: 'A voice layer for Newk’s that plugs into your stack',
        body: `Hi Adam,

Modern Mustard Seed built a working AI Voice Concierge for Newk's and I would rather show you than pitch you. Call it: ${NEWKS_DEMO_NUMBER}

The part that matters to you: it is built to plug into your existing stack, not replace it.

- Orders flow through a POS adapter (Olo / Toast compatible), so it writes to the system you already run.
- It only speaks from your real menu and prices. No hallucinated items, no made-up specials.
- Payments are PCI-safe by design (pay-link only, no card numbers spoken or stored).
- Multilingual out of the box (100+ languages), and a fleet dashboard rolls up every location.

Live build, end to end: ${NEWKS_DEMO_SITE}

Open to a short technical walkthrough? I can show the call flow, the guardrails, and how a multi-unit rollout would actually sequence.

${SIG(NEWKS_DEMO_NUMBER, NEWKS_DEMO_SITE)}`,
      },
    },
    {
      id: 'paci',
      name: 'Frank Paci',
      title: 'Chief Executive Officer',
      company: "Newk's Eatery",
      linkedin: 'https://www.linkedin.com/in/frank-paci',
      emailGuess: 'fpaci@newks.com',
      emailStatus: 'verified',
      angle: 'Economic buyer. Lead with recovered revenue across the fleet and franchisee value, not features. Short, numbers-first.',
      priority: 2,
      email: {
        subject: "The calls Newk's misses at lunch",
        body: `Hi Frank,

I will keep this short. When a Newk's gets slammed at lunch, the phone is the first thing to go. The person calling to place a big catering order usually will not leave a message. They just call somewhere else. That is real money walking out the door, every day, at every location.

We built something for Newk's that fixes it. It is a friendly AI concierge that answers every call, day or night, takes to-go and catering orders, and never lets anyone hit voicemail. It is already live, and honestly the best way to get it is to call it yourself and order something: ${NEWKS_DEMO_NUMBER}.

You can watch it work here: ${NEWKS_DEMO_SITE}. There is a simple dashboard that shows, location by location, how much business it brought back.

Could I have 15 minutes to show you what it could do across all of Newk's?

${SIG(NEWKS_DEMO_NUMBER, NEWKS_DEMO_SITE)}`,
      },
    },
    {
      id: 'cheek',
      name: 'Chris Cheek',
      title: 'Chief Development Officer',
      company: "Newk's Eatery",
      linkedin: 'https://www.linkedin.com/in/chris-cheek',
      emailGuess: 'ccheek@newks.com',
      emailStatus: 'verified',
      angle: 'Owns franchise growth. Frame the concierge as a franchisee value-add that lifts unit economics and helps new units ramp catering faster.',
      priority: 3,
      email: {
        subject: 'A catering-capture edge for every Newk’s franchisee',
        body: `Hi Chris,

Congrats on the return to Newk's. I will keep this short because it is really a franchisee-economics play.

Modern Mustard Seed built a 24/7 AI Voice Concierge for Newk's that answers every call, takes to-go and catering orders, and captures catering leads that get missed during the rush. For a franchisee, that is recovered revenue with no added labor, and for a new unit it ramps catering faster.

It is live. Call it: ${NEWKS_DEMO_NUMBER}. Full build: ${NEWKS_DEMO_SITE}.

If it is useful, it could be a system-wide value-add you offer the franchise base. Worth a quick look together?

${SIG(NEWKS_DEMO_NUMBER, NEWKS_DEMO_SITE)}`,
      },
    },
  ],
  talkingPoints: [
    'Lead with the demo number. Do not describe it, let them call it and order a sandwich. The product sells itself in 60 seconds.',
    'The phone is the last touchpoint still sending guests to voicemail. Every other channel (app, web, kiosk) already works. This fixes the one that does not.',
    'Catering is the money. One missed catering call can be a four-figure order. The concierge captures it 24/7.',
    'It compounds Newk’s Rewards, it does not compete: returning-guest recognition and "the usual" feed loyalty.',
    'Corporate gets the fleet dashboard: recovered revenue per location across 15 states, on one screen.',
    'It plugs into Olo / Toast, speaks only from the real menu, and is PCI-safe. No rip-and-replace.',
    'There is a 30-day pilot guarantee. Start with one market, prove the number, then roll the fleet.',
  ],
  objections: [
    { objection: 'We already have online ordering.', answer: 'Great, this is for the calls online ordering never catches: the guest driving, the office manager booking catering, the regular who always phones it in. It feeds the same POS.' },
    { objection: 'Our staff answers the phone.', answer: 'During the noon rush they cannot, and that is exactly when the catering calls come in. This answers the ones your team physically cannot get to, 24/7.' },
    { objection: 'Will it sound robotic / hurt the brand?', answer: 'Call the demo and judge for yourself. It is warm, on-brand, multilingual, and it discloses it is an assistant. It will never invent a menu item or a price.' },
    { objection: 'Sounds expensive at the franchise level.', answer: 'It is $499/mo per location at scale, and one recovered catering order a month more than pays for it. There is a 30-day pilot guarantee.' },
    { objection: 'Integration sounds painful.', answer: 'It is built to plug into Olo / Toast and we run the rollout. Start with one location, no rip-and-replace.' },
  ],
  linkedinDm: `Hi {{NAME}}, I run client work at Modern Mustard Seed. We built a live 24/7 AI Voice Concierge for Newk's, you can actually call it and order: ${NEWKS_DEMO_NUMBER}. It catches every to-go and catering call your teams miss at peak and rolls recovered revenue up to corporate. Built and running here: ${NEWKS_DEMO_SITE}. Worth 15 minutes?`,
  voicemail: `Hi {{NAME}}, this is {{REP}} with Modern Mustard Seed. We built a working AI voice concierge for Newk's that answers every call and captures the to-go and catering orders your teams miss during the rush. The easiest way to see it is to call it yourself, ${NEWKS_DEMO_NUMBER}, and order something. I will follow up by email with the link. Thanks.`,
  playbook: [
    { title: '1. Call the demo first', detail: `Before you reach out, call ${NEWKS_DEMO_NUMBER} and place an order so you can speak to it from experience.` },
    { title: '2. Verify the email', detail: 'The corporate emails below are best-guess patterns. Confirm on LinkedIn or with a quick Hunter lookup before sending. LinkedIn DM works today regardless.' },
    { title: '3. Start with the CMO', detail: 'Denise Pedini is the primary buyer. Send her email, connect on LinkedIn the same day with the short DM.' },
    { title: '4. Send the demo link, not a deck', detail: 'The live site and the call-it number are the pitch. Let the product do the talking.' },
    { title: '5. Book the 15-minute walkthrough', detail: 'Goal of every touch is one booked call. Use your /book?ref= link so it tracks to you.' },
    { title: '6. Log it + follow up', detail: 'Mark each contact Sent here, then follow up in 3 business days if no reply. Persistence books the meeting.' },
  ],
  accent: 'from-[#0D1036] to-[#D9272C]',
};

// ============================================================================
// BENJAMIN FRANKLIN PLUMBING (Authority Brands)  —  AI Voice Concierge
// ============================================================================

const FRANKLIN_DEMO_NUMBER = '(804) 480-1564';
const FRANKLIN_DEMO_SITE = 'franklin-voice-concierge.vercel.app';

const franklin: Campaign = {
  slug: 'franklin',
  brand: 'Benjamin Franklin Plumbing',
  product: 'AI Voice Concierge (after-hours dispatcher)',
  lead: { name: 'Polly Thompson', role: 'Account lead' },
  status: 'live',
  headquarters: 'Columbia, Maryland (Authority Brands)',
  footprint: '300+ franchises, home-services trade brand',
  hook: 'Every emergency plumbing call answered and triaged 24/7. The after-hours calls that go to voicemail are the ones worth the most.',
  theStory: [
    '62% of calls to home-services businesses go unanswered, and 85% of callers who hit voicemail simply call the next contractor.',
    '48% of plumbing emergencies happen after hours, when the office is closed and the call is worth the most.',
    'The average missed service call is about $1,200, and contractors lose $45k to $120k a year to the phone.',
    'The Voice Concierge answers every call, triages emergencies, books jobs, captures big-ticket estimates, and warm-transfers true emergencies to on-call dispatch.',
    'A fleet dashboard shows revenue recovered, emergencies caught, and after-hours calls captured across every branch.',
  ],
  assets: [
    { label: 'Live pitch + ROI calculator', href: 'https://franklin-voice-concierge.vercel.app', kind: 'demo', note: 'Send this link' },
    { label: 'Call the live demo', href: 'tel:+18044801564', kind: 'phone', note: FRANKLIN_DEMO_NUMBER },
    { label: 'Dispatcher dashboard', href: 'https://franklin-voice-concierge.vercel.app/dashboard', kind: 'dashboard', note: 'Jobs board, emergencies caught, after-hours capture' },
  ],
  pricing: [
    {
      name: 'Single branch',
      price: '$549',
      cadence: '/mo',
      setup: '$750 setup',
      includes: ['24/7 answer + emergency triage', 'Job booking', 'Estimate capture (water heater / repipe / sewer)', 'After-hours warm transfer to on-call', 'Dispatcher dashboard'],
    },
    {
      name: 'Multi-branch',
      price: '$499',
      cadence: '/mo per branch',
      recommended: true,
      setup: 'Setup waived at 25+ branches',
      includes: ['Everything in Single', 'Fleet rollup dashboard', 'Emergencies-caught + after-hours KPIs', 'Multilingual', 'Priority support'],
    },
    {
      name: 'Franchise system',
      price: 'Custom',
      includes: ['System-wide rollout across Authority Brands trade brands', 'CSR / dispatch software integration', 'Brand-trained triage', 'Dedicated success manager'],
    },
  ],
  contacts: [
    {
      id: 'clemente',
      name: 'Steve Clemente',
      title: 'President & COO, Trade Brands',
      company: 'Authority Brands',
      linkedin: 'https://www.linkedin.com/in/steve-clemente',
      emailGuess: 'sclemente@authoritybrandsllc.com',
      emailStatus: 'guess',
      angle: 'Runs the trade brands (Ben Franklin is one). Owns the unit economics and the franchisee value story. Primary buyer.',
      priority: 1,
      email: {
        subject: 'The after-hours plumbing calls Ben Franklin franchisees are losing',
        body: `Hi Steve,

48% of plumbing emergencies happen after hours, and 85% of callers who hit voicemail just call the next contractor. For a Ben Franklin franchisee that is the single most expensive leak in the business, and it has nothing to do with pipes.

Modern Mustard Seed built a 24/7 AI Voice Concierge for Benjamin Franklin Plumbing that answers every call, triages emergencies, books jobs, captures big-ticket estimates, and warm-transfers true emergencies to on-call dispatch.

It is live. Call it: ${FRANKLIN_DEMO_NUMBER}. See it run: ${FRANKLIN_DEMO_SITE}.

As a trade-brand-wide value-add this lifts franchisee revenue with no added labor. Worth 15 minutes to see the fleet dashboard?

${SIG(FRANKLIN_DEMO_NUMBER, FRANKLIN_DEMO_SITE)}`,
      },
    },
    {
      id: 'bowes',
      name: 'Ryan Bowes',
      title: 'Chief Growth & Transformation Officer',
      company: 'Authority Brands',
      linkedin: 'https://www.linkedin.com/in/ryan-bowes',
      emailGuess: 'rbowes@authoritybrandsllc.com',
      emailStatus: 'guess',
      angle: 'Owns growth + transformation across the portfolio. Frame as a scalable, system-wide tech edge for franchisees.',
      priority: 2,
      email: {
        subject: 'A 24/7 capture layer for the Authority Brands trade brands',
        body: `Hi Ryan,

Growth-and-transformation framing: the fastest revenue lift across the home-services trade brands is not more leads, it is catching the ones already calling. 62% of calls to home-services businesses go unanswered.

Modern Mustard Seed built a live AI Voice Concierge for Benjamin Franklin Plumbing that answers and triages every call 24/7, books jobs, and captures after-hours emergencies. It is a repeatable layer that drops onto any trade brand.

Live demo, call it: ${FRANKLIN_DEMO_NUMBER}. Build: ${FRANKLIN_DEMO_SITE}.

Open to a short look at how this scales across the portfolio?

${SIG(FRANKLIN_DEMO_NUMBER, FRANKLIN_DEMO_SITE)}`,
      },
    },
  ],
  talkingPoints: [
    'Lead with the stat: 48% of emergencies are after-hours, 85% who hit voicemail call the next guy.',
    'The after-hours call is the most valuable one and the one most likely to be missed. This catches it.',
    'Emergency triage + warm transfer to on-call is the signature. It is not just an answering service.',
    'Average missed call is ~$1,200. One saved emergency a week pays for it many times over.',
    'It is a franchisee value-add: more captured revenue, zero added labor.',
  ],
  objections: [
    { objection: 'We use an answering service already.', answer: 'Answering services take a message. This triages the emergency, books the job, captures the estimate, and warm-transfers real emergencies to on-call. It does the work, not just the note.' },
    { objection: 'Plumbing is too technical for AI.', answer: 'It does not diagnose, it triages and books. It knows emergency vs routine, captures the big-ticket estimates, and hands true emergencies to a human.' },
    { objection: 'Franchisees will not pay for it.', answer: 'One captured after-hours emergency a month covers it several times over. There is a pilot to prove the number first.' },
  ],
  linkedinDm: `Hi {{NAME}}, I run client work at Modern Mustard Seed. We built a live 24/7 AI dispatcher for Benjamin Franklin Plumbing, you can call it: ${FRANKLIN_DEMO_NUMBER}. It triages emergencies, books jobs, and catches the after-hours calls franchisees lose to voicemail. Running here: ${FRANKLIN_DEMO_SITE}. Worth 15 minutes?`,
  voicemail: `Hi {{NAME}}, this is {{REP}} with Modern Mustard Seed. We built a working 24/7 AI dispatcher for Benjamin Franklin Plumbing that triages emergencies and catches the after-hours calls franchisees lose. Easiest way to see it is to call it, ${FRANKLIN_DEMO_NUMBER}. I will follow up by email. Thanks.`,
  playbook: [
    { title: '1. Call the demo first', detail: `Call ${FRANKLIN_DEMO_NUMBER} and run an after-hours emergency so you can speak to it from experience.` },
    { title: '2. Verify the email', detail: 'Authority Brands uses @authoritybrandsllc.com. Confirm the exact address on LinkedIn / Hunter before sending.' },
    { title: '3. Start with Trade Brands leadership', detail: 'Steve Clemente runs the trade brands. He is the primary. Ryan Bowes is the growth angle.' },
    { title: '4. Lead with the stat, then the number', detail: 'Open with the after-hours miss stat, then hand them the call-it number.' },
    { title: '5. Book the walkthrough', detail: 'One booked call per touch. Use your /book?ref= link.' },
  ],
  accent: 'from-[#122a52] to-[#c8202f]',
};

export const campaigns: Campaign[] = [newks, franklin];

export function getCampaign(slug: string): Campaign | undefined {
  return campaigns.find((c) => c.slug === slug);
}

/** Swap the rep tokens in any preloaded copy. {{REP}} = the sender (Sarah or
 *  Polly), {{BOOK}} = their booking link, {{NAME}} = the recipient's first name. */
export function personalize(text: string, opts: { book: string; rep?: string; name?: string }): string {
  return text
    .replaceAll('{{BOOK}}', opts.book)
    .replaceAll('{{REP}}', opts.rep ?? 'Polly Thompson')
    .replaceAll('{{NAME}}', opts.name ?? 'there');
}

/** The primary (priority 1) contact, used to key the client + project record. */
export function primaryContact(c: Campaign): Contact | undefined {
  return [...c.contacts].sort((a, b) => a.priority - b.priority)[0];
}
