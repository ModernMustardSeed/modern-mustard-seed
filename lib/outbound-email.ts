import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { auditReportEmail, clientEmail, escape } from '@/lib/email';
import type { OutboundLead } from '@/lib/outbound';

/**
 * The one way an outbound lead gets emailed: the branded audit report when an
 * audit exists, a warm intro otherwise, optionally leading with their forged
 * demo link. Sends from Sarah's address (replies flow back through the Zoho
 * sync onto the thread), embeds the open-tracking pixel, logs the message row,
 * and stamps last_email_at. Used by the follow-up route and the cadence cron.
 */
export async function sendOutboundEmail(
  supabase: SupabaseClient,
  lead: OutboundLead,
  opts: { note?: string; includeDemo?: boolean; source?: string } = {},
): Promise<{ ok: true; lead: OutboundLead } | { ok: false; status: number; error: string }> {
  if (!lead.email) return { ok: false, status: 400, error: 'No email on file. Run "Find site & email" first.' };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 500, error: 'Email is not configured (RESEND_API_KEY missing).' };

  let domain = lead.website || '';
  try {
    if (domain) domain = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }

  const first = lead.contact_name?.trim().split(/\s+/)[0];
  const demoBlock =
    opts.includeDemo && lead.demo_url
      ? `<p><strong>I already built your receptionist.</strong> It answers as ${escape(lead.business_name)}, right now. Talk to it here, it takes 60 seconds: <a href="${escape(lead.demo_url)}">${escape(lead.demo_url)}</a></p>`
      : '';

  const hasAudit = Boolean(lead.audit_json);
  const subject = opts.includeDemo && lead.demo_url
    ? `Your AI receptionist is ready to meet you, ${lead.business_name}`
    : hasAudit
      ? `A quick audit of ${domain || lead.business_name}`
      : 'Following up from Modern Mustard Seed';

  const html = lead.audit_json && !opts.includeDemo
    ? auditReportEmail({
        toName: lead.contact_name ?? undefined,
        url: lead.audit_url || lead.website || '',
        report: lead.audit_json,
        note: opts.note,
        trackId: lead.id,
      })
    : clientEmail({
        greeting: first ? `Hi ${first},` : 'Hi there,',
        body:
          demoBlock +
          `<p>${
            opts.note
              ? escape(opts.note)
              : `I help local businesses like ${escape(lead.business_name)} stop losing the calls they miss. I build an AI receptionist that answers every call in two rings, books the job, and texts you the details. The first 30 days are free, so you see exactly what it catches before you pay a dollar.`
          }</p>` +
          (hasAudit && lead.audit_score != null
            ? `<p>I also ran your website through a quick audit. It came back at ${lead.audit_score}/100. Happy to walk you through the breakdown on a 10-minute call.</p>`
            : ''),
        cta: { label: 'Book a 10-minute demo', url: 'https://modernmustardseed.com/book' },
        secondary: opts.includeDemo && lead.demo_url
          ? { label: 'Talk to your receptionist', url: lead.demo_url }
          : { label: 'Run the free Website Audit', url: 'https://modernmustardseed.com/website-audit' },
        trackId: lead.id,
      });

  try {
    const resend = new Resend(apiKey);
    const { error: sendErr } = await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: lead.email,
      replyTo: 'sarah@modernmustardseed.com',
      subject,
      html,
    });
    if (sendErr) return { ok: false, status: 500, error: sendErr.message };
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : 'Send failed' };
  }

  await supabase.from('messages').insert({
    outbound_lead_id: lead.id,
    direction: 'outbound',
    channel: 'email',
    from_addr: 'sarah@modernmustardseed.com',
    to_addr: lead.email,
    subject,
    snippet: opts.includeDemo && lead.demo_url
      ? 'Sent their forged demo link.'
      : hasAudit
        ? `Sent the website audit (${lead.audit_score ?? '?'}/100).`
        : `Sent an intro email${opts.source ? ` (${opts.source})` : ''}.`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  const update: Record<string, unknown> = { last_email_at: new Date().toISOString() };
  if (lead.status === 'new') update.status = 'contacted';
  const { data: updated } = await supabase.from('outbound_leads').update(update).eq('id', lead.id).select().single();

  return { ok: true, lead: (updated ?? lead) as OutboundLead };
}
