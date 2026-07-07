/**
 * Durable Sidekick Forge state on the existing app_state key/value table
 * (migration 030, live in prod), so the forge ships with fail-closed caps and
 * zero new DDL. The text primary key gives us atomic once-per-email and
 * once-per-phone guards for free: a duplicate insert conflicts (23505), which
 * IS the cap.
 *
 * Keys:
 *   sidekick:run:<uuid>     the forged run (profile + phone ring state)
 *   sidekick:email:<email>  claimed the moment a forge is granted
 *   sidekick:phone:<e164>   claimed the moment a ring is placed
 *   sidekick:day:<UTC date> best-effort daily counter (backstop, not the main gate)
 *
 * supabase/migrations/036_sidekick.sql remains the OPTIONAL future upgrade to
 * a real table (nicer admin browsing); this layer is the live v1.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SidekickProfile } from '@/lib/sidekick';

export type SidekickRun = SidekickProfile & {
  email: string;
  ip: string;
  createdAt: string;
  phone?: string;
  phoneCallId?: string;
};

type KV = SupabaseClient;

const runKey = (id: string) => `sidekick:run:${id}`;
const emailKey = (email: string) => `sidekick:email:${email}`;
const phoneKey = (e164: string) => `sidekick:phone:${e164}`;
const dayKey = () => `sidekick:day:${new Date().toISOString().slice(0, 10)}`;

export type ClaimResult = 'claimed' | 'taken' | 'error';

/** Atomically claim a one-shot key. PK conflict = someone already has it. */
async function claim(db: KV, key: string, value: Record<string, unknown>): Promise<ClaimResult> {
  const { error } = await db.from('app_state').insert({ key, value });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'taken';
  console.error('sidekick claim failed', key, error.message);
  return 'error';
}

export async function claimEmail(db: KV, email: string, runId: string): Promise<ClaimResult> {
  return claim(db, emailKey(email), { runId, at: new Date().toISOString() });
}

export async function claimPhone(db: KV, e164: string, runId: string): Promise<ClaimResult> {
  return claim(db, phoneKey(e164), { runId, at: new Date().toISOString() });
}

/** One ring per RUN, atomically. Closes the concurrent-request fan-out on a single runId. */
export async function claimRing(db: KV, runId: string): Promise<ClaimResult> {
  return claim(db, `sidekick:ring:${runId}`, { at: new Date().toISOString() });
}

export async function releaseRing(db: KV, runId: string): Promise<void> {
  const { error } = await db.from('app_state').delete().eq('key', `sidekick:ring:${runId}`);
  if (error) console.error('sidekick ring release failed', error.message);
}

/** Release a claim we made but could not honor (e.g. the run insert failed). */
export async function releaseKey(db: KV, kind: 'email' | 'phone', id: string): Promise<void> {
  const key = kind === 'email' ? emailKey(id) : phoneKey(id);
  const { error } = await db.from('app_state').delete().eq('key', key);
  if (error) console.error('sidekick release failed', key, error.message);
}

/** Best-effort daily counter. Returns the count AFTER incrementing, or null on error. */
export async function bumpDailyCount(db: KV): Promise<number | null> {
  const key = dayKey();
  const { data, error } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error('sidekick daily read failed', error.message);
    return null;
  }
  const count = ((data?.value as { count?: number } | null)?.count ?? 0) + 1;
  const { error: upErr } = await db
    .from('app_state')
    .upsert({ key, value: { count }, updated_at: new Date().toISOString() });
  if (upErr) {
    console.error('sidekick daily bump failed', upErr.message);
    return null;
  }
  return count;
}

export async function saveRun(db: KV, runId: string, run: SidekickRun): Promise<boolean> {
  const { error } = await db.from('app_state').insert({ key: runKey(runId), value: run });
  if (error) {
    console.error('sidekick run save failed', error.message);
    return false;
  }
  return true;
}

export async function getRun(db: KV, runId: string): Promise<SidekickRun | null> {
  // Guard the key shape so a hostile runId cannot address arbitrary app_state rows.
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return null;
  const { data, error } = await db.from('app_state').select('value').eq('key', runKey(runId)).maybeSingle();
  if (error) {
    console.error('sidekick run read failed', error.message);
    return null;
  }
  return (data?.value as SidekickRun | null) ?? null;
}

export async function markRunRang(db: KV, runId: string, run: SidekickRun, e164: string, callId: string): Promise<void> {
  const { error } = await db
    .from('app_state')
    .update({ value: { ...run, phone: e164, phoneCallId: callId }, updated_at: new Date().toISOString() })
    .eq('key', runKey(runId));
  if (error) console.error('sidekick run update failed', error.message);
}
