import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { auditReportEmail, type AuditReport } from '@/lib/email';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';

/**
 * Send a personalized website audit to a lead, by hand, from the admin.
 * Deliberately NOT wired to Harvest or any drip sequence: this is a one-off
 * outreach email that delivers the audit, the to-do list, and a booking link.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, name, url, report, note } = (await req.json()) as {
    to?: string;
    name?: string;
    url?: string;
    report?: AuditReport;
    note?: string;
  };

  if (!to || !url || !report) {
    return NextResponse.json(
      { error: 'Recipient email, url, and a report are all required.' },
      { status: 400 }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'That recipient email does not look valid.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email is not configured (RESEND_API_KEY missing).' },
      { status: 500 }
    );
  }

  let domain = url;
  try {
    domain = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw url */
  }

  try {
    const resend = resendClient();
    const { error } = await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `Your website audit, ${domain}`,
      html: auditReportEmail({ toName: name, url, report, note }),
    });
    if (error) {
      console.error('admin/audit/send error', error);
      return NextResponse.json({ error: 'Could not send the email. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('admin/audit/send error', err);
    return NextResponse.json({ error: 'Could not send the email. Please try again.' }, { status: 500 });
  }
}
