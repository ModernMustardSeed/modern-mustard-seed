import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/client-auth';
import { accountForSession, brandFor } from '@/lib/cc-access';
import { startChallenge, ccCodeEmail } from '@/lib/cc-code';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Step one of the Command Center sign-in. Always answers the same, whether or
 * not the address is on an account, so the door tells a stranger nothing. The
 * code only goes out to an address on a Command Center that is switched on.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const email = normalizeEmail(body.email ?? '');
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter the email address on your account.' }, { status: 400 });

  const sb = getSupabase();
  const account = sb ? await accountForSession(sb, email) : null;
  if (account) {
    try {
      const code = await startChallenge(email);
      const brand = brandFor(account.project);
      const key = process.env.RESEND_API_KEY;
      if (key) {
        await resendClient().emails.send({
          from: `${brand.business} Command Center <sarah@modernmustardseed.com>`,
          to: email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `${code} is your Command Center code`,
          html: ccCodeEmail({ code, business: brand.business, brand: { ink: brand.colors.ink, accent: brand.colors.accent } }),
        });
      } else {
        console.warn('RESEND_API_KEY missing; Command Center code not sent for', email);
      }
    } catch (err) {
      console.error('cc code send failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
