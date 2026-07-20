/**
 * Truthful delivery bookkeeping for outbound email.
 *
 * Two jobs:
 *  1. The Sent-folder proof: `recordSentEmail` writes every outbound send into
 *     the same `emails` store the admin Sent folder reads, tagged with provider
 *     + delivery status, so there is ONE place that proves what left.
 *  2. The suppression mirror: Resend accepts (and silently drops) sends to
 *     addresses on its suppression list, and exposes no API to read or clear
 *     that list. We mirror it locally from bounce/complaint webhooks and a
 *     reconcile poll, so callers can refuse to "send" to a blocked address and
 *     report the truth instead of logging a phantom success.
 */
import { getSupabase } from '@/lib/supabase';

/** Delivery events that mean the message did NOT reach the inbox. */
export const DROP_EVENTS = new Set(['bounced', 'complained', 'suppressed', 'failed']);

export function normEmail(a: string): string {
  return (a || '').trim().toLowerCase();
}

/**
 * Map of address -> suppression reason for the still-active entries.
 *
 * UNIONS THE TWO SUPPRESSION LISTS (fixed 2026-07-20). They were disconnected,
 * and the gap meant every unsubscribe click was ignored by every send path:
 *
 *  - `email_suppressions`: written ONLY by the Resend bounce/complaint webhook
 *    (lib/email-log.ts addSuppression). Has `resolved` so a cleared address can
 *    resume. This was the only list any send path enforced.
 *  - `suppression`: written by all three UNSUBSCRIBE routes (/api/outreach/
 *    unsubscribe, /api/harvest/unsubscribe, admin manual opt-out). It was read
 *    by exactly one function, lib/outreach.ts isSuppressed, which is called only
 *    from the admin add-prospect form. So a person could click Unsubscribe, be
 *    told "You will not be contacted again", and keep receiving mail from the
 *    drips and every transactional path.
 *
 * An opt-out is PERMANENT and has no `resolved` column by design: a human said
 * stop. Only a bounce/complaint is clearable, and only via the Resend dashboard.
 *
 * `suppression.contact` also stores social handles, so non-email rows simply
 * never match an address in `list` and are ignored.
 */
export async function activeSuppressions(
  addrs: string[],
): Promise<Map<string, { reason: string | null; detail: string | null }>> {
  const out = new Map<string, { reason: string | null; detail: string | null }>();
  const sb = getSupabase();
  const list = [...new Set(addrs.map(normEmail).filter(Boolean))];
  if (!sb || !list.length) return out;

  const [bounced, optedOut] = await Promise.all([
    sb.from('email_suppressions').select('email,reason,detail').in('email', list).eq('resolved', false),
    sb.from('suppression').select('contact,reason').in('contact', list),
  ]);

  for (const r of bounced.data ?? []) out.set(r.email, { reason: r.reason, detail: r.detail });

  // Opt-outs win: a human asking to be left alone outranks a clearable bounce.
  for (const r of optedOut.data ?? []) {
    out.set(normEmail(r.contact as string), {
      reason: (r.reason as string | null) ?? 'unsubscribed',
      detail: 'This address opted out. Opt-outs are permanent and cannot be cleared from the Resend dashboard.',
    });
  }

  // A read failure must NEVER read as "nobody is suppressed". Throwing makes
  // callers fail closed: sendViaResend catches this and refuses the send rather
  // than risking mail to someone who asked to be left alone.
  if (bounced.error || optedOut.error) {
    const why = bounced.error?.message ?? optedOut.error?.message ?? 'unknown';
    throw new SuppressionReadError(why);
  }

  return out;
}

/** Thrown when the suppression lists cannot be read. Callers must fail closed. */
export class SuppressionReadError extends Error {
  constructor(detail: string) {
    super(`Suppression list unreadable (${detail}). Refusing to send: an unreadable list cannot be treated as empty.`);
    this.name = 'SuppressionReadError';
  }
}

/** Add / refresh a suppression entry (from a bounce, complaint, or reconcile). */
export async function addSuppression(
  email: string,
  reason: string,
  detail?: string | null,
  resendId?: string | null,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const e = normEmail(email);
  if (!e) return;
  await sb
    .from('email_suppressions')
    .upsert(
      {
        email: e,
        reason,
        detail: detail ?? null,
        provider: 'resend',
        resend_email_id: resendId ?? null,
        resolved: false, // a fresh bounce/complaint re-blocks even a previously cleared address
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )
    .then(() => {}, () => {});
}

type SentRow = {
  mailbox: string;
  provider: 'resend' | 'zoho' | 'script';
  providerMessageId?: string | null;
  from_addr: string;
  from_name?: string | null;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  text?: string | null;
  html?: string | null;
  status: string; // 'sent' = provider accepted; 'delivered' only when confirmed
  statusDetail?: string | null;
  prospectId?: string | null;
  leadId?: string | null;
};

/** Record an outbound send into the Sent store + (if lead-linked) the thread. */
export async function recordSentEmail(row: SentRow): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const snippet = (row.text || row.subject || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const now = new Date().toISOString();
  await sb
    .from('emails')
    .insert({
      mailbox: normEmail(row.mailbox),
      folder: 'sent',
      direction: 'outbound',
      provider: row.provider,
      provider_message_id: row.providerMessageId ?? null,
      status: row.status,
      status_detail: row.statusDetail ?? null,
      message_id: row.providerMessageId ?? null,
      thread_key: (row.subject || '').replace(/^\s*(re|fwd?):\s*/i, '').trim().toLowerCase().slice(0, 200),
      from_addr: normEmail(row.from_addr),
      from_name: row.from_name ?? null,
      to_addrs: row.to,
      cc_addrs: row.cc ?? null,
      subject: row.subject || '(no subject)',
      snippet,
      body_text: (row.text || '').slice(0, 40_000) || null,
      body_html: row.html ? row.html.slice(0, 200_000) : null,
      is_read: true,
      prospect_id: row.prospectId ?? null,
      lead_id: row.leadId ?? null,
      occurred_at: now,
    })
    .then(() => {}, () => {});

  if (row.prospectId || row.leadId) {
    await sb
      .from('messages')
      .insert({
        prospect_id: row.prospectId ?? null,
        lead_id: row.leadId ?? null,
        direction: 'outbound',
        channel: 'email',
        status: row.status,
        from_addr: normEmail(row.from_addr),
        to_addr: row.to,
        subject: row.subject || '(no subject)',
        snippet,
        body: (row.text || '').slice(0, 20_000) || null,
        read: true,
        occurred_at: now,
      })
      .then(() => {}, () => {});
  }
}

/**
 * Flip a logged send's status from a webhook/reconcile event, matched by the
 * Resend email id. 'delivered' stamps delivered_at; 'opened' stamps opened_at
 * without downgrading a later status.
 */
export async function markDeliveryByProviderId(
  providerId: string,
  status: string,
  detail?: string | null,
): Promise<void> {
  const sb = getSupabase();
  if (!sb || !providerId) return;
  const now = new Date().toISOString();

  // 'opened' is orthogonal — stamp the time without touching status.
  if (status === 'opened') {
    await sb
      .from('emails')
      .update({ opened_at: now })
      .eq('provider_message_id', providerId)
      .is('opened_at', null)
      .then(() => {}, () => {});
    return;
  }

  const patch: Record<string, unknown> = { status, status_detail: detail ?? null };
  if (status === 'delivered') patch.delivered_at = now;

  // Never regress. Svix delivers events out of order and retries, so a late
  // 'sent'/'delivered' must not overwrite a real 'bounced'/'complained', and a
  // late 'delivery_delayed'/'sent' must not downgrade a 'delivered'. A terminal
  // drop is authoritative and always wins.
  let q = sb.from('emails').update(patch).eq('provider_message_id', providerId);
  if (!DROP_EVENTS.has(status)) {
    q = q.not('status', 'in', `(${[...DROP_EVENTS].join(',')})`);
    if (status !== 'delivered') q = q.neq('status', 'delivered');
  }
  await q.then(() => {}, () => {});
}
