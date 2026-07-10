import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/client-auth';
import { clientEmail, leadNotification, p } from '@/lib/email';

const CELL = '(406) 250-6076';

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

  // Two emails go out on every new application: a heads-up to Sarah so no
  // signup is ever missed, and a warm confirmation to the applicant so they
  // know it landed. Both are best effort (a mail hiccup must never fail the
  // application), but failures are logged loudly instead of silently swallowed,
  // so a real delivery problem shows up in the logs rather than vanishing.
  const firstName = name.split(' ')[0] || 'there';
  if (process.env.RESEND_API_KEY) {
    const resend = resendClient();

    // 1) Owner notification. Routing to a @modernmustardseed.com address sends
    //    it through Zoho, so it reaches Sarah's mailbox reliably.
    try {
      const { error } = await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        replyTo: email,
        subject: `New partner application: ${name}`,
        text:
          `New partner application.\n\n` +
          `Name: ${name}\nEmail: ${email}\n` +
          `Promotes where: ${body.promoteWhere || 'n/a'}\n` +
          `Audience: ${body.audience || 'n/a'}\n` +
          `Why: ${body.why || 'n/a'}\n\n` +
          `Review and approve at https://modernmustardseed.com/admin/partners`,
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
      if (error) console.error('partner apply: owner notification failed', email, error);
    } catch (err) {
      console.error('partner apply: owner notification threw', email, err);
    }

    // 2) Applicant confirmation. This is the email the applicant expects to see
    //    the moment they submit, so they know a real person will follow up.
    try {
      const { error } = await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'I got your partner application',
        text:
          `Hi ${firstName},\n\n` +
          `Thank you for applying to partner with Modern Mustard Seed. I review every application personally, usually within a day. ` +
          `When you're approved you'll get your own referral link, free access to everything so you only recommend what you've used, and the full Outreach Playbook with your link already in it.\n\n` +
          `Want to talk it through first? Just reply to this email, or text me directly at ${CELL}.\n\n` +
          `With love and faith,\nSarah\nModern Mustard Seed`,
        html: clientEmail({
          preheader: 'I got your partner application, and I review every one personally.',
          eyebrow: 'Partner Program',
          greeting: `Hi ${firstName},`,
          body:
            p('Thank you for applying to partner with Modern Mustard Seed. It genuinely means a lot, and I review every single application personally, usually within a day.') +
            p('When you are approved you will get your own referral link, free access to every product so you only ever recommend what you have used, and the full Outreach Playbook with your link already baked in.') +
            p(`Want to talk it through first? Just reply to this email, or text me directly at <strong>${CELL}</strong>.`),
          cta: { label: 'See the partner program', url: 'https://modernmustardseed.com/partners' },
        }),
      });
      if (error) console.error('partner apply: applicant confirmation failed', email, error);
    } catch (err) {
      console.error('partner apply: applicant confirmation threw', email, err);
    }
  }

  return NextResponse.json({ ok: true });
}
