/**
 * The ONE way anything goes out through Resend.
 *
 * Why this exists: `resend.emails.send()` returns 200 + an id even when the
 * recipient is on Resend's suppression list — the mail is accepted and then
 * silently dropped. Calling it directly and treating "no error" as "sent" is how
 * the app claimed success while nothing was delivered. This wrapper:
 *   - refuses to send to a suppressed primary recipient and returns an HONEST
 *     failure with the reason (no phantom success);
 *   - strips a suppressed BCC (a suppressed self-bcc otherwise causes Resend to
 *     drop the WHOLE message — the exact bug that killed the Newk's outreach);
 *   - records every accepted send into the Sent store as status='sent'
 *     (provider accepted). Only the Resend webhook/reconcile flips it to
 *     'delivered' once the recipient server actually takes it.
 *
 * Callers get a truthful result: ok:true means the provider accepted it and it
 * is in the Sent folder; ok:false always carries a reason.
 */
import { Resend } from 'resend';
import { activeSuppressions, normEmail, recordSentEmail } from '@/lib/email-log';

export type TrackedSend = {
  from: string; // "Display Name <addr@domain>" or "addr@domain"
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** Which Sent folder this belongs to. Defaults to the from address. */
  mailbox?: string;
  prospectId?: string | null;
  leadId?: string | null;
};

export type TrackedResult =
  | { ok: true; id: string; droppedBcc?: string[] }
  | { ok: false; error: string; suppressed?: string[] };

const arr = (v?: string | string[]): string[] =>
  (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.trim()).filter(Boolean);

/** Parse the bare address out of "Name <addr>" or "addr". */
function bareAddr(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return normEmail(m ? m[1] : from);
}

function cleanKey(k?: string): string {
  return (k || '').replace(/[\r\n]/g, '').trim();
}

export async function sendViaResend(msg: TrackedSend): Promise<TrackedResult> {
  const apiKey = cleanKey(process.env.RESEND_API_KEY);
  if (!apiKey) return { ok: false, error: 'Email is not configured (RESEND_API_KEY missing).' };

  const to = arr(msg.to);
  const cc = arr(msg.cc);
  const bcc = arr(msg.bcc);
  if (!to.length) return { ok: false, error: 'No recipient.' };

  // Suppression gate. A suppressed primary recipient (to/cc) is a hard stop —
  // Resend would drop it anyway; we say so instead of pretending it sent. A
  // suppressed bcc is merely stripped so the real recipients still get the mail.
  const supp = await activeSuppressions([...to, ...cc, ...bcc]);
  const blockedPrimary = [...to, ...cc].map(normEmail).filter((a) => supp.has(a));
  if (blockedPrimary.length) {
    const why = blockedPrimary
      .map((a) => `${a} (${supp.get(a)?.reason || 'suppressed'})`)
      .join(', ');
    return {
      ok: false,
      suppressed: blockedPrimary,
      error:
        `Not sent: ${why} is on the Resend suppression list from a past hard bounce or spam complaint, ` +
        `so Resend will drop it. Clear it in the Resend dashboard (Emails → the suppressed message → ` +
        `"Remove from suppression list"), then mark it resolved here to resume sending.`,
    };
  }
  const keptBcc = bcc.filter((a) => !supp.has(normEmail(a)));
  const droppedBcc = bcc.filter((a) => supp.has(normEmail(a)));

  if (!msg.html && !msg.text) return { ok: false, error: 'No email body (html or text).' };

  const common = {
    from: msg.from,
    to,
    cc: cc.length ? cc : undefined,
    bcc: keptBcc.length ? keptBcc : undefined,
    replyTo: msg.replyTo,
    subject: msg.subject,
  };
  // Resend's CreateEmailOptions is a union that needs a definite html OR text;
  // build the variant explicitly so the type resolves.
  const payload = msg.html
    ? { ...common, html: msg.html, text: msg.text }
    : { ...common, text: msg.text as string };

  let id: string;
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(payload);
    if (error || !data?.id) return { ok: false, error: error?.message || 'Resend returned no id.' };
    id = data.id;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed.' };
  }

  // Proof-of-send: accepted by the provider. Webhook/reconcile upgrades to
  // 'delivered' (or flags bounced/complained) later.
  await recordSentEmail({
    mailbox: msg.mailbox || bareAddr(msg.from),
    provider: 'resend',
    providerMessageId: id,
    from_addr: bareAddr(msg.from),
    from_name: msg.from.replace(/<[^>]+>/, '').trim() || null,
    to: to.join(', '),
    cc: cc.join(', ') || null,
    bcc: keptBcc.join(', ') || null,
    subject: msg.subject,
    text: msg.text ?? null,
    html: msg.html ?? null,
    status: 'sent',
    prospectId: msg.prospectId ?? null,
    leadId: msg.leadId ?? null,
  });

  return droppedBcc.length ? { ok: true, id, droppedBcc } : { ok: true, id };
}
