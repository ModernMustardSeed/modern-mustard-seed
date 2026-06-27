import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession, getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { clientEmail, p } from '@/lib/email';
import { adminSender, logClientMessage } from '@/lib/client-mail';

export const runtime = 'nodejs';

/** Reply to a client from inside their profile. Sends via Resend (so it lands
 *  in their inbox and threads in Zoho), as the logged-in teammate, then logs
 *  the message on their thread. */
export async function POST(req: Request, { params }: { params: Promise<{ email: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const to = decodeURIComponent((await params).email || '').trim().toLowerCase();
  if (!to || !to.includes('@')) return NextResponse.json({ error: 'Invalid client email' }, { status: 400 });

  let payload: { subject?: string; body?: string } = {};
  try { payload = await req.json(); } catch { /* validated below */ }
  const body = (payload.body ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 });

  const user = await getAdminUser();
  const sender = adminSender(user);
  const subject = (payload.subject ?? '').trim() || 'A note from Modern Mustard Seed';
  const html = clientEmail({ body: p(body.replace(/\n/g, '<br>')) });

  const resend = new Resend(apiKey);
  const { error: sendErr } = await resend.emails.send({
    from: sender.from,
    to,
    replyTo: sender.replyTo,
    subject,
    html,
  });
  if (sendErr) {
    console.error('client reply failed', sendErr);
    return NextResponse.json({ error: 'Email failed to send. Try again.' }, { status: 502 });
  }

  await logClientMessage({
    direction: 'outbound',
    fromAddr: sender.address,
    toAddr: to,
    subject,
    body,
  });

  return NextResponse.json({ ok: true });
}
