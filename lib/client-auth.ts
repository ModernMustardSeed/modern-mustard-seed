import { cookies } from 'next/headers';
import { getSession as getAdminSession } from '@/lib/admin-auth';

/**
 * Client portal auth. Passwordless: a visitor enters their email, we email a
 * signed magic link, clicking it sets a 30-day session cookie. Same edge-safe
 * HMAC approach as admin-auth, but a separate cookie and secret, and a short
 * lived "magic" token type that cannot be replayed as a session.
 *
 * Identity is just the email. What a given client can see is scoped by that
 * email in every query (their orders, their projects, their files, their calls).
 */

const COOKIE_NAME = 'mms_client';
const SESSION_DAYS = 30;
const MAGIC_MINUTES = 20;

// Sarah looking at a client's portal as they see it. Honoured only while her own
// admin session is valid too, so a look pass copied off her machine opens nothing.
const LOOK_COOKIE = 'mms_client_look';
const LOOK_HOURS = 8;

function getSecret(): string {
  const s = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('CLIENT_SESSION_SECRET (or ADMIN_SESSION_SECRET) not configured');
  }
  return s;
}

// ── Edge-compatible base64url + HMAC (Web Crypto) ─────────────────

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToString(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return decodeURIComponent(escape(atob(padded)));
}

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bufferToBase64Url(sig);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// ── Token core. `kind` ('sess' | 'magic') keeps the two non-interchangeable ──

async function makeToken(kind: 'sess' | 'magic' | 'look', email: string, expires: number): Promise<string> {
  const payload = `${kind}:${normalizeEmail(email)}:${expires}`;
  const sig = await hmacSign(payload);
  return `${stringToBase64Url(payload)}.${sig}`;
}

async function readToken(kind: 'sess' | 'magic' | 'look', token: string): Promise<{ email: string; expires: number } | null> {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const payload = base64UrlToString(payloadB64);
    const expected = await hmacSign(payload);
    if (!timingSafeEqualStr(sig, expected)) return null;
    const parts = payload.split(':');
    if (parts.length !== 3 || parts[0] !== kind) return null;
    const email = parts[1];
    const expires = Number(parts[2]);
    if (!email || !expires || Date.now() > expires) return null;
    return { email, expires };
  } catch {
    return null;
  }
}

// ── Public API ─────────────────

/** preview: true when Sarah is looking as this client from her admin session. */
export type ClientSession = { email: string; expires: number; preview?: boolean };

export async function createMagicToken(email: string): Promise<string> {
  return makeToken('magic', email, Date.now() + MAGIC_MINUTES * 60 * 1000);
}

export async function verifyMagicToken(token: string): Promise<ClientSession | null> {
  return readToken('magic', token);
}

export async function setClientSessionCookie(email: string): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = await makeToken('sess', email, expires);
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearClientSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getClientSession(): Promise<ClientSession | null> {
  const c = await cookies();
  const look = c.get(LOOK_COOKIE)?.value;
  if (look) {
    const as = await readToken('look', look);
    if (as && (await getAdminSession())) return { ...as, preview: true };
  }
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return readToken('sess', token);
}

/** Start looking at a client's portal as them. Admin routes only. */
export async function setLookCookie(email: string): Promise<void> {
  const expires = Date.now() + LOOK_HOURS * 60 * 60 * 1000;
  const token = await makeToken('look', email, expires);
  const c = await cookies();
  c.set(LOOK_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: LOOK_HOURS * 60 * 60 });
}

export async function clearLookCookie(): Promise<void> {
  const c = await cookies();
  c.delete(LOOK_COOKIE);
}

/** For middleware: verify a raw look token (edge runtime). The caller checks the admin cookie as well. */
export async function verifyLookToken(token: string): Promise<ClientSession | null> {
  return readToken('look', token);
}

/** For middleware: verify a raw session token string (edge runtime). */
export async function verifyClientToken(token: string): Promise<ClientSession | null> {
  return readToken('sess', token);
}

export { COOKIE_NAME as CLIENT_COOKIE_NAME, LOOK_COOKIE as CLIENT_LOOK_COOKIE_NAME, normalizeEmail };
