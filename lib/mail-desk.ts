import type { SupabaseClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { llmEnqueue } from '@/lib/llm';
import type { ClientProject } from '@/lib/client-leads';

/**
 * THE OWNER'S INBOX, SORTED, WITH A REPLY WAITING.
 *
 * Gmail's own API needs an OAuth app that Google reviews for months. An app
 * password does not: the owner turns on 2-Step Verification, makes one
 * password for "Mail", and pastes it here. We read the inbox over IMAP,
 * sort each message into a plain category, and for anything that needs an
 * answer we draft one in the owner's voice. The owner reads, edits, and
 * presses Send. Nothing leaves without that press. Nothing is deleted or
 * moved in their mailbox, ever; we only read, and we only write a draft
 * into their Drafts folder when they ask for one.
 */

const PROVIDER = 'gmail';
const HOSTS: Record<string, { imap: string; smtp: string }> = {
  gmail: { imap: 'imap.gmail.com', smtp: 'smtp.gmail.com' },
};

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

type Creds = { address: string; pass: string; imap: string; smtp: string; lastUid: number };

async function credsFor(sb: SupabaseClient, clientEmail: string): Promise<Creds | null> {
  const { data } = await sb.from('client_integrations').select('account_email, access_ciphertext, access_iv, access_tag, status, meta').eq('client_email', clientEmail).eq('provider', PROVIDER).maybeSingle();
  if (!data || data.status !== 'connected' || !data.access_ciphertext || !data.account_email) return null;
  try {
    const pass = decryptSecret(data.access_ciphertext as string, data.access_iv as string, data.access_tag as string);
    const meta = (data.meta as Record<string, unknown>) ?? {};
    const host = HOSTS[String(meta.host ?? 'gmail')] ?? HOSTS.gmail;
    return { address: data.account_email as string, pass, imap: host.imap, smtp: host.smtp, lastUid: Number(meta.lastUid ?? 0) };
  } catch {
    return null;
  }
}

export type MailStatus = { connected: boolean; address: string | null; lastSyncAt: string | null; error: string | null };

export async function mailStatus(sb: SupabaseClient, clientEmail: string): Promise<MailStatus> {
  const { data } = await sb.from('client_integrations').select('account_email, status, error, meta').eq('client_email', clientEmail).eq('provider', PROVIDER).maybeSingle();
  if (!data) return { connected: false, address: null, lastSyncAt: null, error: null };
  const meta = (data.meta as Record<string, unknown>) ?? {};
  return { connected: data.status === 'connected', address: (data.account_email as string) ?? null, lastSyncAt: (meta.lastSyncAt as string) ?? null, error: (data.error as string) ?? null };
}

/** Prove the app password against IMAP, then keep it encrypted. */
export async function connectMailbox(sb: SupabaseClient, clientEmail: string, address: string, appPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const addr = address.trim().toLowerCase();
  const pass = appPassword.replace(/\s+/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return { ok: false, error: 'That does not look like an email address.' };
  if (pass.length < 12) return { ok: false, error: 'A Google app password is 16 letters. Copy it exactly as Google showed it.' };
  const host = HOSTS.gmail;
  const client = new ImapFlow({ host: host.imap, port: 993, secure: true, auth: { user: addr, pass }, logger: false });
  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return { ok: false, error: /auth|credentials|invalid/i.test(m) ? 'Google did not accept that. Make sure 2-Step Verification is on and this is an app password, not your normal password.' : `Could not reach the mailbox: ${m}` };
  }
  const enc = encryptSecret(pass);
  const { error } = await sb.from('client_integrations').upsert(
    { client_email: clientEmail, provider: PROVIDER, account_email: addr, access_ciphertext: enc.ciphertext, access_iv: enc.iv, access_tag: enc.tag, status: 'connected', error: null, meta: { host: 'gmail', lastUid: 0 }, updated_at: new Date().toISOString() },
    { onConflict: 'client_email,provider' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function disconnectMailbox(sb: SupabaseClient, clientEmail: string): Promise<void> {
  await sb.from('client_integrations').delete().eq('client_email', clientEmail).eq('provider', PROVIDER);
}

const SORT_SYSTEM = (p: ClientProject) => `You sort and answer email for ${p.business}, a luxury custom home builder in Northwest Montana. The owner is Shan; Carmen runs the office. You are not the owner and you never claim to be.

Sort each message into exactly one category:
- lead: a person asking about building, remodeling, land, plans, a quote, a visit, or availability.
- customer: someone already working with them about their project.
- vendor: a subcontractor, supplier, lumber yard, inspector, engineer, or trade partner.
- money: invoices, payments, bank, insurance, permits, taxes, receipts.
- newsletter: marketing mail, promotions, digests.
- notification: automated system mail: alerts, confirmations, calendar, software.
- spam: junk or scams.
- other: anything else.

needs_reply is true only when a real person is waiting for the owner's answer. A newsletter, a receipt, an automated notice, or a message that closes the loop needs no reply.

When needs_reply is true, write a draft reply in the owner's voice: warm, short, plain, first person as the company (we, us). Never quote a price, a price per square foot, a timeline, or financing terms; say Shan will talk those through in person. Never promise a date. Never invent a fact about a project. End with a plain next step (a call, a site visit, a time that works). No em dashes. Sign off as Shan.

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

/** Read new mail since the last uid, keep it, and queue the sorting. */
export async function syncMailbox(sb: SupabaseClient, p: ClientProject): Promise<{ ok: boolean; fetched: number; queued: number; error?: string }> {
  const creds = await credsFor(sb, p.clientEmail);
  if (!creds) return { ok: false, fetched: 0, queued: 0, error: 'not connected' };
  const client = new ImapFlow({ host: creds.imap, port: 993, secure: true, auth: { user: creds.address, pass: creds.pass }, logger: false });
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
        const { data: ins } = await sb.from('client_mail').upsert(row, { onConflict: 'client_email,message_id', ignoreDuplicates: true }).select('id');
        if (ins && ins.length) {
          // Mail from the owner's own address, or to nobody, is not sorted; it is theirs.
          if (row.from_addr === creds.address) continue;
          const jobId = await llmEnqueue({
            label: `client-mail:${ins[0].id}`,
            model: 'sonnet',
            system: SORT_SYSTEM(p),
            user: `From: ${row.from_name ?? ''} <${row.from_addr ?? ''}>\nSubject: ${row.subject}\nReceived: ${row.received_at}\n\n${row.body_text.slice(0, 6000)}`,
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
    await sb.from('client_integrations').update({ error: m.slice(0, 300), updated_at: new Date().toISOString() }).eq('client_email', p.clientEmail).eq('provider', PROVIDER);
    return { ok: false, fetched, queued, error: m };
  }
  await sb
    .from('client_integrations')
    .update({ error: null, meta: { host: 'gmail', lastUid: maxUid, lastSyncAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
    .eq('client_email', p.clientEmail)
    .eq('provider', PROVIDER);
  return { ok: true, fetched, queued };
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

/** Send the owner's reply from their own address, threaded under the original. */
export async function sendReply(sb: SupabaseClient, clientEmail: string, mailId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const creds = await credsFor(sb, clientEmail);
  if (!creds) return { ok: false, error: 'The mailbox is not connected.' };
  const { data: m } = await sb.from('client_mail').select('*').eq('id', mailId).eq('client_email', clientEmail).maybeSingle();
  if (!m || !m.from_addr) return { ok: false, error: 'That message has no address to reply to.' };
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
    return { ok: false, error: `Google did not send it: ${err instanceof Error ? err.message : String(err)}` };
  }
  await sb.from('client_mail').update({ status: 'replied', replied_at: new Date().toISOString(), draft: body, updated_at: new Date().toISOString() }).eq('id', mailId);
  return { ok: true };
}

/** Put the draft in their Gmail Drafts folder, to finish on their phone. */
export async function saveDraft(sb: SupabaseClient, clientEmail: string, mailId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const creds = await credsFor(sb, clientEmail);
  if (!creds) return { ok: false, error: 'The mailbox is not connected.' };
  const { data: m } = await sb.from('client_mail').select('*').eq('id', mailId).eq('client_email', clientEmail).maybeSingle();
  if (!m || !m.from_addr) return { ok: false, error: 'That message has no address to reply to.' };
  const subject = /^re:/i.test(String(m.subject ?? '')) ? String(m.subject) : `Re: ${m.subject ?? ''}`;
  const raw = [`From: ${creds.address}`, `To: ${m.from_addr}`, `Subject: ${subject}`, `In-Reply-To: ${m.message_id}`, `References: ${[m.in_reply_to, m.message_id].filter(Boolean).join(' ')}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', text.trim(), ''].join('\r\n');
  const client = new ImapFlow({ host: creds.imap, port: 993, secure: true, auth: { user: creds.address, pass: creds.pass }, logger: false });
  try {
    await client.connect();
    const boxes = await client.list();
    const drafts = boxes.find((b) => (b.specialUse ?? '').toLowerCase() === '\\drafts')?.path ?? '[Gmail]/Drafts';
    await client.append(drafts, Buffer.from(raw, 'utf8'), ['\\Draft', '\\Seen']);
    await client.logout();
  } catch (err) {
    return { ok: false, error: `Could not save the draft: ${err instanceof Error ? err.message : String(err)}` };
  }
  await sb.from('client_mail').update({ draft: text.trim(), updated_at: new Date().toISOString() }).eq('id', mailId);
  return { ok: true };
}
