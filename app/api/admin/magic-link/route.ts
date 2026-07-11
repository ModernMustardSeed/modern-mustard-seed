import { NextResponse } from 'next/server';
import { createMagicToken, isKnownAdmin } from '@/lib/admin-auth';
import { resendClient } from '@/lib/send-email';
import { magicLinkEmail } from '@/lib/email';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Light per-IP rate limit so nobody can spray sign-in emails.
const attempts = new Map<string, { count: number; first: number }>();
const MAX = 6;
const WINDOW = 10 * 60 * 1000;
function ok(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.first > WINDOW) {
    attempts.set(ip, { count: 1, first: now });
    return true;
  }
  a.count += 1;
  return a.count <= MAX;
}

/**
 * Email a one-tap sign-in link. Always returns ok so it never reveals who is on
 * the team; a link is only actually sent to a known teammate.
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ok(ip)) return NextResponse.json({ ok: true }); // silently drop past the limit

  let email = '';
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  email = (email || '').trim().toLowerCase();

  if (email && EMAIL_RE.test(email) && (await isKnownAdmin(email))) {
    try {
      const origin = new URL(req.url).origin;
      const token = await createMagicToken(email);
      const url = `${origin}/admin/magic?token=${encodeURIComponent(token)}`;
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        subject: 'Your sign-in link',
        html: magicLinkEmail({ url, note: 'Tap to sign into your Modern Mustard Seed command center. No password needed.' }),
        text: `Sign into your Modern Mustard Seed command center (no password needed). This link expires in 20 minutes:\n\n${url}`,
      });
    } catch {
      /* still return ok */
    }
  }

  return NextResponse.json({ ok: true });
}
