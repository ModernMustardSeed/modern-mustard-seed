import { cookies } from 'next/headers';

/**
 * THE COMMAND CENTER'S DOOR. A six digit code, emailed, typed in.
 *
 * Why a code and not the portal's magic link: this is a separate product with
 * a separate price, and it should feel like one. A code is also the only shape
 * that survives a client reading mail on their phone and working on a laptop,
 * because they read it there and type it here.
 *
 * No table. The challenge lives in a signed, httpOnly cookie holding the
 * email, a hash of the code, an attempt count and an expiry, so a stolen
 * cookie is worth nothing without the code and a stolen code is worth nothing
 * without the cookie. Five wrong tries burns it.
 */

const CHALLENGE_COOKIE = 'mms_cc_try';
const CODE_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function getSecret(): string {
  const s = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('CLIENT_SESSION_SECRET (or ADMIN_SESSION_SECRET) not configured');
  return s;
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

/** The code is never stored, only this. */
async function hashCode(email: string, code: string): Promise<string> {
  return sign(`cc-code:${email}:${code}`);
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function newCode(): string {
  // Crypto random, no leading zero lost: 100000 to 999999.
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900_000;
  return String(100_000 + n);
}

type Challenge = { email: string; hash: string; expires: number; tries: number };

function encodeChallenge(c: Challenge): string {
  return `${c.email}|${c.hash}|${c.expires}|${c.tries}`;
}

function decodeChallenge(s: string): Challenge | null {
  const [email, hash, expires, tries] = s.split('|');
  if (!email || !hash || !expires) return null;
  return { email, hash, expires: Number(expires), tries: Number(tries ?? 0) };
}

async function writeChallenge(c: Challenge): Promise<void> {
  const body = encodeChallenge(c);
  const token = `${btoa(body).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.${await sign(body)}`;
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CODE_MINUTES * 60,
  });
}

async function readChallenge(): Promise<Challenge | null> {
  const jar = await cookies();
  const token = jar.get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  const [b, sig] = token.split('.');
  if (!b || !sig) return null;
  try {
    const padded = b.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b.length / 4) * 4, '=');
    const body = atob(padded);
    if (!equal(sig, await sign(body))) return null;
    const c = decodeChallenge(body);
    if (!c || Date.now() > c.expires) return null;
    return c;
  } catch {
    return null;
  }
}

export async function clearChallenge(): Promise<void> {
  const jar = await cookies();
  jar.delete(CHALLENGE_COOKIE);
}

/** Start a sign-in. Returns the code to email; nothing else ever sees it. */
export async function startChallenge(email: string): Promise<string> {
  const code = newCode();
  await writeChallenge({ email, hash: await hashCode(email, code), expires: Date.now() + CODE_MINUTES * 60 * 1000, tries: 0 });
  return code;
}

export type CheckResult = { ok: true; email: string } | { ok: false; error: string };

/** Check a typed code against the open challenge. Consumes it on success. */
export async function checkChallenge(email: string, code: string): Promise<CheckResult> {
  const c = await readChallenge();
  if (!c) return { ok: false, error: 'That code has expired. Send a new one.' };
  if (c.email !== email) return { ok: false, error: 'That code was sent to a different address.' };
  if (c.tries >= MAX_ATTEMPTS) {
    await clearChallenge();
    return { ok: false, error: 'Too many tries. Send a new code.' };
  }
  const given = code.replace(/\D/g, '');
  if (given.length !== 6 || !equal(c.hash, await hashCode(email, given))) {
    await writeChallenge({ ...c, tries: c.tries + 1 });
    const left = MAX_ATTEMPTS - (c.tries + 1);
    return { ok: false, error: left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many tries. Send a new code.' };
  }
  await clearChallenge();
  return { ok: true, email };
}

/** The sign-in email. Plain, big code, no marketing. */
export function ccCodeEmail({ code, link, business, brand }: { code: string; link?: string | null; business: string; brand?: { ink?: string; accent?: string } }): string {
  const ink = brand?.ink ?? '#161616';
  const accent = brand?.accent ?? '#1E50C8';
  const tap = link
    ? `<tr><td style="padding:4px 32px 0" align="center">
          <a href="${link}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font:700 15px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:15px 26px;border-radius:10px">Open it on this device</a>
          <div style="font:400 13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8b949e;padding-top:10px">Reading this on your phone? Tap the button and skip the code.</div>
        </td></tr>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e6e8ec">
        <tr><td style="padding:32px 32px 8px;font:600 13px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${accent}">${business} Command Center</td></tr>
        <tr><td style="padding:0 32px 4px;font:400 22px/1.3 Georgia,'Times New Roman',serif;color:${ink}">Your sign-in code</td></tr>
        <tr><td style="padding:16px 32px 8px">
          <div style="font:700 40px/1.1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.22em;color:${ink};background:#f7f8fa;border:1px solid #e6e8ec;border-radius:12px;padding:18px 12px;text-align:center">${code}</div>
        </td></tr>
        ${tap}
        <tr><td style="padding:12px 32px 32px;font:400 14px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#57606a">
          Type it into the sign-in screen. It works once and expires in 15 minutes.
          <br><br>If you did not ask for it, nothing happened and you can ignore this.
        </td></tr>
      </table>
      <div style="font:400 12px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8b949e;padding:16px">Built and run by <a href="https://modernmustardseed.com" style="color:#8b949e">Modern Mustard Seed</a></div>
    </td></tr>
  </table>
</body></html>`;
}
