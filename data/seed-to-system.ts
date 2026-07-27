export const SEED_TO_SYSTEM = {
  name: 'SEED TO SYSTEM',
  descriptor: 'The six-week one-person business lab',
  promise:
    'Turn one useful idea into a clear offer, a working sales engine, and real customer conversations in six weeks. No team, technical background, or giant audience required.',
  audience:
    'Capable founders, operators, and experts who know they could build something valuable but are stuck between too many ideas, too many tools, and no clean path to a buyer.',
  foundingPrice: 997,
  futurePrice: 1997,
  paymentPlan: '3 payments of $367',
  seats: 15,
  guarantee:
    'Do the six core missions and submit the work. If your engine is not ready to meet the market by the end, join the next cohort free. We keep building until it is.',
} as const;

export const COURSE_WEEKS = [
  {
    code: '00',
    title: 'Plant the flag',
    result: 'Choose the one idea and the life it is allowed to build.',
    details:
      'Set the constraints first: who you want to serve, what you will not sacrifice, and the one measurable outcome this business must create.',
  },
  {
    code: '01',
    title: 'Find the expensive problem',
    result: 'A specific buyer, urgent problem, and proof that people care.',
    details:
      'Use the Idea to Spec method and a focused interview sprint to replace guesses with language, evidence, and a problem worth solving.',
  },
  {
    code: '02',
    title: 'Build the offer',
    result: 'A named outcome, scope, price, guarantee, and reason to act.',
    details:
      'Package the transformation so a buyer can understand it in one breath. Price the result, define the finish line, and remove the avoidable risk.',
  },
  {
    code: '03',
    title: 'Make the proof',
    result: 'A real demonstration, founding version, or paid pilot.',
    details:
      'Build the smallest honest version that can create evidence. Show the work, invite ten right-fit people, and listen before adding more.',
  },
  {
    code: '04',
    title: 'Wire the engine',
    result: 'A page, payment path, follow-up, and simple delivery system.',
    details:
      'Turn the offer into a working business path. One page, one next step, one follow-up sequence, and AI handling the repeatable middle.',
  },
  {
    code: '05',
    title: 'Borrow the room',
    result: 'A partner list and first 100 customer conversations.',
    details:
      'Stop waiting for an audience. Build a partner workshop, a useful outreach asset, and a direct path into rooms where the right people already gather.',
  },
  {
    code: '06',
    title: 'Open the doors',
    result: 'A live launch, clean numbers, and the next iteration.',
    details:
      'Run the class, make the offer, follow up like a human, and read the signal. Keep what worked. Fix what did not. Ship the next version.',
  },
] as const;

export const INCLUDED_ASSETS = [
  {
    title: 'Six live build rooms with Sarah',
    detail: 'A working session each week. Short teaching, live decisions, then building.',
  },
  {
    title: 'Idea to Spec',
    detail: 'The full $497 program and Spec Studio, used in weeks one and two.',
  },
  {
    title: 'Mustard Launch Kit',
    detail: 'The $197 launch package for positioning, pricing, copy, and the 30/60/90 plan.',
  },
  {
    title: 'Mustard Mode Player',
    detail: 'The $197 coach-led build system for the technical and creative reps.',
  },
  {
    title: 'The Foundations Bundle',
    detail: 'The $97 AI-ready, AI-native, and sales playbooks that support the core missions.',
  },
  {
    title: 'The Brand Studio Playbook',
    detail: 'The $67 voice, visual system, and content-production playbook.',
  },
  {
    title: 'Two personal engine reviews',
    detail: 'Sarah reviews the offer before you pitch it and the full engine before launch.',
  },
  {
    title: 'The Borrowed Room partner kit',
    detail: 'Host pitch, partner brief, referral terms, swipe copy, and a 100-conversation tracker.',
  },
] as const;

export const SEED_FAQ = [
  {
    q: 'Is this only for Christians?',
    a: 'No. The work is practical and the room is open to anyone. Sarah teaches from a Christian posture: stewardship over striving, people over vanity metrics, and work that should serve more than your ego.',
  },
  {
    q: 'Do I need a business idea already?',
    a: 'Bring one idea, five ideas, or simply useful experience. Week zero and week one are designed to choose the right seed before you spend time building it.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. You need a computer and the willingness to learn a few new motions. The system uses AI to do much of the technical work, and Sarah teaches the rest in order.',
  },
  {
    q: 'Will I make money in six weeks?',
    a: 'You will build toward real offers and customer conversations, not simulated homework. Nobody honest can guarantee that another person will buy. We can guarantee a clear offer, a working path to purchase, direct market signal, and hands-on help if you complete the work.',
  },
  {
    q: 'How much time should I plan for?',
    a: 'Plan on one 90-minute live room and three focused hours of implementation each week. The point is a small number of high-leverage moves, not another full-time job.',
  },
  {
    q: 'Why a cohort instead of another self-paced course?',
    a: 'Information is not the scarce part. Decisions, deadlines, feedback, and contact with the market are. The live room exists to get the business out of your notes app and into the world.',
  },
  {
    q: 'What happens if I fall behind?',
    a: 'Recordings and mission briefs are available after every room. Complete the six core missions and submit the work. If the engine is not market-ready, the next cohort is included.',
  },
] as const;

export const WEBINAR = {
  name: 'The One-Person Business Engine',
  eyebrow: 'Free live class with Sarah Scarano',
  headline: 'Build the five jobs your business needs before you hire five people',
  promise:
    'See how to turn one useful idea into an offer, a simple AI-powered engine, and your first 100 customer conversations, even if your audience is currently very small.',
  length: '60-minute class plus live Q&A',
  proof:
    'Taught from the real systems Sarah uses across Modern Mustard Seed, Cross + Covenant, and dozens of shipped client products.',
} as const;

export const ENGINE_JOBS = [
  {
    number: '01',
    job: 'The Scout',
    result: 'Finds the expensive problem and the people already trying to solve it.',
  },
  {
    number: '02',
    job: 'The Offer Builder',
    result: 'Turns what you know into a clear outcome, price, scope, and guarantee.',
  },
  {
    number: '03',
    job: 'The Proof Maker',
    result: 'Creates the demonstration or paid pilot that makes the claim believable.',
  },
  {
    number: '04',
    job: 'The Follow-Up Desk',
    result: 'Captures interest, answers the common questions, and keeps warm leads warm.',
  },
  {
    number: '05',
    job: 'The Delivery Engine',
    result: 'Uses AI for the repeatable middle so your judgment can stay on the work only you can do.',
  },
] as const;
