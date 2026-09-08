/**
 * THE OUTREACH SENDING DOMAIN.
 *
 * Cold outreach, follow-up drips and nurture sequences send from
 * outreach.modernmustardseed.com. Nothing marketing-shaped ever sends from the
 * bare root domain again.
 *
 * Why (2026-09-08): 83 of the last 100 emails the studio sent were cold
 * outreach, every one from sarah@modernmustardseed.com, the same address Sarah
 * reads and replies from. Gmail scores an address and a domain by the mail it
 * sees, so her real mail (including a join link she sent herself) started
 * landing in spam. The fix is separation: the root domain carries only what a
 * person asked for (replies, receipts, sign-in links, booking confirmations);
 * the subdomain carries the volume and earns its own reputation, warming up
 * from a low daily allowance under the acquisition governor.
 *
 * Replies still route to Sarah's real mailbox: every outreach send sets
 * reply-to to the root address.
 */

export const ROOT_DOMAIN = 'modernmustardseed.com';
export const OUTREACH_DOMAIN = `outreach.${ROOT_DOMAIN}`;

/** The address cold outreach and drips send from. */
export const OUTREACH_ADDRESS = `sarah@${OUTREACH_DOMAIN}`;
export const OUTREACH_FROM = `Sarah at Modern Mustard Seed <${OUTREACH_ADDRESS}>`;
/** Where a reply lands: Sarah's real mailbox, on the root domain. */
export const OUTREACH_REPLY_TO = `sarah@${ROOT_DOMAIN}`;

function bareAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

/** True when the address is on the bare root domain (not a subdomain of it). */
export function isRootDomainAddress(from: string): boolean {
  return bareAddress(from).endsWith(`@${ROOT_DOMAIN}`);
}

/**
 * The guard every marketing send passes. Throws before anything leaves if the
 * From address is on the root domain, so a campaign row or a constant that
 * drifts back to sarah@modernmustardseed.com fails loudly instead of quietly
 * poisoning the domain again.
 */
export function outreachOnly(from: string): string {
  if (isRootDomainAddress(from)) {
    throw new Error(
      `Refusing to send outreach from ${bareAddress(from)}: marketing mail sends from ${OUTREACH_DOMAIN}, never the root domain (lib/outreach-domain.ts).`,
    );
  }
  return from;
}
