import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { clientEmail, escape } from '@/lib/email';
import { oppEmailSchema } from '@/lib/opps';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Send one email from Sarah about this opportunity, log it on the thread, and
 * move the row forward. Same path the outbound cockpit uses for a reply:
 * clientEmail wrapper, Sarah's from address, the tracked Resend client.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: opp, error } = await guard.supabase.from('opps').select('*').eq('id', id).single();
  if (error || !opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 500 });
  }

  const parsed = await parseBody(req, oppEmailSchema);
  if ('error' in parsed) return parsed.error;
  const { to, subject, body } = parsed.data;

  const html = clientEmail({
    body: body
      .split(/\n{2,}/)
      .map((par) => `<p>${escape(par).replace(/\n/g, '<br>')}</p>`)
      .join(''),
    trackId: opp.id,
  });

  try {
    const resend = resendClient();
    const { error: sendErr } = await resend.emails.send({
      from: 'Sarah Scarano <sarah@modernmustardseed.com>',
      to,
      replyTo: 'sarah@modernmustardseed.com',
      subject,
      html,
    });
    if (sendErr) return NextResponse.json({ error: sendErr.message }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data: message } = await guard.supabase
    .from('messages')
    .insert({
      opp_id: id,
      direction: 'outbound',
      channel: 'email',
      from_addr: 'sarah@modernmustardseed.com',
      to_addr: to,
      subject,
      snippet: body.replace(/\s+/g, ' ').slice(0, 500),
      body,
      read: true,
      occurred_at: now,
    })
    .select('id, direction, channel, from_addr, to_addr, subject, body, snippet, occurred_at')
    .single();

  const patch: Record<string, unknown> = { last_email_at: now, last_action_at: now, contact_email: opp.contact_email || to };
  if (opp.status === 'new' || opp.status === 'shortlist') {
    patch.status = 'applied';
    if (!opp.applied_at) patch.applied_at = now;
  }
  const { data: updated } = await guard.supabase.from('opps').update(patch).eq('id', id).select().single();

  return NextResponse.json({ ok: true, message, opp: updated ?? opp });
}
