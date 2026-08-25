/**
 * Durable Voice Agent Build state on the existing app_state key/value table
 * (migration 030, live in prod), so the build ships with fail-closed caps and
 * zero new DDL. The text primary key gives us atomic once-per-email and
 * once-per-phone guards for free: a duplicate insert conflicts (23505), which
 * IS the cap.
 *
 * Keys:
 *   demo:run:<uuid>     the built run (profile + phone ring state)
 *   demo:email:<email>  claimed the moment a build is granted
 *   demo:phone:<e164>   claimed the moment a ring is placed
 *   demo:day:<UTC date> best-effort daily counter (backstop, not the main gate)
 *
 * supabase/migrations/036_demo_agent_runs.sql remains the OPTIONAL future upgrade to
 * a real table (nicer admin browsing); this layer is the live v1.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DemoAgentProfile } from '@/lib/demo-agent';

export type DemoAgentRun = DemoAgentProfile & {
  email: string;
  ip: string;
  createdAt: string;
  phone?: string;
  phoneCallId?: string;
};

type KV = SupabaseClient;

const runKey = (id: string) => `demo:run:${id}`;
const emailKey = (email: string) => `demo:email:${email}`;
const phoneKey = (e164: string) => `demo:phone:${e164}`;
const dayKey = () => `demo:day:${new Date().toISOString().slice(0, 10)}`;

export type ClaimResult = 'claimed' | 'taken' | 'error';

/** Atomically claim a one-shot key. PK conflict = someone already has it. */
async function claim(db: KV, key: string, value: Record<string, unknown>): Promise<ClaimResult> {
  const { error } = await db.from('app_state').insert({ key, value });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'taken';
  console.error('demo agent claim failed', key, error.message);
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
  return claim(db, `demo:ring:${runId}`, { at: new Date().toISOString() });
}

export async function releaseRing(db: KV, runId: string): Promise<void> {
  const { error } = await db.from('app_state').delete().eq('key', `demo:ring:${runId}`);
  if (error) console.error('demo agent ring release failed', error.message);
}

/** Release a claim we made but could not honor (e.g. the run insert failed). */
export async function releaseKey(db: KV, kind: 'email' | 'phone', id: string): Promise<void> {
  const key = kind === 'email' ? emailKey(id) : phoneKey(id);
  const { error } = await db.from('app_state').delete().eq('key', key);
  if (error) console.error('demo agent release failed', key, error.message);
}

/** Best-effort daily counter. Returns the count AFTER incrementing, or null on error. */
export async function bumpDailyCount(db: KV): Promise<number | null> {
  const key = dayKey();
  const { data, error } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error('demo agent daily read failed', error.message);
    return null;
  }
  const count = ((data?.value as { count?: number } | null)?.count ?? 0) + 1;
  const { error: upErr } = await db
    .from('app_state')
    .upsert({ key, value: { count }, updated_at: new Date().toISOString() });
  if (upErr) {
    console.error('demo agent daily bump failed', upErr.message);
    return null;
  }
  return count;
}

export async function saveRun(db: KV, runId: string, run: DemoAgentRun): Promise<boolean> {
  const { error } = await db.from('app_state').insert({ key: runKey(runId), value: run });
  if (error) {
    console.error('demo agent run save failed', error.message);
    return false;
  }
  return true;
}

/**
 * ⚠️ THE LEGACY KEY FALLBACK IS LOAD BEARING. DO NOT DELETE IT.
 *
 * These runs were stored under `sidekick:run:<uuid>` until 2026-08-25, and a
 * built demo link is not a page somebody can re-request: it has already been
 * emailed, texted, put on a hub and embedded in walkthrough films that are
 * sitting in other people's inboxes forever. A run that stops resolving is a
 * dead link on a demo we paid to send.
 *
 * Migration 112 moves every key, so on a healthy database this fallback never
 * fires. It stays anyway, because the cost of keeping it is one extra query on
 * a miss and the cost of being wrong about "every row moved" is silent.
 */
const legacyRunKey = (id: string) => `sidekick:run:${id}`;

export async function getRun(db: KV, runId: string): Promise<DemoAgentRun | null> {
  // Guard the key shape so a hostile runId cannot address arbitrary app_state rows.
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return null;
  const { data, error } = await db.from('app_state').select('value').eq('key', runKey(runId)).maybeSingle();
  if (error) {
    console.error('demo agent run read failed', error.message);
    return null;
  }
  if (data?.value) return data.value as DemoAgentRun;

  const { data: legacy } = await db
    .from('app_state')
    .select('value')
    .eq('key', legacyRunKey(runId))
    .maybeSingle();
  return (legacy?.value as DemoAgentRun | null) ?? null;
}

/**
 * Rewrite a stored run's brief IN PLACE, keeping its id.
 *
 * The built demo lives at /voice-agents/build/demo/<runId>, and that link has
 * already been emailed, texted, put on a hub and embedded in a walkthrough film.
 * Rebuilding mints a NEW id and silently orphans every one of those. So when a
 * correction is needed (a trade fixed after the fact, a law improved), the run is
 * edited where it stands and the link keeps working.
 */
export async function updateRunBrief(db: KV, runId: string, patch: Partial<DemoAgentRun>): Promise<boolean> {
  const run = await getRun(db, runId);
  if (!run) return false;
  const { error } = await db
    .from('app_state')
    .update({ value: { ...run, ...patch }, updated_at: new Date().toISOString() })
    .eq('key', runKey(runId));
  if (error) {
    console.error('demo agent run brief update failed', error.message);
    return false;
  }
  return true;
}

export async function markRunRang(db: KV, runId: string, run: DemoAgentRun, e164: string, callId: string): Promise<void> {
  const { error } = await db
    .from('app_state')
    .update({ value: { ...run, phone: e164, phoneCallId: callId }, updated_at: new Date().toISOString() })
    .eq('key', runKey(runId));
  if (error) console.error('demo agent run update failed', error.message);
}
