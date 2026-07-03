import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { leadNotification } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Front Desk lead capture (homepage hero terminal). A visitor typed an idea,
 * got the instant scope, and left an email for the personal follow-up.
 * Best-effort on every side channel: the hero must never break.
 */
export async function POST(req: Request) {
  try {
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
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: 'Front Desk <sarah@modernmustardseed.com>',
          to: 'sarah@modernmustardseed.com',
          replyTo: email,
          subject: `Front Desk: new scoped idea (${email})`,
          html: leadNotification({
            type: 'Contact',
            name: email,
            email,
            fields: [{ label: 'Source', value: 'Homepage hero terminal' }],
            message: idea,
            suggestedAction: 'Send the personal scope within 3 business days',
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
