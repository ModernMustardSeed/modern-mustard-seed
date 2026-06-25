/**
 * Purge tracker prospects that are not actionable for our outreach model: every
 * lead must have a WEBSITE (we audit it), an EMAIL, and a PHONE. Anything missing
 * one is dead weight and gets removed.
 *
 * Safety:
 *  - Backs up ALL prospects to backups/rep_prospects_<ts>.json first (reversible).
 *  - PRESERVES incomplete rows that represent real work: already promoted to the
 *    pipeline (lead_id) or already audited (audit_score). Those are reported, not
 *    deleted, so no audit work or live lead is lost.
 *
 * Run AFTER enrichment. Dry run by default; pass --apply to actually delete.
 *   node scripts/purge-incomplete-leads.mjs            (preview only)
 *   node scripts/purge-incomplete-leads.mjs --apply    (delete)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (k) => { for (const l of env.split(/\r?\n/)) { if (l.toLowerCase().startsWith(k.toLowerCase() + '=')) { let v = l.slice(k.length + 1).trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; } } return ''; };
const sb = createClient(get('supabase_url'), get('supabase_service_role_key'), { auth: { persistSession: false } });

const { data: all, error } = await sb.from('rep_prospects').select('*');
if (error) { console.error('fetch failed', error.message); process.exit(1); }
console.log(`total prospects: ${all.length}`);

// backup
if (!existsSync('backups')) mkdirSync('backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = `backups/rep_prospects_${stamp}.json`;
writeFileSync(backupFile, JSON.stringify(all, null, 2));
console.log(`backup written: ${backupFile}`);

const complete = (r) => !!(r.website && r.email && r.phone);
const worthKeeping = (r) => r.lead_id != null || r.audit_score != null; // pipeline or audited

const incomplete = all.filter((r) => !complete(r));
const toDelete = incomplete.filter((r) => !worthKeeping(r));
const keptIncomplete = incomplete.filter((r) => worthKeeping(r));

const cnt = (rows, f) => rows.filter(f).length;
console.log(`\ncomplete (website+email+phone): ${all.length - incomplete.length}`);
console.log(`incomplete: ${incomplete.length}`);
console.log(`  -> DELETE (no pipeline link, no audit): ${toDelete.length}`);
console.log(`       missing website: ${cnt(toDelete, (r) => !r.website)}`);
console.log(`       missing email:   ${cnt(toDelete, (r) => !r.email)}`);
console.log(`       missing phone:   ${cnt(toDelete, (r) => !r.phone)}`);
console.log(`  -> KEEP despite incomplete (audited or in pipeline): ${keptIncomplete.length}`);

if (!APPLY) { console.log(`\nDRY RUN. Re-run with --apply to delete ${toDelete.length}.`); process.exit(0); }

let deleted = 0;
const ids = toDelete.map((r) => r.id);
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const { error: delErr } = await sb.from('rep_prospects').delete().in('id', batch);
  if (delErr) { console.error('delete batch failed', delErr.message); break; }
  deleted += batch.length;
}
console.log(`\nDELETED ${deleted} incomplete prospects. Backup: ${backupFile}`);
const { count } = await sb.from('rep_prospects').select('*', { count: 'exact', head: true });
console.log(`remaining prospects: ${count}`);
