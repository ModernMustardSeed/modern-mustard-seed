/**
 * READ THE DOSSIER AND WRITE THE DRAFT, WITHOUT SENDING ANYTHING.
 *
 * The composer's suggestion is only as good as what it reads, and what it reads
 * is invisible from the screen. This prints both: every fact and interaction
 * the dossier picked up for one lead, then the email the model writes from it.
 *
 * It never calls Resend and never writes a row. Safe against production data.
 *
 *   pnpm exec tsx scripts/lead-email-dry-run.mts "pool tile"
 *   pnpm exec tsx scripts/lead-email-dry-run.mts <uuid> --source prospect
 *   pnpm exec tsx scripts/lead-email-dry-run.mts "pool tile" --say "offer him 120 minutes at $197/mo"
 *   pnpm exec tsx scripts/lead-email-dry-run.mts "pool tile" --no-draft
 *
 * One exception, and you have to ask for it by name: --send-to <address> proves
 * the whole chain end to end. It creates a throwaway test lead pointed at that
 * address, runs the real send, checks the rows it should have written, then
 * deletes everything it made. It never mails the lead you searched for.
 *
 *   pnpm exec tsx scripts/lead-email-dry-run.mts --send-to sarah@modernmustardseed.com
 */
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the ambient environment */
}

const { getSupabase } = await import('../lib/supabase');
const { loadComposeSubject, suggestEmail, sendComposedEmail, LEAD_SOURCES } = await import('../lib/lead-compose');
type Source = (typeof LEAD_SOURCES)[number];

const argv = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? '') : null;
};
const query = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true) ?? argv[0];
const source = (flag('source') ?? 'lead') as Source;
const say = flag('say') ?? '';
const noDraft = argv.includes('--no-draft');
const sendTo = flag('send-to');

const db = getSupabase();
if (!db) {
  console.error('No Supabase client. Is .env.local present with the service role key?');
  process.exit(1);
}

if (sendTo) {
  await liveSendTest(sendTo);
  process.exit(0);
}

if (!query) {
  console.error('Give me a lead id, or part of a business name.');
  process.exit(1);
}

const TABLE: Record<Source, string> = { lead: 'outbound_leads', prospect: 'rep_prospects', inbound: 'leads' };
const NAME_COL: Record<Source, string> = { lead: 'business_name', prospect: 'business', inbound: 'business_name' };

let id = query;
if (!/^[0-9a-f-]{36}$/i.test(query)) {
  const { data, error } = await db
    .from(TABLE[source])
    .select(`id,${NAME_COL[source]}`)
    .ilike(NAME_COL[source], `%${query}%`)
    .limit(5);
  if (error) {
    console.error(`Search failed: ${error.message}`);
    process.exit(1);
  }
  const rows = (data ?? []) as Record<string, string>[];
  if (!rows.length) {
    console.error(`Nothing in ${TABLE[source]} matches "${query}".`);
    process.exit(1);
  }
  if (rows.length > 1) {
    console.log(`${rows.length} matches. Using the first.`);
    for (const r of rows) console.log(`  ${r.id}  ${r[NAME_COL[source]]}`);
  }
  id = rows[0].id;
}

const subject = await loadComposeSubject(db, source, id);
if (!subject) {
  console.error('That lead is not on file.');
  process.exit(1);
}

const rule = '-'.repeat(74);
console.log(`\n${rule}\n${subject.businessName}  (${source} ${subject.id})\n${rule}`);
console.log(`To:      ${subject.to ?? 'NO EMAIL ON FILE'}`);
console.log(`Blocked: ${subject.blocked ?? 'no, this one can be mailed'}`);
console.log(`Basis:   ${subject.basis}`);

console.log(`\nFACTS (${subject.facts.length})`);
for (const f of subject.facts) console.log(`  - ${f}`);

console.log(`\nLINKS (${subject.links.length})`);
for (const l of subject.links) console.log(`  - ${l.label}: ${l.url}`);

console.log(`\nINTERACTIONS (${subject.interactions.length}, newest first)`);
for (const i of subject.interactions) {
  const head = `  [${new Date(i.at).toLocaleString('en-US', { timeZone: 'America/Denver' })}] ${i.what}`;
  console.log(head);
  if (i.detail) {
    for (const line of i.detail.split('\n').slice(0, 6)) console.log(`      ${line.slice(0, 150)}`);
    const extra = i.detail.split('\n').length - 6;
    if (extra > 0) console.log(`      ... ${extra} more lines, ${i.detail.length} chars in total`);
  }
}

if (noDraft) {
  console.log('\n--no-draft, so the model was not called.\n');
  process.exit(0);
}

console.log(`\n${rule}\nTHE DRAFT${say ? `, told: "${say}"` : ', with no instruction'}\n${rule}`);
try {
  const draft = await suggestEmail(subject, say);
  console.log(`Subject: ${draft.subject}\n`);
  console.log(draft.body);
  const dashes = /[—–]/.test(`${draft.subject}${draft.body}`);
  console.log(`\n${rule}`);
  console.log(`Em dashes surviving: ${dashes ? 'YES, THAT IS A BUG' : 'none'}`);
  console.log('Nothing was sent and nothing was written to the database.\n');
} catch (e) {
  console.error(`\nThe draft failed: ${e instanceof Error ? e.message : String(e)}`);
  console.error('Everything above still shows what the composer reads, which is the half that matters most.\n');
  process.exit(1);
}

/**
 * The whole chain, for real, against a lead that exists only for the duration
 * of this function: create, send, verify the rows, delete. The email genuinely
 * leaves, which is the only way to prove Resend accepted it, the suppression
 * gate ran, and the thread rows landed with the right foreign key.
 */
async function liveSendTest(address: string): Promise<void> {
  const db2 = getSupabase()!;
  const rule2 = '-'.repeat(74);
  console.log(`\n${rule2}\nLIVE SEND TEST, to ${address}\n${rule2}`);

  const { data: made, error: mkErr } = await db2
    .from('outbound_leads')
    .insert({
      business_name: 'Composer Self Test',
      contact_name: 'Sarah',
      email: address,
      phone: '+14063121223',
      city: 'Kalispell',
      state: 'MT',
      trade: 'test',
      status: 'new',
      is_test: true,
      notes: 'Throwaway row created by scripts/lead-email-dry-run.mts --send-to. Deleted at the end of the run.',
    })
    .select('id')
    .single();
  if (mkErr || !made) {
    console.error(`Could not create the test lead: ${mkErr?.message ?? 'no row came back'}`);
    process.exit(1);
  }
  const testId = made.id as string;
  console.log(`Test lead ${testId} created.`);

  let failed = false;
  try {
    const s = await loadComposeSubject(db2, 'lead', testId);
    if (!s) throw new Error('The dossier could not read the row it just created.');
    console.log(`Dossier read it. Blocked: ${s.blocked ?? 'no'}`);

    const res = await sendComposedEmail(db2, s, {
      subject: 'Composer self test',
      body: 'This is the lead email composer proving it can send.\n\nIf this is in your inbox, the whole path works: the draft, the template, Resend, the suppression gate, and the thread rows.',
      sentBy: 'lead-email-dry-run',
    });
    if (!res.ok) throw new Error(res.error);
    console.log(`Sent. Resend id ${res.messageId}, to ${res.to}.`);

    const { data: msg } = await db2.from('messages').select('id,external_id,subject').eq('outbound_lead_id', testId);
    console.log(`messages rows on the lead: ${msg?.length ?? 0}${msg?.[0]?.external_id === res.messageId ? ' (external_id matches the Resend id)' : ''}`);
    const { data: mail } = await db2.from('emails').select('id,status').eq('provider_message_id', res.messageId);
    console.log(`emails rows in the Sent store: ${mail?.length ?? 0}${mail?.[0] ? ` (status ${mail[0].status})` : ''}`);
    const { data: ev } = await db2.from('acq_events').select('id,type,label').eq('lead_id', testId);
    console.log(`acq_events rows: ${ev?.length ?? 0}${ev?.[0] ? ` (${ev[0].type})` : ''}`);
    const { data: after } = await db2.from('outbound_leads').select('status,last_email_at').eq('id', testId).single();
    console.log(`lead after: status ${after?.status}, last_email_at ${after?.last_email_at}`);
    if (!msg?.length || !mail?.length || !ev?.length) {
      failed = true;
      console.error('At least one row did not land. Read the counts above.');
    }
  } catch (e) {
    failed = true;
    console.error(`The send failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await db2.from('messages').delete().eq('outbound_lead_id', testId);
    await db2.from('acq_events').delete().eq('lead_id', testId);
    await db2.from('outbound_leads').delete().eq('id', testId);
    console.log('Test lead, its messages and its events deleted. The Sent-store row is kept on purpose: it is the receipt.');
  }
  console.log(`${rule2}\n${failed ? 'FAILED. See above.' : 'PASSED. Check the inbox.'}\n`);
  if (failed) process.exit(1);
}
