/**
 * THE BUILD WORKER'S HEARTBEAT.
 *
 * The demo-site worker runs on Sarah's own machine, not on Vercel. Both build
 * boards used to INFER its state from the queue, which is silent in the two
 * cases that actually cost a day: with an empty queue a dead worker looks
 * exactly like an idle one, and on 2026-07-26 the worker was alive and
 * deliberately declining every claim because free memory sat under its floor,
 * which no amount of queue-watching can express.
 *
 * So the worker writes its own state to app_state and this reads it. Best
 * effort in both directions: a missing row and a failed read both mean "no
 * signal", and neither may take a board down, because the board is how Sarah
 * works the floor.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { BUILD_WORKER_DEAD_AFTER_S } from '@/lib/outbound';
import type { BuildWorkerHealth, BuildWorkerVitals } from '@/lib/outbound';

export async function readBuildWorkerVitals(db: SupabaseClient): Promise<BuildWorkerVitals | null> {
  try {
    const { data } = await db.from('app_state').select('value').eq('key', 'forge_worker_health').maybeSingle();
    const v = (data?.value ?? null) as BuildWorkerHealth | null;
    if (!v?.at) return null;
    const ageSeconds = Math.max(0, Math.round((Date.now() - new Date(v.at).getTime()) / 1000));
    return { ...v, ageSeconds, alive: ageSeconds <= BUILD_WORKER_DEAD_AFTER_S };
  } catch {
    return null;
  }
}
