import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { mailboxForLogin, listMailboxes } from '@/lib/mailboxes';
import { describeMailError } from '@/lib/mail-errors';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Live health check on the signed-in teammate's mailbox: does Zoho accept the
 * app password over IMAP, does it accept it over SMTP, and when did a message
 * last land in the admin. Answers "is my email working" without a deploy or a
 * log dive, and names the Zoho setting to change when it is not.
 *
 * Never returns the password. Only its length, which is enough to tell a real
 * app password from an empty or placeholder value.
 */
type Check = { ok: boolean; reason?: string; detail?: string; code?: string; fix?: string; ms: number };

async function checkImap(host: string, port: number, user: string, pass: string): Promise<Check & { unseen?: number; total?: number }> {
  const started = Date.now();
  const client = new ImapFlow({ host, port, secure: true, auth: { user, pass }, logger: false });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const box = client.mailbox && typeof client.mailbox !== 'boolean' ? client.mailbox : null;
    const total = box?.exists;
    const unseen = box?.unseen;
    lock.release();
    await client.logout();
    return { ok: true, ms: Date.now() - started, total, unseen };
  } catch (e) {
    try { await client.logout(); } catch { /* already closed */ }
    const f = describeMailError(e);
    return { ok: false, ms: Date.now() - started, reason: f.reason, detail: f.detail, code: f.code, fix: f.fix };
  }
}

async function checkSmtp(host: string, port: number, user: string, pass: string): Promise<Check> {
  const started = Date.now();
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 15_000 });
  try {
    await transport.verify();
    return { ok: true, ms: Date.now() - started };
  } catch (e) {
    const f = describeMailError(e);
    return { ok: false, ms: Date.now() - started, reason: f.reason, detail: f.detail, code: f.code, fix: f.fix };
  } finally {
    transport.close();
  }
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const box = mailboxForLogin(user.email);
  if (!box) {
    return NextResponse.json({
      ok: false,
      mailbox: null,
      configuredMailboxes: listMailboxes().length,
      reason: 'No mailbox is mapped to your login.',
      fix: `Add a line to the MAILBOXES env var: ${user.email}|${user.email}|Your Name|<zoho app password>`,
    });
  }

  const passLen = (box.pass || '').length;
  const passLooksPlaceholder = /^\[?SENSITIVE\]?$/i.test(box.pass || '');

  const [imap, smtp] = await Promise.all([
    checkImap(box.imapHost, box.imapPort, box.user, box.pass),
    checkSmtp(box.smtpHost, box.smtpPort, box.user, box.pass),
  ]);

  // When the last inbound message landed, so a silently stalled sync is obvious.
  let lastInboundAt: string | null = null;
  let storedInbox = 0;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('emails')
      .select('occurred_at')
      .eq('mailbox', box.address)
      .eq('folder', 'inbox')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastInboundAt = data?.occurred_at ?? null;
    const { count } = await sb
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('mailbox', box.address)
      .eq('folder', 'inbox');
    storedInbox = count ?? 0;
  }

  const staleHours = lastInboundAt ? (Date.now() - Date.parse(lastInboundAt)) / 3_600_000 : null;

  return NextResponse.json({
    ok: imap.ok && smtp.ok,
    mailbox: { address: box.address, name: box.name },
    credential: {
      length: passLen,
      looksPlaceholder: passLooksPlaceholder,
      note: passLooksPlaceholder
        ? 'The password is a placeholder, not a real app password. Set the real value on the MAILBOXES env var again.'
        : undefined,
    },
    hosts: { imap: `${box.imapHost}:${box.imapPort}`, smtp: `${box.smtpHost}:${box.smtpPort}` },
    imap,
    smtp,
    store: { lastInboundAt, storedInbox, staleHours: staleHours === null ? null : Math.round(staleHours * 10) / 10 },
  });
}
