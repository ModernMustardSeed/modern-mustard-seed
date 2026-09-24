import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { createMagicToken, normalizeEmail } from '@/lib/client-auth';
import { accountForEmail, accountForSession, brandFor } from '@/lib/cc-access';
import { startChallenge, ccCodeEmail } from '@/lib/cc-code';
import { magicLinkEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { hydrateDesks } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Step one of the Command Center sign-in. Always answers the same, whether or
 * not the address is on an account, so the door tells a stranger nothing. The
 * code only goes out to an address on a Command Center that is switched on.
 *
 * ONE EMAIL, TWO WAYS IN. The code is for the person reading mail on a phone
 * and working on a laptop. The tap link beside it is for the person reading
 * mail on the device they are already holding, which is most of them, and it
 * saves typing six digits one handed in a truck. Both land on the same desk
 * and both open the project portal at the same time, so nobody is ever asked
 * to sign in twice.
 */
export async function POST(req: Request) {
  await hydrateDesks();
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

  // A real client whose Command Center is not switched on yet typed a real
  // address and would otherwise sit watching an inbox that never fills. They
  // get their portal link instead, so the door opens on something.
  if (!account && sb) {
    const known = accountForEmail(email);
    if (known) {
      try {
        const url = `${SITE.url}/api/portal/verify?token=${encodeURIComponent(await createMagicToken(email))}`;
        if (process.env.RESEND_API_KEY) {
          await resendClient().emails.send({
            from: `${known.project.business} <sarah@modernmustardseed.com>`,
            to: email,
            replyTo: 'sarah@modernmustardseed.com',
            subject: 'Your sign-in link',
            html: magicLinkEmail({ firstName: known.person?.split(' ')[0], url }),
          });
        }
      } catch (err) {
        console.error('cc fallback link send failed', err);
      }
    }
  }

  if (account) {
    try {
      const code = await startChallenge(email);
      const brand = brandFor(account.project);
      // The tap link is the portal's own magic token, which verify() already
      // answers by minting both sessions and landing a Command Center client
      // on /cc. One token, one expiry, no second login shape to maintain.
      const link = `${SITE.url}/api/portal/verify?token=${encodeURIComponent(await createMagicToken(email))}`;
      const key = process.env.RESEND_API_KEY;
      if (key) {
        await resendClient().emails.send({
          from: `${brand.business} Command Center <sarah@modernmustardseed.com>`,
          to: email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `${code} is your Command Center code`,
          html: ccCodeEmail({ code, link, business: brand.business, brand: { ink: brand.colors.ink, accent: brand.colors.accent } }),
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
