/**
 * Ownership rule (2026-07-09): Polly works the South, Sarah works everything
 * else. Ownership is a soft default for filtering and goal attribution; the
 * queue stays open to whoever is dialing.
 *
 * Also backfills state for the migrated Tracker leads (they carried city
 * only) using the known sourcing markets, so the state filter covers the
 * whole floor.
 *
 * Run: node scripts/reassign-outbound-owners.mjs            (dry run)
 *      node scripts/reassign-outbound-owners.mjs --apply    (write)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }
const sb = createClient(env.SUPABASE_URL || env.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key, {
  auth: { persistSession: false },
});

export const SOUTH = new Set(['AL', 'AR', 'MS', 'LA', 'GA', 'TN', 'FL', 'TX', 'OK', 'NC', 'SC', 'VA', 'WV', 'KY']);

// The Tracker-era sourcing markets (memory: sourcing runs 2026-06), used only
// to backfill rows whose state is null.
const CITY_STATE = {
  kalispell: 'MT', whitefish: 'MT', 'columbia falls': 'MT', missoula: 'MT', bozeman: 'MT',
  billings: 'MT', helena: 'MT', 'great falls': 'MT', lakeside: 'MT', bigfork: 'MT', polson: 'MT', evergreen: 'MT',
  austin: 'TX', 'round rock': 'TX', pflugerville: 'TX',
  tampa: 'FL', brandon: 'FL',
  tulsa: 'OK', 'broken arrow': 'OK',
  scottsdale: 'AZ', phoenix: 'AZ', tempe: 'AZ', mesa: 'AZ', chandler: 'AZ', glendale: 'AZ', peoria: 'AZ',
  boise: 'ID', meridian: 'ID', nampa: 'ID',
};

const [{ data: leads, error }, { data: reps, error: repErr }] = await Promise.all([
  sb.from('outbound_leads').select('id, city, state, owner_rep_id, status').limit(20000),
  sb.from('outbound_reps').select('id, name'),
]);
if (error || repErr) {
  console.error('Read failed:', (error || repErr).message);
  process.exit(1);
}
const polly = (reps ?? []).find((r) => r.name === 'Polly')?.id;
const sarah = (reps ?? []).find((r) => r.name === 'Sarah')?.id;
if (!polly || !sarah) {
  console.error('Reps not found.');
  process.exit(1);
}

let backfills = 0;
let toPolly = 0;
let toSarah = 0;
let unchanged = 0;
const updates = [];
for (const l of leads ?? []) {
  let state = l.state;
  let patch = null;
  if (!state && l.city) {
    const guess = CITY_STATE[l.city.trim().toLowerCase()];
    if (guess) {
      state = guess;
      patch = { state: guess };
      backfills++;
    }
  }
  const owner = state && SOUTH.has(state) ? polly : sarah;
  if (l.owner_rep_id !== owner) {
    patch = { ...(patch ?? {}), owner_rep_id: owner };
    if (owner === polly) toPolly++;
    else toSarah++;
  } else if (!patch) {
    unchanged++;
  }
  if (patch) updates.push({ id: l.id, patch });
}

console.log(`Leads: ${leads?.length ?? 0} · state backfills: ${backfills} · reassign→Polly(South): ${toPolly} · reassign→Sarah: ${toSarah} · already right: ${unchanged}`);

if (!APPLY) {
  console.log('Dry run only. Rerun with --apply to write.');
  process.exit(0);
}

let done = 0;
for (const u of updates) {
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const { error: upErr } = await sb.from('outbound_leads').update(u.patch).eq('id', u.id);
      if (upErr) throw new Error(upErr.message);
      ok = true;
    } catch (e) {
      if (attempt === 3) {
        console.error(`Update failed for ${u.id} after 3 tries:`, e instanceof Error ? e.message : e, `(done: ${done})`);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  done++;
  if (done % 100 === 0) console.log(`  updated ${done}/${updates.length}`);
}
console.log(`Done. ${done} rows updated. Polly owns the South, Sarah owns the rest, and the queue stays open to both.`);
