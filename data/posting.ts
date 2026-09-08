/**
 * DAILY POSTING. A productized line Sarah set on 2026-09-08, the day Built
 * Right in Montana said yes: $297 a month, no setup fee, month to month.
 *
 * The client drops photos and a few words in their portal. The studio turns
 * them into platform-specific posts and posts every day on Facebook,
 * Instagram, Google Business Profile and Houzz. The calendar and every post
 * live in the portal. One blog post a month comes out of the same material.
 *
 * SUBSCRIPTION ONLY. There is no setup line, so this does not live in
 * DEMO_PRODUCTS (every piece there carries a setup fee and the ladder check
 * assumes one). It is its own product with its own pay link, /pay/posting,
 * minted by app/pay/[slug]/route.ts from the numbers here and nowhere else.
 *
 * NEVER BUNDLED. Not with the Command Center, not with the Talking Website.
 * It is sold on its own at its own price. The price is in cents, the one copy.
 */

export type SubscriptionProduct = {
  key: string;
  name: string;
  monthlyCents: number;
  /** One line, the way it is said on a call. */
  pitch: string;
  /** What Stripe prints under the line item, and what the receipt says. */
  description: string;
  includes: string[];
};

export const DAILY_POSTING: SubscriptionProduct = {
  key: 'posting',
  name: 'Daily Posting',
  monthlyCents: 29700,
  pitch: 'You drop the photos. We post every day, everywhere your customers look.',
  description:
    'Drop photos and a few words in your portal. We turn them into platform-specific posts and post every day on Facebook, Instagram, Google Business Profile and Houzz. Your calendar and every post live in your portal. One blog post a month from the same material.',
  includes: [
    'A post every day on Facebook, Instagram, Google Business Profile and Houzz',
    'Written for each platform, not one caption pasted four times',
    'You drop photos and a few words in your portal; that is your whole job',
    'The calendar and every post, live in your portal',
    'One blog post a month from the same material',
    'Month to month, cancel anytime, no setup fee',
  ],
};

/**
 * Every subscription-only product a pay link can mint, by slug. Aliases are
 * generous on purpose: the slug is read aloud on a phone call.
 */
export const SUBSCRIPTION_SLUGS: Record<string, SubscriptionProduct> = {
  posting: DAILY_POSTING,
  'daily-posting': DAILY_POSTING,
  social: DAILY_POSTING,
  'social-posting': DAILY_POSTING,
};
