import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/client-auth';
import { leadNotification } from '@/lib/email';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Affiliate application. Stores a pending affiliate and notifies Sarah. */
export async function POST(req: Request) {
  let body: { name?: string; email?: string; promoteWhere?: string; audience?: string; why?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  const name = (body.name ?? '').trim().slice(0, 120);
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Tell us your name.' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  try {
    // Never downgrade an existing partner. If they are already approved, this is
    // a no-op (they just re-submitted), so their status and code stay intact.
    const { data: existing } = await supabase
      .from('affiliates')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (existing?.status === 'approved') {
      return NextResponse.json({ ok: true, alreadyPartner: true });
    }

    const { error } = await supabase.from('affiliates').upsert(
      {
        email,
        name,
        promote_where: (body.promoteWhere ?? '').slice(0, 500),
        audience: (body.audience ?? '').slice(0, 500),
        why: (body.why ?? '').slice(0, 1000),
        status: 'pending',
      },
      { onConflict: 'email' }
    );
    if (error) {
      return NextResponse.json({ error: 'Could not submit. The partners table may not be set up yet.' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Could not submit.' }, { status: 500 });
  }

  // Notify Sarah (best effort).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        replyTo: email,
        subject: `New partner application: ${name}`,
        html: leadNotification({
          type: 'Contact',
          name,
          email,
          fields: [
            { label: 'Email', value: email },
            { label: 'Promotes where', value: body.promoteWhere || 'n/a' },
            { label: 'Audience', value: body.audience || 'n/a' },
          ],
          message: body.why || '',
          suggestedAction: 'Review and approve in the back office at /admin/partners.',
        }),
      });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ ok: true });
}
