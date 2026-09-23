/**
 * Rebuild named presence audits in place, from what is already stored.
 *
 * No website is re-read and no model runs: this re-runs buildPresenceReport
 * over the lead's existing grade, which is what you want after a fix to the
 * report BUILDER rather than to the grader. Used on 2026-09-20 for the eleven
 * reports whose stored website grade carried a junk category key and took
 * their own page to a 500.
 *
 *   node --import tsx scripts/door-drop/rebuild-audits.mts <audit id> [more ids...]
 */
import { loadEnv, supabase } from './select.mts';
import { buildPresenceReport, inputFromLead } from '../../lib/presence-audit.ts';
import type { WebsiteAuditReport } from '../../lib/website-audit.ts';

loadEnv(process.cwd());
const sb = supabase();
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!ids.length) throw new Error('give me at least one presence_audits id');

for (const id of ids) {
  const { data: a } = await sb.from('presence_audits').select('id,lead_id,business_name,score,letter').eq('id', id).maybeSingle();
  if (!a) { console.log(`${id}: no such audit`); continue; }
  const { data: lead } = await sb.from('outbound_leads').select('*').eq('id', a.lead_id).maybeSingle();
  if (!lead) { console.log(`${a.business_name}: no lead row`); continue; }

  const built = buildPresenceReport(inputFromLead(lead), (lead.audit_json as WebsiteAuditReport | null) ?? null);
  const { error } = await sb
    .from('presence_audits')
    .update({ score: built.overall_score, letter: built.letter_grade, report: built })
    .eq('id', id);
  if (error) { console.log(`${a.business_name}: ${error.message}`); continue; }
  if (lead.presence_audit_id === id) {
    await sb.from('outbound_leads').update({ presence_audit_score: built.overall_score }).eq('id', lead.id);
  }
  console.log(`${String(a.business_name).slice(0, 34).padEnd(35)} ${a.score} ${a.letter} -> ${built.overall_score} ${built.letter_grade}`);
}
