/**
 * Who gets the "something happened" heads-up (a new partner, lead, sale, client,
 * or message). Sarah's @modernmustardseed.com mailbox is the mailbox of record,
 * but she lives in her Gmail, and the Zoho mailbox is easy to miss. So every
 * owner notification goes to BOTH.
 *
 * The instrumented resendClient() in lib/send-email.ts splits the recipients on
 * its own: the @modernmustardseed.com address is delivered through Zoho (lands
 * reliably, never caught by Resend suppression) and the Gmail goes through
 * Resend, so this one array reaches her in both inboxes with a single send call.
 *
 * Use OWNER_NOTIFY_TO as the `to:` on any internal owner-notification email.
 */
export const OWNER_NOTIFY_TO = [
  'sarah@modernmustardseed.com',
  'makeourcitypretty@gmail.com',
  'wildhopehouse@gmail.com',
];
