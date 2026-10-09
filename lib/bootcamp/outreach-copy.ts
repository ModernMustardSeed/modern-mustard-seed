import { BOOTCAMP, BOOTCAMP_PROOF, HOSTS, OPERATOR, bootcampTiers, usd } from '@/data/bootcamp';
import { SITE } from '@/lib/seo';

/**
 * THE HOST LETTERS. Three touches to one audience owner, in Sarah's voice.
 *
 * Pure functions, no network. Every number is read from data/bootcamp.ts so a
 * price move on the page moves the letters with it, and nothing is promised
 * here that the host terms on /bootcamp/host do not pay. The one thing a
 * letter never does is guess the size of their audience back at them: the
 * research row knows a number, the letter does not say it.
 *
 * Plain text only. These go out one at a time from Sarah's own address, which
 * is the same reason there is no html, no pixel and no unsubscribe footer.
 */

export type OutreachTarget = {
  name: string;
  brand?: string | null;
  email?: string | null;
  hook?: string | null;
  vertical?: string | null;
  fit?: number | null;
  tier?: string | null;
};

export type OutreachStep = 1 | 2 | 3;

const MASTERCLASS_URL = `${SITE.url}/bootcamp/masterclass`;
const HOST_URL = `${SITE.url}/bootcamp/host`;

/** Word caps the tests pin. Step 1 is the long one; it still fits on a phone. */
export const WORD_CAP: Record<OutreachStep | 'hand', number> = { 1: 160, 2: 90, 3: 90, hand: 90 };

export const countWords = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

const monthDay = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: BOOTCAMP.timezone, month: 'long', day: 'numeric' }).format(new Date(iso));
const dayOf = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: BOOTCAMP.timezone, day: 'numeric' }).format(new Date(iso));

/** "February 2 to 9". */
export const SESSION_SPAN = `${monthDay(BOOTCAMP.dates.day1)} to ${dayOf(BOOTCAMP.dates.day3)}`;
export const MASTERCLASS_DAY = monthDay(BOOTCAMP.dates.masterclass);

const ticketLow = usd(Math.min(...bootcampTiers.map((t) => t.priceCents)));
const ticketHigh = usd(Math.max(...bootcampTiers.map((t) => t.priceCents)));
/** "Operator Program" in a sentence; the data file carries the article. */
const PROGRAM = OPERATOR.name.replace(/^The /, '');
/** 20% of the program seat, in whole dollars, the same figure HOSTS.terms publishes. */
const programShare =usd(Math.round((OPERATOR.priceCents * HOSTS.programPct) / 100));

function firstName(name: string): string {
  const first = (name || '').trim().split(/\s+/)[0] || '';
  // A brand in the name slot ("The Futur") is not a person; "Hi there" beats "Hi The".
  if (!first || /^(the|team|a|an)$/i.test(first)) return 'there';
  return first;
}

const SIGNATURE = ['Sarah', '', `Sarah Scarano, ${SITE.name}, Kalispell, Montana`, SITE.url].join('\n');

/**
 * The hook the research wrote, turned into the opening observation. Research
 * hooks are one sentence about their audience, usually followed by a clause
 * about the bootcamp after a semicolon. The letter opens with the observation
 * alone, in second person, and says the bootcamp part itself. Nothing is
 * invented: a missing hook opens on the one fact every target shares.
 */
export function observationFrom(target: OutreachTarget, maxWords = 34): string {
  let s = (target.hook || '').replace(/\s+/g, ' ').trim();
  if (!s) return 'Your audience already runs a business on their own.';
  // Keep the observation, drop the pitch clause the researcher appended.
  s = s.split(';')[0];
  s = s.replace(/,?\s+(and|so|where)\s+(a live bootcamp|the bootcamp|our bootcamp|the one-person company bootcamp)\b.*$/i, '');
  // Their audience size stays in the research row. The letter never says a
  // number back at them: "Your 250K readers" becomes "Your readers".
  s = s
    .replace(/\b\d{1,3}(?:,\d{3})+\+?(?:-member)?\s*/g, '')
    .replace(/\b\d+(?:\.\d+)?[KkMm]\+?(?:-member)?\s*/g, '')
    .replace(/\s{2,}/g, ' ');
  // Second person: this is a letter to them, not a note about them.
  s = s
    .replace(/^(His|Her|Their)\b/, 'Your')
    .replace(/^(He|She|They) (already )?(sells?|runs?|teach(?:es)?|hosts?|has|have)\b/, (m, _p, already, verb) => `You ${already || ''}${verb.replace(/s$|es$/, '')}`)
    .replace(/\b(his|her|their) (audience|listeners|readers|viewers|subscribers|followers|members|people|community|builders|founders|students|clients)\b/gi, 'your $2');
  const words = s.split(' ');
  if (words.length > maxWords) {
    // Cut at the last clause boundary inside the cap, so the sentence still
    // reads like one Sarah wrote rather than one that ran out of room.
    const cut = words.slice(0, maxWords).join(' ');
    const at = Math.max(...[',', ' and ', ' that ', ' who ', ' which ', ' so ', ' because '].map((b) => cut.lastIndexOf(b)));
    s = at > cut.length * 0.4 ? cut.slice(0, at) : cut;
  }
  s = s.replace(/[\s,.;:]+$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

/** One proof number per target, fixed by name so the same person never sees two. */
export function proofFor(target: OutreachTarget): { n: string; label: string } {
  // "1 person at the desk" is the premise, not a proof; the rest are.
  const pool = BOOTCAMP_PROOF.filter((p) => p.n !== '1');
  let h = 0;
  for (const ch of `${target.name}${target.brand || ''}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

const WHAT_IT_IS =
  `${BOOTCAMP.name} is three live sessions, ${SESSION_SPAN}. I show how one builder runs an entire AI product studio on a crew of Claude agents, then every attendee builds two agents of their own.`;

const WHAT_HOSTING_IS =
  `Hosting means running it for your audience under your name. You keep ${HOSTS.ticketPct}% of every ticket, ${ticketLow} to ${ticketHigh}, plus ${HOSTS.programPct}% of every ${PROGRAM} seat, ${programShare} a seat. Bring ${HOSTS.roomThreshold} and you get your own room on Day 2 with your name on it.`;

const THE_ASK = 'Want the host link and the swipe copy? Reply yes and it is yours the same day.';

export function outreachEmail(step: OutreachStep, target: OutreachTarget): { subject: string; text: string } {
  const hi = `Hi ${firstName(target.name)},`;
  if (step === 1) {
    return {
      subject: 'Host a room at the bootcamp, keep every ticket',
      text: [
        hi,
        '',
        observationFrom(target),
        '',
        WHAT_IT_IS,
        '',
        WHAT_HOSTING_IS,
        '',
        `The free masterclass on ${MASTERCLASS_DAY} is the first thing to share.`,
        '',
        THE_ASK,
        '',
        SIGNATURE,
      ].join('\n'),
    };
  }
  if (step === 2) {
    const proof = proofFor(target);
    return {
      subject: `Founding host terms, first ${HOSTS.foundingHosts}`,
      text: [
        hi,
        '',
        `One number from the desk that runs the studio: ${proof.n} ${proof.label}. Your audience sees that desk, live, across the three sessions.`,
        '',
        `The first ${HOSTS.foundingHosts} hosts are founding hosts and keep the same terms on all four 2027 launches: ${HOSTS.ticketPct}% of every ticket and ${HOSTS.programPct}% of every ${PROGRAM} seat.`,
        '',
        'Reply yes and the host link and swipe copy go out the same day.',
        '',
        SIGNATURE,
      ].join('\n'),
    };
  }
  return {
    subject: 'Closing the file, and a free seat for your audience',
    text: [
      hi,
      '',
      `I will take the quiet as a no and close this file, and the free masterclass on ${MASTERCLASS_DAY} is open to your audience either way, no terms attached: ${MASTERCLASS_URL}`,
      '',
      SIGNATURE,
    ].join('\n'),
  };
}

/**
 * The paste-in version for a contact form or a DM: no greeting, no line
 * breaks a form will eat, the whole thing under ninety words. The desk shows
 * it next to the contact path with a Copy button.
 */
export function handMessage(target: OutreachTarget): string {
  return [
    observationFrom(target, 20),
    `${BOOTCAMP.name} is three live sessions, ${SESSION_SPAN}: one builder runs an AI product studio on a crew of Claude agents, and every attendee builds two agents.`,
    `Hosts keep ${HOSTS.ticketPct}% of every ticket and ${HOSTS.programPct}% of every ${PROGRAM} seat.`,
    `Want the host link and the swipe copy? Reply yes and it is yours the same day. Sarah Scarano, ${SITE.name}, ${HOST_URL}`,
  ].join(' ');
}
