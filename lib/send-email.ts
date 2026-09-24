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
import { stripTrackingPixels } from '@/lib/email';
import { ROOT_DOMAIN, isRootDomainAddress } from '@/lib/outreach-domain';

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
  /**
   * One-click unsubscribe URL. Set this on ANY bulk or drip mail. It emits
   * List-Unsubscribe + List-Unsubscribe-Post (RFC 8058), which Gmail and Yahoo
   * require from bulk senders and which materially protects inbox placement.
   * Added 2026-07-20; before that no send path in the repo emitted the header.
   * Leave it unset for one-to-one transactional mail (receipts, replies).
   */
  unsubscribeUrl?: string;
};

/** RFC 8058 one-click unsubscribe headers, or nothing for transactional mail. */
export function unsubHeaders(url?: string): Record<string, string> | undefined {
  if (!url) return undefined;
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export type TrackedResult =
  | { ok: true; id: string; droppedBcc?: string[] }
  | { ok: false; error: string; suppressed?: string[] };

/**
 * Staff notification mute (Sarah's call, 2026-07-21). Easton is part-time and
 * was getting every team-wide notification (the daily pipeline digest and
 * whatever the next feature adds). Policy: a muted address receives NOTHING
 * except sign-in links, the emails that carry a magic-link token URL. Enforced
 * here, in the one choke point all outbound mail passes through, so any future
 * team-wide send skips a muted teammate without its author having to know the
 * policy exists. A fully muted send is recorded as status='suppressed' with the
 * reason, never silently vanished.
 */
const MUTED_NOTIFICATION_ADDRS = new Set(['easton12parrot@gmail.com']);
const LOGIN_LINK_RE = /\/(admin\/magic|(?:api\/)?portal\/verify)\?token=/;

export function applyMute(addrs: string[], body: string): { kept: string[]; muted: string[] } {
  if (!addrs.length || LOGIN_LINK_RE.test(body)) return { kept: addrs, muted: [] };
  const muted = addrs.filter((a) => MUTED_NOTIFICATION_ADDRS.has(normEmail(a)));
  if (!muted.length) return { kept: addrs, muted: [] };
  return { kept: addrs.filter((a) => !MUTED_NOTIFICATION_ADDRS.has(normEmail(a))), muted };
}

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

/**
 * REPLY ROUTING. We send as addresses we cannot receive at.
 *
 * Confirmed by live probe on 2026-08-22: mail to hello@, notifications@ and
 * outbound@modernmustardseed.com hard-bounces with `550 5.1.1 User does not
 * exist`. The Zoho org has two mailboxes, sarah@ and polly.thompson@, and
 * nothing else. Roughly forty send sites use "Modern Mustard Seed <hello@...>"
 * as their From (store receipts, demo orders, intake nudges, press proofs, the
 * hatchery, the portal coach) and only a handful set a Reply-To, so a customer
 * who hit reply got a bounce and we never learned they had answered. The
 * outreach subdomain has no mailbox at all, so the same rule covers it.
 *
 * The gate: any From on our domain, or a subdomain of it, that is not a real
 * mailbox gets a Reply-To that is. REPLY_TO_FALLBACK changes where those land;
 * add to RECEIVING_MAILBOXES the moment a new mailbox or alias exists.
 * Addresses on any other domain (a client's, a Factory tenant's) are left
 * exactly as the caller wrote them.
 *
 * First written as PR #63 (never merged); carried here with the subdomain case.
 */
const RECEIVING_MAILBOXES = new Set(
  (process.env.RECEIVING_MAILBOXES || `sarah@${ROOT_DOMAIN},polly.thompson@${ROOT_DOMAIN}`)
    .split(',')
    .map((s) => normEmail(s))
    .filter(Boolean),
);

function replyFallback(): string {
  return normEmail(process.env.REPLY_TO_FALLBACK || `sarah@${ROOT_DOMAIN}`);
}

/** True for an address on our domain (or a subdomain of it) that no mailbox answers. */
function unroutable(addr: string): boolean {
  const a = normEmail(addr);
  const domain = a.split('@')[1] || '';
  const ours = domain === ROOT_DOMAIN || domain.endsWith(`.${ROOT_DOMAIN}`);
  // A plus tag still lands in the base mailbox, so sarah+forge@ is routable.
  const base = a.replace(/\+[^@]*@/, '@');
  return ours && !RECEIVING_MAILBOXES.has(base);
}

/**
 * The Reply-To this message should actually carry. Keeps whatever the caller
 * set unless that address is itself a dead one on our domain.
 */
export function routableReplyTo(from: string, replyTo?: string | string[]): string | string[] | undefined {
  // Resend takes one address or a list, and fifteen callers pass a list. Reading
  // a list as one string threw inside the send, so every client lead, booking
  // and review ask with a list failed from 2026-09-18 until this line.
  if (Array.isArray(replyTo)) {
    const list = replyTo.filter((r): r is string => typeof r === 'string' && r.trim() !== '');
    if (list.length) {
      const kept = list.filter((r) => !unroutable(bareAddr(r)));
      return kept.length ? kept : replyFallback();
    }
    return unroutable(bareAddr(from)) ? replyFallback() : undefined;
  }
  if (replyTo) return unroutable(bareAddr(replyTo)) ? replyFallback() : replyTo;
  return unroutable(bareAddr(from)) ? replyFallback() : undefined;
}

/**
 * THE ROOT DOMAIN CARRIES ONE-TO-ONE MAIL ONLY (2026-09-18).
 *
 * modernmustardseed.com is Sarah's own address. Its reputation is what decides
 * whether her replies, proposals and receipts reach an inbox, and it already
 * paid once for cold volume (spam placement on 2026-09-08, cold email stopped
 * 2026-09-10). Two rules hold that line at the one choke point every send
 * passes, so no future call site has to remember them:
 *
 *  1. No open pixel on root-domain mail. A 1x1 remote image on a personal
 *     reply is a bulk-mail fingerprint, and the opens it records are mostly
 *     security scanners anyway (see lib/acq/bots.ts). Pixels stay legal on the
 *     outreach subdomain, where the drips live.
 *  2. Nothing carrying List-Unsubscribe leaves from the root domain. An
 *     unsubscribe header means bulk, and bulk sends from
 *     outreach.modernmustardseed.com (lib/outreach-domain.ts). A send that
 *     breaks this is refused with the reason, not quietly sent.
 */
export function oneToOneHtml(from: string, html?: string): string | undefined {
  if (!html || !isRootDomainAddress(bareAddr(from))) return html;
  return stripTrackingPixels(html);
}

export function bulkOnRootRefusal(from: string, hasUnsubscribe: boolean): string | null {
  if (!hasUnsubscribe || !isRootDomainAddress(bareAddr(from))) return null;
  return (
    `Refusing to send bulk mail from ${bareAddr(from)}: anything with an unsubscribe link sends from ` +
    `outreach.${ROOT_DOMAIN}, never the root domain (lib/send-email.ts).`
  );
}

export async function sendViaResend(msg: TrackedSend): Promise<TrackedResult> {
  const apiKey = cleanKey(process.env.RESEND_API_KEY);
  if (!apiKey) return { ok: false, error: 'Email is not configured (RESEND_API_KEY missing).' };

  let to = arr(msg.to);
  let cc = arr(msg.cc);
  let bcc = arr(msg.bcc);
  if (!to.length) return { ok: false, error: 'No recipient.' };

  // Staff mute: strip muted teammates from every recipient line unless this is
  // a sign-in-link email. If nobody is left, record the drop and stop here.
  const muteBody = `${msg.html || ''} ${msg.text || ''}`;
  const toMute = applyMute(to, muteBody);
  const allMuted = [...toMute.muted, ...applyMute(cc, muteBody).muted, ...applyMute(bcc, muteBody).muted];
  if (allMuted.length) {
    to = toMute.kept;
    cc = applyMute(cc, muteBody).kept;
    bcc = applyMute(bcc, muteBody).kept;
    if (!to.length) {
      await recordSentEmail({
        mailbox: msg.mailbox || bareAddr(msg.from),
        provider: 'resend',
        from_addr: bareAddr(msg.from),
        to: allMuted.join(', '),
        subject: msg.subject,
        text: msg.text ?? null,
        html: msg.html ?? null,
        status: 'suppressed',
        statusDetail: 'muted: staff notifications are off for this address (sign-in links only)',
        prospectId: msg.prospectId ?? null,
        leadId: msg.leadId ?? null,
      });
      return { ok: true, id: 'muted' };
    }
  }

  // Suppression gate. A suppressed primary recipient (to/cc) is a hard stop —
  // Resend would drop it anyway; we say so instead of pretending it sent. A
  // suppressed bcc is merely stripped so the real recipients still get the mail.
  // An unreadable suppression list fails CLOSED (see SuppressionReadError):
  // treating it as empty is how you mail someone who unsubscribed.
  let supp: Awaited<ReturnType<typeof activeSuppressions>>;
  try {
    supp = await activeSuppressions([...to, ...cc, ...bcc]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Suppression list unreadable. Refusing to send.' };
  }
  const blockedPrimary = [...to, ...cc].map(normEmail).filter((a) => supp.has(a));
  if (blockedPrimary.length) {
    const why = blockedPrimary
      .map((a) => `${a} (${supp.get(a)?.reason || 'suppressed'})`)
      .join(', ');
    return {
      ok: false,
      suppressed: blockedPrimary,
      error:
        `Not sent: ${why}. Either the address opted out (permanent, honor it) or Resend suppressed it after a ` +
        `hard bounce or spam complaint. A bounce can be cleared in the Resend dashboard (Emails → the suppressed ` +
        `message → "Remove from suppression list") then marked resolved here. An opt-out is never cleared.`,
    };
  }
  const keptBcc = bcc.filter((a) => !supp.has(normEmail(a)));
  const droppedBcc = bcc.filter((a) => supp.has(normEmail(a)));

  if (!msg.html && !msg.text) return { ok: false, error: 'No email body (html or text).' };

  const bulkRefusal = bulkOnRootRefusal(msg.from, Boolean(msg.unsubscribeUrl));
  if (bulkRefusal) return { ok: false, error: bulkRefusal };
  const html = oneToOneHtml(msg.from, msg.html);

  const common = {
    from: msg.from,
    to,
    cc: cc.length ? cc : undefined,
    bcc: keptBcc.length ? keptBcc : undefined,
    replyTo: routableReplyTo(msg.from, msg.replyTo),
    subject: msg.subject,
    headers: unsubHeaders(msg.unsubscribeUrl),
  };
  // Resend's CreateEmailOptions is a union that needs a definite html OR text;
  // build the variant explicitly so the type resolves. With html and no text,
  // Resend generates the plain-text part itself, so every send is multipart.
  const payload = html
    ? { ...common, html, text: msg.text }
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
    html: html ?? null,
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
      replyTo?: string | string[];
      headers?: Record<string, string>;
    };
    let to = arr(p.to);
    let cc = arr(p.cc);
    let bcc = arr(p.bcc);
    const from = p.from || '';
    const mailbox = bareAddr(from);
    const fromName = from.replace(/<[^>]+>/, '').trim() || null;

    // Staff mute, same policy as sendViaResend: muted teammates only ever get
    // sign-in links. A fully muted send is recorded and short-circuited.
    const muteBody = `${p.html || ''} ${p.text || ''}`;
    const toMute = applyMute(to, muteBody);
    if (toMute.muted.length || applyMute(cc, muteBody).muted.length || applyMute(bcc, muteBody).muted.length) {
      const mutedAll = [...toMute.muted, ...applyMute(cc, muteBody).muted, ...applyMute(bcc, muteBody).muted];
      to = toMute.kept;
      cc = applyMute(cc, muteBody).kept;
      bcc = applyMute(bcc, muteBody).kept;
      if (!to.length) {
        await recordSentEmail({
          mailbox,
          provider: 'resend',
          from_addr: mailbox,
          from_name: fromName,
          to: mutedAll.join(', '),
          subject: p.subject || '(no subject)',
          text: p.text ?? null,
          html: p.html ?? null,
          status: 'suppressed',
          statusDetail: 'muted: staff notifications are off for this address (sign-in links only)',
        });
        return { data: { id: 'muted' }, error: null } as Awaited<ReturnType<typeof real.emails.send>>;
      }
    }

    // Root domain is one-to-one only: no bulk, no pixel, a reply path that works.
    const hasUnsub = Object.keys(p.headers ?? {}).some((h) => h.toLowerCase() === 'list-unsubscribe');
    const bulkRefusal = bulkOnRootRefusal(from, hasUnsub);
    if (bulkRefusal) {
      return {
        data: null,
        error: { name: 'validation_error', message: bulkRefusal },
      } as Awaited<ReturnType<typeof real.emails.send>>;
    }
    const html = oneToOneHtml(from, p.html);
    const replyTo = routableReplyTo(from, p.replyTo);

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
        html,
        text: p.text,
        fromName: fromName || undefined,
        replyTo: Array.isArray(replyTo) ? replyTo.join(', ') : replyTo,
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
        html: html ?? null,
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

    // Fail closed on an unreadable list, same rule as sendViaResend.
    let supp: Awaited<ReturnType<typeof activeSuppressions>>;
    try {
      supp = await activeSuppressions([...resendTo, ...cc, ...bcc]);
    } catch (err) {
      const why = err instanceof Error ? err.message : 'Suppression list unreadable.';
      return {
        data: null,
        error: { name: 'application_error', message: why },
      } as Awaited<ReturnType<typeof real.emails.send>>;
    }
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
        html: html ?? null,
        status: 'suppressed',
        statusDetail: `blocked before send: ${why}`,
      });
      return {
        data: null,
        error: { name: 'validation_error', message: `Recipient suppressed: ${why}` },
      } as Awaited<ReturnType<typeof real.emails.send>>;
    }

    // Strip a suppressed bcc so it can't drop the whole message. cc/bcc are
    // set explicitly so the mute-filtered lists win over the originals in p.
    const keptBcc = bcc.filter((a) => !supp.has(normEmail(a)));
    const outPayload = {
      ...p,
      to: resendTo,
      cc: cc.length ? cc : undefined,
      bcc: keptBcc.length ? keptBcc : undefined,
      replyTo,
      ...(html !== undefined ? { html } : {}),
    };

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
        html: html ?? null,
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
