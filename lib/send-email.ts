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
import { sendViaZoho, zohoConfigured } from '@/lib/zoho-send';

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

/**
 * A drop-in replacement for `new Resend(process.env.RESEND_API_KEY)`.
 *
 * Returns a client whose `.emails.send(...)` is instrumented: it runs the same
 * suppression gate and records every send to the Sent store, then returns
 * Resend's normal `{ data, error }` shape — so existing call sites keep working
 * unchanged, but a suppressed recipient comes back as an ERROR (not a phantom
 * success) and a status='suppressed' row is written for proof. Every other
 * method (emails.get, batch, etc.) passes straight through.
 *
 * Use this instead of `new Resend(...)` everywhere a transactional/outreach
 * email is sent, so the whole app shares one honest, logged send path.
 */
export function resendClient(): Resend {
  const real = new Resend(cleanKey(process.env.RESEND_API_KEY));

  const instrumentedSend = async (
    payload: Parameters<typeof real.emails.send>[0],
    options?: Parameters<typeof real.emails.send>[1],
  ): ReturnType<typeof real.emails.send> => {
    const p = payload as {
      from: string;
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject?: string;
      html?: string;
      text?: string;
      replyTo?: string;
    };
    const to = arr(p.to);
    const cc = arr(p.cc);
    const bcc = arr(p.bcc);
    const from = p.from || '';
    const mailbox = bareAddr(from);
    const fromName = from.replace(/<[^>]+>/, '').trim() || null;

    // Internal notifications (to a @modernmustardseed.com mailbox) go through
    // Zoho so they land reliably and are never caught by Resend's suppression
    // list. External recipients keep going via Resend below. A purely-external
    // send never touches Zoho — that path is byte-for-byte unchanged.
    const INTERNAL = '@modernmustardseed.com';
    const internalTo = to.filter((a) => normEmail(a).endsWith(INTERNAL));
    const externalTo = to.filter((a) => !normEmail(a).endsWith(INTERNAL));
    const useZoho = internalTo.length > 0 && zohoConfigured();

    if (useZoho) {
      const z = await sendViaZoho({
        to: internalTo,
        subject: p.subject || '(no subject)',
        html: p.html,
        text: p.text,
        fromName: fromName || undefined,
        replyTo: p.replyTo,
      });
      await recordSentEmail({
        mailbox: z.from || mailbox,
        provider: 'zoho',
        providerMessageId: z.messageId || null,
        from_addr: z.from || mailbox,
        from_name: z.fromName || fromName,
        to: internalTo.join(', '),
        subject: p.subject || '(no subject)',
        text: p.text ?? null,
        html: p.html ?? null,
        status: z.ok ? 'sent' : 'failed',
        statusDetail: z.ok ? null : z.error || 'zoho send failed',
      });
      if (externalTo.length === 0) {
        return (z.ok
          ? { data: { id: z.messageId || 'zoho' }, error: null }
          : { data: null, error: { name: 'application_error', message: z.error || 'internal send failed' } }
        ) as Awaited<ReturnType<typeof real.emails.send>>;
      }
    }

    // Resend handles only the external recipients (or all recipients when Zoho
    // is not in play).
    const resendTo = useZoho ? externalTo : to;

    const supp = await activeSuppressions([...resendTo, ...cc, ...bcc]);
    const blocked = [...resendTo, ...cc].map(normEmail).filter((a) => supp.has(a));
    if (blocked.length) {
      const why = blocked.map((a) => `${a} (${supp.get(a)?.reason || 'suppressed'})`).join(', ');
      // Proof row: we did NOT send, and we say why.
      await recordSentEmail({
        mailbox,
        provider: 'resend',
        from_addr: mailbox,
        from_name: fromName,
        to: resendTo.join(', '),
        cc: cc.join(', ') || null,
        subject: p.subject || '(no subject)',
        text: p.text ?? null,
        html: p.html ?? null,
        status: 'suppressed',
        statusDetail: `blocked before send: ${why}`,
      });
      return {
        data: null,
        error: { name: 'validation_error', message: `Recipient suppressed: ${why}` },
      } as Awaited<ReturnType<typeof real.emails.send>>;
    }

    // Strip a suppressed bcc so it can't drop the whole message.
    const keptBcc = bcc.filter((a) => !supp.has(normEmail(a)));
    const outPayload = { ...p, to: resendTo, bcc: keptBcc };

    const res = await real.emails.send(
      outPayload as Parameters<typeof real.emails.send>[0],
      options,
    );
    if (res.data?.id && !res.error) {
      await recordSentEmail({
        mailbox,
        provider: 'resend',
        providerMessageId: res.data.id,
        from_addr: mailbox,
        from_name: fromName,
        to: resendTo.join(', '),
        cc: cc.join(', ') || null,
        bcc: keptBcc.join(', ') || null,
        subject: p.subject || '(no subject)',
        text: p.text ?? null,
        html: p.html ?? null,
        status: 'sent',
      });
    }
    return res;
  };

  return new Proxy(real, {
    get(target, prop, recv) {
      if (prop === 'emails') {
        const emails = target.emails;
        return new Proxy(emails, {
          get(et, ep, er) {
            if (ep === 'send') return instrumentedSend;
            const v = Reflect.get(et, ep, er);
            return typeof v === 'function' ? v.bind(et) : v;
          },
        });
      }
      const v = Reflect.get(target, prop, recv);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}
