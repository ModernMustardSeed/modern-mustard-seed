import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { proposalSendEmail } from '@/lib/email';

export const runtime = 'nodejs';

/** Email the client a link to review, sign, and pay their proposal. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };

  const { data: p } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (!p.client_email) {
    return NextResponse.json({ error: 'Add a client email before sending.' }, { status: 400 });
  }

  // share_token has a DB default, but guard for any legacy null.
  let token = p.share_token as string | null;
  if (!token) {
    token = (globalThis.crypto?.randomUUID?.() ?? `${id}-${Date.now()}`).replace(/-/g, '');
    await supabase.from('proposals').update({ share_token: token }).eq('id', id);
  }

  const url = `${SITE.url}/proposal/${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY).' }, { status: 500 });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: p.client_email as string,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'Your proposal from Modern Mustard Seed',
      html: proposalSendEmail({ toName: (p.client_name as string) || undefined, url, note: body.note }),
    });
  } catch (err) {
    console.error('proposal send email failed', err);
    return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 502 });
  }

  // Mark sent (do not downgrade an accepted proposal).
  if (p.status === 'draft') {
    await supabase.from('proposals').update({ status: 'sent' }).eq('id', id);
  }

  return NextResponse.json({ ok: true, url });
}
