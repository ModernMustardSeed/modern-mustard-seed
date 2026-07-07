/**
 * Zoho inbox sync. Reads Sarah's mailbox over IMAP and pulls in any reply from a
 * known lead, so correspondence shows up in the admin (and stays in Zoho too).
 * Each inbound email from a prospect's address becomes a `messages` row on that
 * prospect's thread, deduped by Message-ID. A reply also nudges a still-cold
 * prospect to "contacted" so the board reflects the engagement.
 *
 * Configured by ZOHO_IMAP_USER / ZOHO_IMAP_PASSWORD / ZOHO_IMAP_HOST. Degrades
 * gracefully (returns ok:false) if unset, so nothing breaks when it is not wired.
 */
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSupabase } from '@/lib/supabase';

export type SyncResult = { ok: boolean; fetched: number; inserted: number; matched: number; error?: string };

export async function syncZohoInbox(opts: { sinceDays?: number } = {}): Promise<SyncResult> {
  const user = process.env.ZOHO_IMAP_USER;
  const pass = process.env.ZOHO_IMAP_PASSWORD;
  const host = process.env.ZOHO_IMAP_HOST || 'imap.zoho.com';
  if (!user || !pass) return { ok: false, fetched: 0, inserted: 0, matched: 0, error: 'Zoho IMAP not configured' };
  const sb = getSupabase();
  if (!sb) return { ok: false, fetched: 0, inserted: 0, matched: 0, error: 'Database not configured' };

  // Map known lead emails to their prospect so we only ingest mail from leads.
  const { data: prospects } = await sb.from('rep_prospects').select('id,email,status').not('email', 'is', null);
  const byEmail = new Map<string, { id: string; status: string }>();
  for (const p of prospects || []) byEmail.set(String(p.email).toLowerCase(), { id: p.id, status: p.status });

  // Also ingest mail from known clients. These are keyed by address (no
  // prospect id), so a client's profile thread can pick them up by from/to.
  const { data: clientRows } = await sb.from('clients').select('email').not('email', 'is', null);
  const clientEmails = new Set<string>();
  for (const c of clientRows || []) clientEmails.add(String(c.email).toLowerCase());

  const since = new Date(Date.now() - (opts.sinceDays ?? 14) * 86_400_000);
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
  let fetched = 0, inserted = 0, matched = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch({ since }, { envelope: true, source: true })) {
        fetched++;
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
        if (!from) continue;
        const match = byEmail.get(from);
        const isClient = !match && clientEmails.has(from);
        if (!match && !isClient) continue; // only mail from a known lead or client
        matched++;
        const messageId = msg.envelope?.messageId || `zoho:${msg.uid}`;
        let text = '';
        try {
          const parsed = await simpleParser(msg.source as Buffer);
          text = (parsed.text || (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ') : '') || '').toString();
        } catch {
          /* fall back to empty body */
        }
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
        const { error } = await sb.from('messages').insert({
          prospect_id: match ? match.id : null,
          direction: 'inbound',
          channel: 'email',
          from_addr: from,
          to_addr: user,
          subject: msg.envelope?.subject || '(no subject)',
          snippet,
          body: text.slice(0, 20_000),
          external_id: messageId,
          read: false,
          occurred_at: (msg.envelope?.date ? new Date(msg.envelope.date) : new Date()).toISOString(),
        });
        if (!error) {
          inserted++;
          if (match && match.status === 'to-contact') {
            await sb.from('rep_prospects').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', match.id);
          }
        }
        // A unique index on external_id means duplicates error out harmlessly.
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, fetched, inserted, matched };
  } catch (e) {
    try { await client.logout(); } catch { /* already closed */ }
    return { ok: false, fetched, inserted, matched, error: e instanceof Error ? e.message : String(e) };
  }
}
