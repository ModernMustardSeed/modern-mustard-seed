/**
 * Flip a go-live runbook item from an agent session. Service key, local only.
 * When a Claude Code session completes work that closes a runbook item, it
 * runs this so the hub reflects reality without waiting for a rescan.
 *
 * Run from the MMS repo root:
 *   node scripts/golive-check.mjs <slug> <itemId>           # mark done
 *   node scripts/golive-check.mjs <slug> <itemId> --undone  # unmark
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const [slug, itemId] = process.argv.slice(2);
const undone = process.argv.includes('--undone');
if (!slug || !itemId) {
  console.error('Usage: node scripts/golive-check.mjs <slug> <itemId> [--undone]');
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

const sb = createClient(
  env.SUPABASE_URL || env.supabase_url,
  env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key,
  { auth: { persistSession: false } }
);

const { data: rb, error: readErr } = await sb.from('golive_runbooks').select('data, extras, done').eq('slug', slug).maybeSingle();
if (readErr || !rb) {
  console.error('Runbook not found:', slug, readErr?.message ?? '');
  process.exit(1);
}
const ids = new Set([
  ...rb.data.flatMap((g) => g.items.map((i) => i.id)),
  ...(rb.extras ?? []).map((e) => e.id),
]);
if (!ids.has(itemId)) {
  console.error(`Item "${itemId}" not in runbook "${slug}". Items: ${[...ids].join(', ')}`);
  process.exit(1);
}

const done = { ...rb.done };
if (undone) delete done[itemId];
else done[itemId] = { at: new Date().toISOString(), by: 'claude' };

const { error } = await sb
  .from('golive_runbooks')
  .update({ done, updated_at: new Date().toISOString() })
  .eq('slug', slug);
if (error) {
  console.error('Update failed:', error.message);
  process.exit(1);
}
console.log(`OK ${slug}/${itemId} -> ${undone ? 'not done' : 'done'}`);
