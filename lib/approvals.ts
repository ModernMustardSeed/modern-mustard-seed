import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { clientEmail, p as emailP } from '@/lib/email';
import { SITE } from '@/lib/seo';

/**
 * The approvals queue. Producers (follow-up operator, outreach, case studies,
 * expansion offers) create editable drafts here. Sarah edits + approves, which
 * runs executeApproval(). Nothing outward-facing happens without that approval.
 */

export type ApprovalRow = {
  id: string;
  type: string;
  title: string;
  to_email: string | null;
  to_name: string | null;
  subject: string | null;
  body: string;
  context: Record<string, unknown>;
  status: string;
  dedupe_key: string | null;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function textToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((para) => emailP(esc(para).replace(/\n/g, '<br>')))
    .join('');
}

/** Create a draft, unless an equivalent one was made recently (dedupe). */
export async function createApproval(a: {
  type: string;
  title: string;
  toEmail?: string | null;
  toName?: string | null;
  subject?: string | null;
  body: string;
  context?: Record<string, unknown>;
  source?: string;
  dedupeKey?: string;
  dedupeWindowDays?: number;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  if (a.dedupeKey) {
    const since = new Date(Date.now() - (a.dedupeWindowDays ?? 7) * 86400000).toISOString();
    const { data: existing } = await supabase
      .from('approvals')
      .select('id')
      .eq('dedupe_key', a.dedupeKey)
      .gte('created_at', since)
      .limit(1);
    if (existing && existing.length) return false;
  }
  const { error } = await supabase.from('approvals').insert({
    type: a.type,
    title: a.title,
    to_email: a.toEmail ?? null,
    to_name: a.toName ?? null,
    subject: a.subject ?? null,
    body: a.body,
    context: a.context ?? {},
    source: a.source ?? null,
    dedupe_key: a.dedupeKey ?? null,
  });
  return !error;
}

/** Execute an approved draft. Returns an error string or null on success. */
export async function executeApproval(row: ApprovalRow): Promise<string | null> {
  // Email-type approvals: send the edited message to the recipient.
  if (['followup', 'outreach', 'expansion', 'email'].includes(row.type)) {
    if (!row.to_email) return 'No recipient email.';
    if (!process.env.RESEND_API_KEY) return 'Email is not configured.';
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: row.to_email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: row.subject || 'A note from Modern Mustard Seed',
        html: clientEmail({
          preheader: row.subject || 'A note from Modern Mustard Seed',
          greeting: row.to_name ? `Hi ${row.to_name.split(' ')[0]},` : undefined,
          body: textToHtml(row.body),
        }),
      });
    } catch (err) {
      console.error('approval send failed', err);
      return 'Could not send.';
    }
    // Touch the linked proposal so the follow-up radar clears it.
    const supabase = getSupabase();
    const proposalId = row.context?.proposalId as string | undefined;
    if (supabase && proposalId) {
      try {
        await supabase.from('proposals').update({ updated_at: new Date().toISOString() }).eq('id', proposalId);
      } catch {
        /* ignore */
      }
    }
    // Move a nurtured lead out of "new" so it is not re-drafted.
    const leadId = row.context?.leadId as string | undefined;
    if (supabase && leadId) {
      try {
        await supabase.from('leads').update({ status: 'replied' }).eq('id', leadId).eq('status', 'new');
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  // Build delivery: post the finished build to the client and close the build out.
  if (row.type === 'build_delivery') {
    const supabase = getSupabase();
    if (!supabase) return 'Database not configured.';
    const ctx = row.context as { buildId?: string; liveUrl?: string; repoUrl?: string; notes?: string; deliverableType?: string };
    const live = (ctx.liveUrl || '').trim();
    if (ctx.buildId) {
      await supabase
        .from('build_requests')
        .update({ status: 'delivered', delivered_at: new Date().toISOString(), result: { live_url: live || null, repo_url: ctx.repoUrl || null, notes: ctx.notes || null }, updated_at: new Date().toISOString() })
        .eq('id', ctx.buildId);
    }
    if (live && row.to_email) {
      try {
        const url = /^https?:\/\//i.test(live) ? live : `https://${live}`;
        await supabase.from('client_files').insert({
          client_email: row.to_email,
          label: row.title || 'Delivered build',
          url,
          kind: ctx.deliverableType === 'brand_bible' ? 'doc' : 'site',
        });
      } catch (err) {
        console.error('build delivery -> client_files failed', err);
      }
    }
    // Send the (editable) delivery note to the client.
    if (row.to_email && process.env.RESEND_API_KEY && row.body.trim()) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: row.to_email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: row.subject || 'Your build is ready',
          html: clientEmail({ preheader: 'Your build is ready', greeting: row.to_name ? `Hi ${row.to_name.split(' ')[0]},` : undefined, body: textToHtml(row.body), cta: live ? { label: 'View it live', url: /^https?:\/\//i.test(live) ? live : `https://${live}` } : undefined }),
        });
      } catch (err) {
        console.error('build delivery email failed', err);
      }
    }
    return null;
  }

  return `No executor for type "${row.type}".`;
}

/** The nurture operator: draft a warm first-touch for new top-of-funnel leads. */
export async function scanNurture(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  let created = 0;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, type, status, name, email, business_name, audit_score, source, created_at')
      .eq('status', 'new')
      .neq('source', 'mustard-seed-booking')
      .gte('created_at', since)
      .limit(100);
    for (const l of leads ?? []) {
      const email = l.email as string;
      if (!email) continue;
      const first = ((l.name as string) || '').split(' ')[0] || 'there';
      const biz = (l.business_name as string) || '';
      let subject = 'Following up';
      let body = '';
      if (l.type === 'audit') {
        subject = 'Your website audit, and the fix I would start with';
        body = `Hi ${first},\n\nThanks for running the audit on your site. I looked at the results${l.audit_score != null ? ` (you scored ${l.audit_score}/100)` : ''}, and there is one fix that would move the needle fastest. I am glad to walk you through it, or just take it off your plate.\n\nWant a quick plan? Reply here, or grab a time: ${SITE.url}/book`;
      } else if (l.type === 'build-queue') {
        subject = 'Your build idea';
        body = `Hi ${first},\n\nThank you for sharing your idea${biz ? ` for ${biz}` : ''}. I read every submission personally, and I already have a sense of how I would approach it and what it would take to ship.\n\nCan we grab 20 minutes so I can walk you through the plan? ${SITE.url}/book`;
      } else {
        subject = 'Following up';
        body = `Hi ${first},\n\nThank you for reaching out. I wanted to follow up personally and see how I can help${biz ? ` ${biz}` : ''}. If it is useful, here is my calendar: ${SITE.url}/book\n\nOr just reply and tell me what you are working on.`;
      }
      const ok = await createApproval({
        type: 'outreach',
        title: `Nurture: ${(l.name as string) || email} (${l.type})`,
        toEmail: email,
        toName: (l.name as string) || null,
        subject,
        body,
        context: { leadId: l.id },
        source: 'nurture-operator',
        dedupeKey: `nurture:${l.id}`,
        dedupeWindowDays: 30,
      });
      if (ok) created += 1;
    }
  } catch (err) {
    console.error('scanNurture error', err);
  }
  return created;
}

/** The follow-up operator: draft nudges for stale proposals (unsigned, or signed-no-deposit). */
export async function scanFollowups(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  let created = 0;
  try {
    const { data: props } = await supabase
      .from('proposals')
      .select('id, client_name, client_company, client_email, share_token, status, signed_at, deposit_status, updated_at')
      .in('status', ['sent', 'accepted']);
    const nowMs = Date.now();
    for (const p of props ?? []) {
      const email = (p.client_email as string) || '';
      if (!email) continue;
      const who = (p.client_name as string) || (p.client_company as string) || 'there';
      const first = who.split(' ')[0];
      const days = Math.floor((nowMs - new Date(p.updated_at as string).getTime()) / 86400000);

      // Sent, not signed, 3+ days.
      if ((p.status === 'sent' || p.status === 'accepted') && !p.signed_at && days >= 3) {
        const link = p.share_token ? `${SITE.url}/proposal/${p.share_token}` : `${SITE.url}/work`;
        const ok = await createApproval({
          type: 'followup',
          title: `Nudge: ${who} has not signed (sent ${days}d ago)`,
          toEmail: email,
          toName: (p.client_name as string) || null,
          subject: 'Following up on your proposal',
          body: `Hi ${first},\n\nJust circling back on the proposal I sent over. No pressure at all, I wanted to make sure it reached you and answer anything that would help you decide.\n\nWhenever you are ready, you can review and sign it here: ${link}\n\nHappy to hop on a quick call if that is easier. Just reply to this email.`,
          context: { proposalId: p.id },
          source: 'followup-operator',
          dedupeKey: `followup:unsigned:${p.id}`,
        });
        if (ok) created += 1;
      }

      // Signed, deposit not paid, 2+ days.
      if (p.signed_at && p.deposit_status !== 'paid' && days >= 2) {
        const ok = await createApproval({
          type: 'followup',
          title: `Nudge: ${who} signed, no deposit (${days}d)`,
          toEmail: email,
          toName: (p.client_name as string) || null,
          subject: 'Ready to start whenever you are',
          body: `Hi ${first},\n\nThank you for signing. The last step to lock in your spot and start the build is the deposit. You can pay it from your portal: ${SITE.url}/portal\n\nIf anything is holding it up or you have a question, just reply and I will sort it out.`,
          context: { proposalId: p.id },
          source: 'followup-operator',
          dedupeKey: `followup:deposit:${p.id}`,
        });
        if (ok) created += 1;
      }
    }
  } catch (err) {
    console.error('scanFollowups error', err);
  }
  return created;
}
