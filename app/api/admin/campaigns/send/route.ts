import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const maxDuration = 20;

/**
 * Send a campaign outreach email straight from the rep's studio (Zoho) mailbox
 * identity via Resend. From = the rep's own address (sarah@ or polly.thompson@),
 * reply-to that same address so replies land back in their Zoho inbox (and get
 * ingested by the Zoho sync), and bcc that address so a copy is filed in their
 * mailbox for the record. The From identity is allowlisted so only the two known
 * studio mailboxes can be used. Admin-gated. The rep reviews and confirms in the
 * UI before this is called.
 */
const ALLOWED_FROM: Record<string, string> = {
  'sarah@modernmustardseed.com': 'Sarah at Modern Mustard Seed',
  'polly.thompson@modernmustardseed.com': 'Polly at Modern Mustard Seed',
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 500 });

  let p: { to?: string; fromEmail?: string; subject?: string; body?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const to = String(p.to ?? '').trim();
  const fromEmail = String(p.fromEmail ?? '').trim().toLowerCase();
  const subject = String(p.subject ?? '').trim();
  const body = String(p.body ?? '').trim();

  if (!isEmail(to)) return NextResponse.json({ error: 'The recipient email looks invalid.' }, { status: 400 });
  const fromName = ALLOWED_FROM[fromEmail];
  if (!fromName) return NextResponse.json({ error: 'That from-address is not allowed.' }, { status: 400 });
  if (!subject) return NextResponse.json({ error: 'The subject is empty.' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'The body is empty.' }, { status: 400 });

  try {
    const resend = resendClient();
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      replyTo: fromEmail,
      bcc: fromEmail,
      subject,
      text: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Resend accepts the API call even when it then SUPPRESSES the address (a
    // recipient on the account suppression list from an earlier bounce). That
    // status is set right away, so read it back and report the truth instead of
    // a false "sent". Best-effort: if the status check fails, assume it queued.
    const id = data?.id ?? null;
    let status: string | undefined;
    if (id) {
      try {
        await new Promise((r) => setTimeout(r, 900));
        const got = await resend.emails.get(id);
        status = (got.data as { last_event?: string } | null)?.last_event;
      } catch {
        /* status check is best-effort */
      }
    }
    if (status && ['suppressed', 'bounced', 'complained'].includes(status)) {
      const why =
        status === 'suppressed'
          ? `${to} is on your Resend suppression list (usually from an earlier bounce), so Resend blocked it. Remove it in the Resend dashboard under Suppressions, then try again.`
          : `the address ${status} it. Check that ${to} is correct.`;
      return NextResponse.json({ ok: false, status, error: `Not delivered: ${why}` });
    }
    return NextResponse.json({ ok: true, id, status: status ?? 'queued' });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 500 });
  }
}
