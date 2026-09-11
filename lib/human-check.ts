/**
 * THE HUMAN CHECK.
 *
 * Carmen said what she wants out of this: "five strong real leads per month,
 * decrease in spam/fake leads." The lead endpoint already drops the obvious
 * robots silently, with a honeypot field and by refusing anything that filled
 * a message in under three seconds. Those are invisible, which is right, but
 * invisible protection gives the business no confidence that anything is
 * happening.
 *
 * So this adds one plain question in front of the send button. Not a puzzle,
 * not a grid of traffic lights, not a third party watching their visitors.
 * A sentence a person answers without thinking and a script cannot answer
 * without being written for this one site.
 *
 * It is stateless. The server signs the expected answer into the token it
 * hands out, so nothing is stored and nothing expires except by the clock.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 30 * 60 * 1000;
const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

function secret(): string {
  const s = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('CLIENT_SESSION_SECRET not configured');
  return s;
}

export type Challenge = { question: string; token: string };

/**
 * A question in words, never digits, because a digit is trivially regexed out
 * of a page by a scraper and a spelled number is not.
 */
export function makeChallenge(): Challenge {
  const kind = Math.floor(Math.random() * 3);
  let question: string;
  let answer: string;

  if (kind === 0) {
    const a = 1 + Math.floor(Math.random() * 5);
    const b = 1 + Math.floor(Math.random() * 5);
    question = `What is ${SMALL[a]} plus ${SMALL[b]}?`;
    answer = String(a + b);
  } else if (kind === 1) {
    const words = ['Montana', 'Flathead', 'Kalispell', 'Whitefish', 'Glacier'];
    const w = words[Math.floor(Math.random() * words.length)];
    question = `Type the word ${w} to show you are a person.`;
    answer = w.toLowerCase();
  } else {
    const sets: Array<[string, string]> = [
      ['Which of these is a colour: Tuesday, blue, or hammer?', 'blue'],
      ['Which of these is a season: winter, kitchen, or gravel?', 'winter'],
      ['Which of these is an animal: roof, elk, or window?', 'elk'],
      ['Which of these is a tree: larch, granite, or Sunday?', 'larch'],
    ];
    const [q, a] = sets[Math.floor(Math.random() * sets.length)];
    question = q;
    answer = a;
  }

  const expires = Date.now() + TTL_MS;
  const payload = `${answer}:${expires}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  // The answer travels inside the signature, never in the clear.
  return { question, token: `${Buffer.from(String(expires)).toString('base64url')}.${sig}` };
}

/** True when `given` is the answer the token was minted for and the token is still in date. */
export function checkAnswer(token: unknown, given: unknown): { ok: true } | { ok: false; reason: string } {
  const raw = String(token ?? '');
  const [expB64, sig] = raw.split('.');
  if (!expB64 || !sig) return { ok: false, reason: 'missing' };

  let expires: number;
  try {
    expires = Number(Buffer.from(expB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'bad token' };
  }
  if (!Number.isFinite(expires)) return { ok: false, reason: 'bad token' };
  if (Date.now() > expires) return { ok: false, reason: 'expired' };

  const answer = String(given ?? '').trim().toLowerCase();
  if (!answer) return { ok: false, reason: 'no answer' };
  // A person may write the number as a word; accept either.
  const asDigit = SMALL.indexOf(answer);
  const candidates = asDigit >= 0 ? [answer, String(asDigit)] : [answer];

  for (const c of candidates) {
    const want = createHmac('sha256', secret()).update(`${c}:${expires}`).digest('base64url');
    const a = Buffer.from(want);
    const b = Buffer.from(sig);
    if (a.length === b.length && timingSafeEqual(a, b)) return { ok: true };
  }
  return { ok: false, reason: 'wrong' };
}
