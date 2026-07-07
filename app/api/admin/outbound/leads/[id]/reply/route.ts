import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { clientEmail, escape } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/** Reply to the lead from inside the cockpit thread. */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: 'No email on file for this lead.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 500 });

  let subject = `Re: Modern Mustard Seed and ${lead.business_name}`;
  let body = '';
  try {
    const parsed = (await req.json()) as { subject?: string; body?: string };
    if (typeof parsed.subject === 'string' && parsed.subject.trim()) subject = parsed.subject.trim().slice(0, 300);
    if (typeof parsed.body === 'string') body = parsed.body.trim().slice(0, 10000);
  } catch {
    /* fallthrough */
  }
  if (!body) return NextResponse.json({ error: 'Write the reply first.' }, { status: 400 });

  const html = clientEmail({
    body: body
      .split(/\n{2,}/)
      .map((par) => `<p>${escape(par).replace(/\n/g, '<br>')}</p>`)
      .join(''),
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

  const { data: message } = await guard.supabase
    .from('messages')
    .insert({
      outbound_lead_id: id,
      direction: 'outbound',
      channel: 'email',
      from_addr: 'sarah@modernmustardseed.com',
      to_addr: lead.email,
      subject,
      snippet: body.replace(/\s+/g, ' ').slice(0, 500),
      body,
      read: true,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  await guard.supabase.from('outbound_leads').update({ last_email_at: new Date().toISOString() }).eq('id', id);

  return NextResponse.json({ ok: true, message });
}
