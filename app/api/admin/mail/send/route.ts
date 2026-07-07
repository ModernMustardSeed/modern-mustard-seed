import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { mailboxForLogin } from '@/lib/mailboxes';
import { sendMailAs } from '@/lib/mailer';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Send an email as the signed-in teammate, from their own Zoho mailbox. Handles
 * both a fresh compose and a reply (pass inReplyTo/references + replyToId to
 * thread it). If the recipient is a known lead, the send is linked to their
 * conversation automatically.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const box = mailboxForLogin(user.email);
  if (!box) return NextResponse.json({ error: 'No mailbox is mapped to your login. Add it to MAILBOXES.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const text = String(body.text || '').trim();
  const cc = body.cc ? String(body.cc).trim() : undefined;
  const inReplyTo = body.inReplyTo ? String(body.inReplyTo) : undefined;
  const references = body.references ? String(body.references) : undefined;
  if (!to || !text) return NextResponse.json({ error: 'A recipient and a message are required.' }, { status: 400 });

  // Link to a lead if this address is a known prospect, so it threads on the CRM.
  let prospectId: string | null = body.prospectId || null;
  if (!prospectId && sb) {
    const { data } = await sb.from('rep_prospects').select('id').eq('email', to.toLowerCase()).limit(1).maybeSingle();
    if (data) prospectId = data.id;
  }

  const res = await sendMailAs(box, { to, subject, text, cc, inReplyTo, references, prospectId });
  if (!res.ok) return NextResponse.json({ error: res.error || 'Send failed' }, { status: 502 });
  return NextResponse.json({ ok: true, messageId: res.messageId });
}
