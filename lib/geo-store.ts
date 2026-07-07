/**
 * GEO DESK state on the existing app_state k/v table (same spine as
 * sidekick/pictures/press).
 *
 * Keys:
 *   geo:pack:<sessionId>   the generated fix pack for a paid Stripe session
 *   geo:watch:<id>         a monitoring row (subscription id or fulldesk session id)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type GeoArtifacts = {
  llmsTxt: string;
  aiTxt: string;
  jsonLd: string[];
  metaRewrites: { page: string; title: string; description: string }[];
  faqBlock: string;
  platform: string;
  installSteps: string[];
  notes: string;
};

export type GeoPack = {
  url: string;
  email: string;
  business: string;
  artifacts: GeoArtifacts;
  generatedAt: string;
  rerunsUsed: number;
  lastScore: number | null;
  lastGrade: string | null;
};

export type GeoWatch = {
  urls: string[];
  email: string;
  kind: 'watch' | 'watchpro' | 'fulldesk';
  nextAt: string;
  /** null = until canceled; fulldesk gets createdAt + 100 days (3 cycles fit) */
  expiresAt: string | null;
  lastScores: Record<string, number>;
  createdAt: string;
  /** Completed monthly cycles; cadence anchors to createdAt + n*30d. */
  cycles?: number;
};

type KV = SupabaseClient;

const packKey = (sessionId: string) => `geo:pack:${sessionId}`;
const watchKey = (id: string) => `geo:watch:${id}`;

/**
 * Atomic once-per-session guard for the Stripe webhook (retries must not
 * duplicate orders, leads, watch rows, or emails). PK conflict = already done.
 */
export async function claimGeoWebhook(db: KV, sessionId: string): Promise<'claimed' | 'taken' | 'error'> {
  const { error } = await db.from('app_state').insert({ key: `geo:done:${sessionId}`, value: { at: new Date().toISOString() } });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'taken';
  console.error('geo webhook claim failed', error.message);
  return 'error';
}

export async function getGeoPack(db: KV, sessionId: string): Promise<GeoPack | null> {
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  const { data, error } = await db.from('app_state').select('value').eq('key', packKey(sessionId)).maybeSingle();
  if (error) {
    console.error('geo pack read failed', error.message);
    return null;
  }
  return (data?.value as GeoPack | null) ?? null;
}

export async function saveGeoPack(db: KV, sessionId: string, pack: GeoPack): Promise<boolean> {
  const { error } = await db
    .from('app_state')
    .upsert({ key: packKey(sessionId), value: pack, updated_at: new Date().toISOString() });
  if (error) {
    console.error('geo pack save failed', error.message);
    return false;
  }
  return true;
}

export async function saveGeoWatch(db: KV, id: string, watch: GeoWatch): Promise<boolean> {
  const { error } = await db
    .from('app_state')
    .upsert({ key: watchKey(id), value: watch, updated_at: new Date().toISOString() });
  if (error) {
    console.error('geo watch save failed', error.message);
    return false;
  }
  return true;
}

export async function deleteGeoWatch(db: KV, id: string): Promise<void> {
  const { error } = await db.from('app_state').delete().eq('key', watchKey(id));
  if (error) console.error('geo watch delete failed', error.message);
}

/** All watches due for a re-grade (cron). */
export async function dueGeoWatches(db: KV, limit = 10): Promise<{ id: string; watch: GeoWatch }[]> {
  const { data, error } = await db
    .from('app_state')
    .select('key,value')
    .like('key', 'geo:watch:%')
    .limit(200);
  if (error) {
    console.error('geo watch scan failed', error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? [])
    .map((r) => ({ id: (r.key as string).slice('geo:watch:'.length), watch: r.value as GeoWatch }))
    .filter(({ watch }) => {
      if (!watch?.nextAt) return false;
      if (watch.expiresAt && new Date(watch.expiresAt).getTime() < now) return false;
      return new Date(watch.nextAt).getTime() <= now;
    })
    .slice(0, limit);
}
