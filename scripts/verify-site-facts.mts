/**
 * VERIFY SITE FACTS: read every lead's website and correct the research.
 *
 * Sarah, 2026-08-25: the Murrell Dental suite told the prospect their site
 * "does not even show hours or an address" while both sat on the contact page,
 * and the lead had no email on file while info@ sat on the same page. The
 * research notes were written by hand; nothing ever checked them.
 *
 * This sweep does the checking. For every lead with a website it:
 *
 *   1. reads the site live (lib/site-facts.ts): address, hours, email, phone,
 *      booking, plus whether the certificate is broken;
 *   2. stores one `SITE FACTS (verified DATE):` line on the lead's notes, so the
 *      hub, the audit, the brief and the printed sheet all read the same facts;
 *   3. rewrites the WEBSITE: and GAP: research lines, removing every clause the
 *      site contradicts ("no hours" when five days are listed), and prints what
 *      it removed so the correction is visible;
 *   4. fills in the lead's email from the site when the lead has none.
 *
 * Run from the repo root:
 *
 *   .\node_modules\.bin\tsx.CMD scripts\verify-site-facts.mts            all leads with research lines, stale facts only
 *   .\node_modules\.bin\tsx.CMD scripts\verify-site-facts.mts --all      every lead with a website
 *   .\node_modules\.bin\tsx.CMD scripts\verify-site-facts.mts --name murrell
 *   .\node_modules\.bin\tsx.CMD scripts\verify-site-facts.mts --force    re-read even fresh facts
 *   .\node_modules\.bin\tsx.CMD scripts\verify-site-facts.mts --dry      read and report, write nothing
 *
 * Idempotent: facts under 30 days old are skipped unless --force. Six sites at
 * a time, so a hundred leads takes a few minutes, not an hour.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { emailTrusted, fetchSiteFacts, parseSiteFacts, scrubClaims, siteFactsFresh, siteFactsLine, withSiteFactsLine, type SiteFacts } from '../lib/site-facts';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};
const DRY = flag('--dry');
const ALL = flag('--all');
const FORCE = flag('--force');
const NAME = opt('--name');
const CONCURRENCY = 6;

function loadEnv() {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i <= 0 || line.startsWith('#')) continue;
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^"|"$/g, '');
      if (!process.env[k] && v && v !== '[SENSITIVE]') process.env[k] = v;
    }
  } catch {
    /* env comes from the shell */
  }
}
loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(1);
}
const sb = createClient(url, key);

type Lead = { id: string; business_name: string; website: string | null; email: string | null; notes: string | null };

async function loadLeads(): Promise<Lead[]> {
  const out: Lead[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = sb
      .from('outbound_leads')
      .select('id, business_name, website, email, notes')
      .not('website', 'is', null)
      .neq('website', '')
      .order('business_name')
      .range(from, from + PAGE - 1);
    if (NAME) q = q.ilike('business_name', `%${NAME}%`);
    if (!ALL && !NAME) q = q.or('notes.ilike.%GAP:%,notes.ilike.%WEBSITE:%');
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Lead[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Rewrite one research line, keeping the marker, dropping contradicted clauses. */
function correctLine(notes: string, marker: 'WEBSITE' | 'GAP', facts: SiteFacts): { notes: string; removed: string[] } {
  const re = new RegExp(`^${marker}:\\s*(.*)$`, 'm');
  const m = re.exec(notes);
  if (!m) return { notes, removed: [] };
  const { text, removed } = scrubClaims(m[1], facts, 'notes');
  if (!removed.length) return { notes, removed };
  // What was removed is kept under its own marker, which no surface prints,
  // so the correction is auditable. The research line itself either keeps its
  // true remainder or disappears: a GAP line that says "corrected" would be
  // read by the hub as a finding and printed to the prospect.
  const record = `RESEARCH CORRECTED ${facts.verified}: ${marker} said "${removed.join('; ')}" and the site has it`;
  const line = text ? `${marker}: ${text}\n${record}` : record;
  return { notes: notes.replace(re, line), removed };
}

async function one(lead: Lead, stats: { read: number; skipped: number; corrected: number; emails: number; unreachable: number }) {
  const stored = parseSiteFacts(lead.notes);
  if (!FORCE && siteFactsFresh(stored)) {
    stats.skipped++;
    return;
  }
  const facts = await fetchSiteFacts(lead.website!);
  stats.read++;
  if (!facts.reachable) stats.unreachable++;
  const keep = !facts.reachable && stored?.reachable ? stored : facts;
  let notes = withSiteFactsLine(lead.notes, keep);
  const removed: string[] = [];
  if (keep.reachable) {
    for (const marker of ['WEBSITE', 'GAP'] as const) {
      const r = correctLine(notes, marker, keep);
      notes = r.notes;
      removed.push(...r.removed.map((x) => `${marker}: "${x}"`));
    }
  }
  const patch: Record<string, unknown> = { notes };
  if (keep.email && !lead.email && emailTrusted(keep.email, keep.url)) {
    patch.email = keep.email;
    stats.emails++;
  }
  if (removed.length) stats.corrected++;

  const tag = keep.reachable ? (keep.ssl_error ? 'SSL BROKEN' : 'ok') : 'unreachable';
  console.log(`\n## ${lead.business_name} [${tag}] ${lead.website}`);
  console.log(`   ${siteFactsLine(keep)}`);
  for (const r of removed) console.log(`   removed ${r}`);
  if (patch.email) console.log(`   email set: ${patch.email}`);

  if (DRY) return;
  const { error } = await sb.from('outbound_leads').update(patch).eq('id', lead.id);
  if (error) console.log(`   WRITE FAILED: ${error.message}`);
}

const leads = await loadLeads();
console.log(`${leads.length} leads with a website${NAME ? ` matching "${NAME}"` : ALL ? '' : ' and research lines'}${DRY ? ' (dry run)' : ''}`);
const stats = { read: 0, skipped: 0, corrected: 0, emails: 0, unreachable: 0 };
let i = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < leads.length) {
      const lead = leads[i++];
      try {
        await one(lead, stats);
      } catch (err) {
        console.log(`\n## ${lead.business_name} FAILED: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }),
);
console.log(`\nread ${stats.read}, skipped ${stats.skipped} (fresh), unreachable ${stats.unreachable}, research corrected on ${stats.corrected}, emails filled ${stats.emails}`);
