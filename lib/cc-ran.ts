import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A CRON SAYS IT RAN. NOTHING GUESSES.
 *
 * The first version of the watchdog worked out whether a cron was alive by
 * looking at its side effects: the newest row it would have touched. That is
 * wrong in the one direction that matters. A publisher with nothing to publish
 * touches nothing, so a perfectly healthy cron on a quiet week reads exactly
 * like a cron that stopped a fortnight ago, and the watchdog cries. An alert
 * channel that cries is a channel that gets a filter rule.
 *
 * So each cron stamps one row when it finishes. Absence of the stamp is then
 * real evidence rather than an inference, and "it ran and had nothing to do"
 * and "it never ran" stop looking alike.
 *
 * It is deliberately one tiny write with its own try/catch: a heartbeat that
 * can fail a cron is worse than no heartbeat.
 */
export async function ran(sb: SupabaseClient | null, name: string, detail?: Record<string, unknown>): Promise<void> {
  if (!sb) return;
  try {
    await sb.from('app_state').upsert(
      { key: `cron:${name}:ran`, value: { at: new Date().toISOString(), ...(detail ?? {}) }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  } catch {
    /* the work the cron did is what matters */
  }
}

/** When it last said so, or null when it never has. */
export async function lastRan(sb: SupabaseClient, name: string): Promise<Date | null> {
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', `cron:${name}:ran`).maybeSingle();
    const at = (data?.value as { at?: string } | null)?.at;
    return at ? new Date(at) : null;
  } catch {
    return null;
  }
}
