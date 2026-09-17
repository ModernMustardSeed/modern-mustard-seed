/**
 * THE ONLINE PRESENCE AUDIT, as a public landing page.
 *
 * Why this exists (Sarah, 2026-09-16): every "audit" link on the site pointed at
 * /audit, which is the Bottleneck Breaker. That is a different tool answering a
 * different question, so a visitor who came for an audit of their presence got a
 * sixty-second bottleneck scan instead and nothing tied the tools together.
 *
 * The argument below is not marketing invention. It is the reasoning already
 * written into lib/presence-audit.ts, which grades three pillars and deliberately
 * keeps two of them out of the hands of a model, because a rubric a contractor
 * can re-run himself is a rubric he believes.
 *
 * What is honest about the split on this page:
 *   - The WEBSITE pillar runs instantly and self-serve. It is the existing
 *     public engine and it needs nothing but a URL.
 *   - The PROFILE and REVIEWS pillars are read off their real Google listing,
 *     so the full three-pillar report is requested rather than generated on the
 *     spot. The page says that rather than pretending otherwise.
 */

export const PRESENCE = {
  metaTitle: 'The Online Presence Audit',
  metaDescription:
    'A free audit of your whole online presence, not just your website: the site itself, your Google Business Profile, and your reviews, each scored against a rubric you can check yourself. Sixty seconds for the website grade, the full report by email.',
};

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
    d: '"Your website is weak" is something a stranger can wave away. "You have 312 reviews at 4.9, which is the best asset you own, and the website they land on after reading them scores 41" is an argument, because you can verify every number in it in about ninety seconds.',
  },
];

/* ─────────────────────────── the three pillars ─────────────────────────── */

export const PILLARS = [
  {
    n: 'One',
    name: 'The website',
    how: 'Read, not scanned',
    d: 'Seven categories graded against your real HTML: what it says, how fast it is, whether it works on a phone, whether it can be found, and whether anybody who lands on it knows what to do next. This is the part you can run right now, on this page.',
    instant: true,
  },
  {
    n: 'Two',
    name: 'The Google profile',
    how: 'Eight checks, pass or fail',
    d: 'Claimed or not. Categories set correctly, because categories decide which searches you are even eligible for. Hours, address and phone matching the site exactly, because matching is the part Google checks. Photos, services, and whether anybody answers a review.',
    instant: false,
  },
  {
    n: 'Three',
    name: 'The reviews',
    how: 'Measured against your trade',
    d: 'Volume and rating, scored against a benchmark for businesses like yours rather than against perfection. Plenty of good operators are one honest ask away from the number that changes how they rank, and plenty of others are sitting on the best asset they own without using it.',
    instant: false,
  },
];

/* ─────────────────────────── the rest of the desk ─────────────────────────── */

export const DESK = [
  {
    name: 'The Bottleneck Breaker',
    href: '/audit',
    line: 'One question answered in sixty seconds: of everything in your business, what is quietly costing you the most right now. Start here if you already know the site is fine.',
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
    a: 'Yes, and there is no card and no meeting. The website grade runs on this page and you keep it whether or not we ever speak. The full three-pillar report is emailed to you and you keep that too.',
  },
  {
    q: 'Why can I run the website grade now but not the whole thing?',
    a: 'Because the other two pillars are read off your real Google listing rather than generated. Your profile checks and your review numbers are facts about your business, and we would rather go and look at them than guess. That takes a little longer than a page load, so the full report comes by email.',
  },
  {
    q: 'What makes this different from the free audits everybody offers?',
    a: 'Two of the three pillars are not AI at all. Every profile check passes or fails on something you can verify yourself in a minute, every review number prints the benchmark it was measured against, and the pillar weights are printed on the report so you can see exactly how the score was reached. Nothing in it asks you to take our word.',
  },
  {
    q: 'Will you call me?',
    a: 'Only if you ask. The report lands in your inbox with the fixes ranked, and plenty of people take that and do the work themselves. That is a fine outcome and it is the honest reason the audit exists.',
  },
  {
    q: 'What do I need to hand over?',
    a: 'Your website and your business name for the grade. For the full report it helps to have the town you operate in, so the right Google listing gets matched to the right business.',
  },
  {
    q: 'What if I do not have a website yet?',
    a: 'Then the audit is the wrong tool and the profile is the right place to start. Say so when you write and we will tell you what to do first, which is usually free and usually not us.',
  },
];
