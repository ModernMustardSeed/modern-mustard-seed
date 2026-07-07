/**
 * Outbound mail over each teammate's own Zoho SMTP. When Sarah or Polly send from
 * the admin it goes out as their real address (sarah@ / polly.thompson@), lands
 * in their Zoho Sent, and replies come straight back to them. A copy is recorded
 * to the `emails` mailbox store (folder='sent') and, when the recipient is a
 * known lead, to that lead's `messages` conversation.
 *
 * Degrades cleanly: if the mailbox has no credentials, send() returns ok:false
 * with a friendly reason and nothing throws.
 */
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import type { Mailbox } from '@/lib/mailboxes';
import { getSupabase } from '@/lib/supabase';

export type SendResult = { ok: boolean; messageId?: string; error?: string };

function normalizeSubject(s: string): string {
  return (s || '').replace(/^\s*(re|fwd?):\s*/i, '').trim().toLowerCase().slice(0, 200);
}

/** Plain text to a safe HTML body (escape, preserve line breaks + links). */
function textToHtml(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = esc.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#161616;white-space:pre-wrap">${linked}</div>`;
}

/**
 * Send an email from a specific mailbox. `inReplyTo`/`references` thread a reply.
 * `prospectId`/`leadId` link it to a lead so it shows on that conversation.
 */
export async function sendMailAs(
  box: Mailbox,
  opts: {
    to: string;
    subject: string;
    text: string;
    cc?: string;
    inReplyTo?: string;
    references?: string;
    prospectId?: string | null;
    leadId?: string | null;
  }
): Promise<SendResult> {
  if (!box.pass) return { ok: false, error: 'Mailbox not configured' };
  const to = (opts.to || '').trim();
  if (!to) return { ok: false, error: 'No recipient' };

  const transport = nodemailer.createTransport({
    host: box.smtpHost,
    port: box.smtpPort,
    secure: box.smtpPort === 465,
    auth: { user: box.user, pass: box.pass },
  });

  const html = textToHtml(opts.text);
  let messageId: string | undefined;
  try {
    const info = await transport.sendMail({
      from: { name: box.name, address: box.address },
      to,
      cc: opts.cc || undefined,
      subject: opts.subject || '(no subject)',
      text: opts.text,
      html,
      inReplyTo: opts.inReplyTo || undefined,
      references: opts.references || opts.inReplyTo || undefined,
    });
    messageId = info.messageId;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Record to the mailbox Sent folder (best-effort DB write).
  const sb = getSupabase();
  if (sb) {
    const snippet = opts.text.replace(/\s+/g, ' ').trim().slice(0, 500);
    await sb.from('emails').insert({
      mailbox: box.address,
      folder: 'sent',
      direction: 'outbound',
      message_id: messageId || null,
      in_reply_to: opts.inReplyTo || null,
      thread_key: normalizeSubject(opts.subject),
      from_addr: box.address,
      from_name: box.name,
      to_addrs: to,
      cc_addrs: opts.cc || null,
      subject: opts.subject || '(no subject)',
      snippet,
      body_text: opts.text.slice(0, 40_000),
      is_read: true,
      prospect_id: opts.prospectId || null,
      lead_id: opts.leadId || null,
      occurred_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    // Mirror onto the lead's conversation so the tracker/thread shows the send.
    if (opts.prospectId || opts.leadId) {
      await sb.from('messages').insert({
        prospect_id: opts.prospectId || null,
        lead_id: opts.leadId || null,
        direction: 'outbound',
        channel: 'email',
        from_addr: box.address,
        to_addr: to,
        subject: opts.subject || '(no subject)',
        snippet,
        body: opts.text.slice(0, 20_000),
        read: true,
        occurred_at: new Date().toISOString(),
      }).then(() => {}, () => {});
    }
  }

  // Best-effort append to the real Zoho Sent folder so it also shows in Zoho.
  appendToSent(box, { to, subject: opts.subject, text: opts.text, html, messageId }).catch(() => {});

  return { ok: true, messageId };
}

/** Append a copy to the mailbox's IMAP Sent folder so Zoho reflects it too. */
async function appendToSent(
  box: Mailbox,
  m: { to: string; subject: string; text: string; html: string; messageId?: string }
): Promise<void> {
  const raw =
    `From: ${box.name} <${box.address}>\r\n` +
    `To: ${m.to}\r\n` +
    `Subject: ${m.subject || '(no subject)'}\r\n` +
    (m.messageId ? `Message-ID: ${m.messageId}\r\n` : '') +
    `Date: ${new Date().toUTCString()}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n\r\n` +
    m.html;
  const client = new ImapFlow({
    host: box.imapHost, port: box.imapPort, secure: true,
    auth: { user: box.user, pass: box.pass }, logger: false,
  });
  try {
    await client.connect();
    // Zoho's sent mailbox is usually "Sent". Try common names, ignore failures.
    for (const folder of ['Sent', 'Sent Mail', 'INBOX.Sent']) {
      try { await client.append(folder, raw, ['\\Seen']); break; } catch { /* try next */ }
    }
  } finally {
    try { await client.logout(); } catch { /* already closed */ }
  }
}
