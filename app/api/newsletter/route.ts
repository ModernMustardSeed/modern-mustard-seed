import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
    const { email, firstName } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          email,
          firstName: firstName ?? undefined,
          unsubscribed: false,
          audienceId: AUDIENCE_ID,
        });
      } catch (e) {
        // already-subscribed errors are fine, surface unexpected ones
        console.warn('Resend audience add:', e);
      }
    }

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      subject: 'Welcome to Modern Mustard Seed',
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <h1 style="color:#C8A415">Welcome aboard.</h1>
  <p>You are now on the Modern Mustard Seed list. Here is what to expect:</p>
  <ul>
    <li><strong>One email a week.</strong> A real playbook, a live build, or a teardown of something we shipped.</li>
    <li><strong>No fluff.</strong> If I do not have something useful to say, I will not send.</li>
    <li><strong>Subscriber-only PDFs.</strong> Every playbook gets a downloadable version, free for you.</li>
  </ul>
  <p>Want to get started? Run the <a href="https://modernmustardseed.com/audit" style="color:#C8A415"><strong>free AI audit</strong></a> on your business and get a 60-second readout on the highest-leverage AI moves you could make.</p>
  <p>Talk soon.<br>Sarah</p>
</body></html>
      `,
    });

    await resend.emails.send({
      from: 'Newsletter Signups <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      subject: 'New newsletter signup',
      html: `<p>${email}${firstName ? ` (${firstName})` : ''} subscribed.</p>`,
    });

    return NextResponse.json({ success: true, message: 'You are in. Check your inbox.' });
  } catch (err) {
    console.error('Newsletter error:', err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
