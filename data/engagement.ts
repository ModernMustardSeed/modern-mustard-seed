/**
 * HOW AN ENGAGEMENT RUNS, AND WHAT LANDS ON YOUR DESK.
 *
 * Two pages read from here and they own different halves, so they stop
 * repeating each other:
 *
 *   /work-with-us  HOW it runs. The five steps, the terms, the fit.
 *   /playbook      WHAT you actually receive. Deliverables, cadence, the
 *                  portal, what happens after launch, the standard.
 *
 * Rules honored: no prices, no scarcity claim, no one-person framing, no em
 * dashes. Nothing here claims a client outcome.
 */

/* ------------------------------------------------------------------ */
/* HOW IT RUNS                                                         */
/* ------------------------------------------------------------------ */

export type Step = {
  n: string;
  title: string;
  /** The one-line promise. Shows large. */
  promise: string;
  body: string;
  /** What the client does at this step. Named, so nobody waits on nobody. */
  yours: string;
  /** What exists at the end of it that did not exist before. */
  output: string;
  /** Honest elapsed time for this step alone. */
  clock: string;
};

export const STEPS: Step[] = [
  {
    n: '01',
    title: 'The inquiry',
    promise: 'You write. A person answers.',
    body:
      'Tell us the business, the problem, and what a good outcome looks like. Detail helps, and so does telling us what you already tried and why it did not stick. Every inquiry gets read and answered, including the ones that are not a fit, because a fast no is worth more to you than a slow maybe.',
    yours: 'One honest note. What you have tried already is the useful part.',
    output: 'A straight answer on fit, and the first question worth arguing about.',
    clock: 'Answered inside one business day',
  },
  {
    n: '02',
    title: 'The working session',
    promise: 'Not a sales call. A working hour.',
    body:
      'We take your problem apart on a call and put it back together with fewer pieces. What the business actually needs, what it does not, and what has to be true for this to be worth doing. Most of the hard thinking on an engagement happens here, before anyone is paid.',
    yours: 'An hour, and the willingness to be told the answer is smaller than you thought.',
    output: 'An agreed outcome, the constraints around it, and what to build first.',
    clock: 'One hour, usually within the week',
  },
  {
    n: '03',
    title: 'The proposal',
    promise: 'One number, in writing, that does not move.',
    body:
      'A written scope with a set package price, a fixed timeline, the milestones, and an explicit list of what is out. The out list is the important half: it is how you know the price is real rather than a guess with room to grow.',
    yours: 'Read it properly and push on anything that reads vague. That is what it is for.',
    output: 'A scope, a price, a date, and a list of what this is not.',
    clock: 'Within 48 hours of the session',
  },
  {
    n: '04',
    title: 'The build',
    promise: 'You watch it happen, in the open.',
    body:
      'Work starts on the agreed date and you can see it from the first day. A weekly written update, a live link the moment there is something to look at, and a standing invitation to say when something is wrong while it is still cheap to change.',
    yours: 'Look at it when we send it, and tell us the truth about what you see.',
    output: 'A working thing on a real URL, getting closer every week.',
    clock: 'Days to weeks, fixed in the proposal',
  },
  {
    n: '05',
    title: 'The handoff',
    promise: 'You leave owning all of it.',
    body:
      'The repository, the live deployment, the domain, every account and credential, and the documentation to run it without us. Not a licence and not a lease. If you hired another engineer tomorrow they could pick it up, which is the only real test of whether you own something.',
    yours: 'Accept the transfer, and keep the credentials somewhere you will find them.',
    output: 'The asset, in your name, with the keys.',
    clock: 'Launch day',
  },
];

/* ------------------------------------------------------------------ */
/* THE TERMS                                                           */
/* ------------------------------------------------------------------ */

export type Term = { title: string; body: string };

export const TERMS: Term[] = [
  {
    title: 'One price, agreed before anything is built',
    body:
      'A set package price for a defined scope, in writing, before work starts. You see the whole cost and the whole delivery date up front, and the number is the number.',
  },
  {
    title: 'Changes are included, permanently',
    body:
      'Adjustments to what we built are included, forever. No change order, no second invoice, no conversation about whether it counts. Work that adds something we never agreed to build is a new engagement, quoted the same way as the first.',
  },
  {
    title: 'You own everything',
    body:
      'Code, deployments, domain, accounts, credentials. Transferred to you, not licensed. There is no seat fee, no platform you are stuck on, and nothing you have to keep paying us to keep using.',
  },
  {
    title: 'Straight through, start to finish',
    body:
      'No coordination tax and no telephone game. The people who scope your engagement are the people who build it, so nothing gets lost being explained a second time.',
  },
  {
    title: 'We finish the work',
    body:
      'We do not stop at a handoff date. We stop when the thing is right by you. Revisions are inside every engagement rather than bolted on, which is why there is nothing to refund and nothing to argue about.',
  },
  {
    title: 'Stewardship over extraction',
    body:
      'Every decision gets made for the version of your business that exists in three years. We build assets you own and can operate without us. We do not build dependency, and we will tell you when something is not worth building at all.',
  },
];

/* ------------------------------------------------------------------ */
/* THE FIT                                                             */
/* ------------------------------------------------------------------ */

export const GOOD_FIT = [
  'You run something real, with revenue and customers, and you want it to work better.',
  'You would rather hear a hard no early than a soft yes that costs you a quarter.',
  'You want to own what gets built, and you understand why that matters.',
  'You can say what a good outcome looks like, even roughly.',
];

export const POOR_FIT = [
  'You are shopping for the cheapest quote. We will lose that one on purpose.',
  'You want a strategy deck. The work here is the deliverable, not a document about it.',
  'Eight people have to approve a button colour.',
  'You want agentic systems in the business because a competitor announced some.',
];

/* ------------------------------------------------------------------ */
/* WHAT LANDS ON YOUR DESK                                             */
/* ------------------------------------------------------------------ */

export type Deliverable = { k: string; title: string; body: string };

export const DELIVERABLES: Deliverable[] = [
  {
    k: 'The thing itself',
    title: 'Built, live, and yours',
    body:
      'On your domain, on your accounts, running in production. Not a prototype, not a staging link, not a design file somebody still has to build. The work is the deliverable.',
  },
  {
    k: 'The repository',
    title: 'Every line of it, in your name',
    body:
      'Transferred on launch day with a readable history, so another engineer can open it and be useful the same afternoon. Nothing is obfuscated and nothing is held back as leverage.',
  },
  {
    k: 'The keys',
    title: 'Domain, hosting, and every account',
    body:
      'The registrar, the deployment, the database, the analytics, the mail, the payment processor. Yours, in your name, with the credentials handed over rather than held.',
  },
  {
    k: 'The runbook',
    title: 'How to operate it without us',
    body:
      'Plain English, written for the person who has to keep it alive: what each piece does, how to change the parts you will want to change, and what to do when something breaks at an inconvenient hour.',
  },
  {
    k: 'The brand assets',
    title: 'Source files, not just exports',
    body:
      'Where an engagement includes design: the marks, the palette, the type, the components, and the originals they came from. You should never have to come back to us to put your own logo on something.',
  },
  {
    k: 'The care',
    title: 'Changes, included',
    body:
      'Adjustments to what we built stay included after launch. New copy, new photos, a new section, a new look. The only line is a page that did not exist in the scope, and that is a new engagement rather than an argument.',
  },
];

/* ------------------------------------------------------------------ */
/* THE WEEK                                                            */
/* ------------------------------------------------------------------ */

export const CADENCE = [
  {
    when: 'Monday',
    what: 'The written update',
    body: 'What moved last week, what is moving this week, and anything that is waiting on you. Short, in sentences, and in your inbox without you asking.',
  },
  {
    when: 'Midweek',
    what: 'The live link',
    body: 'The moment there is something to look at, you get the URL. Not a screenshot and not a walkthrough scheduled for Friday. You look at the real thing on your own phone.',
  },
  {
    when: 'Any hour',
    what: 'The open line',
    body: 'Something is wrong, something changed, something occurred to you in the truck. Send it. Early feedback is cheap and late feedback is expensive, and we would rather have it early.',
  },
  {
    when: 'Launch week',
    what: 'The handover',
    body: 'Accounts transferred, the runbook walked through, and a week of watching it in production together before anybody calls it done.',
  },
];

/* ------------------------------------------------------------------ */
/* THE STANDARD                                                        */
/* ------------------------------------------------------------------ */

export const STANDARD = [
  {
    title: 'It works on a phone, in a truck, on bad signal',
    body: 'Every surface is built and checked at phone width before it ships, because that is where your customers actually are.',
  },
  {
    title: 'It is findable',
    body: 'Metadata, structured data, and the signals that get a business cited by Google and by answer engines. Built into the pages from the first one rather than bolted on later.',
  },
  {
    title: 'It says something true',
    body: 'No invented statistics, no fabricated reviews, no claim about your business we have not verified. If we cannot stand behind a line, it does not ship.',
  },
  {
    title: 'It is fast',
    body: 'Real images at real sizes, no bloated scripts, and pages that paint before somebody gives up on them.',
  },
  {
    title: 'It is accessible',
    body: 'Real contrast, real focus states, keyboard paths that work, and alternative text that says what the picture is. Not for a badge. Because people use it.',
  },
  {
    title: 'It is handed over finished',
    body: 'No placeholder text, no lorem, no coming-soon page, no dead link. Launch day means launch day.',
  },
];

/* ------------------------------------------------------------------ */
/* QUESTIONS                                                           */
/* ------------------------------------------------------------------ */

export const ENGAGEMENT_FAQ = [
  {
    q: 'How does pricing work?',
    a: 'Every engagement is scoped in one working session and quoted privately as a set package price, agreed in writing before anything is built. You see the whole cost and the whole timeline before work starts and the number does not move afterwards. There is no price list on this site because a focused site and a full operating system are not the same piece of work.',
  },
  {
    q: 'Where do most people start?',
    a: 'With the free audit, usually. It takes sixty seconds, it names the one thing quietly costing you the most, and you keep the answer whether or not you ever hire us. Most engagements begin there rather than with a sales conversation, because it is easier to decide what to build once you can see what is leaking.',
  },
  {
    q: 'How fast does it go live?',
    a: 'A focused website or a voice agent is typically live within a week or two of kickoff. Custom applications, stores, and deeper software usually run two to six weeks. Whole-operation engagements run longer because they cover more of the business. The exact date is in your proposal, next to the price, before you agree to either.',
  },
  {
    q: 'Do you offer payment plans?',
    a: 'Yes. Most engagements can be split into milestone payments that fit your situation. Say so in the working session and we structure it together before the proposal is written.',
  },
  {
    q: 'Who owns the code and the accounts?',
    a: 'You do, fully, and from day one rather than at the end. Code is delivered to your repository. The domain, the hosting, the database, and every credential are in your name. There is no licence, no seat fee, and nothing you have to keep paying us to keep using.',
  },
  {
    q: 'What if I am not happy with what gets built?',
    a: 'We do not work in handoffs, we work in iterations, and we do not stop until it is right by you. Revisions are inside every engagement rather than bolted on. There is nothing to refund because we do not walk away from unfinished work.',
  },
  {
    q: 'I do not know much about agentic systems. Is this still for me?',
    a: 'Yes, and most clients do not. A website or a voice agent asks nothing of you technically, and a custom build starts with working out what to build together. You bring the business and the judgment about your own customers. We bring the technical decisions and we explain the ones that matter.',
  },
  {
    q: 'What if my project does not look like anything on your site?',
    a: 'Plenty do not, and that is usually the interesting ones. Say what you are trying to make happen rather than what you think it should be called. The working session exists to turn that into a scope.',
  },
];
