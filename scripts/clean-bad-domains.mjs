/**
 * Auto-clean leads whose website is dead/unreachable. These are prospects that
 * HAVE a website on file but it never returned a usable page during the audit
 * pass (dead domain, parked page, DNS failure, or a hard bot-wall), so they
 * still have audit_score = null. They fail the "every lead has a real, auditable
 * website" rule, so we remove them. Backed up first (reversible, gitignored).
 *
 * Run: node scripts/clean-bad-domains.mjs            (preview)
 *      node scripts/clean-bad-domains.mjs --apply    (delete)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (k) => { for (const l of env.split(/\r?\n/)) { if (l.toLowerCase().startsWith(k.toLowerCase() + '=')) { let v = l.slice(k.length + 1).trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; } } return ''; };
const sb = createClient(get('supabase_url'), get('supabase_service_role_key'), { auth: { persistSession: false } });

// Bad domain = has a website but it never audited (dead/parked/unreachable).
// Preserve anything already worked: in the pipeline (lead_id) or already audited.
const { data: bad, error } = await sb.from('rep_prospects').select('*').not('website', 'is', null).is('audit_score', null).is('lead_id', null);
if (error) { console.error('query failed', error.message); process.exit(1); }
console.log(`bad-domain leads (website on file, never audited): ${bad.length}`);
const byCity = {};
for (const r of bad) byCity[r.city || '?'] = (byCity[r.city || '?'] || 0) + 1;
console.log('by city:', JSON.stringify(byCity));
console.log('sample:', bad.slice(0, 8).map((r) => `${r.business} (${r.website})`).join(' | '));

if (!existsSync('backups')) mkdirSync('backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = `backups/bad_domains_${stamp}.json`;
writeFileSync(file, JSON.stringify(bad, null, 2));
console.log(`backup: ${file}`);

if (!APPLY) { console.log(`\nDRY RUN. Re-run with --apply to delete ${bad.length}.`); process.exit(0); }

let deleted = 0;
const ids = bad.map((r) => r.id);
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const { error: delErr } = await sb.from('rep_prospects').delete().in('id', batch);
  if (delErr) { console.error('delete batch failed', delErr.message); break; }
  deleted += batch.length;
}
const { count } = await sb.from('rep_prospects').select('*', { count: 'exact', head: true });
console.log(`\nDELETED ${deleted} bad-domain leads. Backup: ${file}. Remaining prospects: ${count}`);
