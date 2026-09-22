import type { SupabaseClient } from '@supabase/supabase-js';
import { promises as dns } from 'node:dns';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { llmEnqueue } from '@/lib/llm';
import type { ClientProject } from '@/lib/client-leads';

/**
 * EVERY MAILBOX THE BUSINESS RUNS, SORTED, WITH A REPLY WAITING.
 *
 * A business has more than one mailbox: Built Right runs shan@, carmen@ and
 * zayne@brimhomes.com. Each one is connected once and read on its own. Gmail
 * and Google Workspace take an app password (2-Step Verification, Security,
 * App passwords, "Mail"), because Gmail's own API needs an OAuth app Google
 * reviews for months. Porkbun hosted mail takes the mailbox's own password.
 * Which of the two is decided from the address and its MX, never asked.
 *
 * We read each inbox over IMAP, sort each message into a plain category, and
 * for anything that needs an answer we draft one in the voice of the person
 * whose mailbox it arrived in. The owner reads, edits, and presses Send, and
 * the reply leaves from the mailbox the message came to. Nothing leaves
 * without that press. Nothing is deleted or moved in any mailbox, ever; we
 * only read, and we only write a draft into Drafts when they ask for one.
 */

/** The first version kept one Gmail row per client. It is still read, never written. */
const LEGACY = 'gmail';
const providerFor = (address: string) => `mail:${address}`;
const isMailbox = (provider: string) => provider === LEGACY || provider.startsWith('mail:');

type HostKey = 'gmail' | 'porkbun';
const HOSTS: Record<HostKey, { imap: string; smtp: string; name: string; drafts: string }> = {
  gmail: { imap: 'imap.gmail.com', smtp: 'smtp.gmail.com', name: 'Google', drafts: '[Gmail]/Drafts' },
  // Porkbun offers 465 with implicit TLS beside 587, so one transport serves both.
  porkbun: { imap: 'imap.porkbun.com', smtp: 'smtp.porkbun.com', name: 'Porkbun', drafts: 'Drafts' },
};

/** Where an address's mail lives, from its domain and MX. Null when we do not read that host. */
export async function hostFor(address: string): Promise<HostKey | null> {
  const domain = address.split('@')[1]?.toLowerCase() ?? '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'gmail';
  try {
    const mx = (await dns.resolveMx(domain)).map((m) => m.exchange.toLowerCase().replace(/\.$/, ''));
    if (mx.some((h) => h === 'porkbun.com' || h.endsWith('.porkbun.com'))) return 'porkbun';
    if (mx.some((h) => h.endsWith('google.com') || h.endsWith('googlemail.com'))) return 'gmail';
  } catch {
    /* no MX answer: not a host we can read */
  }
  return null;
}

export const CATEGORIES = ['lead', 'customer', 'vendor', 'money', 'newsletter', 'notification', 'spam', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_WORD: Record<Category, string> = {
  lead: 'New inquiry',
  customer: 'A customer',
  vendor: 'A sub or supplier',
  money: 'Money and bills',
  newsletter: 'Newsletters',
  notification: 'Notifications',
  spam: 'Junk',
  other: 'Everything else',
};

export type MailRow = {
  id: string;
  mailbox: string;
  uid: number | null;
  message_id: string;
  in_reply_to: string | null;
  from_addr: string | null;
  from_name: string | null;
  to_addrs: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string;
  category: Category | null;
  summary: string | null;
  needs_reply: boolean | null;
  draft: string | null;
  llm_job_id: string | null;
  status: 'new' | 'replied' | 'done' | 'skipped';
  replied_at: string | null;
};

type IntegrationRow = {
  provider: string;
  account_email: string | null;
  access_ciphertext: string | null;
  access_iv: string | null;
  access_tag: string | null;
  status: string;
  error: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type Creds = { provider: string; address: string; pass: string; host: HostKey; imap: string; smtp: string; drafts: string; lastUid: number };

/** Every mailbox row for a client, oldest first, so the first one connected stays the default. */
async function mailboxRows(sb: SupabaseClient, clientEmail: string): Promise<IntegrationRow[]> {
  const { data } = await sb
    .from('client_integrations')
    .select('provider, account_email, access_ciphertext, access_iv, access_tag, status, error, meta, created_at')
    .eq('client_email', clientEmail)
    .order('created_at', { ascending: true });
  return ((data ?? []) as IntegrationRow[]).filter((r) => isMailbox(r.provider) && r.account_email);
}

function toCreds(r: IntegrationRow): Creds | null {
  if (r.status !== 'connected' || !r.access_ciphertext || !r.account_email) return null;
  try {
    const pass = decryptSecret(r.access_ciphertext, r.access_iv as string, r.access_tag as string);
    const meta = r.meta ?? {};
    const host: HostKey = meta.host === 'porkbun' ? 'porkbun' : 'gmail';
    const h = HOSTS[host];
    return { provider: r.provider, address: r.account_email, pass, host, imap: h.imap, smtp: h.smtp, drafts: h.drafts, lastUid: Number(meta.lastUid ?? 0) };
  } catch {
    return null;
  }
}

async function allCreds(sb: SupabaseClient, clientEmail: string): Promise<Creds[]> {
  return (await mailboxRows(sb, clientEmail)).map(toCreds).filter((c): c is Creds => c !== null);
}

/** The mailbox a message arrived in, or the first connected one when that one is gone. */
async function credsFor(sb: SupabaseClient, clientEmail: string, address?: string | null): Promise<Creds | null> {
  const all = await allCreds(sb, clientEmail);
  const want = address?.trim().toLowerCase();
  return (want && all.find((c) => c.address === want)) || all[0] || null;
}

export type MailboxStatus = { address: string; host: HostKey; connected: boolean; lastSyncAt: string | null; error: string | null };
/**
 * connected, address, lastSyncAt and error summarise every mailbox, so each
 * caller that knew one mailbox still reads true. `mailboxes` is the list.
 */
export type MailStatus = { connected: boolean; address: string | null; lastSyncAt: string | null; error: string | null; mailboxes: MailboxStatus[] };

export async function mailStatus(sb: SupabaseClient, clientEmail: string): Promise<MailStatus> {
  const rows = await mailboxRows(sb, clientEmail);
  const mailboxes: MailboxStatus[] = rows.map((r) => {
    const meta = r.meta ?? {};
    return { address: r.account_email as string, host: meta.host === 'porkbun' ? 'porkbun' : 'gmail', connected: r.status === 'connected', lastSyncAt: (meta.lastSyncAt as string) ?? null, error: r.error ?? null };
  });
  if (!mailboxes.length) return { connected: false, address: null, lastSyncAt: null, error: null, mailboxes };
  const live = mailboxes.filter((m) => m.connected);
  const last = mailboxes.map((m) => m.lastSyncAt).filter((t): t is string => Boolean(t)).sort().pop() ?? null;
  const broken = mailboxes.find((m) => m.error);
  return {
    connected: live.length > 0,
    address: (live.length ? live : mailboxes).map((m) => m.address).join(', '),
    lastSyncAt: last,
    error: broken ? `${broken.address}: ${broken.error}` : null,
    mailboxes,
  };
}

/** Prove the password against the mailbox's own IMAP server, then keep it encrypted. */
export async function connectMailbox(sb: SupabaseClient, clientEmail: string, address: string, password: string): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  const addr = address.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return { ok: false, error: 'That does not look like an email address.' };
  const host = await hostFor(addr);
  if (!host) return { ok: false, error: `We read Gmail, Google Workspace and Porkbun mailboxes, and ${addr.split('@')[1]} is none of those yet.` };
  // Google shows an app password in four groups of four; a Porkbun password is kept exactly as typed.
  const pass = host === 'gmail' ? password.replace(/\s+/g, '') : password.trim();
  if (host === 'gmail' && pass.length < 12) return { ok: false, error: 'A Google app password is 16 letters. Copy it exactly as Google showed it.' };
  if (!pass) return { ok: false, error: 'The mailbox password is needed.' };
  const h = HOSTS[host];
  const client = new ImapFlow({ host: h.imap, port: 993, secure: true, auth: { user: addr, pass }, logger: false });
  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    // Porkbun answers a wrong password with a bare "Command failed"; imapflow flags it.
    const refused = Boolean((err as { authenticationFailed?: boolean })?.authenticationFailed) || /auth|credentials|invalid|login/i.test(m);
    if (refused && host === 'gmail') return { ok: false, error: 'Google did not accept that. Make sure 2-Step Verification is on and this is an app password, not your normal password.' };
    if (refused) return { ok: false, error: `Porkbun did not accept that password for ${addr}. Use the password set for this mailbox on Porkbun, not the Porkbun account password.` };
    return { ok: false, error: `Could not reach the mailbox: ${m}` };
  }
  const enc = encryptSecret(pass);
  const { error } = await sb.from('client_integrations').upsert(
    { client_email: clientEmail, provider: providerFor(addr), account_email: addr, access_ciphertext: enc.ciphertext, access_iv: enc.iv, access_tag: enc.tag, status: 'connected', error: null, meta: { host, lastUid: 0 }, updated_at: new Date().toISOString() },
    { onConflict: 'client_email,provider' }
  );
  if (error) return { ok: false, error: error.message };
  // The same address under the first version's single row would be read twice.
  await sb.from('client_integrations').delete().eq('client_email', clientEmail).eq('provider', LEGACY).eq('account_email', addr);
  return { ok: true, address: addr };
}

/** One mailbox when an address is given, every mailbox when it is not. */
export async function disconnectMailbox(sb: SupabaseClient, clientEmail: string, address?: string | null): Promise<void> {
  const want = address?.trim().toLowerCase();
  const rows = await mailboxRows(sb, clientEmail);
  const gone = rows.filter((r) => !want || r.account_email === want).map((r) => r.provider);
  if (gone.length) await sb.from('client_integrations').delete().eq('client_email', clientEmail).in('provider', gone);
}

/** Whose mailbox this is, by the part before the @ or by the address on file. */
function personFor(p: ClientProject, address: string): string {
  const local = address.split('@')[0];
  const people = p.people ?? {};
  const hit = people[local] ?? Object.values(people).find((x) => x.email.toLowerCase() === address);
  return hit?.name ?? 'Shan';
}

const SORT_SYSTEM = (p: ClientProject, mailbox: string, signer: string) => `You sort and answer email for ${p.business}, a luxury custom home builder in Northwest Montana. The owner is Shan; Carmen runs the office; Zayne runs the job sites. You are not any of them and you never claim to be.

This message arrived in ${mailbox}, ${signer}'s mailbox.

Sort each message into exactly one category:
- lead: a person asking about building, remodeling, land, plans, a quote, a visit, or availability.
- customer: someone already working with them about their project.
- vendor: a subcontractor, supplier, lumber yard, inspector, engineer, or trade partner.
- money: invoices, payments, bank, insurance, permits, taxes, receipts.
- newsletter: marketing mail, promotions, digests.
- notification: automated system mail: alerts, confirmations, calendar, software.
- spam: junk or scams.
- other: anything else.

needs_reply is true only when a real person is waiting for an answer. A newsletter, a receipt, an automated notice, or a message that closes the loop needs no reply.

When needs_reply is true, write a draft reply in ${signer}'s voice: warm, short, plain, first person as the company (we, us). Never quote a price, a price per square foot, a timeline, or financing terms; say Shan will talk those through in person. Never promise a date. Never invent a fact about a project. End with a plain next step (a call, a site visit, a time that works). No em dashes. Sign off as ${signer}.

summary is one sentence, under 25 words, saying what the message is and what it wants.`;

const SORT_SCHEMA = {
  type: 'object' as const,
  properties: {
    category: { type: 'string', enum: [...CATEGORIES] },
    needs_reply: { type: 'boolean' },
    summary: { type: 'string' },
    draft: { type: 'string' },
  },
  required: ['category', 'needs_reply', 'summary'],
};

type SyncResult = { ok: boolean; fetched: number; queued: number; error?: string };

/** Read one mailbox's new mail since its last uid, keep it, and queue the sorting. */
async function syncOne(sb: SupabaseClient, p: ClientProject, creds: Creds): Promise<SyncResult> {
  const client = new ImapFlow({ host: creds.imap, port: 993, secure: true, auth: { user: creds.address, pass: creds.pass }, logger: false });
  const signer = personFor(p, creds.address);
  let fetched = 0;
  let queued = 0;
  let maxUid = creds.lastUid;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // First run: the last 14 days. After that: everything above the last uid we saw.
      const range = creds.lastUid > 0 ? `${creds.lastUid + 1}:*` : { since: new Date(Date.now() - 14 * 86_400_000) };
      for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true })) {
        if (creds.lastUid > 0 && msg.uid <= creds.lastUid) continue;
        fetched++;
        maxUid = Math.max(maxUid, msg.uid);
        const env = msg.envelope;
        const messageId = env?.messageId || `imap:${creds.address}:${msg.uid}`;
        let text = '';
        try {
          const parsed = await simpleParser(msg.source as Buffer);
          text = (parsed.text || '').toString();
          if (!text && parsed.html) text = String(parsed.html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
        } catch {
          /* keep the envelope */
        }
        text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        const from = env?.from?.[0];
        const row = {
          client_email: p.clientEmail,
          mailbox: creds.address,
          uid: msg.uid,
          message_id: messageId,
          in_reply_to: env?.inReplyTo || null,
          from_addr: from?.address?.toLowerCase() ?? null,
          from_name: from?.name || null,
          to_addrs: (env?.to ?? []).map((t) => t.address).filter(Boolean).join(', ') || null,
          subject: env?.subject || '(no subject)',
          snippet: text.replace(/\s+/g, ' ').slice(0, 300),
          body_text: text.slice(0, 20_000),
          received_at: (env?.date ? new Date(env.date) : new Date()).toISOString(),
        };
        // A message sent to two of their mailboxes is one row: the first mailbox read keeps it.
        const { data: ins } = await sb.from('client_mail').upsert(row, { onConflict: 'client_email,message_id', ignoreDuplicates: true }).select('id');
        if (ins && ins.length) {
          // Mail from the mailbox's own address is not sorted; it is theirs.
          if (row.from_addr === creds.address) continue;
          const jobId = await llmEnqueue({
            label: `client-mail:${ins[0].id}`,
            model: 'sonnet',
            system: SORT_SYSTEM(p, creds.address, signer),
            user: `From: ${row.from_name ?? ''} <${row.from_addr ?? ''}>\nTo: ${row.to_addrs ?? creds.address}\nSubject: ${row.subject}\nReceived: ${row.received_at}\n\n${row.body_text.slice(0, 6000)}`,
            schema: SORT_SCHEMA,
          });
          await sb.from('client_mail').update({ llm_job_id: jobId }).eq('id', ins[0].id);
          queued++;
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    await sb.from('client_integrations').update({ error: m.slice(0, 300), updated_at: new Date().toISOString() }).eq('client_email', p.clientEmail).eq('provider', creds.provider);
    return { ok: false, fetched, queued, error: `${creds.address}: ${m}` };
  }
  await sb
    .from('client_integrations')
    .update({ error: null, meta: { host: creds.host, lastUid: maxUid, lastSyncAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
    .eq('client_email', p.clientEmail)
    .eq('provider', creds.provider);
  return { ok: true, fetched, queued };
}

/** Read every connected mailbox. One broken mailbox never stops the others. */
export async function syncMailbox(sb: SupabaseClient, p: ClientProject): Promise<SyncResult> {
  const all = await allCreds(sb, p.clientEmail);
  if (!all.length) return { ok: false, fetched: 0, queued: 0, error: 'not connected' };
  let fetched = 0;
  let queued = 0;
  const errors: string[] = [];
  for (const c of all) {
    const r = await syncOne(sb, p, c);
    fetched += r.fetched;
    queued += r.queued;
    if (!r.ok && r.error) errors.push(r.error);
  }
  return errors.length ? { ok: errors.length < all.length, fetched, queued, error: errors.join('; ') } : { ok: true, fetched, queued };
}

/** Pull finished sorting jobs onto their rows. Cheap; runs on every read. */
export async function collectSorted(sb: SupabaseClient, clientEmail: string): Promise<number> {
  const { data: pending } = await sb.from('client_mail').select('id, llm_job_id').eq('client_email', clientEmail).is('category', null).not('llm_job_id', 'is', null).limit(60);
  if (!pending?.length) return 0;
  const ids = pending.map((r) => r.llm_job_id as string);
  const { data: jobs } = await sb.from('llm_jobs').select('id, status, result_json').in('id', ids);
  let n = 0;
  for (const j of jobs ?? []) {
    if (j.status !== 'done' || !j.result_json) continue;
    const r = j.result_json as { category?: string; needs_reply?: boolean; summary?: string; draft?: string };
    const row = pending.find((p) => p.llm_job_id === j.id);
    if (!row) continue;
    const category = (CATEGORIES as readonly string[]).includes(String(r.category)) ? (r.category as Category) : 'other';
    await sb
      .from('client_mail')
      .update({ category, needs_reply: Boolean(r.needs_reply), summary: (r.summary ?? '').slice(0, 300) || null, draft: r.needs_reply ? (r.draft ?? '').replace(/—/g, ',').slice(0, 4000) || null : null, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    n++;
  }
  return n;
}

/** Send the reply from the mailbox the message arrived in, threaded under the original. */
export async function sendReply(sb: SupabaseClient, clientEmail: string, mailId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: m } = await sb.from('client_mail').select('*').eq('id', mailId).eq('client_email', clientEmail).maybeSingle();
  if (!m || !m.from_addr) return { ok: false, error: 'That message has no address to reply to.' };
  const creds = await credsFor(sb, clientEmail, m.mailbox as string | null);
  if (!creds) return { ok: false, error: 'The mailbox is not connected.' };
  const body = text.trim();
  if (!body) return { ok: false, error: 'Write something first.' };
  const transport = nodemailer.createTransport({ host: creds.smtp, port: 465, secure: true, auth: { user: creds.address, pass: creds.pass } });
  try {
    await transport.sendMail({
      from: creds.address,
      to: m.from_name ? { name: m.from_name as string, address: m.from_addr as string } : (m.from_addr as string),
      subject: /^re:/i.test(String(m.subject ?? '')) ? String(m.subject) : `Re: ${m.subject ?? ''}`,
      text: body,
      inReplyTo: m.message_id as string,
      references: [m.in_reply_to, m.message_id].filter(Boolean).join(' '),
    });
  } catch (err) {
    return { ok: false, error: `${HOSTS[creds.host].name} did not send it: ${err instanceof Error ? err.message : String(err)}` };
  }
  await sb.from('client_mail').update({ status: 'replied', replied_at: new Date().toISOString(), draft: body, updated_at: new Date().toISOString() }).eq('id', mailId);
  return { ok: true };
}

async function appendDraft(creds: Creds, raw: string): Promise<void> {
  const client = new ImapFlow({ host: creds.imap, port: 993, secure: true, auth: { user: creds.address, pass: creds.pass }, logger: false });
  await client.connect();
  const boxes = await client.list();
  const drafts = boxes.find((b) => (b.specialUse ?? '').toLowerCase() === '\\drafts')?.path ?? creds.drafts;
  await client.append(drafts, Buffer.from(raw, 'utf8'), ['\\Draft', '\\Seen']);
  await client.logout();
}

/**
 * A fresh draft to anyone, in their own Drafts. The guide uses this when the
 * owner says "email Bob about Thursday": the words are written, the draft is
 * in the Drafts folder of the mailbox named (or the first one), and nothing
 * has been sent.
 */
export async function draftNewMail(sb: SupabaseClient, clientEmail: string, to: string, subject: string, text: string, fromMailbox?: string | null): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  const creds = await credsFor(sb, clientEmail, fromMailbox);
  if (!creds) return { ok: false, error: 'The mailbox is not connected.' };
  const addr = to.trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(addr)) return { ok: false, error: 'That does not look like an email address.' };
  const raw = [`From: ${creds.address}`, `To: ${addr}`, `Subject: ${subject.replace(/[\r\n]+/g, ' ').slice(0, 200)}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', text.trim(), ''].join('\r\n');
  try {
    await appendDraft(creds, raw);
  } catch (err) {
    return { ok: false, error: `Could not save the draft: ${err instanceof Error ? err.message : String(err)}` };
  }
  return { ok: true, address: creds.address };
}

/** Put the draft in the Drafts folder of the mailbox the message arrived in, to finish on a phone. */
export async function saveDraft(sb: SupabaseClient, clientEmail: string, mailId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: m } = await sb.from('client_mail').select('*').eq('id', mailId).eq('client_email', clientEmail).maybeSingle();
  if (!m || !m.from_addr) return { ok: false, error: 'That message has no address to reply to.' };
  const creds = await credsFor(sb, clientEmail, m.mailbox as string | null);
  if (!creds) return { ok: false, error: 'The mailbox is not connected.' };
  const subject = /^re:/i.test(String(m.subject ?? '')) ? String(m.subject) : `Re: ${m.subject ?? ''}`;
  const raw = [`From: ${creds.address}`, `To: ${m.from_addr}`, `Subject: ${subject}`, `In-Reply-To: ${m.message_id}`, `References: ${[m.in_reply_to, m.message_id].filter(Boolean).join(' ')}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', text.trim(), ''].join('\r\n');
  try {
    await appendDraft(creds, raw);
  } catch (err) {
    return { ok: false, error: `Could not save the draft: ${err instanceof Error ? err.message : String(err)}` };
  }
  await sb.from('client_mail').update({ draft: text.trim(), updated_at: new Date().toISOString() }).eq('id', mailId);
  return { ok: true };
}
