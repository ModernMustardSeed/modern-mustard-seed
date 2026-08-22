/**
 * Readable reasons for Zoho IMAP/SMTP failures.
 *
 * ImapFlow throws `Error: Command failed` for a rejected login and keeps the real
 * server text on `responseText`/`serverResponseCode`. Nodemailer does the same on
 * `code`/`responseCode`/`response`. Reporting only `error.message` turned a three
 * day mail outage into the single word "Command failed", so every mail path now
 * runs its error through here before it is stored or shown.
 */

export type MailFailure = {
  /** One line, safe to render in the admin. */
  reason: string;
  /** Raw server text, kept for the diagnose panel. */
  detail?: string;
  /** IMAP serverResponseCode or SMTP code, when the server gave one. */
  code?: string;
  /** True when the server rejected the username or app password. */
  auth: boolean;
  /** What to actually do about it. */
  fix?: string;
};

const AUTH_FIX =
  'Zoho rejected the mailbox password. IMAP and SMTP are paid-plan only: open Zoho Mail ' +
  'Settings > Mail Accounts > IMAP (and SMTP) and switch access on, then Settings > Security > ' +
  'App Passwords and generate a fresh app password. Put the new password in the MAILBOXES env ' +
  'var and redeploy.';

const IMAP_DISABLED_FIX =
  'Zoho is refusing IMAP for this mailbox. Turn it on at Zoho Mail Settings > Mail Accounts > ' +
  'IMAP Access, then retry. A plan that lapsed to the free tier switches this off.';

function pick(e: unknown, key: string): string | undefined {
  if (!e || typeof e !== 'object') return undefined;
  const v = (e as Record<string, unknown>)[key];
  if (v === undefined || v === null || v === '') return undefined;
  return String(v);
}

/** Turn any thrown mail error into something a human can act on. */
export function describeMailError(e: unknown): MailFailure {
  const message = e instanceof Error ? e.message : String(e);
  const responseText = pick(e, 'responseText') || pick(e, 'response');
  const serverCode = pick(e, 'serverResponseCode');
  const smtpCode = pick(e, 'responseCode');
  const errno = pick(e, 'code');
  const code = serverCode || errno || smtpCode;
  const detail = responseText || undefined;
  const haystack = `${message} ${responseText ?? ''} ${serverCode ?? ''} ${errno ?? ''}`.toUpperCase();

  const authFailed =
    pick(e, 'authenticationFailed') === 'true' ||
    serverCode === 'AUTHENTICATIONFAILED' ||
    errno === 'EAUTH' ||
    smtpCode === '535' ||
    /AUTHENTICATION\s*FAILED|INVALID\s*(USER|CREDENTIAL|PASSWORD)|LOGIN\s*(DENIED|FAILED)|BAD\s*CREDENTIAL/.test(haystack);

  if (authFailed) {
    return { reason: 'Zoho rejected the mailbox credentials.', detail, code, auth: true, fix: AUTH_FIX };
  }
  if (/IMAP.*(DISABLED|NOT\s*(ENABLED|ALLOWED|SUPPORTED))|ACCESS\s*DENIED|PLAN|UPGRADE/.test(haystack)) {
    return { reason: 'Zoho is not allowing IMAP on this mailbox.', detail, code, auth: false, fix: IMAP_DISABLED_FIX };
  }
  if (errno === 'ENOTFOUND' || errno === 'EAI_AGAIN') {
    return {
      reason: 'The mail host could not be resolved.',
      detail, code, auth: false,
      fix: 'ZOHO_IMAP_HOST / ZOHO_SMTP_HOST is wrong or reads "[SENSITIVE]" from a clobbered env pull. It should be imap.zoho.com and smtp.zoho.com.',
    };
  }
  if (errno === 'ECONNREFUSED' || errno === 'ETIMEDOUT' || errno === 'ESOCKET' || /TIMED?\s*OUT/.test(haystack)) {
    return { reason: 'Could not reach the Zoho mail server.', detail, code, auth: false, fix: 'Network or port problem. IMAP is 993 and SMTP is 465, both TLS.' };
  }
  if (message === 'Command failed' && !detail) {
    return { reason: 'Zoho refused the command without giving a reason (usually a rejected login).', code, auth: false, fix: AUTH_FIX };
  }
  return { reason: message || 'Mail error', detail, code, auth: false };
}

/** One-line form for logs and the sync result's `error` field. */
export function mailErrorLine(e: unknown): string {
  const f = describeMailError(e);
  return f.detail ? `${f.reason} (${f.detail})` : f.reason;
}
