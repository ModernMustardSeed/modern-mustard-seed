import { Resend } from 'resend';
import { createMagicToken } from './client-auth';
import { affiliateWelcomeEmail } from './email';

/**
 * Partner welcome send, shared by the approve flow and the admin "resend"
 * recovery action. Each send mints a fresh passwordless magic link so the
 * dashboard button works no matter when it is sent.
 */

/** Strip stray whitespace or escaped newlines that can sneak into an env value
 *  and silently invalidate the API key. */
function cleanKey(k?: string): string {
  return (k || '').replace(/\\r|\\n/g, '').replace(/[\r\n]/g, '').trim();
}

export type WelcomeResult = { sent: boolean; id?: string; error?: string };

export async function sendAffiliateWelcome(
  aff: { email: string; name?: string | null; code: string },
  origin: string
): Promise<WelcomeResult> {
  const apiKey = cleanKey(process.env.RESEND_API_KEY);
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY not configured' };
  try {
    const token = await createMagicToken(aff.email);
    const url = `${origin}/api/portal/verify?token=${encodeURIComponent(token)}&next=/partners/hq`;
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: aff.email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'You are in. Welcome to the Modern Mustard Seed partner program',
      html: affiliateWelcomeEmail({ firstName: aff.name?.split(' ')[0], code: aff.code, url }),
    });
    if (error) return { sent: false, error: error.message || String(error) };
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}
