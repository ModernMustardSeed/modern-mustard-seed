/**
 * Durable MUSTARD PRESS state on the existing app_state k/v table, same
 * atomic-claim spine as sidekick/pictures (text PK conflict = the cap).
 *
 * Keys:
 *   press:run:<uuid>     the press run (business meta + parsed catalog)
 *   press:email:<email>  claimed the moment a proof is granted (1 forever)
 *   press:day:<UTC date> best-effort daily counter
 *   press:slots:<ISO week> HAND PRESS bookings this week (cap 5)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type PressItem = {
  name: string;
  detail: string | null;
  price: string;
  note: string | null;
};

export type PressSection = { title: string; items: PressItem[] };

export type PressCatalog = { sections: PressSection[]; footnotes: string[] };

export type PressProfile = {
  business: string;
  tagline: string;
  city: string;
  ownerName: string;
};

export type PressRun = {
  profile: PressProfile;
  email: string;
  ip: string;
  createdAt: string;
  catalog: PressCatalog;
  /** Bumped on every buyer edit; the paid PDF renders whatever is current. */
  edits: number;
};

type KV = SupabaseClient;

const runKey = (id: string) => `press:run:${id}`;
const emailKey = (email: string) => `press:email:${email}`;
const dayKey = () => `press:day:${new Date().toISOString().slice(0, 10)}`;

/** ISO week key, e.g. press:slots:2026-W28 (UTC, Monday-start). */
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `press:slots:${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type ClaimResult = 'claimed' | 'taken' | 'error';

async function claim(db: KV, key: string, value: Record<string, unknown>): Promise<ClaimResult> {
  const { error } = await db.from('app_state').insert({ key, value });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'taken';
  console.error('press claim failed', key, error.message);
  return 'error';
}

export async function claimProof(db: KV, email: string, runId: string): Promise<ClaimResult> {
  return claim(db, emailKey(email), { runId, at: new Date().toISOString() });
}

export async function releaseProof(db: KV, email: string): Promise<void> {
  const { error } = await db.from('app_state').delete().eq('key', emailKey(email));
  if (error) console.error('press release failed', error.message);
}

async function bumpCounter(db: KV, key: string): Promise<number | null> {
  const { data, error } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error('press counter read failed', key, error.message);
    return null;
  }
  const count = ((data?.value as { count?: number } | null)?.count ?? 0) + 1;
  const { error: upErr } = await db
    .from('app_state')
    .upsert({ key, value: { count }, updated_at: new Date().toISOString() });
  if (upErr) {
    console.error('press counter bump failed', key, upErr.message);
    return null;
  }
  return count;
}

/** Best-effort daily counter. Returns the count AFTER incrementing, or null. */
export async function bumpPressDaily(db: KV): Promise<number | null> {
  return bumpCounter(db, dayKey());
}

/** HAND PRESS slots used this week (read-only). */
export async function handPressSlotsUsed(db: KV): Promise<number | null> {
  const { data, error } = await db.from('app_state').select('value').eq('key', weekKey()).maybeSingle();
  if (error) {
    console.error('press slots read failed', error.message);
    return null;
  }
  return (data?.value as { count?: number } | null)?.count ?? 0;
}

/** Consume a HAND PRESS slot (called from the webhook on paid orders). */
export async function consumeHandPressSlot(db: KV): Promise<number | null> {
  return bumpCounter(db, weekKey());
}

export async function savePressRun(db: KV, runId: string, run: PressRun): Promise<boolean> {
  const { error } = await db.from('app_state').insert({ key: runKey(runId), value: run });
  if (error) {
    console.error('press run save failed', error.message);
    return false;
  }
  return true;
}

export async function getPressRun(db: KV, runId: string): Promise<PressRun | null> {
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return null;
  const { data, error } = await db.from('app_state').select('value').eq('key', runKey(runId)).maybeSingle();
  if (error) {
    console.error('press run read failed', error.message);
    return null;
  }
  return (data?.value as PressRun | null) ?? null;
}

export async function updatePressRun(db: KV, runId: string, run: PressRun): Promise<boolean> {
  const { error } = await db
    .from('app_state')
    .update({ value: run, updated_at: new Date().toISOString() })
    .eq('key', runKey(runId));
  if (error) {
    console.error('press run update failed', error.message);
    return false;
  }
  return true;
}
