import { NextResponse } from 'next/server';
import { leadNotification } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';

// Soft per-instance IP throttle, same pattern as mustard-mode/free-play.
// Each submission inserts a lead and emails Sarah, so cap the blast radius.
const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 5;
}

/**
 * Front Desk lead capture (homepage hero terminal). A visitor typed an idea,
 * got the instant scope, and left an email for the personal follow-up.
 * Best-effort on every side channel: the hero must never break.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!ipAllowed(ip)) {
      return NextResponse.json({ error: 'Easy there. Try again in a bit.' }, { status: 429 });
    }

    const body = (await req.json()) as { idea?: string; email?: string };
    const idea = (body.idea ?? '').trim().slice(0, 600);
    const email = (body.email ?? '').trim().toLowerCase();

    if (!idea || idea.length < 3) {
      return NextResponse.json({ error: 'Tell us the idea first.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A real email unlocks the scope.' }, { status: 400 });
    }

    await insertLead({
      type: 'contact',
      email,
      business_name: 'Front Desk (homepage hero)',
      idea_description: idea,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Front Desk <sarah@modernmustardseed.com>',
          to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
          replyTo: email,
          subject: `Front Desk: new scoped idea (${email})`,
          html: leadNotification({
            type: 'Contact',
            name: email,
            email,
            fields: [{ label: 'Source', value: 'Homepage hero terminal' }],
            message: idea,
            suggestedAction: 'Send the personal scope fast, same day if you can',
          }),
        });
      } catch (err) {
        console.error('Front desk notification failed:', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
