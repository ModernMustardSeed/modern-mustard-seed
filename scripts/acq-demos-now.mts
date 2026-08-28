/**
 * SEND THE WAITING DEMOS, NOW, FROM THE TERMINAL.
 *
 *   pnpm acq:demos            # what would go, nothing sent
 *   pnpm acq:demos --send     # send them
 *   pnpm acq:demos --send --lead <uuid> --lead <uuid>
 *
 * The same path the admin button uses. It exists as a script as well because
 * the button needs a deploy and a demo does not: this runs against production
 * from here, today, whatever is or is not merged.
 *
 * Pacing is lifted. Consent is not, ever. A dry run is the default because
 * mail does not come back.
 */
import { readFileSync } from 'node:fs';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const send = argv.includes('--send');
const leadIds = argv.reduce<string[]>((acc, a, i) => (a === '--lead' && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const reason = (() => {
  const i = argv.indexOf('--reason');
  return i >= 0 && argv[i + 1] ? argv[i + 1] : 'Sent by hand from the terminal.';
})();

const { getSupabase } = await import('../lib/supabase');
const { getCampaign } = await import('../lib/acq/settings');
const { authorize } = await import('../lib/acq/governor');
const { sendDemosNow } = await import('../lib/acq/demos-now');

const db = getSupabase();
if (!db) {
  console.error('No database. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}
const campaign = await getCampaign();
if (!campaign) {
  console.error('The MEET MR. MUSTARD campaign row is missing.');
  process.exit(1);
}

let q = db
  .from('acq_queue')
  .select('id,lead_id,run_after')
  .eq('status', 'pending')
  .eq('kind', 'demo_email')
  .order('run_after', { ascending: true });
if (leadIds.length) q = q.in('lead_id', leadIds);
const { data: jobs } = await q;
const rows = (jobs ?? []) as { id: string; lead_id: string | null; run_after: string }[];

console.log(`\n${rows.length} demo email${rows.length === 1 ? '' : 's'} queued${leadIds.length ? ' (filtered)' : ''}.\n`);

const override = { reason };
let willSend = 0;
for (const job of rows) {
  if (!job.lead_id) continue;
  const { data } = await db.from('outbound_leads').select('*').eq('id', job.lead_id).maybeSingle();
  const lead = data as { id: string; business_name?: string; email?: string; demo_emailed_at?: string | null; hub_demo_url?: string | null; demo_url?: string | null } | null;
  if (!lead) {
    console.log(`  GONE     ${job.lead_id}`);
    continue;
  }
  const who = `${(lead.business_name ?? '?').slice(0, 34).padEnd(34)} ${lead.email ?? '(no address)'}`;
  if (lead.demo_emailed_at) {
    console.log(`  ALREADY  ${who}`);
    continue;
  }
  if (!lead.hub_demo_url && !lead.demo_url) {
    console.log(`  UNBUILT ${who}`);
    continue;
  }
  const d = await authorize({ db, lead: lead as never, kind: 'demo', campaign, override });
  if (d.allowed) {
    willSend++;
    console.log(`  READY    ${who}`);
  } else {
    console.log(`  BLOCKED  ${who}\n           ${d.reason}`);
  }
}

console.log(`\n${willSend} would send.`);

if (!send) {
  console.log('\nDry run. Add --send to actually send them.\n');
  process.exit(0);
}

console.log(`\nSending, reason: ${reason}\n`);
const report = await sendDemosNow({ db, leadIds: leadIds.length ? leadIds : undefined, reason });
for (const o of report.outcomes) {
  console.log(`  ${o.status.toUpperCase().padEnd(8)} ${(o.company ?? o.email ?? o.leadId).slice(0, 40)}${o.status === 'sent' ? '' : `  ${o.note}`}`);
}
console.log(`\n${report.sent} sent, ${report.skipped} skipped, ${report.failed} failed.`);
if (report.held) console.log(`HELD: ${report.held}`);
console.log('');
