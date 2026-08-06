/**
 * Upsert a go-live runbook into the hub (golive_runbooks, migration 084).
 * Used by the `golive` skill after scanning a project. Service key, local only.
 *
 * Run from the MMS repo root:
 *   node scripts/golive-upsert.mjs data/golive/<slug>.json
 *
 * The JSON file: { slug, title, subtitle?, repo_path?, prod_url?, groups: [...] }
 * Groups shape matches lib/golive.ts. A re-run REPLACES the plan (data) but
 * PRESERVES existing checkmarks for item ids that still exist, so a rescan
 * never wipes progress. Ids must therefore be stable across scans.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/golive-upsert.mjs <runbook.json>');
  process.exit(1);
}

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* no .env.local */
}

const url = env.SUPABASE_URL || env.supabase_url;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (run from the MMS repo root).');
  process.exit(1);
}

const rb = JSON.parse(readFileSync(file, 'utf8'));
for (const k of ['slug', 'title', 'groups']) {
  if (!rb[k]) {
    console.error(`Runbook JSON missing "${k}"`);
    process.exit(1);
  }
}
const ids = rb.groups.flatMap((g) => g.items.map((i) => i.id));
if (new Set(ids).size !== ids.length) {
  console.error('Duplicate item ids in runbook JSON.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await sb.from('golive_runbooks').select('done').eq('slug', rb.slug).maybeSingle();
const keep = new Set(ids);
const done = Object.fromEntries(Object.entries(existing?.done ?? {}).filter(([id]) => keep.has(id)));

const { error } = await sb.from('golive_runbooks').upsert({
  slug: rb.slug,
  title: rb.title,
  subtitle: rb.subtitle ?? null,
  repo_path: rb.repo_path ?? null,
  prod_url: rb.prod_url ?? null,
  data: rb.groups,
  done,
  archived: false,
  updated_at: new Date().toISOString(),
});
if (error) {
  console.error('Upsert failed:', error.message);
  process.exit(1);
}
console.log(`OK ${rb.slug}: ${ids.length} items, ${Object.keys(done).length} checks preserved.`);
console.log(`https://modernmustardseed.com/admin/golive/${rb.slug}`);
