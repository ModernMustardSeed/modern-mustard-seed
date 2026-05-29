import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Lazy-init Stripe client. Returns null if STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, {
    typescript: true,
  });
  return cached;
}

export const STRIPE_WEBHOOK_SECRET = () => process.env.STRIPE_WEBHOOK_SECRET ?? '';
