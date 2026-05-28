import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, leadNotification } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Mustard Seed chatbot intake endpoint.
 * Captures the pain point, optional email/name/business, drops the lead
 * into Supabase, emails Sarah, and sends an auto-reply if email provided.
 */
export async function POST(req: Request) {
  try {
    const { message, email, name, business } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return NextResponse.json(
        { error: 'Tell me a little about your pain point first.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const safeName = (name && String(name).trim()) || 'A site visitor';
    const safeEmail = (email && String(email).trim()) || null;
    const safeBiz = (business && String(business).trim()) || null;
    const trimmedMessage = String(message).trim().slice(0, 2000);

    // Store the lead. Email is optional from chat (we still capture context).
    await insertLead({
      type: 'contact',
      name: safeName,
      email: safeEmail ?? 'no-email@chat.modernmustardseed.com',
      message: trimmedMessage,
      source: 'mustard-seed-chat',
    });

    if (apiKey) {
      const resend = new Resend(apiKey);
      const fields = [
        ...(safeEmail ? [{ label: 'Email', value: safeEmail }] : []),
        ...(safeBiz ? [{ label: 'Business', value: safeBiz }] : []),
        { label: 'Source', value: 'Mustard Seed chatbot' },
      ];

      // Notify Sarah
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        replyTo: safeEmail ?? 'sarah@modernmustardseed.com',
        subject: `Mustard Seed chat: ${safeName}`,
        html: leadNotification({
          type: 'Contact',
          name: safeName,
          email: safeEmail ?? 'no email provided',
          fields,
          message: trimmedMessage,
          suggestedAction: 'Reply within 24 hours, chat lead is hot',
        }),
      });

      // Auto-reply if we have an email
      if (safeEmail) {
        const firstName = safeName.split(' ')[0];
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: safeEmail,
          replyTo: 'sarah@modernmustardseed.com',
          subject: 'You named your pain point. I am on it.',
          html: clientEmail({
            preheader: 'Thanks for telling Mustard Seed your pain point. I read it.',
            eyebrow: 'Mustard Seed Chat',
            greeting: `${firstName}, I read what you sent.`,
            body: `<p>You named a pain point. That is the hard part.</p>
<p>I am the founder of Modern Mustard Seed and I read every Mustard Seed chat personally. I will reply within 24 hours with one of three things: a question to sharpen the scope, a recommendation, or a yes-let-us-build-it.</p>
<p>If you would like to move faster, run the free 60-second AI Audit while you wait. It returns a working roadmap for your business in under a minute.</p>`,
            cta: { label: 'Run the AI Audit', url: 'https://modernmustardseed.com/audit' },
            secondary: { label: 'Book a call', url: 'https://modernmustardseed.zohobookings.com/#/4764600000000052054' },
            signature: 'Sarah',
          }),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      reply:
        safeEmail
          ? 'I just sent you a note. Sarah will personally reply within 24 hours. The free AI Audit is yours to run any time.'
          : 'I have your pain point. Drop your email and Sarah will personally reply within 24 hours, or run the free AI Audit right now.',
    });
  } catch (err) {
    console.error('mustard-chat error', err);
    return NextResponse.json({ error: 'Something broke. Try again or email sarah@modernmustardseed.com.' }, { status: 500 });
  }
}
