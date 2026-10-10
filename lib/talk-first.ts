/**
 * CONVERSATION FIRST (Sarah, 2026-10-10): "i dont want any prices on my site at all."
 *
 * No price and no self-serve checkout on the public site. Every buy, enroll or
 * start button now opens a conversation with Sarah instead, and the price comes
 * after it, privately: in a proposal, or a pay link she hands over (/pay/<slug>,
 * the proposal pay route, the client portal). Stripe products and prices stay.
 *
 * talkFirstHref() is the one place a public CTA is pointed. The contact form
 * reads ?package= and opens the note with "I'm interested in the <offer> package."
 * Safe in client components: no server imports here. The retired checkout
 * routes answer through checkoutRetired() in lib/talk-first-server.ts.
 */

export function talkFirstHref(offer: string): string {
  return `/contact?package=${encodeURIComponent(offer)}`;
}
