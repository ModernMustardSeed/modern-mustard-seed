import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    // Notify Sarah
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      subject: `New Inquiry from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#DAA520">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Message:</strong></p>
          <div style="background:#f9f9f9;padding:15px;border-radius:8px;border-left:4px solid #DAA520">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="color:#888;font-size:12px;margin-top:20px">Submitted via modernmustardseed.com</p>
        </div>
      `,
    });

    // Auto-reply to visitor
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      subject: 'Thanks for Reaching Out to Modern Mustard Seed!',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background-color: #DAA520; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
  .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
  .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>Thanks for Reaching Out!</h1></div>
  <div class="content">
    <p>Hi ${name},</p>
    <p>Thanks so much for contacting Modern Mustard Seed! I received your message and will personally get back to you within <strong>24–48 hours</strong>.</p>
    <p>In the meantime, feel free to <a href="https://modernmustardseed.zohobookings.com/#/4764600000000052054" style="color:#DAA520">book a discovery call</a> directly on my calendar.</p>
    <p>Looking forward to connecting!</p>
    <p>Best,<br><strong>Sarah</strong><br>Modern Mustard Seed</p>
  </div>
  <div class="footer"><p>Modern Mustard Seed | AI Solutions for Modern Businesses</p></div>
</div>
</body>
</html>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
