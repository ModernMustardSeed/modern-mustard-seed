import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { clientEmail, p } from '@/lib/email';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';

/** Reply to a prospect from inside the admin. Sends via Resend (so it lands in
 *  their inbox and threads in Zoho), then logs the message on their thread. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let payload: { subject?: string; body?: string } = {};
  try { payload = await req.json(); } catch { /* validated below */ }
  const body = (payload.body ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });

  const { data, error } = await sb.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const prospect = data as Prospect;
  const to = prospect.email?.trim();
  if (!to) return NextResponse.json({ error: 'No email on file for this lead.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 });

  const subject = (payload.subject ?? '').trim() || `Re: Modern Mustard Seed${prospect.business ? ` and ${prospect.business}` : ''}`;
  const html = clientEmail({ body: p(body.replace(/\n/g, '<br>')), trackId: id });
  const resend = new Resend(apiKey);
  const { error: sendErr } = await resend.emails.send({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to,
    replyTo: 'sarah@modernmustardseed.com',
    subject,
    html,
  });
  if (sendErr) {
    console.error('prospect reply failed', sendErr);
    return NextResponse.json({ error: 'Email failed to send. Try again.' }, { status: 502 });
  }

  await sb.from('messages').insert({
    prospect_id: id, direction: 'outbound', channel: 'email',
    from_addr: 'sarah@modernmustardseed.com', to_addr: to, subject,
    snippet: body.slice(0, 500), body: body.slice(0, 20_000), read: true,
    occurred_at: new Date().toISOString(),
  });
  await sb.from('rep_prospects').update({ last_email_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);

  return NextResponse.json({ ok: true });
}
