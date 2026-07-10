import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { leadNotification } from '@/lib/email';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';

/**
 * Inbound reply webhook. Point your email provider's inbound parse (e.g. Resend
 * inbound on the outreach subdomain) here. When a prospect replies, we pause
 * their sequence (status -> replied, so the cadence cron skips them) and notify
 * Sarah so she answers personally.
 *
 * Optional shared secret: set OUTREACH_INBOUND_SECRET and pass ?secret=... .
 */
function extractEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.OUTREACH_INBOUND_SECRET;
  if (secret && url.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: 'no_json' });
  }

  // Find the sender across the common shapes (Resend, SendGrid, generic).
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const from =
    extractEmail(data.from) ||
    extractEmail((data.from as Record<string, unknown>)?.email) ||
    extractEmail(data.sender) ||
    extractEmail(payload.from);
  if (!from) return NextResponse.json({ ok: true, ignored: 'no_sender' });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true });

  const { data: prospect } = await supabase.from('prospects').select('*').eq('contact', from).maybeSingle();
  if (!prospect) return NextResponse.json({ ok: true, matched: false });

  // Pause the sequence unless they already converted/opted out.
  if (!['joined', 'opted_out', 'declined'].includes(prospect.status as string)) {
    await supabase.from('prospects').update({ status: 'replied' }).eq('id', prospect.id);
  }

  // Notify Sarah to answer personally.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = resendClient();
      const snippet = String(data.text || data.subject || payload.subject || '').slice(0, 600);
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        replyTo: from,
        subject: `A prospect replied: ${prospect.name}`,
        html: leadNotification({
          type: 'Contact',
          name: prospect.name as string,
          email: from,
          fields: [
            { label: 'From', value: from },
            { label: 'Channel', value: (prospect.channel as string) || 'email' },
          ],
          message: snippet || 'They replied to your outreach. Sequence paused.',
          suggestedAction: 'Reply personally. Their sequence is paused in /admin/outreach.',
        }),
      });
    } catch (err) {
      console.error('inbound notify failed', err);
    }
  }

  return NextResponse.json({ ok: true, matched: true, prospect: prospect.id });
}
