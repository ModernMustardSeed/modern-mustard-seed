import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const REVENUE_LABELS: Record<string, string> = {
  'pre-revenue': 'Pre-revenue',
  'under-100k': 'Under $100K',
  '100k-500k': '$100K to $500K',
  '500k-1m': '$500K to $1M',
  '1m-plus': '$1M+',
};

const TIMELINE_LABELS: Record<string, string> = {
  'this-quarter': 'This quarter',
  'next-quarter': 'Next quarter',
  exploring: 'Exploring',
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const body = await req.json();
    const { name, email, businessName, ideaDescription, revenueRange, timeline } = body as Record<string, string>;

    if (!name || !email || !businessName || !ideaDescription || !revenueRange || !timeline) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const revenueLabel = REVENUE_LABELS[revenueRange] ?? revenueRange;
    const timelineLabel = TIMELINE_LABELS[timeline] ?? timeline;

    await resend.emails.send({
      from: 'Build Queue <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: `Build Queue: ${businessName} (${timelineLabel})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
          <h2 style="color:#C8A415">New Build Queue Application</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666;width:160px"><strong>Name</strong></td><td style="padding:8px 0">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Business / idea</strong></td><td style="padding:8px 0">${businessName}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Revenue</strong></td><td style="padding:8px 0">${revenueLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Timeline</strong></td><td style="padding:8px 0">${timelineLabel}</td></tr>
          </table>
          <h3 style="margin-top:24px;color:#333">What they want built</h3>
          <div style="background:#f9f9f9;padding:16px;border-radius:8px;border-left:4px solid #C8A415">
            ${String(ideaDescription).replace(/\n/g, '<br>')}
          </div>
        </div>
      `,
    });

    // TODO: when Supabase is wired here, also insert this lead into a `build_queue_leads` table.
    // env var needed: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Build queue submission error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
