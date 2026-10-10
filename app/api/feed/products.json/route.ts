/**
 * RETIRED 2026-10-10: this was a shopping feed (OpenAI Merchant, Google Merchant),
 * and a shopping feed is a price list. Conversation first: Modern Mustard Seed
 * publishes no prices and sells nothing self-serve on the site. See
 * lib/talk-first.ts. 410 tells a merchant crawler the feed is gone on purpose.
 */
import { checkoutRetired } from '@/lib/talk-first-server';

export function GET() {
  return checkoutRetired('Playbooks and courses');
}