/**
 * Backfill website audits for tracker prospects that have a site but no audit
 * (script-imported leads bypass the UI's background auto-audit). Runs the same
 * engine as the call card, then caches the report on the row exactly like
 * /api/admin/prospects/[id]/audit does.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-audits.mts
 * ANTHROPIC_API_KEY is read from the environment or .env.local.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { runWebsiteAudit } from '../lib/website-audit';

// Light .env.local loader so the script runs standalone (no dotenv dep).
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* no .env.local, rely on the environment */
}

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
// Free by default, like scripts/preaudit-leads.mts: this always runs locally, so
// there is no reason for it to bill the API. `AUDIT_ENGINE=api` opts back out.
if (!process.env.AUDIT_ENGINE) process.env.AUDIT_ENGINE = 'claude-code';
const ON_API = process.env.AUDIT_ENGINE === 'api';

if (ON_API && !process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing (env or .env.local).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
// Headless Claude wants a few hundred MB per process, so the free engine runs
// leaner than the API path did. lib/claude-code-json enforces its own cap too.
const CONCURRENCY = ON_API ? 3 : 2;

const { data: rows, error } = await supabase
  .from('rep_prospects')
  .select('id, business, city, website')
  .is('audit_score', null)
  .not('website', 'is', null)
  .order('created_at', { ascending: true });
if (error) throw error;

const queue = (rows ?? []).filter((r) => (r.website ?? '').trim());
console.log(`${queue.length} prospects need an audit.`);

let done = 0;
let failed = 0;

async function auditOne(row: { id: string; business: string; website: string | null }) {
  const result = await runWebsiteAudit(row.website!);
  if (!result.ok) {
    failed++;
    console.log(`  ✗ ${row.business} (${row.website}): ${result.error}`);
    return;
  }
  const { error: saveErr } = await supabase
    .from('rep_prospects')
    .update({
      audit_url: result.url,
      audit_score: Math.round(result.report.overall_score),
      audit_json: result.report,
      audit_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (saveErr) {
    failed++;
    console.log(`  ✗ ${row.business}: audit ran but save failed: ${saveErr.message}`);
    return;
  }
  done++;
  console.log(`  ✓ ${row.business}: ${Math.round(result.report.overall_score)}/100 (${result.report.letter_grade}) [${done + failed}/${queue.length}]`);
}

const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const row = queue.shift();
    if (!row) break;
    try {
      await auditOne(row);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${row.business}: ${err instanceof Error ? err.message : err}`);
    }
  }
});
await Promise.all(workers);

console.log(`\nDone. ${done} audited, ${failed} failed.`);
