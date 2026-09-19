/**
 * REGRADE EVERY LEAD'S PRESENCE AUDIT IN PLACE, after the grader changes.
 *
 * Rebuilds each report from what is already on the lead: the listing facts,
 * the site facts in notes, and the stored website grade (audit_json). Nothing
 * is re-read and no model runs, so a full pass is arithmetic. The row keeps its
 * id, which matters: printed door-drop flyers carry a QR code to
 * /s/<lead id>, which resolves to /demo/audit/<this id>, and a new id would
 * strand every sheet already on a counter.
 *
 * Written 2026-09-19 when 269 of 278 reports turned out to fail "Hours
 * published" only because the Maps sweep never stored hours (see details_read
 * in lib/presence-audit.ts).
 *
 *   node --env-file=<site>\.env.local --import tsx scripts/regrade-presence-audits.mts          # dry run: prints the changes
 *   node --env-file=<site>\.env.local --import tsx scripts/regrade-presence-audits.mts --write  # writes them
 *
 * Audits filed from the public request form (lead_id null) are left alone: the
 * listing facts there are the ones Sarah read and typed in herself.
 */
import { createClient } from '@supabase/supabase-js';
import { buildPresenceReport, inputFromLead } from '../lib/presence-audit.ts';
import type { WebsiteAuditReport } from '../lib/website-audit.ts';

const WRITE = process.argv.includes('--write');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase url or service role key missing; pass --env-file.');
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: audits, error } = await sb
  .from('presence_audits')
  .select('id,lead_id,score,letter,report')
  .not('lead_id', 'is', null)
  .order('created_at', { ascending: true })
  .range(0, 9999);
if (error) throw new Error(error.message);

let changed = 0;
let same = 0;
let missing = 0;
let hoursClaimsRemoved = 0;

for (const a of audits ?? []) {
  const { data: lead } = await sb.from('outbound_leads').select('*').eq('id', a.lead_id).maybeSingle();
  if (!lead) { missing += 1; continue; }

  const built = buildPresenceReport(inputFromLead(lead), (lead.audit_json as WebsiteAuditReport | null) ?? null);
  const hadHoursFail = JSON.stringify(a.report ?? {}).includes('Your hours are missing');
  const hasHoursFail = JSON.stringify(built).includes('Your hours are missing');
  if (hadHoursFail && !hasHoursFail) hoursClaimsRemoved += 1;

  if (built.overall_score === a.score && built.letter_grade === a.letter && hadHoursFail === hasHoursFail) { same += 1; continue; }
  changed += 1;
  console.log(`${String(lead.business_name).slice(0, 36).padEnd(37)} ${a.score} ${a.letter} -> ${built.overall_score} ${built.letter_grade}`);

  if (WRITE) {
    const { error: e1 } = await sb.from('presence_audits').update({ score: built.overall_score, letter: built.letter_grade, report: built }).eq('id', a.id);
    if (e1) throw new Error(`${a.id}: ${e1.message}`);
    // The lead card prints the score of its CURRENT audit only.
    if (lead.presence_audit_id === a.id) {
      const { error: e2 } = await sb.from('outbound_leads').update({ presence_audit_score: built.overall_score }).eq('id', lead.id);
      if (e2) throw new Error(`${lead.id}: ${e2.message}`);
    }
  }
}

console.log(`\n${audits?.length ?? 0} lead audits: ${changed} changed, ${same} unchanged, ${missing} with no lead row.`);
console.log(`"Your hours are missing" removed from ${hoursClaimsRemoved} reports.`);
console.log(WRITE ? 'Written.' : 'Dry run. Pass --write to save.');
