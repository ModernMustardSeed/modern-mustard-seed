/**
 * AI RECEPTIONIST COST. /ai-receptionist-cost
 *
 * Built for the cost questions Search Console shows our buyers typing:
 * "ai receptionist pricing", "ai receptionist cost vs in house", "cost of
 * virtual receptionist vs ai", "ai receptionist under $100", "ai receptionist
 * cost dental", "ai receptionist payback period".
 *
 * Same law as data/compare-pages.ts: every vendor price below was read off that
 * vendor's own pricing page on `CHECKED` and is linked. A price a vendor does
 * not publish is "Quote only". We never print our own price (OUR_PRICE).
 * Re-read every source before changing CHECKED.
 */

import { OUR_PRICE } from './compare-pages';

export const CHECKED = '2026-10-05';
export const PUBLISHED = '2026-10-05';

export type VendorKind = 'AI receptionist' | 'AI or human, same price' | 'Live human receptionists' | 'Built for you';

export type CostVendor = {
  name: string;
  kind: VendorKind;
  /** The range a buyer sees first. */
  from: string;
  /** Every published plan, as the vendor publishes it. */
  plans: string;
  /** What the meter counts: minutes, calls, customers. */
  meter: string;
  notes: string[];
  source: { label: string; url: string };
  isUs?: boolean;
};

export const vendors: CostVendor[] = [
  {
    name: 'Upfirst',
    kind: 'AI receptionist',
    from: '$24.95 a month',
    plans: 'Starter $24.95 (30 calls), Premium $59.95 (90 calls), Pro $159.95 (300 calls), Scale $299 (600 calls) a month. Billed annually: $20, $48, $128 and $240 a month. Custom above 600 calls.',
    meter: 'Calls. Overage $1.50 a call on Starter, down to $0.70 on Scale.',
    notes: [
      'Appointment scheduling, call transfers and 35+ languages listed on every plan.',
      'Business Associate Agreements for HIPAA are listed on the Custom plan.',
    ],
    source: { label: 'Upfirst pricing', url: 'https://www.upfirst.ai/pricing' },
  },
  {
    name: 'Dialzara',
    kind: 'AI receptionist',
    from: '$29 a month',
    plans: 'Business Lite $29 (60 minutes), Business Pro $99 (220 minutes), Business Plus $199 (500 minutes), Business Elite $349 (1,000 minutes) a month.',
    meter: 'Minutes. Overage $0.48 a minute on Lite, down to $0.35 on Elite.',
    notes: ['Appointment booking and calendar integration listed from the Lite plan up.'],
    source: { label: 'Dialzara pricing', url: 'https://www.dialzara.com/pricing' },
  },
  {
    name: 'Rosie',
    kind: 'AI receptionist',
    from: '$49 a month',
    plans: 'Professional $49 (250 minutes), Scale $149 (1,000 minutes), Growth $299 (2,000 minutes) a month.',
    meter: 'Minutes.',
    notes: [
      'English and Spanish on every call, on every plan.',
      'Booking straight onto your calendar is listed on Scale and Growth; Professional sends appointment links by text.',
    ],
    source: { label: 'Rosie pricing', url: 'https://heyrosie.com/pricing' },
  },
  {
    name: 'Goodcall',
    kind: 'AI receptionist',
    from: '$79 a month',
    plans: 'Starter $79, Growth $129, Scale $249 a month per agent. Billed annually: $66, $108 and $208. Enterprise by quote.',
    meter: 'Unique customers: 100, 250 or 500 a month, then $0.50 per extra customer. Goodcall states it does not charge for calls, call minutes or tokens.',
    notes: ['Logic flows for custom call handling: 1 on Starter, 3 on Growth, 25 on Scale.'],
    source: { label: 'Goodcall pricing', url: 'https://www.goodcall.com/pricing' },
  },
  {
    name: 'My AI Front Desk',
    kind: 'AI receptionist',
    from: '$99 a month ($79 billed annually)',
    plans: 'Business-in-a-Box $99 a month, or $79 a month billed annually, with 200 voice minutes. Partner and Enterprise by quote.',
    meter: 'Minutes, then prepaid credits at $10 per 1,000.',
    notes: ['Bundles chatbot conversations, SMS and a 20-page knowledge base with the phone agent.'],
    source: { label: 'My AI Front Desk pricing', url: 'https://www.myaifrontdesk.com/pricing' },
  },
  {
    name: 'Smith.ai',
    kind: 'AI or human, same price',
    from: '$300 a month',
    plans: 'Starter $300 (30 calls), Basic $810 (90 calls), Pro $2,100 (300 calls) a month. Enterprise custom. The same prices apply to its AI-first and human-first options.',
    meter: 'Calls. Overage $11.50 a call on Starter, $10.50 on Basic, $8.50 on Pro.',
    notes: ['Add-ons per call: appointment booking $1.50, a dedicated Spanish line $1.00.'],
    source: { label: 'Smith.ai pricing', url: 'https://smith.ai/pricing' },
  },
  {
    name: 'Ruby',
    kind: 'Live human receptionists',
    from: '$250 a month',
    plans: '$250 (50 minutes), $395 (100 minutes), $720 (200 minutes), $1,725 (500 minutes) a month.',
    meter: 'Minutes of live receptionist time.',
    notes: ['24/7 Spanish and bilingual call handling listed on every plan.', 'No setup, onboarding or customization fees, per the pricing page.'],
    source: { label: 'Ruby pricing', url: 'https://www.ruby.com/pricing/' },
  },
  {
    name: 'Avoca',
    kind: 'AI receptionist',
    from: 'Quote only',
    plans: 'Quote only. Avoca publishes no prices; it offers a 20-minute demo.',
    meter: 'Not published.',
    notes: ['Built for home service companies; a certified ServiceTitan app.'],
    source: { label: 'Avoca', url: 'https://www.avoca.ai/' },
  },
  {
    name: 'Modern Mustard Seed',
    kind: 'Built for you',
    from: OUR_PRICE,
    plans: `${OUR_PRICE}. Built around one business, tested, and handed over; you own the configuration and the accounts.`,
    meter: 'Set out in the written scope before any work starts.',
    notes: ['Changes to what we built are included.', 'Not self-serve: it starts with a discovery call and a written scope.'],
    source: { label: 'Modern Mustard Seed voice agents', url: 'https://modernmustardseed.com/voice-agents' },
    isUs: true,
  },
];

/** BLS Occupational Outlook Handbook, Receptionists, May 2025. */
export const BLS_RECEPTIONIST = {
  annual: 38010,
  period: 'May 2025',
  url: 'https://www.bls.gov/ooh/office-and-administrative-support/receptionists.htm',
};

export const blsMonthly = Math.round(BLS_RECEPTIONIST.annual / 12);

export const costFaqs: { q: string; a: string }[] = [
  {
    q: 'How much does an AI receptionist cost?',
    a: 'Self-serve AI receptionists run from about $25 to $350 a month on published plans: Upfirst from $24.95, Dialzara from $29, Rosie from $49, Goodcall from $79 and My AI Front Desk from $99, per their pricing pages checked October 5, 2026. Services with humans behind them start higher: Ruby from $250 and Smith.ai from $300 a month. Built-for-you receptionists such as Modern Mustard Seed are quoted as a set package price.',
  },
  {
    q: 'Is there an AI receptionist under $100 a month?',
    a: 'Yes. Published plans under $100 a month include Upfirst Starter at $24.95 (30 calls) and Premium at $59.95 (90 calls), Dialzara Business Lite at $29 (60 minutes), Rosie Professional at $49 (250 minutes), Goodcall Starter at $79 per agent, and My AI Front Desk at $79 a month billed annually. Check what the meter counts: calls, minutes or unique customers.',
  },
  {
    q: 'What is the cheapest AI receptionist?',
    a: 'On published monthly prices checked October 5, 2026, Upfirst Starter at $24.95 a month for 30 calls is the lowest entry price, followed by Dialzara Business Lite at $29 for 60 minutes. The cheapest plan is only cheapest at low volume; overage fees decide the real cost once calls pick up.',
  },
  {
    q: 'How much does an AI receptionist cost compared with hiring a receptionist?',
    a: `The median annual pay for receptionists in the US was $${BLS_RECEPTIONIST.annual.toLocaleString('en-US')} in ${BLS_RECEPTIONIST.period}, per the Bureau of Labor Statistics. That is about $${blsMonthly.toLocaleString('en-US')} a month in wages alone, before payroll taxes and benefits, for one person covering business hours. Published AI receptionist plans run about $25 to $350 a month and answer around the clock. A person still wins on judgment, in-office tasks and sensitive conversations.`,
  },
  {
    q: 'How much does a virtual receptionist cost compared with AI?',
    a: 'Live virtual receptionist services charge for human time: Ruby runs $250 a month for 50 minutes up to $1,725 for 500 minutes, and Smith.ai $300 a month for 30 calls up to $2,100 for 300 calls. AI receptionists on published plans run about $25 to $350 a month for far more minutes or calls. Pay for humans when callers need one; use AI when volume, after-hours coverage and booking matter more.',
  },
  {
    q: 'How much does an AI receptionist cost for a dental office?',
    a: 'Dental offices pay the same published plan prices as any business, but should only use a vendor that will sign a Business Associate Agreement for HIPAA. Upfirst lists BAAs on its Custom plan. Ask every vendor, in writing, before patient information touches the line.',
  },
  {
    q: 'What is the payback period for an AI receptionist?',
    a: 'Payback depends on three numbers only you know: how many calls you miss a week, how many of those become jobs, and what a job is worth. Divide the monthly cost by the revenue those recovered calls bring in. The calculator on this page does the math with your numbers.',
  },
  {
    q: 'Can I customize an AI receptionist script?',
    a: 'Yes, and plans differ in how much. Rosie allows 2 message-taking scenarios on Professional, 5 on Scale and unlimited on Growth. Goodcall allows 1 logic flow on Starter, 3 on Growth and 25 on Scale. A built-for-you receptionist is scripted around your services, service area, prices and booking rules from the start.',
  },
  {
    q: 'Does AI receptionist pricing include Spanish?',
    a: 'It varies. Rosie answers in English and Spanish on every plan, Upfirst lists 35+ languages, Ruby lists 24/7 Spanish and bilingual handling on every plan, and Smith.ai charges $1.00 a call for a dedicated Spanish line.',
  },
  {
    q: 'How much does Modern Mustard Seed charge for an AI receptionist?',
    a: `${OUR_PRICE}. The receptionist is built around your business and handed over, and changes to what we built are included.`,
  },
];
