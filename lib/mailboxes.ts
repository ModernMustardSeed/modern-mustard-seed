/**
 * Team mailbox registry. Maps each admin login to the Zoho mailbox they send and
 * receive from inside the admin, so Sarah works her sarah@ inbox and Polly works
 * her polly.thompson@ inbox without ever opening Zoho's webmail.
 *
 * Configured by the MAILBOXES env var, one mailbox per line (or ";;"-separated):
 *   loginEmail|mailboxAddress|Display Name|zohoAppPassword
 * where loginEmail is how they sign in to the admin (Sarah's is her ADMIN_EMAIL,
 * Polly's is her gmail login), mailboxAddress is the Zoho address, and the app
 * password is a Zoho "Application-Specific Password" (works for both IMAP + SMTP).
 * Example:
 *   MAILBOXES="sarah@modernmustardseed.com|sarah@modernmustardseed.com|Sarah Scarano|abcд1234;;thompsonpolly71@gmail.com|polly.thompson@modernmustardseed.com|Polly Thompson|efgh5678"
 *
 * Falls back to the legacy single ZOHO_IMAP_USER / ZOHO_IMAP_PASSWORD (Sarah's
 * mailbox) so the correspondence sync keeps working before MAILBOXES is set.
 */

export type Mailbox = {
  /** The email a teammate signs in to the admin with. */
  login: string;
  /** The Zoho address this mailbox sends + receives as. */
  address: string;
  /** Friendly display name for the From header. */
  name: string;
  /** IMAP/SMTP username (the mailbox address). */
  user: string;
  /** Zoho app-specific password. */
  pass: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
};

function hosts() {
  return {
    imapHost: process.env.ZOHO_IMAP_HOST || 'imap.zoho.com',
    imapPort: Number(process.env.ZOHO_IMAP_PORT || 993),
    smtpHost: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
    smtpPort: Number(process.env.ZOHO_SMTP_PORT || 465),
  };
}

/** All configured mailboxes. Empty if neither MAILBOXES nor the legacy vars are set. */
export function listMailboxes(): Mailbox[] {
  const h = hosts();
  const raw = process.env.MAILBOXES;
  if (raw && raw.trim()) {
    return raw
      .split(/;;|\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [login, address, name, pass] = line.split('|').map((s) => (s ?? '').trim());
        const addr = (address || login).toLowerCase();
        if (!login || !addr || !pass) return null;
        return {
          login: login.toLowerCase(),
          address: addr,
          name: name || addr.split('@')[0],
          user: addr,
          pass,
          ...h,
        } as Mailbox;
      })
      .filter((m): m is Mailbox => m !== null);
  }

  // Legacy fallback: Sarah's single Zoho mailbox via the old IMAP vars.
  const user = process.env.ZOHO_IMAP_USER;
  const pass = process.env.ZOHO_IMAP_PASSWORD;
  if (user && pass) {
    const address = user.toLowerCase();
    const login = (process.env.ADMIN_EMAIL || address).toLowerCase();
    return [{
      login,
      address,
      name: process.env.ADMIN_NAME || 'Sarah Scarano',
      user: address,
      pass,
      ...h,
    }];
  }
  return [];
}

/** The mailbox a signed-in admin owns, matched by their login email. */
export function mailboxForLogin(loginEmail: string): Mailbox | null {
  const e = (loginEmail || '').toLowerCase().trim();
  const all = listMailboxes();
  return all.find((m) => m.login === e) || all.find((m) => m.address === e) || null;
}

/** A mailbox matched by its address (used when routing inbound mail). */
export function mailboxByAddress(address: string): Mailbox | null {
  const a = (address || '').toLowerCase().trim();
  return listMailboxes().find((m) => m.address === a) || null;
}

export function mailboxesConfigured(): boolean {
  return listMailboxes().length > 0;
}
