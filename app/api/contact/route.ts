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
    const { name, email, message, source } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    const sourceLine = source ? `<p><strong>Package interest:</strong> ${source}</p>` : '';

    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: source ? `New ${source} inquiry from ${name}` : `New Inquiry from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#DAA520">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${sourceLine}
          <p><strong>Message:</strong></p>
          <div style="background:#f9f9f9;padding:15px;border-radius:8px;border-left:4px solid #DAA520">
            ${String(message).replace(/\n/g, '<br>')}
          </div>
          <p style="color:#888;font-size:12px;margin-top:20px">Submitted via modernmustardseed.com</p>
        </div>
      `,
    });

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      subject: 'Thanks for Reaching Out to Modern Mustard Seed',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background-color: #C8A415; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
  .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
  .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>Thanks for Reaching Out</h1></div>
  <div class="content">
    <p>Hi ${name},</p>
    <p>Thanks for contacting Modern Mustard Seed. I received your message and will personally get back to you within <strong>24-48 hours</strong>.</p>
    <p>While you wait, you can <a href="https://modernmustardseed.zohobookings.com/#/4764600000000052054" style="color:#C8A415">book a 30-minute discovery call</a> on my calendar, or run the <a href="https://modernmustardseed.com/audit" style="color:#C8A415">free AI audit</a> on your business.</p>
    <p>Looking forward to building with you.</p>
    <p>Best,<br><strong>Sarah</strong><br>Modern Mustard Seed</p>
  </div>
  <div class="footer"><p>Modern Mustard Seed | AI products, voice agents, and full-stack execution</p></div>
</div>
</body>
</html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
