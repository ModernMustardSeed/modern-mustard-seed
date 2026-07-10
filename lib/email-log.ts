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

/** Map of address -> suppression reason for the still-active (unresolved) entries. */
export async function activeSuppressions(
  addrs: string[],
): Promise<Map<string, { reason: string | null; detail: string | null }>> {
  const out = new Map<string, { reason: string | null; detail: string | null }>();
  const sb = getSupabase();
  const list = [...new Set(addrs.map(normEmail).filter(Boolean))];
  if (!sb || !list.length) return out;
  const { data } = await sb
    .from('email_suppressions')
    .select('email,reason,detail')
    .in('email', list)
    .eq('resolved', false);
  for (const r of data ?? []) out.set(r.email, { reason: r.reason, detail: r.detail });
  return out;
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
  const patch: Record<string, unknown> = { status, status_detail: detail ?? null };
  const now = new Date().toISOString();
  if (status === 'delivered') patch.delivered_at = now;
  if (status === 'opened') {
    // Don't overwrite a real terminal status with 'opened'; just stamp the time.
    delete patch.status;
    delete patch.status_detail;
    patch.opened_at = now;
  }
  await sb.from('emails').update(patch).eq('provider_message_id', providerId).then(() => {}, () => {});
}
