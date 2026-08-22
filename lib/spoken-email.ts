/**
 * IS THIS AN ADDRESS THAT CAN ACTUALLY RECEIVE MAIL?
 *
 * A voice agent takes an email by ear, and a shape check (`something@something
 * .something`) passes every plausible mishearing. `gmial.com` passes. `gmail.co`
 * passes. `gnail.com` passes. Each one sends a real customer's checkout link,
 * demo, or booking confirmation into nothing, and the caller has already hung up
 * believing it is in their inbox.
 *
 * 2026-08-17 is why this exists: a live pay link went out to `bizyal2023@gmail
 * .com` when the caller had confirmed `bizyai2023@gmail.com`. The domain was
 * fine there, so this catches the other half of the same problem, and the two
 * guards together are what make "it is on its way" a true sentence.
 *
 * Two checks, cheapest first:
 *   1. A typo table for the handful of domains that are 90% of real traffic.
 *      A near miss returns a correction the agent can read back, which is far
 *      better than a refusal, because the caller almost certainly said the right
 *      thing and the transcriber heard it wrong.
 *   2. A live MX lookup. A domain with no mail exchanger cannot receive mail,
 *      full stop, and that is knowable in a few milliseconds before anyone
 *      promises anything.
 *
 * It FAILS OPEN on lookup trouble. A DNS timeout must never block a real
 * customer's email, so an unresolvable check returns ok with a note rather than
 * refusing the send.
 */

import { promises as dns } from 'node:dns';

export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The domains a caller actually says, and the ways a phone line mangles them.
 * Kept short on purpose: this list is for near misses of common consumer mail,
 * not a dictionary of the internet. A domain that is not here and has MX
 * records is simply accepted.
 */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'jmail.com': 'gmail.com',
  'email.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclould.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'icoud.com': 'icloud.com',
  'aol.co': 'aol.com',
  'comcast.com': 'comcast.net',
  'protonmail.co': 'protonmail.com',
};

export type EmailVerdict =
  | { ok: true; address: string; note?: string }
  | { ok: false; reason: 'shape' | 'typo' | 'no-mail-server'; suggestion?: string };

/**
 * @param raw the address exactly as the agent wrote it into a tool
 */
export async function checkSpokenEmail(raw: string): Promise<EmailVerdict> {
  const address = String(raw || '').trim().toLowerCase();
  if (!EMAIL_SHAPE.test(address)) return { ok: false, reason: 'shape' };

  const domain = address.slice(address.lastIndexOf('@') + 1);

  const fixed = DOMAIN_TYPOS[domain];
  if (fixed) {
    return { ok: false, reason: 'typo', suggestion: `${address.slice(0, address.lastIndexOf('@'))}@${fixed}` };
  }

  try {
    const mx = await withTimeout(dns.resolveMx(domain), 2500);
    if (Array.isArray(mx) && mx.length > 0) return { ok: true, address };
    // No MX is not automatically fatal: a domain may accept mail on its A
    // record. Check that before calling it dead.
    const a = await withTimeout(dns.resolve4(domain), 2000).catch(() => []);
    if (Array.isArray(a) && a.length > 0) return { ok: true, address, note: 'no MX, falling back to the A record' };
    return { ok: false, reason: 'no-mail-server' };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // ENOTFOUND / NXDOMAIN mean the domain does not exist. That is a real
    // answer, not a lookup failure, and it is exactly the mishearing we want to
    // catch before promising a customer their link is on the way.
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') return { ok: false, reason: 'no-mail-server' };
    // Anything else (timeout, servfail, no network) fails OPEN.
    return { ok: true, address, note: `mail server check inconclusive (${code ?? 'unknown'})` };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms)),
  ]);
}

/**
 * What the agent should SAY about a bad address. Written as an instruction to
 * him rather than as an error, because the caller is still on the line and the
 * fix is a sentence, not a stack trace.
 */
export function spokenEmailInstruction(v: Extract<EmailVerdict, { ok: false }>): string {
  if (v.reason === 'typo' && v.suggestion) {
    return `That address has a domain that does not exist, and it is almost certainly a mishearing. Ask them plainly: "I have you at ${v.suggestion}, is that right?" Read the domain as ordinary words, not spelled. Then send again with whatever they confirm.`;
  }
  if (v.reason === 'no-mail-server') {
    return 'That domain cannot receive mail, so nothing would arrive and they would never know. Tell them plainly that the domain did not come through, and take the address again with the domain spelled anchored ("g as in george, m as in mary"). Then send again.';
  }
  return 'That is not a complete email address. Take it again, local part first, then the domain, and read it back before sending.';
}
