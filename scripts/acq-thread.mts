/**
 * Read one contact's whole mail thread from the terminal.
 *
 *   pnpm exec tsx scripts/acq-thread.mts "Cooling and Herbers"
 *   pnpm exec tsx scripts/acq-thread.mts info@coolinglaw.com
 *   pnpm exec tsx scripts/acq-thread.mts <lead-uuid> --html   # dump the bytes
 *
 * Same builder the admin panel uses (lib/acq/thread.ts), so what prints here is
 * what the screen shows. `--html` writes each rendered email to a temp file and
 * prints the paths, which is how you check a body in a browser without opening
 * the admin.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// A git worktree has no .env.local of its own (it is gitignored, so it never
// gets checked out), and every acquisition script is run from one sooner or
// later. Fall back to the primary clone rather than dying on a missing file.
const ENV_CANDIDATES = ['.env.local', resolve('../../products/modern-mustard-seed/.env.local')];
const envFile = ENV_CANDIDATES.find((p) => existsSync(p));
if (!envFile) {
  console.error('No .env.local found. Looked in:\n  ' + ENV_CANDIDATES.join('\n  '));
  process.exit(1);
}
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { buildEmailThread } = await import('../lib/acq/thread');

const args = process.argv.slice(2);
const dumpHtml = args.includes('--html');
const needle = args.filter((a) => !a.startsWith('--')).join(' ').trim();
if (!needle) {
  console.error('Give me a business name, an email address, or a lead id.');
  process.exit(1);
}

const db = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
const isEmail = needle.includes('@');

let leadId: string | null = isUuid ? needle : null;
const email: string | null = isEmail ? needle.toLowerCase() : null;

if (!leadId && !isEmail) {
  const { data } = await db
    .from('outbound_leads')
    .select('id,business_name,email')
    .ilike('business_name', `%${needle}%`)
    .limit(5);
  if (!data?.length) {
    console.error(`No prospect matches "${needle}".`);
    process.exit(1);
  }
  if (data.length > 1) {
    console.log(`${data.length} matches, taking the first:`);
    for (const r of data) console.log(`  ${r.business_name}  ${r.email ?? '(no email)'}  ${r.id}`);
  }
  leadId = data[0].id as string;
}

const thread = await buildEmailThread(db, { leadId, email });

const line = '─'.repeat(74);
console.log(`\n${thread.businessName ?? thread.email ?? needle}   ${thread.email ?? '(no address)'}`);
if (thread.sequence) {
  const s = thread.sequence;
  console.log(`Drip: ${s.stage} of ${s.length} sent, gaps ${s.gaps.join('/')} business days`);
  if (s.stoppedReason) console.log(`Stopped: ${s.stoppedReason}`);
}

console.log(`\n${line}\nSENT SO FAR, IN ORDER (${thread.messages.length})\n${line}`);
const files: string[] = [];
for (const m of [...thread.messages].reverse()) {
  const when = new Date(m.occurredAt).toLocaleString();
  const eng = [
    m.opens ? `${m.opens} open` : '',
    m.clicks ? `${m.clicks} click` : '',
    m.machineHits ? `${m.machineHits} scanner` : '',
  ].filter(Boolean).join(', ');
  console.log(`  ${when}  ${m.direction === 'inbound' ? '<-' : '->'} [${m.kind}${m.step ? ` ${m.step}` : ''}] ${m.status}${eng ? `  (${eng})` : ''}`);
  console.log(`      "${m.subject}"  to ${m.to}`);
  if (m.statusDetail) console.log(`      ! ${m.statusDetail}`);
  if (m.bodyMissing) console.log('      (no body stored)');
  for (const l of m.links) console.log(`      link: ${l.label} -> ${l.url}`);
  if (dumpHtml && m.html) {
    const p = join(tmpdir(), `mms-thread-${m.id}.html`);
    writeFileSync(p, m.html, 'utf8');
    files.push(p);
  }
}
console.log(`\n${line}\nSTILL TO GO (${thread.scheduled.length})\n${line}`);
for (const s of thread.scheduled) {
  const when = s.dueAt ? new Date(s.dueAt).toLocaleString() : 'no date';
  console.log(`  ${when}  [${s.source}/${s.status}] ${s.kind}${s.step ? ` step ${s.step}` : ''}${s.variant ? ` arm ${s.variant}` : ''}`);
  if (s.subject) console.log(`      "${s.subject}"`);
  console.log(`      ${s.note}`);
}

if (thread.refusals.length) {
  console.log(['', line, `HELD BACK, NEVER SENT (${thread.refusals.length})`, line].join('\n'));
  for (const r of thread.refusals) console.log(`  ${new Date(r.at).toLocaleString()}  ${r.reason}`);
}

if (dumpHtml) {
  for (const s of thread.scheduled) {
    if (!s.html) continue;
    const p = join(tmpdir(), `mms-thread-next-${s.step ?? s.id}.html`);
    writeFileSync(p, s.html, 'utf8');
    files.push(p);
  }
  console.log(`\nWrote ${files.length} files:`);
  for (const f of files) console.log(`  ${f}`);
}
console.log('');
