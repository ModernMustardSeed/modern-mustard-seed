/**
 * Durable MUSTARD HATCHERY state on the existing app_state k/v table (no new
 * table, no DDL). Same atomic-claim spine as press/sidekick/pictures.
 *
 * Keys:
 *   hatchery:glimpse:<email>  claimed the moment a free First Glimpse is granted
 *   hatchery:count            monotonic tally, drives the hand-numbered certificate
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

const glimpseKey = (email: string) => `hatchery:glimpse:${email.trim().toLowerCase()}`;

/**
 * Grant a free First Glimpse to an email, once and only once (the lead magnet is
 * hard-capped 1 per email forever). 'taken' means they already claimed one.
 */
export async function claimGlimpse(db: KV, email: string): Promise<ClaimResult> {
  return claim(db, glimpseKey(email), { at: new Date().toISOString() });
}

/**
 * The next hand-numbered Birth Certificate number. A simple monotonic counter,
 * NOT a cap: the offer is evergreen, this just keeps the heirloom numbering
 * (No. 001, 002, ...). Best-effort; returns null on error and the webhook falls
 * back to no number rather than blocking a paid order.
 */
export async function nextHatchNumber(db: KV): Promise<number | null> {
  const key = 'hatchery:count';
  const { data, error } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error('hatchery count read failed', error.message);
    return null;
  }
  const count = ((data?.value as { count?: number } | null)?.count ?? 0) + 1;
  const { error: upErr } = await db
    .from('app_state')
    .upsert({ key, value: { count }, updated_at: new Date().toISOString() });
  if (upErr) {
    console.error('hatchery count bump failed', upErr.message);
    return null;
  }
  return count;
}
