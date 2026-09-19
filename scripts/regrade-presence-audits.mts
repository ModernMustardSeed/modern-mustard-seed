/**
 * REGRADE EVERY LEAD'S PRESENCE AUDIT IN PLACE, after the grader changes.
 *
 * Rebuilds each report from what is on the lead: the listing facts, the site
 * facts in notes, and the website grade (audit_json). The row keeps its id,
 * which matters: printed door-drop flyers carry a QR code to /s/<lead id>,
 * which resolves to /demo/audit/<this id>, and a new id would strand every
 * sheet already on a counter.
 *
 * Two depths:
 *
 *   (default)    arithmetic only. The stored website grade is reused. Use it
 *                after a change to the profile, reviews or blend rules.
 *   --rewebsite  every lead with a website is graded again by the website
 *                engine first, on the subscription, three at a time. Use it
 *                after a change to the website grader's prompt or signals.
 *                A site that will not load drops to "not graded" rather than
 *                keeping a grade written by the old prompt.
 *
 * Written 2026-09-19: 269 of 278 reports failed "Hours published" only because
 * the Maps sweep never stored hours, and 31 told owners whose sites redirect to
 * https that they were "Not Secure".
 *
 *   node --env-file=<site>\.env.local --import tsx scripts/regrade-presence-audits.mts [--rewebsite] [--write] [--limit N] [--only <lead id>]
 *
 * Without --write nothing is saved (and --rewebsite without --write grades
 * nothing, because a grade you do not save is a wasted call).
 * Audits filed from the public request form (lead_id null) are left alone: the
 * listing facts there are the ones Sarah read and typed in herself.
 */
import { createClient } from '@supabase/supabase-js';
import { buildPresenceReport, inputFromLead } from '../lib/presence-audit.ts';
import { runWebsiteAudit, type WebsiteAuditReport } from '../lib/website-audit.ts';
import { parseSiteFacts } from '../lib/site-facts.ts';

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const REWEBSITE = argv.includes('--rewebsite') && WRITE;
const flag = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? null : argv[i + 1] ?? null;
};
const LIMIT = Number(flag('limit') ?? 0);
const ONLY = flag('only');
const CONCURRENCY = 3;
const RECENT_HOURS = Number(flag('recent-hours') ?? 6);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase url or service role key missing; pass --env-file.');
const sb = createClient(url, key, { auth: { persistSession: false } });

let q = sb.from('presence_audits').select('id,lead_id,score,letter,report').not('lead_id', 'is', null).order('created_at', { ascending: true });
if (ONLY) q = q.eq('lead_id', ONLY);
const { data: rows, error } = await q.range(0, 9999);
if (error) throw new Error(error.message);
let audits = rows ?? [];
if (LIMIT) audits = audits.slice(0, LIMIT);

// One website grade per lead, even when a lead has several audit rows.
const graded = new Map<string, WebsiteAuditReport | null>();

let changed = 0;
let same = 0;
let missing = 0;
let regraded = 0;
let unloadable = 0;
let done = 0;

async function regradeWebsite(lead: Record<string, unknown>): Promise<WebsiteAuditReport | null> {
  const id = String(lead.id);
  if (graded.has(id)) return graded.get(id) ?? null;
  const site = lead.website as string | null;
  let report: WebsiteAuditReport | null = null;
  // Resumable: a grade written in the last RECENT_HOURS is this run's (or the
  // run before it that died), so it is reused rather than paid for twice.
  const at = lead.audit_at ? new Date(String(lead.audit_at)).getTime() : 0;
  if (site && lead.audit_json && Date.now() - at < RECENT_HOURS * 3600e3) {
    graded.set(id, lead.audit_json as WebsiteAuditReport);
    return lead.audit_json as WebsiteAuditReport;
  }
  if (site) {
    for (let attempt = 0; attempt < 2 && !report; attempt += 1) {
      const r = await runWebsiteAudit(site, {
        facts: parseSiteFacts(lead.notes as string | null) ?? undefined,
        source: { table: 'outbound_leads', id },
        business: (lead.business_name as string | null) ?? null,
        town: (lead.city as string | null) ?? null,
      });
      if (r.ok) {
        report = r.report;
        await sb.from('outbound_leads').update({ audit_score: r.report.overall_score, audit_url: r.url, audit_json: r.report, audit_at: new Date().toISOString() }).eq('id', id);
        regraded += 1;
      }
    }
    if (!report) {
      unloadable += 1;
      // The old grade was written by the prompt we are replacing. Better no
      // website grade than a wrong one.
      await sb.from('outbound_leads').update({ audit_json: null, audit_score: null }).eq('id', id);
    }
  }
  graded.set(id, report);
  return report;
}

async function one(a: (typeof audits)[number]) {
  const { data: lead } = await sb.from('outbound_leads').select('*').eq('id', a.lead_id).maybeSingle();
  if (!lead) { missing += 1; return; }

  const website = REWEBSITE ? await regradeWebsite(lead) : ((lead.audit_json as WebsiteAuditReport | null) ?? null);
  const built = buildPresenceReport(inputFromLead(lead), website);

  const before = JSON.stringify(a.report ?? {});
  const after = JSON.stringify({ ...built, generated_at: (a.report as { generated_at?: string } | null)?.generated_at });
  const moved = built.overall_score !== a.score || built.letter_grade !== a.letter || REWEBSITE || before.length !== after.length;
  done += 1;
  if (!moved) { same += 1; return; }
  changed += 1;
  console.log(`[${done}/${audits.length}] ${String(lead.business_name).slice(0, 36).padEnd(37)} ${a.score} ${a.letter} -> ${built.overall_score} ${built.letter_grade}`);

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

// A small pool: website grades take ~40s each on the subscription.
const queue = [...audits];
await Promise.all(
  Array.from({ length: REWEBSITE ? CONCURRENCY : 1 }, async () => {
    while (queue.length) {
      const a = queue.shift()!;
      try {
        await one(a);
      } catch (e) {
        console.log(`FAILED ${a.id}: ${(e as Error).message}`);
      }
    }
  }),
);

console.log(`\n${audits.length} lead audits: ${changed} rewritten, ${same} unchanged, ${missing} with no lead row.`);
if (REWEBSITE) console.log(`Websites regraded: ${regraded}. Could not load (grade cleared): ${unloadable}.`);
console.log(WRITE ? 'Written.' : 'Dry run. Pass --write to save.');
