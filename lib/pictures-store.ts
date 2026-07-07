/**
 * Durable MUSTARD PICTURES state on the existing app_state k/v table, same
 * atomic-claim design as lib/sidekick-store.ts (text PK conflict = the cap).
 *
 * Keys:
 *   pictures:run:<uuid>     the screen test (profile + storyboard + frame url)
 *   pictures:email:<email>  claimed the moment a screen test is granted
 *   pictures:day:<UTC date> best-effort daily counter
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type PicturesProfile = {
  business: string;
  verticalId: string;
  city: string;
  ownerName: string;
  /** What they are proud of / want the world to feel. */
  story: string;
};

export type PicturesRun = {
  profile: PicturesProfile;
  email: string;
  ip: string;
  createdAt: string;
  storyboard: string;
  frameUrl?: string;
};

type KV = SupabaseClient;

const runKey = (id: string) => `pictures:run:${id}`;
const emailKey = (email: string) => `pictures:email:${email}`;
const dayKey = () => `pictures:day:${new Date().toISOString().slice(0, 10)}`;

export type ClaimResult = 'claimed' | 'taken' | 'error';

async function claim(db: KV, key: string, value: Record<string, unknown>): Promise<ClaimResult> {
  const { error } = await db.from('app_state').insert({ key, value });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'taken';
  console.error('pictures claim failed', key, error.message);
  return 'error';
}

export async function claimScreenTest(db: KV, email: string, runId: string): Promise<ClaimResult> {
  return claim(db, emailKey(email), { runId, at: new Date().toISOString() });
}

export async function releaseScreenTest(db: KV, email: string): Promise<void> {
  const { error } = await db.from('app_state').delete().eq('key', emailKey(email));
  if (error) console.error('pictures release failed', error.message);
}

/** Best-effort daily counter. Returns the count AFTER incrementing, or null on error. */
export async function bumpPicturesDaily(db: KV): Promise<number | null> {
  const key = dayKey();
  const { data, error } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error('pictures daily read failed', error.message);
    return null;
  }
  const count = ((data?.value as { count?: number } | null)?.count ?? 0) + 1;
  const { error: upErr } = await db
    .from('app_state')
    .upsert({ key, value: { count }, updated_at: new Date().toISOString() });
  if (upErr) {
    console.error('pictures daily bump failed', upErr.message);
    return null;
  }
  return count;
}

export async function savePicturesRun(db: KV, runId: string, run: PicturesRun): Promise<boolean> {
  const { error } = await db.from('app_state').insert({ key: runKey(runId), value: run });
  if (error) {
    console.error('pictures run save failed', error.message);
    return false;
  }
  return true;
}

export async function getPicturesRun(db: KV, runId: string): Promise<PicturesRun | null> {
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return null;
  const { data, error } = await db.from('app_state').select('value').eq('key', runKey(runId)).maybeSingle();
  if (error) {
    console.error('pictures run read failed', error.message);
    return null;
  }
  return (data?.value as PicturesRun | null) ?? null;
}

export async function updatePicturesRun(db: KV, runId: string, run: PicturesRun): Promise<void> {
  const { error } = await db
    .from('app_state')
    .update({ value: run, updated_at: new Date().toISOString() })
    .eq('key', runKey(runId));
  if (error) console.error('pictures run update failed', error.message);
}
