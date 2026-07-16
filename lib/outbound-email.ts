import type { SupabaseClient } from '@supabase/supabase-js';
import { auditReportEmail, clientEmail, demoFilmCard, escape } from '@/lib/email';
import { sendViaResend } from '@/lib/send-email';
import { ensureDemoHub } from '@/lib/outbound-demo';
import type { OutboundLead } from '@/lib/outbound';

export const OUTBOUND_FROM = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
export const OUTBOUND_REPLY_TO = 'sarah@modernmustardseed.com';

export type OutboundEmailOpts = {
  note?: string;
  includeDemo?: boolean;
  includeSite?: boolean;
  includeOs?: boolean;
  source?: string;
};

export type BuiltOutboundEmail = {
  /** The lead as it stands after any hub minting the build required. */
  lead: OutboundLead;
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  /** Exactly the bytes Resend will be handed, pixel and all. */
  html: string;
  /** One line naming what this send is; reused as the thread snippet. */
  summary: string;
};

type BuildResult = { ok: true; email: BuiltOutboundEmail } | { ok: false; status: number; error: string };

/**
 * Compose the outbound email WITHOUT sending it.
 *
 * Split out from the send so the cockpit can show Sarah the real thing before it
 * leaves: /preview-email renders this exact html (minus the tracking pixel) and
 * sendOutboundEmail hands this exact html to Resend. One builder, so a preview
 * can never drift from what actually ships.
 *
 * The only write it performs is minting the demo hub, which is idempotent and is
 * required for the hub link in the body to be real.
 */
export async function buildOutboundEmail(
  supabase: SupabaseClient,
  leadInput: OutboundLead,
  opts: OutboundEmailOpts = {},
): Promise<BuildResult> {
  let lead = leadInput;

  // Demo sends lead with the SUITE HUB: one adorable link that fronts
  // everything, so mint it if it is missing.
  if (opts.includeDemo || opts.includeSite || opts.includeOs) {
    lead = await ensureDemoHub(supabase, lead);
  }
  if (!lead.email) return { ok: false, status: 400, error: 'No email on file. Run "Find site & email" first.' };

  let domain = lead.website || '';
  try {
    if (domain) domain = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }

  const first = lead.contact_name?.trim().split(/\s+/)[0];
  // Only offer what actually exists and is live; a queued site never ships.
  const withDemo = Boolean(opts.includeDemo && lead.demo_url);
  const withSite = Boolean(opts.includeSite && lead.site_demo_status === 'ready' && lead.site_demo_url);
  const withOs = Boolean(opts.includeOs && lead.os_demo_status === 'ready' && lead.os_demo_url);
  const includeAny = withDemo || withSite || withOs;

  // The suite block: one card per demo (email-safe table rows) under a short
  // human intro, with the hub as the single golden door above them.
  const hub = lead.hub_demo_url;
  const demoRow = (icon: string, title: string, desc: string, url: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0"><tr>
      <td style="border:2px solid #161616;border-radius:14px;padding:14px 16px;background:#ffffff">
        <p style="margin:0;font-size:15px;color:#161616"><strong>${icon} ${escape(title)}</strong></p>
        <p style="margin:4px 0 8px;font-size:13px;color:#5a564f;line-height:1.55">${desc}</p>
        <a href="${escape(url)}" style="font-size:13px;font-weight:bold;color:#8a6a1f">Open it &rarr;</a>
      </td>
    </tr></table>`;

  const rows = [
    withDemo &&
      demoRow('🎙', 'Your AI receptionist', `It answers as ${escape(lead.business_name)}, right now, in your browser. Pretend you are a customer and try to stump it.`, lead.demo_url!),
    withSite &&
      demoRow('🌐', 'Your new website', `A real working draft designed for your business${withDemo ? ', with the receptionist living on it (gold button, bottom corner)' : ''}.`, lead.site_demo_url!),
    withOs &&
      demoRow('⚙️', 'Your command center', 'Your day, customers, reviews, ads, and automations, with an AI assistant that already knows the board. Nothing to install.', lead.os_demo_url!),
  ]
    .filter(Boolean)
    .join('');

  const n = [withDemo, withSite, withOs].filter(Boolean).length;
  // Same film the hub picks for this forged set (see app/demo/hub/[hubId]).
  const film = withSite && withOs ? 'demo-welcome' : withSite ? 'demo-welcome-site' : withOs ? 'demo-welcome-os' : 'demo-welcome-voice';
  const suiteBlock = includeAny
    ? `<p>${
        n > 1
          ? `We went ahead and built ${escape(lead.business_name)} <strong>${n === 3 ? 'three' : 'two'} working demos</strong>. Not mockups, the real thing, already answering to your name:`
          : 'We went ahead and built you something. Not a mockup, the real thing, already answering to your name:'
      }</p>` +
      (hub
        ? demoFilmCard({
            film,
            href: hub,
            caption: `Thirty seconds from Mr. Mustard on what we built ${lead.business_name}.`,
          })
        : '') +
      rows +
      (hub
        ? `<p style="margin-top:16px">The easiest way in is the suite page: everything in one place, plus the video above and a calculator that shows what missed calls have been costing you.</p>`
        : '')
    : '';

  const hasAudit = Boolean(lead.audit_json);
  const subject = withSite && withOs
    ? `I built ${lead.business_name} a website AND the software to run it`
    : withSite
      ? `I built ${lead.business_name} a new website${withDemo ? ' (and it answers the phone)' : ''}`
      : withOs
        ? `I built ${lead.business_name} the software that runs the whole shop`
        : withDemo
          ? `Your AI receptionist is ready to meet you, ${lead.business_name}`
          : hasAudit
            ? `A quick audit of ${domain || lead.business_name}`
            : 'Following up from Modern Mustard Seed';

  const html = lead.audit_json && !includeAny
    ? auditReportEmail({
        toName: lead.contact_name ?? undefined,
        url: lead.audit_url || lead.website || '',
        report: lead.audit_json,
        note: opts.note,
        trackId: lead.id,
        reportUrl: `https://modernmustardseed.com/audit/${lead.id}`,
      })
    : clientEmail({
        greeting: first ? `Hi ${first},` : 'Hi there,',
        body:
          suiteBlock +
          `<p>${
            opts.note
              ? escape(opts.note)
              : includeAny
                ? `Why build it for free? Because showing beats telling. I help local businesses like ${escape(lead.business_name)} stop losing the calls they miss, and the demos make the case better than I can. If you want it on your real line, the button inside sets it up in a week. No trial to sign up for, no card to test it: you already have the real thing in front of you.`
                : `I help local businesses like ${escape(lead.business_name)} stop losing the calls they miss. I build an AI receptionist that answers every call in two rings, books the job, and texts you the details. I would rather show you than pitch you, so tell me the word and I will build you a working one to try.`
          }</p>` +
          (hasAudit && lead.audit_score != null && !includeAny
            ? `<p>I also ran your website through a quick audit. It came back at ${lead.audit_score}/100. Happy to walk you through the breakdown on a 10-minute call.</p>`
            : ''),
        cta: includeAny && hub
          ? { label: 'Open your Demo Suite', url: hub }
          : { label: 'Book a 10-minute demo', url: 'https://modernmustardseed.com/book' },
        secondary: includeAny && hub
          ? { label: 'Book 10 minutes with Sarah', url: 'https://modernmustardseed.com/book' }
          : withSite && lead.site_demo_url
            ? { label: 'See your new website', url: lead.site_demo_url }
            : withOs && lead.os_demo_url
              ? { label: 'Open your command center', url: lead.os_demo_url }
              : withDemo && lead.demo_url
                ? { label: 'Talk to your receptionist', url: lead.demo_url }
                : { label: 'Run the free Website Audit', url: 'https://modernmustardseed.com/website-audit' },
        trackId: lead.id,
      });

  const summary = includeAny
    ? `Sent forged demos: ${[withSite && 'website', withOs && 'business OS', withDemo && 'receptionist'].filter(Boolean).join(' + ')}.`
    : hasAudit
      ? `Sent the website audit (${lead.audit_score ?? '?'}/100).`
      : `Sent an intro email${opts.source ? ` (${opts.source})` : ''}.`;

  return {
    ok: true,
    email: { lead, to: lead.email, from: OUTBOUND_FROM, replyTo: OUTBOUND_REPLY_TO, subject, html, summary },
  };
}

export type SendOutboundResult =
  | { ok: true; lead: OutboundLead; to: string; subject: string; messageId: string }
  | { ok: false; status: number; error: string };

/**
 * The one way an outbound lead gets emailed: the branded audit report when an
 * audit exists, a warm intro otherwise, optionally leading with their forged
 * demo links (the voice receptionist, the demo website, or both). Sends from
 * Sarah's address (replies flow back through the Zoho sync onto the thread),
 * embeds the open-tracking pixel, logs the message row WITH the Resend message
 * id so delivery is provable, and stamps last_email_at. Used by the follow-up
 * route and the cadence cron.
 */
export async function sendOutboundEmail(
  supabase: SupabaseClient,
  leadInput: OutboundLead,
  opts: OutboundEmailOpts = {},
): Promise<SendOutboundResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 500, error: 'Email is not configured (RESEND_API_KEY missing).' };

  const built = await buildOutboundEmail(supabase, leadInput, opts);
  if (!built.ok) return built;
  const { lead, to, from, replyTo, subject, html, summary } = built.email;

  // One tracked path: refuses suppressed recipients (honest failure instead of a
  // phantom success), records the send into the Sent folder as status='sent',
  // and lets the Resend webhook confirm delivery. `lead.email` is a primary
  // recipient, so a suppressed address returns ok:false here and the lead is NOT
  // marked contacted below.
  const sent = await sendViaResend({
    from,
    to,
    replyTo,
    subject,
    html,
    mailbox: OUTBOUND_REPLY_TO,
  });
  if (!sent.ok) return { ok: false, status: 500, error: sent.error };

  // external_id carries the Resend message id onto the thread. That is the join
  // key the cockpit uses to prove the send: the Sent viewer pulls the stored html
  // and the live last_event from Resend by this id, and the delivery webhook
  // upgrades 'sent' to 'delivered'/'bounced' against the same id in `emails`.
  await supabase.from('messages').insert({
    outbound_lead_id: lead.id,
    direction: 'outbound',
    channel: 'email',
    status: 'sent',
    external_id: sent.id,
    from_addr: OUTBOUND_REPLY_TO,
    to_addr: to,
    subject,
    snippet: summary,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  const update: Record<string, unknown> = { last_email_at: new Date().toISOString() };
  if (lead.status === 'new') update.status = 'contacted';
  const { data: updated } = await supabase.from('outbound_leads').update(update).eq('id', lead.id).select().single();

  return { ok: true, lead: (updated ?? lead) as OutboundLead, to, subject, messageId: sent.id };
}
