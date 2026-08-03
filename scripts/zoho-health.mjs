/**
 * ZOHO MAIL HEALTH CHECK. Read-only, sends nothing.
 *
 * Answers the one question that matters after a billing change: can the app
 * still actually reach the mailboxes, or is it about to fail silently?
 *
 *   node scripts/zoho-health.mjs
 *
 * It matters because Zoho's FREE tier has no IMAP, POP or SMTP. If a paid plan
 * lapses, the mailbox keeps working perfectly in the browser while every
 * programmatic path dies: /admin/inbox stops syncing, and lib/zoho-send.ts
 * stops delivering owner alerts. That failure is invisible from the webmail UI,
 * which is exactly where someone would go to check.
 *
 * Verifies per mailbox:
 *   IMAP  login + INBOX open + message counts (what /admin/inbox reads)
 *   SMTP  auth only, via nodemailer verify(). NO message is sent.
 *
 * Related: mms-team-mail-and-texting, mms-resend-suppression-sarah.
 */
import { readFileSync } from 'node:fs';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

const env = { ...process.env };
try {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* rely on the real environment */ }

/**
 * Same resolution as lib/mailboxes.ts, so this tests what the app actually does.
 *
 * The field that matters: MAILBOXES is `login|address|Name|password`, where
 * `login` is how a teammate signs in to the ADMIN and `address` is the Zoho
 * mailbox. IMAP and SMTP authenticate as the ADDRESS (`user: addr` in
 * mailboxes.ts), never as the login. Polly's admin login is a gmail address, so
 * a check that authenticates with `login` reports her mailbox as having invalid
 * credentials when nothing is wrong with it. Read the app, do not assume.
 */
function resolveMailboxes() {
  const out = [];
  for (const entry of (env.MAILBOXES || '').split(/;;|\r?\n/)) {
    const [login, address, name, pass] = entry.trim().split('|').map((s) => (s || '').trim());
    const addr = (address || login || '').toLowerCase();
    if (!login || !addr || !pass) continue;
    out.push({ login: login.toLowerCase(), mailbox: addr, user: addr, name: name || addr, pass });
  }
  if (!out.length && env.ZOHO_IMAP_USER && env.ZOHO_IMAP_PASSWORD) {
    const addr = env.ZOHO_IMAP_USER.toLowerCase();
    out.push({ login: addr, mailbox: addr, user: addr, name: 'legacy ZOHO_IMAP_*', pass: env.ZOHO_IMAP_PASSWORD });
  }
  return out;
}

const boxes = resolveMailboxes();
if (!boxes.length) {
  console.error('No mailboxes configured. Set MAILBOXES or ZOHO_IMAP_USER/ZOHO_IMAP_PASSWORD.');
  process.exit(1);
}

console.log(`Checking ${boxes.length} mailbox(es). Nothing will be sent.\n`);
let bad = 0;

for (const box of boxes) {
  console.log(`${box.mailbox}  (admin login ${box.login}, auth as ${box.user})`);

  // IMAP: this is what /admin/inbox and the zoho-sync cron depend on.
  let client;
  // Track the stage, because "Command failed" alone cannot distinguish a
  // rejected login (wrong password, or IMAP switched off with the plan) from a
  // login that worked and a mailbox that would not open. Those have completely
  // different fixes, and guessing between them wastes an afternoon.
  let stage = 'connect/login';
  try {
    client = new ImapFlow({
      host: 'imap.zoho.com',
      port: 993,
      secure: true,
      auth: { user: box.user, pass: box.pass },
      logger: false,
      emitLogs: false,
    });
    await client.connect();
    stage = 'open INBOX';
    const lock = await client.getMailboxLock('INBOX');
    try {
      stage = 'status';
      const status = await client.status('INBOX', { messages: true, unseen: true });
      console.log(`  IMAP  OK   ${status.messages} message(s), ${status.unseen} unread`);
    } finally {
      lock.release();
    }
  } catch (e) {
    bad += 1;
    const msg = String(e?.message || e);
    // imapflow puts the server's own words in responseText; that is the line
    // that actually names the cause.
    const server = e?.responseText || e?.response || '';
    console.log(`  IMAP  FAIL at ${stage}: ${msg}${server ? ` | server said: ${server}` : ''}`);
    if (stage === 'connect/login') {
      console.log('        Zoho gives the free tier NO IMAP. If the plan lapsed or is mid-trial,');
      console.log('        re-enable it at Zoho Mail > Settings > Mail Accounts > IMAP Access,');
      console.log('        and confirm the plan is active first. The webmail keeps working either way,');
      console.log('        so this failure is invisible from the browser.');
    }
  } finally {
    try { await client?.logout(); } catch { /* already closed */ }
  }

  // SMTP: auth only. This is the owner-alert delivery path (lib/zoho-send.ts).
  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: { user: box.user, pass: box.pass },
    });
    await transport.verify();
    console.log('  SMTP  OK   authenticated (no message sent)');
  } catch (e) {
    bad += 1;
    console.log(`  SMTP  FAIL ${String(e?.message || e)}`);
  }
  console.log('');
}

console.log(bad === 0 ? 'All Zoho paths healthy.' : `${bad} check(s) FAILED. /admin/inbox and owner alerts are affected.`);
process.exit(bad === 0 ? 0 : 1);
