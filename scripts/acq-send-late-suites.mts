/**
 * THE LATE SUITES (Sarah, 2026-09-09).
 *
 *   pnpm exec tsx scripts/acq-send-late-suites.mts                 # dry run: the list, and a preview per email
 *   pnpm exec tsx scripts/acq-send-late-suites.mts --apply         # send them
 *   pnpm exec tsx scripts/acq-send-late-suites.mts --only swan     # one business, by name fragment
 *   pnpm exec tsx scripts/acq-send-late-suites.mts --out C:\previews
 *
 * WHO. People who ASKED for a demo and never got their suite: they built one
 * at the demo station or the self-serve build page, clicked "the free build"
 * or "the Talking Website" in a campaign email, asked Mr. Mustard on a call,
 * or gave consent to be called. A prospect Sarah built proactively from the
 * board did not ask, and this never mails them; the board's send button is
 * for those.
 *
 * WHAT. The suite email with the late variant on: one sentence owning the
 * wait, the reason a person can accept (the response outran us), every piece
 * that is genuinely finished, and one ask: call Mr. Mustard and book a slot
 * with Sarah. See buildSuiteEmail in lib/acq/campaign.ts.
 *
 * NEVER. Test rows, opted-out rows, rows already sent or already announced by
 * the suite-ready hook, clients, rows with no address or a placeholder one,
 * and the studio's own addresses used to try the demo station. A lead that
 * asked and has NOTHING built is listed under "needs a build" and left
 * alone, because there is no suite to send.
 *
 * Every send goes through sendSuiteEmail, so it carries the hand-send
 * override (the master switch and the pacing step aside, the recipient's own
 * protections do not), stamps the lead, writes the ledger and the timeline,
 * and starts the post-demo follow-ups.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = ['.env.local', resolve('../../products/modern-mustard-seed/.env.local')];
const envFile = ENV_CANDIDATES.find((p) => existsSync(p));
if (!envFile) {
  console.error('No .env.local found. Looked in:\n  ' + ENV_CANDIDATES.join('\n  '));
  process.exit(1);
}
for (const l of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const { sendSuiteEmail, checkoutUrlFor, CALENDAR_URL } = await import('../lib/acq/send');
const { buildSuiteEmail } = await import('../lib/acq/campaign');
const { getCampaign } = await import('../lib/acq/settings');
const { OFFER } = await import('../lib/acq/types');
type AcqProspect = import('../lib/acq/types').AcqProspect;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('[')) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be real values in .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const only = flag('--only')?.toLowerCase();
const outDir = flag('--out') ?? join(process.cwd(), '.late-suites-preview');

const REASON = 'Sent by hand: the late suites, with the apology (2026-09-09)';

/** Sources that mean the person asked for this themselves. */
const ASKED_SOURCES = new Set(['demo-station', 'mms-demo-build', 'mr-mustard']);
/** Event types that mean a person reached for a demo or a call. */
const ASKED_EVENTS = new Set(['forge_requested', 'consent_captured', 'reply', 'link_clicked', 'permission_visited', 'call_inbound', 'meeting_booked']);
/** The studio's own addresses, used to try the demo station. Never a prospect. */
const OURS = /makeourcitypretty|wildhopehouse|fiatluxdesign84|theclawconcierge|bizyai2023|bellavalentina22|@modernmustardseed\.com$/i;
/** An address that is a placeholder, not a mailbox. */
const PLACEHOLDER = /@example\.|unknown@|@\.com$|yourbusiness|@company\.site|safeguarding@|^abuse@/i;

type Row = AcqProspect & { suite_film_status?: string | null; status?: string | null; is_test?: boolean };

const cols =
  'id,business_name,contact_name,email,phone,source,acq_campaign_id,acq_cohort_id,acq_stage,consent_status,call_stage,demo_url,' +
  'site_demo_status,site_demo_url,suite_film_status,hub_demo_url,os_demo_url,demo_emailed_at,unsubscribed_at,is_test,client_status,status,created_at';

/* ── 1. everyone who asked, by the lead row ── */
const { data: byRow, error: rowErr } = await db
  .from('outbound_leads')
  .select(cols)
  .is('demo_emailed_at', null)
  .is('unsubscribed_at', null)
  .or(`consent_status.eq.granted,call_stage.eq.completed,source.in.(${[...ASKED_SOURCES].join(',')})`)
  .limit(1000);
if (rowErr) {
  console.error('Could not read the leads:', rowErr.message);
  process.exit(1);
}

/* ── 2. everyone who asked, by a human event ── */
const { data: events } = await db
  .from('acq_events')
  .select('lead_id,type,label,detail,occurred_at')
  .in('type', [...ASKED_EVENTS])
  .order('occurred_at', { ascending: false })
  .limit(5000);
const human = ((events ?? []) as { lead_id: string | null; type: string; label: string; detail: Record<string, unknown> | null; occurred_at: string }[]).filter(
  (e) => e.lead_id && !(e.detail && e.detail.machine === true) && !/scanner|security|gateway/i.test(e.label),
);
const askedById = new Map<string, string[]>();
for (const e of human) {
  const list = askedById.get(e.lead_id as string) ?? [];
  list.push(`${e.type} ${e.occurred_at.slice(0, 10)}`);
  askedById.set(e.lead_id as string, list);
}
const eventIds = [...askedById.keys()];
const byEvent: Row[] = [];
for (let i = 0; i < eventIds.length; i += 40) {
  const { data } = await db.from('outbound_leads').select(cols).in('id', eventIds.slice(i, i + 40)).is('demo_emailed_at', null).is('unsubscribed_at', null);
  byEvent.push(...((data ?? []) as Row[]));
}

const leads = new Map<string, Row>();
for (const l of [...((byRow ?? []) as Row[]), ...byEvent]) leads.set(l.id, l);

/* ── 3. already announced by the suite-ready hook ── */
const { data: announced } = await db.from('messages').select('outbound_lead_id').eq('subject', 'Demo suite emailed');
const announcedIds = new Set((announced ?? []).map((m) => m.outbound_lead_id as string));

/* ── 4. sort them ── */
const send: Row[] = [];
const needsBuild: Row[] = [];
const skipped: string[] = [];
for (const l of [...leads.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
  const why = (r: string) => skipped.push(`${l.business_name}: ${r}`);
  if (only && !l.business_name.toLowerCase().includes(only)) continue;
  if (l.is_test) { why('test row'); continue; }
  if (!l.email) { why('no email'); continue; }
  if (PLACEHOLDER.test(l.email)) { why(`placeholder address ${l.email}`); continue; }
  if (OURS.test(l.email)) { why(`one of ours (${l.email})`); continue; }
  if (l.client_status === 'client') { why('already a client'); continue; }
  if (announcedIds.has(l.id)) { why('the suite-ready hook already emailed them'); continue; }
  const siteReady = l.site_demo_status === 'ready' && Boolean(l.site_demo_url);
  if (!l.hub_demo_url || (!l.demo_url && !siteReady && !l.os_demo_url)) { needsBuild.push(l); continue; }
  send.push(l);
}

const campaign = await getCampaign();
if (!campaign) {
  console.error('There is no campaign row to send from.');
  process.exit(1);
}

const why = (l: Row) =>
  [
    l.consent_status === 'granted' ? 'gave consent' : null,
    l.call_stage === 'completed' ? 'talked to Mr. Mustard' : null,
    l.source && ASKED_SOURCES.has(l.source) ? `came in via ${l.source}` : null,
    ...(askedById.get(l.id) ?? []),
  ]
    .filter(Boolean)
    .join(', ');

const pieces = (l: Row) =>
  [
    l.demo_url ? 'receptionist' : null,
    l.site_demo_status === 'ready' && l.site_demo_url ? 'website' : l.site_demo_status ? `website ${l.site_demo_status}` : null,
    l.suite_film_status === 'ready' ? 'film' : null,
  ]
    .filter(Boolean)
    .join(' + ');

console.log(`\n${apply ? 'SENDING' : 'Would send'} the late suite to ${send.length}:`);
for (const l of send) console.log(`  ${l.business_name} <${l.email}>  [${pieces(l)}]  asked: ${why(l)}`);

if (needsBuild.length) {
  console.log(`\nAsked, but nothing is built for them yet (${needsBuild.length}). Build the suite from the board, then run this again:`);
  for (const l of needsBuild) console.log(`  ${l.business_name} <${l.email}>  asked: ${why(l)}`);
}
if (skipped.length) {
  console.log(`\nLeft alone (${skipped.length}):`);
  for (const s of skipped) console.log(`  ${s}`);
}

/* ── 5. previews, always ── */
mkdirSync(outDir, { recursive: true });
for (const l of send) {
  const siteReady = l.site_demo_status === 'ready' && Boolean(l.site_demo_url);
  const built = buildSuiteEmail({
    lead: l,
    suite: {
      hubUrl: l.hub_demo_url as string,
      voiceUrl: l.demo_url,
      siteUrl: siteReady ? l.site_demo_url : null,
      osUrl: l.os_demo_url,
      personalVideo: false,
      film: l.suite_film_status === 'ready',
    },
    checkoutUrl: checkoutUrlFor(l),
    calendarUrl: CALENDAR_URL,
    offerLine: OFFER.line,
    fromMustard: false,
    fromName: campaign.from_name,
    fromEmail: campaign.from_email,
    replyTo: campaign.reply_to,
    late: true,
  });
  if (!built) continue;
  const file = join(outDir, `${l.business_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`);
  writeFileSync(file, `<!-- Subject: ${built.subject} -->\n${built.html}`);
}
console.log(`\nPreviews: ${outDir}`);

if (!apply) {
  console.log('Dry run. Add --apply to send.');
  process.exit(0);
}

/* ── 6. send ── */
let sent = 0;
for (const l of send) {
  const res = await sendSuiteEmail(db, campaign, l, { late: true }, { reason: REASON });
  if (res.ok) {
    sent++;
    console.log(`  sent  ${l.business_name}: ${res.subject}`);
  } else {
    console.log(`  REFUSED  ${l.business_name}: ${res.error}`);
  }
}
console.log(`\n${sent} of ${send.length} sent.`);
