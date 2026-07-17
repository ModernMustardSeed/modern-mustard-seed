import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, leadNotification, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';

/**
 * "Plant your seed" capture from /world. Low-friction (name + email + one line),
 * lands in Supabase leads AND both of Sarah's inboxes, and sends the visitor a
 * warm welcome. Best-effort email: if Resend is unset the lead is still captured.
 */
export async function POST(req: Request) {
  try {
    const { name, email, idea } = (await req.json()) as Record<string, string>;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const cleanName = (name || '').trim();
    const cleanIdea = (idea || '').trim();
    const firstName = cleanName ? cleanName.split(' ')[0] : email.split('@')[0];

    await insertLead({
      type: 'build-queue',
      name: cleanName || null,
      email,
      idea_description: cleanIdea || null,
      business_name: cleanIdea ? cleanIdea.slice(0, 120) : null,
      source: 'mustard-seed-world',
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = resendClient();

      await resend.emails.send({
        from: 'The Mustard Seed World <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Seed planted: ${firstName}${cleanIdea ? ` wants ${cleanIdea.slice(0, 48)}` : ''}`,
        html: leadNotification({
          type: 'Build Queue',
          name: cleanName || firstName,
          email,
          fields: [
            { label: 'Wants to grow', value: cleanIdea || '(not specified)' },
            { label: 'Came from', value: '/world scroll experience' },
          ],
          message: cleanIdea,
          suggestedAction: 'Reply personally, same day if you can',
        }),
      }).catch((e) => console.error('world plant owner email:', e));

      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `Your seed is planted, ${firstName}`,
        html: clientEmail({
          preheader: 'I read every one personally and reply fast, usually the same day.',
          greeting: `${firstName},`,
          body:
            p(
              `Thanks for planting a seed in the Mustard Seed World${cleanIdea ? ` for <strong>${cleanIdea}</strong>` : ''}. I read every single one myself.`,
            ) +
            p('Here is what happens next:') +
            `<ol style="margin:0 0 18px;padding-left:22px;color:#e9e1cf;line-height:1.75;font-size:16px">
              <li style="margin-bottom:10px"><strong style="color:#fff">Fast, usually the same day</strong>, I will email you back personally with a first take.</li>
              <li>If we are a fit, the next step is a short scoping call. You leave it with a fixed scope, timeline, and quote. No decks.</li>
            </ol>` +
            p('Want to skip the queue? The calendar is open below.'),
          cta: { label: 'Book a discovery call', url: 'https://modernmustardseed.com/?book=1' },
          secondary: { label: 'See recent work', url: 'https://modernmustardseed.com/work' },
        }),
      }).catch((e) => console.error('world plant welcome email:', e));
    }

    return NextResponse.json({ success: true, message: 'Sarah will email you back, usually the same day.' });
  } catch (err) {
    console.error('world plant error:', err);
    return NextResponse.json({ error: 'Could not plant that. Try again.' }, { status: 500 });
  }
}
