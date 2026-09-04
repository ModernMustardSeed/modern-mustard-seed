/**
 * DOES THE REPLY CLASSIFIER STILL KNOW A YES FROM A QUESTION?
 *
 * `lib/acq/build-ask.ts` decides, with no human in the loop, whether an inbound
 * reply spends 24 to 60 minutes of the build floor. Two ways to be wrong and
 * they cost different things: a missed yes loses the warmest lead in the
 * building, a false yes burns an hour that a real yes was queued behind.
 *
 * Every case below carries our own cold email quoted underneath it, because
 * that is what a real reply looks like and our email is full of the words
 * "build", "website" and "free". A classifier that reads the raw body calls
 * "unsubscribe" an enthusiastic yes. That is the single failure this guards.
 *
 * Needs no credentials and touches nothing. Run: pnpm acq:ask
 */

import { classifyBuildAsk, stripQuoted } from '@/lib/acq/build-ask';

/** Our own cold email, quoted under every genuine reply. */
const OURS = `
On Wed, Sep 3, 2026 at 9:14 AM Sarah at Modern Mustard Seed <sarah@modernmustardseed.com> wrote:
> Can we build ABC Roofing a demo? It is free.
> We build you a website and an AI receptionist, free, nothing to sign up for.
> Just reply yes and we will build it and send it over.
> You got this because Modern Mustard Seed works with local businesses in your area.
`;

type Verdict = 'clear' | 'ambiguous' | 'none';
type Case = { name: string; body: string; want: Verdict };

const cases: Case[] = [
  // A yes that costs us nothing to believe.
  { name: 'bare yes', body: 'Yes', want: 'clear' },
  { name: 'yes please', body: 'Yes, please go ahead.', want: 'clear' },
  { name: 'build it', body: 'Sounds good, build it.', want: 'clear' },
  { name: 'send it over', body: 'sure, send it over', want: 'clear' },
  { name: 'lets do it', body: "Let's do it. -Mike", want: 'clear' },
  { name: 'build mine', body: 'build mine please', want: 'clear' },
  { name: 'id like one', body: "I'd like one, thanks.", want: 'clear' },

  // The trap: our own words must never read as their answer.
  { name: 'only quoted history', body: '', want: 'none' },
  { name: 'unsubscribe', body: 'Unsubscribe.', want: 'none' },
  { name: 'not interested', body: 'Not interested, thanks.', want: 'none' },
  { name: 'remove me', body: 'please remove me from your list', want: 'none' },

  // Machines are never a person asking for anything.
  { name: 'out of office', body: 'I am out of the office until Monday and will reply then.', want: 'none' },
  { name: 'automatic reply', body: 'Automatic reply: Thank you for your email.', want: 'none' },
  { name: 'bounce notice', body: 'Delivery Status Notification (Failure)', want: 'none' },

  // Still asking. The expensive false positive.
  { name: 'yes but how much', body: 'Yes, how much does it cost?', want: 'ambiguous' },
  { name: 'sure whats the catch', body: "Sure. What's the catch?", want: 'ambiguous' },
  { name: 'interested, call me', body: 'Interested. Can we talk? Call me at 555 0134.', want: 'ambiguous' },
  { name: 'price only', body: 'What would a website like that cost?', want: 'ambiguous' },
  { name: 'who are you', body: 'Who is this and how did you get my email?', want: 'ambiguous' },
  { name: 'is it really free', body: 'Is it free? Really?', want: 'ambiguous' },
  { name: 'conditional', body: 'If I like it would I be locked into a contract?', want: 'ambiguous' },
  { name: 'vague interest', body: 'We already have a website but the phone is a problem.', want: 'ambiguous' },

  // Not about us at all.
  { name: 'wrong person', body: 'You want my brother, this is his old address.', want: 'none' },
];

let passed = 0;
const failures: string[] = [];

for (const c of cases) {
  const got = classifyBuildAsk(c.body + OURS, '').verdict;
  if (got === c.want) {
    passed += 1;
    continue;
  }
  failures.push(
    [
      `  ${c.name}`,
      `     want ${c.want}, got ${got}`,
      `     read as: ${JSON.stringify(stripQuoted(c.body + OURS).slice(0, 80))}`,
    ].join('\n'),
  );
}

// The strip is the whole game, so prove it separately rather than trusting the
// verdicts to have exercised it.
const stripped = stripQuoted('Yes' + OURS);
if (stripped !== 'Yes') {
  failures.push(`  quoted history was not stripped\n     expected "Yes", got ${JSON.stringify(stripped)}`);
}

console.log(`${passed}/${cases.length} classifier cases passed, quoted-history strip ${stripped === 'Yes' ? 'clean' : 'BROKEN'}.`);
if (failures.length) {
  console.error(`\n${failures.length} failure${failures.length === 1 ? '' : 's'}:\n${failures.join('\n')}`);
  process.exit(1);
}
