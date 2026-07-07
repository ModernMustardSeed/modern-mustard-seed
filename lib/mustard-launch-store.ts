/**
 * Durable MUSTARD LAUNCH state. Two dedicated tables (migration 040), both
 * service-role only (RLS on, no anon policies):
 *   launch_runs      one row per free Blueprint generated (idea + blueprint jsonb)
 *   launch_progress  one row per member (mission progress + generated Kit blob)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint, LaunchKit } from './mustard-launch';

type KV = SupabaseClient;

export type LaunchRun = { id: string; email: string; idea: string; blueprint: Blueprint | null; createdAt: string };

/** Count free Blueprints this email has generated (durable free-credit check). */
export async function countLaunchRuns(db: KV, email: string): Promise<number | null> {
  const { count, error } = await db
    .from('launch_runs')
    .select('id', { count: 'exact', head: true })
    .eq('email', email);
  if (error) {
    console.error('launch run count failed', error.message);
    return null;
  }
  return count ?? 0;
}

export async function saveLaunchRun(
  db: KV,
  run: { id: string; email: string; idea: string; blueprint: Blueprint | null }
): Promise<boolean> {
  const { error } = await db.from('launch_runs').insert({
    id: run.id,
    email: run.email,
    idea: run.idea,
    blueprint: run.blueprint,
  });
  if (error) {
    console.error('launch run save failed', error.message);
    return false;
  }
  return true;
}

/** A Blueprint by its unguessable run id (the id IS the auth, like press). */
export async function getLaunchRunById(db: KV, id: string): Promise<LaunchRun | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db
    .from('launch_runs')
    .select('id, email, idea, blueprint, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('launch run read failed', error.message);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id as string,
    email: data.email as string,
    idea: data.idea as string,
    blueprint: (data.blueprint as Blueprint | null) ?? null,
    createdAt: data.created_at as string,
  };
}

/** The member's most recent Blueprint run (idea + plan), for coach + Kit context. */
export async function getLatestLaunchRun(db: KV, email: string): Promise<{ idea: string; blueprint: Blueprint | null } | null> {
  const { data, error } = await db
    .from('launch_runs')
    .select('idea, blueprint')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('launch latest run read failed', error.message);
    return null;
  }
  if (!data) return null;
  return { idea: data.idea as string, blueprint: (data.blueprint as Blueprint | null) ?? null };
}

// ── Progress + generated Kit (launch_progress) ─────────────────────────────

export type LaunchProgress = {
  done?: Record<string, boolean>;   // missionKey -> completed
  launchDate?: string | null;       // target Launch Day (ISO date)
  kit?: LaunchKit | null;           // generated Launch Kit, cached
  updatedAt?: string;
};

export async function getLaunchProgress(db: KV, email: string): Promise<{ progress: LaunchProgress | null; updatedAt: string | null }> {
  const { data, error } = await db
    .from('launch_progress')
    .select('progress, updated_at')
    .eq('email', email)
    .maybeSingle();
  if (error) {
    console.error('launch progress read failed', error.message);
    return { progress: null, updatedAt: null };
  }
  return { progress: (data?.progress as LaunchProgress | null) ?? null, updatedAt: (data?.updated_at as string | null) ?? null };
}

export async function saveLaunchProgress(db: KV, email: string, progress: LaunchProgress): Promise<boolean> {
  const { error } = await db
    .from('launch_progress')
    .upsert({ email, progress, updated_at: new Date().toISOString() }, { onConflict: 'email' });
  if (error) {
    console.error('launch progress save failed', error.message);
    return false;
  }
  return true;
}

/** Merge a partial patch into the member's progress blob (kit, launchDate). */
export async function patchLaunchProgress(db: KV, email: string, patch: Partial<LaunchProgress>): Promise<boolean> {
  const { progress } = await getLaunchProgress(db, email);
  return saveLaunchProgress(db, email, { ...(progress ?? {}), ...patch });
}
