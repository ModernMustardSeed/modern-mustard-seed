/**
 * RETIRED 2026-10-10: conversation first, no self-serve checkout on the site.
 * Sarah: "i dont want any prices on my site at all." The price for Mustard Mode now
 * comes after a conversation, privately, in a proposal or a pay link. Stripe
 * products and prices are untouched. See lib/talk-first.ts.
 */
import { checkoutRetired } from '@/lib/talk-first-server';

export function POST() {
  return checkoutRetired('Mustard Mode');
}

export function GET() {
  return checkoutRetired('Mustard Mode');
}