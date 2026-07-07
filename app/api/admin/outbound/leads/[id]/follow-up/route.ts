import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { auditReportEmail, clientEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Email the lead. With an audit on file it sends the full branded audit report
 * (the strongest follow-up we have); otherwise a warm intro. Both carry the
 * open-tracking pixel keyed to this lead, log onto the conversation thread, and
 * stamp last_email_at. Sent from Sarah's address so replies flow back through
 * the Zoho sync into the thread.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: 'No email on file. Run "Find site & email" first.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 500 });

  let note: string | undefined;
  try {
    const body = (await req.json()) as { note?: string };
    if (typeof body.note === 'string' && body.note.trim()) note = body.note.trim().slice(0, 2000);
  } catch {
    /* empty body is fine */
  }

  let domain = lead.website || '';
  try {
    if (domain) domain = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }

  const hasAudit = Boolean(lead.audit_json);
  const subject = hasAudit ? `A quick audit of ${domain || lead.business_name}` : 'Following up from Modern Mustard Seed';
  const html = hasAudit
    ? auditReportEmail({
        toName: lead.contact_name ?? undefined,
        url: lead.audit_url || lead.website || '',
        report: lead.audit_json,
        note,
        trackId: lead.id,
      })
    : clientEmail({
        greeting: lead.contact_name ? `Hi ${lead.contact_name.split(/\s+/)[0]},` : 'Hi there,',
        body: `<p>${note ? note : `I help local businesses like ${lead.business_name} stop losing the calls they miss. I build an AI receptionist that answers every call in two rings, books the job, and texts you the details. The first 30 days are free, so you see exactly what it catches before you pay a dollar.`}</p>`,
        cta: { label: 'Book a 10-minute demo', url: 'https://modernmustardseed.com/book' },
        secondary: { label: 'Run the free Website Audit', url: 'https://modernmustardseed.com/website-audit' },
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
    if (sendErr) return NextResponse.json({ error: sendErr.message }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 500 });
  }

  await guard.supabase.from('messages').insert({
    outbound_lead_id: id,
    direction: 'outbound',
    channel: 'email',
    from_addr: 'sarah@modernmustardseed.com',
    to_addr: lead.email,
    subject,
    snippet: hasAudit ? `Sent the website audit (${lead.audit_score ?? '?'}/100).` : 'Sent an intro email.',
    read: true,
    occurred_at: new Date().toISOString(),
  });

  const stamp = new Date().toISOString();
  const update: Record<string, unknown> = { last_email_at: stamp };
  if (lead.status === 'new') update.status = 'contacted';
  const { data: updated } = await guard.supabase.from('outbound_leads').update(update).eq('id', id).select().single();

  return NextResponse.json({ ok: true, lead: updated ?? lead });
}
