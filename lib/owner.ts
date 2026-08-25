/**
 * Who gets the "something happened" heads-up (a new partner, lead, sale, client,
 * or message). Sarah's @modernmustardseed.com mailbox is the mailbox of record,
 * but she lives in her Gmail, and the Zoho mailbox is easy to miss. So every
 * owner notification goes to BOTH.
 *
 * The instrumented resendClient() in lib/send-email.ts splits the recipients on
 * its own: the @modernmustardseed.com address is delivered through Zoho (lands
 * reliably, never caught by Resend suppression) and the Gmail goes through
 * Resend, so this one array reaches her in both inboxes with a single send call.
 *
 * Use OWNER_NOTIFY_TO as the `to:` on any internal owner-notification email.
 */
export const OWNER_NOTIFY_TO = [
  'sarah@modernmustardseed.com',
  'makeourcitypretty@gmail.com',
  'wildhopehouse@gmail.com',
];

/**
 * ONE OF OURS, NOT A CONTACT'S.
 *
 * Every address the studio owns: the Zoho mailbox of record, Sarah's two
 * Gmails, and anything else on the domain. Used to keep our own inboxes out of
 * places that are meant to hold a customer's address.
 *
 * This exists because a prospect row CAN end up carrying one. The site tracker
 * scrapes contact details off a page and has filed our own address (and once a
 * URL-encoded User-Agent string containing it) as a business's email, and the
 * demo station writes Sarah's address onto every demo she forges for herself.
 * A row like that looks exactly like a prospect: Moses Tree Service of Bozeman
 * sat at acq_stage='emailed' having sent a cold campaign email to
 * wildhopehouse@gmail.com, and the drip was lined up to keep going.
 */
const INTERNAL = new Set(OWNER_NOTIFY_TO.map((a) => a.toLowerCase()));

export function isInternalAddress(addr: string | null | undefined): boolean {
  const a = String(addr ?? '').trim().toLowerCase();
  if (!a) return false;
  const bare = a.match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? a;
  // Substring, not endsWith: the tracker has stored addresses like
  // "modernmustardseed-tracker%2f1.0+%28sarah@modernmustardseed.com", which is
  // a User-Agent header, not an address, and must never be mailed either.
  return INTERNAL.has(bare) || bare.includes('@modernmustardseed.com');
}
