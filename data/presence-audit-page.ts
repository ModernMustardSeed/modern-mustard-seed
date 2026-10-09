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
  metaTitle: 'The Free Website and Online Presence Audit',
  metaDescription:
    'A free audit of your website, your Google Business Profile and your reviews, plus a deep scan underneath: speed, security certificate, domain expiry, email forgery protection, Google and AI search readiness, and whether a visit turns into a call. Every check prints what we found.',
  /** The promise on the page, the receipt email and the FAQ. Change it in all three. */
  turnaround: 'within 24 hours',
};

/* ─────────────────────────── the ticker ─────────────────────────── */

export const TICKER = [
  'Your website, graded',
  'Your Google profile, checked',
  'Your reviews, measured',
  'Speed, measured',
  'Domain and certificate, dated',
  'Email forgery, tested',
  'AI search, checked',
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

/* ─────────────────────────── the four layers ─────────────────────────── */

/**
 * What the report is made of, in the order it reads. Each one maps to a
 * chapter of the studio edition report (app/demo/audit/[auditId]/StudioAudit.tsx).
 */
export const LAYERS = [
  {
    n: '01',
    name: 'The grade',
    line: 'Three pillars, one number',
    d: 'Your website read closely across seven categories, your Google profile on eight checks, your reviews against your trade. The weights are printed, and anything we could not see is left out rather than scored as zero.',
  },
  {
    n: '02',
    name: 'How you show up',
    line: 'Your real Google result, drawn',
    d: 'The title and description Google is most likely to print for you, and what your link looks like when a happy customer texts it to a friend. Drawn from your own homepage, so the gap is something you can see.',
  },
  {
    n: '03',
    name: 'The deep scan',
    line: 'Under the hood, measured',
    d: 'Speed, the security certificate, the date your domain comes due, whether anyone can send email as you, whether Google and the AI assistants are allowed to read you, and whether a visitor can call, text or book. Every line prints what we found.',
  },
  {
    n: '04',
    name: 'The plan',
    line: 'Sorted by effort, not alarm',
    d: 'What you already got right comes first. Then the fixes: a short list to do first, and everything else in three columns, this week, this month, and when you are ready. Most of the first column costs nothing.',
  },
];

/* ─────────────────────────── every check, listed ─────────────────────────── */

/**
 * The whole catalogue, printed before anybody asks. Mirrors the checks in
 * lib/presence-audit.ts (profile, reviews), lib/website-audit.ts (the seven
 * categories) and lib/deep-scan.ts (everything else). The count on the page is
 * this list's length, never a typed number: change a check there, change it here.
 * Some checks only run where they apply (Google's own speed test when a key is
 * set, the urgent-work check for the trades that take it, lazy images on a page
 * with enough of them), so a given report can show fewer.
 */
export const CATALOG: { group: string; layer: string; checks: string[] }[] = [
  {
    group: 'Your website, read closely',
    layer: 'The grade',
    checks: ['Brand: what you do, in three seconds', 'Trust: proof, names, real photos', 'SEO: what Google reads', 'GEO: what AI engines can quote', 'AI features: what answers for you', 'Conversion: the path to a call', 'Design: how it feels on a phone'],
  },
  {
    group: 'Your Google profile',
    layer: 'The grade',
    checks: ['A listing a customer can find', 'Phone number on the listing', 'Website linked from it', 'Street address published', 'Hours published', 'Active enough to carry a rating', 'Enough reviews to rank locally', 'Urgent or after-hours work stated'],
  },
  {
    group: 'Your reviews',
    layer: 'The grade',
    checks: ['Star rating', 'Review volume, against your trade'],
  },
  {
    group: 'Speed',
    layer: 'The deep scan',
    checks: ['How fast your server answers', 'Weight of the homepage', 'Scripts the page loads', 'Images in a modern format', 'Images below the fold wait their turn', "Google's mobile speed score", 'Time until the main thing appears', 'Does the page jump while it loads', 'How fast it reacts to a tap'],
  },
  {
    group: 'Security and trust',
    layer: 'The deep scan',
    checks: ['Secure connection (HTTPS)', 'http:// forwards to the secure page', 'Certificate, and the day it expires', 'Security headers', 'Everything on the page loads securely', 'A footer year that is current'],
  },
  {
    group: 'Your domain and email',
    layer: 'The deep scan',
    checks: ['The day your domain comes due', 'How long the name has been yours', 'Email at your own domain', 'SPF: who may send as you', 'DMARC: what happens to forgeries', 'The address customers see'],
  },
  {
    group: 'Search basics',
    layer: 'The deep scan',
    checks: ['Page title', 'Meta description', 'One clear main heading', 'Built for phones', 'Google is allowed to list you', 'One official address per page', 'A sitemap', 'Photos described in words', 'Page language', 'A picture when your link is shared', 'Your icon in the browser tab'],
  },
  {
    group: 'AI search',
    layer: 'The deep scan',
    checks: ['Business details in machine-readable form', 'How complete that business card is', 'ChatGPT, Claude and Perplexity allowed in', 'An llms.txt guide', 'Questions answered in your own words', 'Enough words to quote'],
  },
  {
    group: 'Turning visits into calls',
    layer: 'The deep scan',
    checks: ['Tap to call', 'A way to reach you without calling', 'Online booking', 'You can see who visits', 'Your other profiles, linked', 'Your reviews, on your own site', 'Something answers after hours'],
  },
];

export const CATALOG_COUNT = CATALOG.reduce((n, g) => n + g.checks.length, 0);

/* ─────────────────────────── how it works ─────────────────────────── */

export const STEPS = [
  {
    n: '01',
    h: 'You ask',
    d: 'Your email, your business name and your website. Thirty seconds.',
  },
  {
    n: '02',
    h: 'We grade it and scan it',
    d: 'Your Google listing on eight checks, your reviews against your trade, your website against seven categories, then the deep scan underneath: speed, security, domain, email, search and AI search.',
  },
  {
    n: '03',
    h: 'It lands in your inbox',
    d: 'What you already got right, your score, every check with what we found, and the plan sorted by effort. A private report page that is yours to keep, and prints clean.',
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
    h: 'Two of the three pillars are plain facts',
    d: 'Every profile check passes or fails on a fact, and prints what failing it costs you. Every review number prints the benchmark it was measured against. The weights are printed on the report. Every score comes with evidence you can check.',
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
    d: 'What it says, whether it is built for a phone, whether it can be found by Google and by answer engines, and whether anybody who lands on it knows what to do next. Graded against your real pages, and every claim is something we saw on them.',
  },
  {
    n: 'Two',
    name: 'The Google profile',
    weight: 25,
    how: 'Eight checks, pass or fail',
    d: 'Phone, website, address and hours on the listing. Whether it is active enough to carry a rating and has enough reviews to rank locally. For the trades, whether it says you take urgent work, the search with the least price shopping in it.',
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
    name: 'The answer engine findability grade',
    href: '/website-audit',
    line: 'How a business gets found and cited by Google and by answer engines, graded on the signals that decide it, with the to-do list that fixes them.',
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
    a: 'Most free audits are a speed score with a sales pitch attached. This one grades the three things a stranger actually sees (your site, your Google profile, your reviews), then measures the parts underneath that nobody checks: your domain, your certificate, your email security, and whether AI search can read you. Two of the three pillars are plain facts, every deep scan line prints what we found, and anything we could not see is left out rather than counted as a zero. It opens on what you already got right.',
  },
  {
    q: 'What is the deep scan?',
    a: 'The part of your online presence nobody looks at until it breaks: how fast your site answers, when your security certificate and your domain name expire, whether your email is protected against someone sending fake invoices in your name, whether Google and the AI assistants are allowed to read your site, and whether a visitor can call, text or book. It is measured from public records and your public pages, every line prints what we found, and it does not change your grade.',
  },
  {
    q: 'Do you need any logins or access?',
    a: 'No. Everything in the audit is public: your Google listing, your reviews, your website as any visitor sees it, and the public records every domain has (registration, certificate, DNS). Nothing private is read and nothing is changed.',
  },
  {
    q: 'Can I hand the report to my web person?',
    a: 'That is what it is built for. Every check prints exactly what we found (the actual title tag, the actual DMARC record, the actual expiry date) and the fix in plain words, so whoever runs your site can confirm it and do it without a meeting.',
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
