/**
 * Zoho inbox sync. Pulls each configured teammate's mailbox over IMAP into the
 * admin so they can read + reply without opening Zoho's webmail. Every inbound
 * message becomes an `emails` row scoped to that mailbox (a real inbox). When the
 * sender is a known lead or client it is ALSO written to that lead's `messages`
 * conversation (deduped by Message-ID) and nudges a still-cold prospect to
 * "contacted", exactly as before.
 *
 * Mailboxes come from lib/mailboxes (MAILBOXES env, or the legacy single
 * ZOHO_IMAP_USER/PASSWORD). Degrades gracefully (ok:false) when nothing is wired.
 */
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSupabase } from '@/lib/supabase';
import { listMailboxes, type Mailbox } from '@/lib/mailboxes';

export type SyncResult = {
  ok: boolean;
  mailbox?: string;
  fetched: number;
  inserted: number;   // new mailbox emails stored
  matched: number;    // emails from a known lead/client
  threaded: number;   // lead `messages` rows written
  error?: string;
};

function normalizeSubject(s: string): string {
  return (s || '').replace(/^\s*(re|fwd?):\s*/i, '').trim().toLowerCase().slice(0, 200);
}

/** Sync one mailbox's INBOX into the admin. */
export async function syncMailbox(box: Mailbox, opts: { sinceDays?: number } = {}): Promise<SyncResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, mailbox: box.address, fetched: 0, inserted: 0, matched: 0, threaded: 0, error: 'Database not configured' };
  if (!box.pass) return { ok: false, mailbox: box.address, fetched: 0, inserted: 0, matched: 0, threaded: 0, error: 'Mailbox not configured' };

  // Known lead + client addresses, so we can thread mail from them onto the CRM.
  const { data: prospects } = await sb.from('rep_prospects').select('id,email,status').not('email', 'is', null);
  const byEmail = new Map<string, { id: string; status: string }>();
  for (const p of prospects || []) byEmail.set(String(p.email).toLowerCase(), { id: p.id, status: p.status });
  const { data: clientRows } = await sb.from('clients').select('email').not('email', 'is', null);
  const clientEmails = new Set<string>();
  for (const c of clientRows || []) clientEmails.add(String(c.email).toLowerCase());

  // Outbound Cockpit leads thread via messages.outbound_lead_id.
  const { data: outboundRows } = await sb.from('outbound_leads').select('id,email,status').not('email', 'is', null);
  const byOutboundEmail = new Map<string, { id: string; status: string }>();
  for (const l of outboundRows || []) byOutboundEmail.set(String(l.email).toLowerCase(), { id: l.id, status: l.status });

  const since = new Date(Date.now() - (opts.sinceDays ?? 14) * 86_400_000);
  const client = new ImapFlow({ host: box.imapHost, port: box.imapPort, secure: true, auth: { user: box.user, pass: box.pass }, logger: false });
  let fetched = 0, inserted = 0, matched = 0, threaded = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch({ since }, { envelope: true, source: true })) {
        fetched++;
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
        const fromName = msg.envelope?.from?.[0]?.name || '';
        const messageId = msg.envelope?.messageId || `zoho:${box.address}:${msg.uid}`;
        const toAddrs = (msg.envelope?.to || []).map((t) => t.address).filter(Boolean).join(', ');
        const ccAddrs = (msg.envelope?.cc || []).map((t) => t.address).filter(Boolean).join(', ');

        let text = '', html = '', hasAttachments = false;
        try {
          const parsed = await simpleParser(msg.source as Buffer);
          text = (parsed.text || '').toString();
          html = (parsed.html ? String(parsed.html) : '').toString();
          if (!text && html) text = html.replace(/<[^>]+>/g, ' ');
          hasAttachments = Array.isArray(parsed.attachments) && parsed.attachments.length > 0;
        } catch { /* fall back to empty body */ }
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
        const occurred = (msg.envelope?.date ? new Date(msg.envelope.date) : new Date()).toISOString();

        const match = from ? byEmail.get(from) : undefined;
        const outboundMatch = !match && from ? byOutboundEmail.get(from) : undefined;
        const isClient = !match && !outboundMatch && !!from && clientEmails.has(from);

        // 1) Store in the mailbox (a real inbox). Deduped by (mailbox, message_id).
        const { error: mailErr, data: mailIns } = await sb.from('emails').upsert({
          mailbox: box.address,
          folder: 'inbox',
          direction: 'inbound',
          message_id: messageId,
          in_reply_to: msg.envelope?.inReplyTo || null,
          thread_key: normalizeSubject(msg.envelope?.subject || ''),
          from_addr: from || null,
          from_name: fromName || null,
          to_addrs: toAddrs || box.address,
          cc_addrs: ccAddrs || null,
          subject: msg.envelope?.subject || '(no subject)',
          snippet,
          body_text: text.slice(0, 40_000),
          body_html: html.slice(0, 200_000) || null,
          has_attachments: hasAttachments,
          is_read: false,
          prospect_id: match ? match.id : null,
          occurred_at: occurred,
        }, { onConflict: 'mailbox,message_id', ignoreDuplicates: true }).select('id');
        if (!mailErr && mailIns && mailIns.length) inserted++;

        // 2) Thread known-lead/client mail onto their conversation, as before.
        if (from && (match || outboundMatch || isClient)) {
          matched++;
          const { error } = await sb.from('messages').insert({
            prospect_id: match ? match.id : null,
            outbound_lead_id: outboundMatch ? outboundMatch.id : null,
            direction: 'inbound',
            channel: 'email',
            from_addr: from,
            to_addr: box.address,
            subject: msg.envelope?.subject || '(no subject)',
            snippet,
            body: text.slice(0, 20_000),
            external_id: messageId,
            read: false,
            occurred_at: occurred,
          });
          if (!error) {
            threaded++;
            if (match && match.status === 'to-contact') {
              await sb.from('rep_prospects').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', match.id);
            }
            if (outboundMatch && outboundMatch.status === 'new') {
              await sb.from('outbound_leads').update({ status: 'contacted' }).eq('id', outboundMatch.id);
            }
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, mailbox: box.address, fetched, inserted, matched, threaded };
  } catch (e) {
    try { await client.logout(); } catch { /* already closed */ }
    return { ok: false, mailbox: box.address, fetched, inserted, matched, threaded, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Sync every configured mailbox. */
export async function syncAllMailboxes(opts: { sinceDays?: number } = {}): Promise<{ ok: boolean; mailboxes: SyncResult[] }> {
  const boxes = listMailboxes();
  if (!boxes.length) return { ok: false, mailboxes: [] };
  const results: SyncResult[] = [];
  for (const box of boxes) results.push(await syncMailbox(box, opts));
  return { ok: results.some((r) => r.ok), mailboxes: results };
}

/**
 * Back-compat wrapper (kept so the existing cron keeps working): now syncs every
 * configured mailbox and returns an aggregate in the original SyncResult shape.
 */
export async function syncZohoInbox(opts: { sinceDays?: number } = {}): Promise<SyncResult> {
  const { ok, mailboxes } = await syncAllMailboxes(opts);
  const agg = mailboxes.reduce(
    (a, r) => ({ fetched: a.fetched + r.fetched, inserted: a.inserted + r.inserted, matched: a.matched + r.matched, threaded: a.threaded + r.threaded }),
    { fetched: 0, inserted: 0, matched: 0, threaded: 0 }
  );
  return { ok, ...agg, error: ok ? undefined : (mailboxes.find((r) => r.error)?.error || 'No mailboxes configured') };
}
