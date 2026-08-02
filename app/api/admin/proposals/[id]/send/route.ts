import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { proposalSendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const FROM = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
const SARAH = 'sarah@modernmustardseed.com';

/**
 * Email the client a link to review, sign, and pay their proposal.
 *
 * Honesty rules learned in the Resend-suppression saga: a 200 from the provider
 * is not delivery, and a swallowed error is how "send" quietly stopped working.
 * This route surfaces the REAL failure reason (suppression, missing config,
 * provider error) instead of a generic "try again", stamps sent_at on the
 * proposal so the admin can see it went out, and offers {test:true} which sends
 * the same email to Sarah's own inbox (the Zoho leg, which always lands) so she
 * can see exactly what the client will get before it goes to them.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string; test?: boolean };

  const { data: p } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (!body.test && !p.client_email) {
    return NextResponse.json({ error: 'Add a client email before sending.' }, { status: 400 });
  }

  // share_token has a DB default, but guard for any legacy null.
  let token = p.share_token as string | null;
  if (!token) {
    token = (globalThis.crypto?.randomUUID?.() ?? `${id}-${Date.now()}`).replace(/-/g, '');
    await supabase.from('proposals').update({ share_token: token }).eq('id', id);
  }

  const url = `${SITE.url}/proposal/${token}`;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY).' }, { status: 500 });
  }

  const to = body.test ? SARAH : (p.client_email as string);
  try {
    const resend = resendClient();
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: SARAH,
      subject: body.test
        ? '[Test] Your proposal from Modern Mustard Seed'
        : 'Your proposal from Modern Mustard Seed',
      html: proposalSendEmail({ toName: (p.client_name as string) || undefined, url, note: body.note }),
    });
    if (error) {
      console.error('proposal send email failed', error);
      // The real reason, verbatim. A suppressed recipient, a config gap, and a
      // provider outage all need different responses from Sarah.
      return NextResponse.json({ error: `Not sent: ${error.message}` }, { status: 502 });
    }
  } catch (err) {
    console.error('proposal send email failed', err);
    const why = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: `Not sent: ${why}` }, { status: 502 });
  }

  if (body.test) {
    return NextResponse.json({ ok: true, url, test: true, to });
  }

  // Mark sent + stamp the ledger (do not downgrade an accepted proposal).
  const sentAt = new Date().toISOString();
  const update: Record<string, unknown> = { sent_at: sentAt };
  if (p.status === 'draft') update.status = 'sent';
  await supabase.from('proposals').update(update).eq('id', id);

  return NextResponse.json({ ok: true, url, sentAt, to });
}
