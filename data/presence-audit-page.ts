/**
 * THE ONLINE PRESENCE AUDIT, as a public landing page.
 *
 * Why this exists (Sarah, 2026-09-16): every "audit" link on the site pointed at
 * /audit, which is the Bottleneck Breaker. That is a different tool answering a
 * different question, so a visitor who came for an audit of their presence got a
 * sixty-second bottleneck scan instead.
 *
 * How it works (Sarah, 2026-09-18): "I want them to have to put email in and then
 * I will run audit for them in my mms admin and it will email them back once I
 * run it." So nothing is graded on this page. The visitor leaves an email, the
 * request lands on the Audit Desk (/admin/audit), Sarah reads their listing and
 * presses Run, and the report is emailed. See lib/audit-requests.ts.
 *
 * The argument below is not marketing invention. It is the reasoning already
 * written into lib/presence-audit.ts, which grades three pillars and deliberately
 * keeps two of them out of the hands of a model, because a rubric an owner can
 * re-run himself is a rubric he believes.
 */

export const PRESENCE = {
  metaTitle: 'The Free Online Presence Audit',
  metaDescription:
    'A free audit of your whole online presence: your website graded on seven categories, your Google Business Profile on eight checks, and your reviews against your trade. Leave your email and the full report arrives in your inbox.',
  /** The promise on the page, the receipt email and the FAQ. Change it in all three. */
  turnaround: 'within one business day',
};

/* ─────────────────────────── the ticker ─────────────────────────── */

export const TICKER = [
  'Your website, graded',
  'Your Google profile, checked',
  'Your reviews, measured',
  'Every check verifiable',
  'Yours to keep',
  'No card',
  'No call unless you ask',
];

/* ─────────────────────────── the sample report ─────────────────────────── */

/**
 * A SAMPLE, and labelled as one everywhere it renders. The business is invented
 * and the page says so, so no real owner is ever graded in public. The numbers
 * are internally honest: the overall is the printed weights applied to the
 * three pillar scores (0.45 x 41 + 0.30 x 88 + 0.25 x 75 = 63.6), each pillar is
 * what lib/presence-audit.ts actually returns for those inputs (58 reviews at
 * 4.8 scores 43 + 45 = 88; the four profile checks shown failing two of eight
 * leaves 75), and every letter is letterFor() of its number.
 */
export const SAMPLE = {
  business: 'Sample Roofing Co.',
  overall: 64,
  letter: 'D',
  headline: 'Your reviews are outrunning your website.',
  pillars: [
    { label: 'Website', score: 41, letter: 'F', weight: 45, note: 'The reviews send people to a page that never mentions them.' },
    { label: 'Reviews', score: 88, letter: 'B+', weight: 30, note: '58 reviews at 4.8. Strangers believe this, and the website never shows it.' },
    { label: 'Google profile', score: 75, letter: 'C', weight: 25, note: 'Two free fixes away from a complete listing.' },
  ],
  checks: [
    { label: 'Phone number on the listing', passed: true, pts: '10/10' },
    { label: 'Website linked from the listing', passed: true, pts: '15/15' },
    { label: 'Hours published', passed: false, pts: '0/15' },
    { label: 'Emergency or after-hours service stated', passed: false, pts: '0/10' },
  ],
  fix: {
    title: 'Publish your hours on Google',
    why: '"Hours not available" is the most common reason a business gets skipped at six in the evening. It is free and it takes five minutes.',
  },
};

/* ─────────────────────────── how it works ─────────────────────────── */

export const STEPS = [
  {
    n: '01',
    h: 'You ask',
    d: 'Your email, your business name and your website. Thirty seconds.',
  },
  {
    n: '02',
    h: 'We grade all three',
    d: 'Your Google listing on eight checks, your reviews against your trade, and your website against seven categories.',
  },
  {
    n: '03',
    h: 'It lands in your inbox',
    d: 'Your score, every check with what it is worth, and the fixes ranked cheapest first. A private report page that is yours to keep.',
  },
];

/* ─────────────────────────── the argument ─────────────────────────── */

export const WHY = [
  {
    k: 'The problem with a website audit',
    h: 'Your site is one third of the story',
    d: 'Most people find you before they ever reach your website. They find a Google listing, a star rating and a pile of reviews, and they have decided how they feel about you before a single page of yours loads. Grading the site alone tells you how the last third went.',
  },
  {
    k: 'Why the score is checkable',
    h: 'Two of the three pillars are not AI',
    d: 'Every profile check passes or fails on a fact, and prints what failing it costs you. Every review number prints the benchmark it was measured against. The weights are printed on the report. An audit nobody can check is a horoscope with a logo.',
  },
  {
    k: 'What you do with it',
    h: 'An argument, not an opinion',
    d: '"Your website is weak" is something a stranger can wave away. "You have 58 reviews at 4.8, which is the best asset you own, and the website they land on after reading them scores 41" is an argument, because you can verify every number in it in about ninety seconds.',
  },
];

/* ─────────────────────────── the three pillars ─────────────────────────── */

export const PILLARS = [
  {
    n: 'One',
    name: 'The website',
    weight: 45,
    how: 'Seven categories, read not scanned',
    d: 'What it says, how fast it is, whether it works on a phone, whether it can be found by Google and by AI answers, and whether anybody who lands on it knows what to do next. Graded against your real pages.',
  },
  {
    n: 'Two',
    name: 'The Google profile',
    weight: 25,
    how: 'Eight checks, pass or fail',
    d: 'Phone, website, address and hours on the listing. Whether it is active enough to carry a rating and has enough reviews to rank locally. Whether it says you take urgent work, the search with the least price shopping in it.',
  },
  {
    n: 'Three',
    name: 'The reviews',
    weight: 30,
    how: 'Measured against your trade',
    d: 'Volume and rating, scored against a benchmark for businesses like yours rather than against perfection. Plenty of good operators are one honest ask away from the number that changes how they rank.',
  },
];

/* ─────────────────────────── the rest of the desk ─────────────────────────── */

export const DESK = [
  {
    name: 'The Bottleneck Breaker',
    href: '/audit',
    line: 'A different question: of everything in your business, what is quietly costing you the most right now. Sixty seconds, on screen, no email. Start there if you already know your presence is fine.',
    cta: 'Find the bottleneck',
  },
  {
    name: 'The AI findability grade',
    href: '/website-audit',
    line: 'How a business gets found and cited by Google and by AI answers, graded on the signals that decide it, with the to-do list that fixes them.',
    cta: 'Grade my findability',
  },
  {
    name: 'The Hundredfold Roadmap',
    href: '/scaling-roadmap',
    line: 'A scaling plan built from what your website actually says about the business. For when the question is not what is broken but what is next.',
    cta: 'Build my roadmap',
  },
];

/* ─────────────────────────── questions ─────────────────────────── */

export const PRESENCE_FAQ = [
  {
    q: 'Is it actually free?',
    a: 'Yes. No card, no meeting, and the report is yours to keep whether or not we ever speak. Plenty of people take the ranked fixes and do the work themselves, and that is a fine outcome.',
  },
  {
    q: 'Why do you need my email?',
    a: 'Because the full report is emailed to you. We read your real Google listing and reviews and grade your site, and the email is how the finished report reaches you. It is not added to a newsletter or a sequence.',
  },
  {
    q: 'How long does it take?',
    a: `The report arrives ${PRESENCE.turnaround}. You get a note the moment you ask so you know it is in, then the full report when it is done.`,
  },
  {
    q: 'What makes this different from the free audits everybody offers?',
    a: 'Two of the three pillars are not AI at all. Every profile check passes or fails on something you can verify yourself in a minute, every review number prints the benchmark it was measured against, and the pillar weights are printed on the report. Anything we could not see is left out of the score rather than counted as a zero.',
  },
  {
    q: 'How is this different from the Bottleneck Breaker?',
    a: 'They answer different questions. The Bottleneck Breaker reads your website and names the one thing in your business costing you the most, on screen in sixty seconds. The Presence Audit grades how you look to a stranger deciding whether to call you: your site, your Google profile and your reviews, delivered as a full report by email.',
  },
  {
    q: 'Will you call me?',
    a: 'Only if you ask. The report lands in your inbox with the fixes ranked. If you want to talk it through, reply to the email.',
  },
  {
    q: 'What if I do not have a website yet?',
    a: 'Ask anyway and leave the website blank. The profile and reviews still get graded, and the report will tell you plainly what to do first, which is usually free.',
  },
];
