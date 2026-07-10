import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * Prospect actions. Nothing sends without Sarah here. Email auto-send only
 * happens when OUTREACH_FROM (a SEPARATE sending domain) is configured, to
 * protect the deliverability of buyer and partner mail. Otherwise every message
 * is queued for assisted manual send, which is also how social always works.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { action?: string; messageId?: string; subject?: string; body?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: prospect } = await supabase.from('prospects').select('*').eq('id', id).maybeSingle();
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  switch (body.action) {
    case 'editMessage': {
      if (!body.messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
      await supabase.from('outreach_messages').update({ subject: body.subject ?? null, body: body.body ?? '' }).eq('id', body.messageId);
      return NextResponse.json({ ok: true });
    }

    case 'send': {
      if (!body.messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
      const { data: message } = await supabase.from('outreach_messages').select('*').eq('id', body.messageId).maybeSingle();
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

      const isEmail = message.channel === 'email';
      const from = process.env.OUTREACH_FROM; // e.g. "Sarah <sarah@reach.modernmustardseed.com>"
      const canAutoSend = isEmail && !!from && !!process.env.RESEND_API_KEY && !!prospect.contact;

      if (canAutoSend) {
        try {
          const resend = resendClient();
          const unsub = `${SITE.url}/api/outreach/unsubscribe?c=${encodeURIComponent(prospect.contact as string)}`;
          const html = `${(message.body as string).replace(/\n/g, '<br>')}<br><br><span style="font-size:12px;color:#888">You are receiving this because of your public work. <a href="${unsub}">Unsubscribe</a> and I will never contact you again.</span>`;
          const { error: sendError } = await resend.emails.send({
            from,
            to: prospect.contact as string,
            replyTo: 'sarah@modernmustardseed.com',
            subject: (message.subject as string) || 'A partner idea',
            html,
          });
          if (sendError) {
            console.error('outreach send failed', sendError);
            return NextResponse.json({ error: 'Send failed. Set OUTREACH_FROM to a verified separate domain.' }, { status: 502 });
          }
          await supabase.from('outreach_messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', body.messageId);
          await supabase.from('prospects').update({ status: 'sent' }).eq('id', id);
          return NextResponse.json({ ok: true, sent: true });
        } catch (err) {
          console.error('outreach send failed', err);
          return NextResponse.json({ error: 'Send failed. Set OUTREACH_FROM to a verified separate domain.' }, { status: 502 });
        }
      }

      // Assisted: approve and queue for manual copy/send (social, or email with no separate domain yet).
      await supabase.from('outreach_messages').update({ status: 'approved' }).eq('id', body.messageId);
      await supabase.from('prospects').update({ status: 'queued' }).eq('id', id);
      return NextResponse.json({ ok: true, sent: false, assisted: true });
    }

    case 'markSent': {
      if (body.messageId) await supabase.from('outreach_messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', body.messageId);
      await supabase.from('prospects').update({ status: 'sent' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    case 'skip': {
      if (body.messageId) await supabase.from('outreach_messages').update({ status: 'skipped' }).eq('id', body.messageId);
      return NextResponse.json({ ok: true });
    }

    case 'setStatus': {
      const status = body.status ?? '';
      await supabase.from('prospects').update({ status }).eq('id', id);
      // Opting out adds to the permanent suppression list.
      if (status === 'opted_out' && prospect.contact) {
        await supabase.from('suppression').upsert({ contact: (prospect.contact as string).toLowerCase().trim(), reason: 'manual opt-out' }, { onConflict: 'contact' });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  await supabase.from('outreach_messages').delete().eq('prospect_id', id);
  await supabase.from('prospects').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
