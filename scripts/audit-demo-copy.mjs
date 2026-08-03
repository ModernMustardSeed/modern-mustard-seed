/**
 * SWEEP THE FLEET FOR COPY WE WOULD BE EMBARRASSED BY.
 *
 * The sibling of audit-demo-assets.mjs. That one asks whether the pictures load;
 * this one reads the words. Both exist because the failure is invisible from our
 * side: a demo with "wants a quote on a order" renders perfectly, scores well on
 * every metric we collect, and quietly tells a prospect a machine wrote it.
 *
 * Usage:
 *   node scripts/audit-demo-copy.mjs             # last 30 days of demos + all client sites
 *   node scripts/audit-demo-copy.mjs --full      # everything ever forged
 *   node scripts/audit-demo-copy.mjs --high      # only findings worth waking someone for
 *   node scripts/audit-demo-copy.mjs --id <uuid> # one row
 *
 * ⚠️ PAGES ON PURPOSE. Selecting html for the whole fleet in one query pulls ~60MB
 * of inlined photographs and Postgres kills it ("canceling statement due to
 * statement timeout"), which is how the asset watchdog once cried wolf hourly.
 * Five rows at a time, same as its sibling.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { copyFindings, formatFindings, hasHighSeverity } from '../lib/site-copy-lint.mjs';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* running in CI, secrets come from the environment */ }

const url = env.supabase_url || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.supabase_service_role_key || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase credentials missing.');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : null;
};
const FULL = process.argv.includes('--full');
const HIGH_ONLY = process.argv.includes('--high');
const ONE = arg('id');
const PAGE = 5;
const WINDOW_DAYS = 30;

const report = { scanned: 0, clean: 0, flagged: [] };

function record(kind, id, name, html) {
  report.scanned++;
  const findings = copyFindings(html, name);
  const keep = HIGH_ONLY ? findings.filter((f) => f.severity === 'high') : findings;
  if (!keep.length) {
    report.clean++;
    return;
  }
  report.flagged.push({ kind, id, name, findings: keep, high: hasHighSeverity(keep) });
}

/** Page through a table so a 60MB fleet never lands in one statement. */
async function sweep(table, idCol, nameCol, extraFilter) {
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(`${idCol}, ${nameCol}, html`).range(from, from + PAGE - 1).order(idCol);
    if (ONE) q = sb.from(table).select(`${idCol}, ${nameCol}, html`).eq(idCol, ONE);
    else if (!FULL && extraFilter) q = extraFilter(q);
    const { data, error } = await q;
    if (error) {
      console.error(`${table}: ${error.message}`);
      process.exit(2);
    }
    if (!data?.length) break;
    for (const row of data) if (row.html) record(table, row[idCol], row[nameCol], row.html);
    if (ONE || data.length < PAGE) break;
    from += PAGE;
  }
}

const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();

// Demo sites: a site only develops a copy problem when something WRITES it, so
// the default window is on updated_at, not created_at.
await sweep('outbound_demo_sites', 'id', 'business_name', (q) => q.gte('updated_at', since));

// Client sites: always sweep every one. These are on a paying customer's domain
// and there are few enough that the window would only save milliseconds.
{
  let from = 0;
  for (;;) {
    let q = sb.from('projects').select('id, name, site_html').range(from, from + PAGE - 1).order('id');
    if (ONE) q = sb.from('projects').select('id, name, site_html').eq('id', ONE);
    const { data, error } = await q;
    if (error) {
      console.error(`projects: ${error.message}`);
      process.exit(2);
    }
    if (!data?.length) break;
    for (const row of data) {
      if (!row.site_html) continue;
      // "Olivia's Chocolates: The Talking Website" -> the business, not the SKU.
      record('projects', row.id, String(row.name ?? '').replace(/:.*$/, '').trim(), row.site_html);
    }
    if (ONE || data.length < PAGE) break;
    from += PAGE;
  }
}

/* ── the report ──────────────────────────────────────────────────────── */
console.log(`\nScanned ${report.scanned} document(s). ${report.clean} clean, ${report.flagged.length} flagged.\n`);
const high = report.flagged.filter((f) => f.high);
for (const f of report.flagged) {
  console.log(`${f.high ? '🔴' : '🟡'} ${f.kind} ${f.id}  ${f.name || '(unnamed)'}`);
  console.log(formatFindings(f.findings));
  console.log('');
}
if (high.length) console.log(`${high.length} document(s) carry a HIGH severity finding.`);
else if (report.flagged.length) console.log('Nothing high severity. The rest is polish.');
else console.log('Fleet is clean.');

// Non-zero only on high severity, so the hourly watchdog does not page a human
// over an em dash.
process.exit(high.length ? 1 : 0);
