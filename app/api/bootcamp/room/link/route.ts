import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { roomLinkLetter } from '@/lib/bootcamp/emails';
import { getRegistrationByEmail, normEmail, recordEvent } from '@/lib/bootcamp/store';

/**
 * "Send me my room link." The answer is the same whether or not the address
 * is registered, so the form cannot be used to learn who bought a ticket. When
 * it is registered, the link goes to that address and nowhere else, at most
 * three times a day per address.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PER_DAY = 3;

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const email = normEmail(body.email ?? '');
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A real email address, please.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const reg = await getRegistrationByEmail(sb, email);
    if (reg) {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const { count, error } = await sb
        .from('bootcamp_events')
        .select('id', { count: 'exact', head: true })
        .eq('kind', 'room:link')
        .eq('registration_id', reg.id)
        .gte('created_at', start.toISOString());
      if (error) throw new Error(error.message);
      if ((count ?? 0) < PER_DAY) {
        const letter = roomLinkLetter({ firstName: reg.first_name, email: reg.email, regId: reg.id });
        const sent = await sendViaResend({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: reg.email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: letter.subject,
          html: letter.html,
          text: letter.text,
        });
        if (sent.ok) await recordEvent(sb, 'room:link', { email: reg.email, registrationId: reg.id, detail: { id: sent.id } });
        else console.error('bootcamp room link: send failed', sent.error);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('bootcamp room link failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'That did not go through. Try again in a minute.' }, { status: 500 });
  }
}
