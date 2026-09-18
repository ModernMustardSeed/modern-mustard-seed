import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';
import { outreachAddressFor, outreachOnly } from '@/lib/outreach-domain';
import { postalAddress, unsubscribeUrlFor } from '@/lib/outbound-email';

export const runtime = 'nodejs';
export const maxDuration = 20;

/**
 * Send a campaign outreach email as the rep, via Resend. The From identity is
 * allowlisted so only the two known studio mailboxes can be used. Admin-gated.
 * The rep reviews and confirms in the UI before this is called.
 *
 * These are cold emails, so since 2026-09-18 they leave from the rep's twin on
 * the outreach subdomain (sarah@outreach.modernmustardseed.com), never the root
 * mailbox itself: cold volume on sarah@modernmustardseed.com is what put her own
 * mail in spam on 2026-09-08. Reply-to is still the rep's real Zoho address, so
 * replies land in their inbox and get ingested by the Zoho sync, and a bcc to
 * that address files a copy for the record. Every send carries the one-click
 * List-Unsubscribe header and a plain opt-out line with the postal address.
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

  const sendAs = outreachOnly(`${fromName} <${outreachAddressFor(fromEmail)}>`);
  const unsub = unsubscribeUrlFor(to);
  const postal = postalAddress();
  const footer =
    `\n\n--\nNot useful? Reply "no thanks", or unsubscribe here and you will not hear from us again: ${unsub}` +
    (postal ? `\n${postal}` : '');

  try {
    const resend = resendClient();
    const { data, error } = await resend.emails.send({
      from: sendAs,
      to,
      replyTo: fromEmail,
      bcc: fromEmail,
      subject,
      text: body + footer,
      headers: {
        'List-Unsubscribe': `<${unsub}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
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
    return NextResponse.json({ ok: true, id, status: status ?? 'queued', from: outreachAddressFor(fromEmail) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 500 });
  }
}
