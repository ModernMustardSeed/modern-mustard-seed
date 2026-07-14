import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

const STATUSES = ['new', 'read', 'done'];

/**
 * Mark a client request read or done, and/or REPLY to it.
 *
 * The reply is the point. Before this, the only way to answer a client was the
 * `mailto:` link in the command center, which meant the conversation forked: the
 * client's half lived in the portal with a status chip, and Sarah's half lived in
 * her sent folder where the client's portal could never show it. The thread the
 * client saw was permanently one-sided, so the portal read as a suggestion box.
 *
 * Now the reply is written onto the request row (portal renders it) AND emailed
 * (so they see it without logging in). One answer, both places, one source of truth.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { status?: string; reply?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const reply = (body.reply ?? '').trim();
  if (!reply && !body.status) {
    return NextResponse.json({ error: 'Nothing to do: send a status, a reply, or both.' }, { status: 400 });
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (reply.length > 4000) {
    return NextResponse.json({ error: 'That reply is too long.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (reply) {
    patch.reply_body = reply;
    patch.replied_at = new Date().toISOString();
    patch.replied_by = session.email ?? 'sarah@modernmustardseed.com';
    // Answering it IS resolving it, unless she explicitly said otherwise.
    if (!body.status) patch.status = 'done';
  }

  const { data: updated, error } = await supabase
    .from('client_requests')
    .update(patch)
    .eq('id', id)
    .select('id, client_email, client_name, body, source')
    .maybeSingle();

  if (error) {
    console.error('request update error', error);
    return NextResponse.json({ error: 'Could not update' }, { status: 500 });
  }

  // Email the reply too. Best effort: the row is already written, and a mail
  // failure must not make Sarah think her answer vanished.
  if (reply && updated?.client_email && process.env.RESEND_API_KEY) {
    try {
      const first = String(updated.client_name ?? '').split(' ')[0];
      const resend = resendClient();
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: updated.client_email as string,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Re: your note',
        html: clientEmail({
          preheader: reply.slice(0, 110),
          eyebrow: 'FROM SARAH',
          greeting: first ? `${first},` : undefined,
          body: `${reply
            .split(/\n{2,}/)
            .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
            .join('')}<p style="color:#6b6b6b;font-size:14px">You can reply right here, or from your portal where the whole thread lives.</p>`,
          cta: { label: 'Open my portal', url: `${SITE.url}/portal` },
          signature: 'Sarah',
        }),
      });
    } catch (err) {
      console.error('client reply email failed', err);
    }
  }

  return NextResponse.json({ ok: true, replied: Boolean(reply) });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
