/**
 * Send through Sarah's real Zoho mailbox over SMTP. Used by the honest send path
 * to deliver INTERNAL notifications (anything addressed to a
 * @modernmustardseed.com mailbox) so they land reliably and can never be caught
 * by Resend's suppression list. Zoho auto-saves to its own Sent folder.
 */
import nodemailer from 'nodemailer';

type ZohoCreds = { user: string; address: string; name: string; pass: string };

/** Resolve sarah@'s SMTP creds: MAILBOXES (login|mailbox|Name|pass, ;;-sep) then legacy ZOHO_IMAP_*. */
function resolveCreds(): ZohoCreds | null {
  const raw = process.env.MAILBOXES || '';
  for (const entry of raw.split(';;')) {
    const [login, mailbox, name, pass] = entry.split('|').map((s) => (s || '').trim());
    if (mailbox && mailbox.toLowerCase() === 'sarah@modernmustardseed.com' && pass) {
      return { user: login || mailbox, address: mailbox, name: name || 'Sarah Scarano', pass };
    }
  }
  const u = process.env.ZOHO_IMAP_USER;
  const p = process.env.ZOHO_IMAP_PASSWORD;
  if (u && p) return { user: u, address: u, name: 'Modern Mustard Seed', pass: p };
  return null;
}

export function zohoConfigured(): boolean {
  return !!resolveCreds();
}

/**
 * Send via Zoho SMTP. `from` is forced to the authenticated mailbox (Zoho
 * rejects a mismatched From), preserving the requested display name.
 */
export async function sendViaZoho(msg: {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string; from: string; fromName: string }> {
  const c = resolveCreds();
  if (!c) return { ok: false, error: 'Zoho not configured', from: '', fromName: '' };
  const fromName = msg.fromName || c.name;
  const transport = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: { user: c.user, pass: c.pass },
  });
  try {
    const info = await transport.sendMail({
      from: { name: fromName, address: c.address },
      to: msg.to.join(', '),
      replyTo: msg.replyTo,
      subject: msg.subject || '(no subject)',
      html: msg.html,
      text: msg.text,
    });
    const accepted = (info.accepted || []).length > 0 && (info.rejected || []).length === 0;
    return {
      ok: accepted,
      messageId: info.messageId,
      error: accepted ? undefined : `rejected: ${JSON.stringify(info.rejected)}`,
      from: c.address,
      fromName,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Zoho send failed', from: c.address, fromName };
  }
}
