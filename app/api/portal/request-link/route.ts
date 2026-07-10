import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { createMagicToken, normalizeEmail } from '@/lib/client-auth';
import { magicLinkEmail } from '@/lib/email';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Step 1 of passwordless login. Always returns ok (never reveals whether an
 * email is known) and only emails a link when the address is valid. The link
 * carries a 20-minute signed token to /api/portal/verify.
 */
export async function POST(req: Request) {
  let body: { email?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  }

  // Optional post-login destination. Internal paths only, never full URLs.
  const next = typeof body.next === 'string' && /^\/[a-z0-9\-/_]*$/i.test(body.next) ? body.next : null;

  // Best-effort: pull their first name so the email feels personal. Never
  // block on this, and never reveal whether they were found.
  let firstName: string | undefined;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: client } = await supabase.from('clients').select('name').eq('email', email).maybeSingle();
      let name = (client?.name as string | undefined) ?? undefined;
      if (!name) {
        const { data: lead } = await supabase.from('leads').select('name').eq('email', email).not('name', 'is', null).limit(1).maybeSingle();
        name = (lead?.name as string | undefined) ?? undefined;
      }
      if (name) firstName = name.split(' ')[0];
    }
  } catch {
    // ignore lookup failures
  }

  try {
    const token = await createMagicToken(email);
    const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
    const url = `${origin}/api/portal/verify?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ''}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Your Modern Mustard Seed sign-in link',
        html: magicLinkEmail({ firstName, url }),
      });
    } else {
      console.warn('RESEND_API_KEY missing; magic link not sent for', email);
    }
  } catch (err) {
    console.error('magic link send failed', err);
    // Still return ok so we never leak state or invite retries that probe.
  }

  return NextResponse.json({ ok: true });
}
