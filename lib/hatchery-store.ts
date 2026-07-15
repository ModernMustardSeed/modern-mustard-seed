/**
 * Durable MUSTARD HATCHERY state on the existing app_state k/v table, same
 * atomic-claim spine as press/sidekick/pictures (a text-PK insert conflict IS
 * the cap). Keeps the Founding 5 honestly limited without a new table or DDL.
 *
 * Keys:
 *   hatchery:founding:<n>     one per Founding Egg, n = 1..CAP (first free wins)
 *   hatchery:glimpse:<email>  claimed the moment a free First Glimpse is granted
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type KV = SupabaseClient;

export type ClaimResult = 'claimed' | 'taken' | 'error';

async function claim(db: KV, key: string, value: Record<string, unknown>): Promise<ClaimResult> {
  const { error } = await db.from('app_state').insert({ key, value });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'taken'; // unique_violation: someone got here first
  console.error('hatchery claim failed', key, error.message);
  return 'error';
}

const seatKey = (n: number) => `hatchery:founding:${n}`;
const glimpseKey = (email: string) => `hatchery:glimpse:${email.trim().toLowerCase()}`;

/**
 * Consume one Founding Egg ATOMICALLY (called from the Stripe webhook on a paid
 * order): claims hatchery:founding:1..CAP, first free of the CAP wins. A
 * 'sold_out' return means the five sold between checkout and payment, and the
 * caller alerts Sarah to refund that overflow by hand (ignite-or-refund keeps
 * the risk on us, never the buyer).
 */
export async function consumeFoundingSeat(db: KV, cap: number): Promise<number | 'sold_out' | null> {
  for (let n = 1; n <= cap; n += 1) {
    const res = await claim(db, seatKey(n), { at: new Date().toISOString() });
    if (res === 'claimed') return n;
    if (res === 'error') return null;
  }
  return 'sold_out';
}

/** Founding Eggs claimed so far, counted from the atomic claim rows. */
export async function foundingSeatsClaimed(db: KV, cap: number): Promise<number | null> {
  const { count, error } = await db
    .from('app_state')
    .select('key', { count: 'exact', head: true })
    .like('key', 'hatchery:founding:%');
  if (error) {
    console.error('hatchery seat count failed', error.message);
    return null;
  }
  return Math.min(count ?? 0, cap);
}

/**
 * Grant a free First Glimpse to an email, once and only once (the lead magnet is
 * hard-capped 1 per email forever). 'taken' means they already claimed one.
 */
export async function claimGlimpse(db: KV, email: string): Promise<ClaimResult> {
  return claim(db, glimpseKey(email), { at: new Date().toISOString() });
}
