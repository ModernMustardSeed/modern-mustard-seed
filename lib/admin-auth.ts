import { cookies } from 'next/headers';

const COOKIE_NAME = 'mms_admin';
const SESSION_DAYS = 7;

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET not configured');
  }
  return s;
}

// ── Edge-compatible HMAC + base64url using Web Crypto ─────────────

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToString(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return decodeURIComponent(escape(atob(padded)));
}

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bufferToBase64Url(sig);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Team + roles ─────────────
//
// The owner (Sarah) is the ADMIN_EMAIL / ADMIN_PASSWORD pair. Additional staff
// (e.g. an assistant) are configured in the ADMIN_TEAM env var so each person
// logs in as themselves. Format: one user per line (or separated by ";;"), each
//   email|password|Full Name|role
// where role is "owner" or "staff" (defaults to staff). Example:
//   ADMIN_TEAM="polly@modernmustardseed.com|TempPass!|Polly Thompson|staff"
// Roles are resolved at read time, so existing sessions keep working.

export type AdminRole = 'owner' | 'staff';
export type AdminUser = { email: string; name: string; role: AdminRole };

function ownerUser(): AdminUser | null {
  const email = process.env.ADMIN_EMAIL;
  if (!email) return null;
  return { email: email.toLowerCase().trim(), name: process.env.ADMIN_NAME || 'Sarah Scarano', role: 'owner' };
}

type TeamCredential = AdminUser & { password: string };

function parseTeam(): TeamCredential[] {
  const raw = process.env.ADMIN_TEAM;
  if (!raw) return [];
  return raw
    .split(/;;|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, password, name, role] = line.split('|').map((s) => (s ?? '').trim());
      if (!email || !password) return null;
      return {
        email: email.toLowerCase(),
        password,
        name: name || email.split('@')[0],
        role: role === 'owner' ? 'owner' : 'staff',
      } as TeamCredential;
    })
    .filter((u): u is TeamCredential => u !== null);
}

/** Everyone who can sign in, owner first. Used to resolve names + roles. */
export function listAdminUsers(): AdminUser[] {
  const owner = ownerUser();
  const team = parseTeam().map(({ password: _pw, ...u }) => u);
  return [...(owner ? [owner] : []), ...team];
}

/**
 * Resolve the full user (name + role) for a signed-in session email, env only.
 * Synchronous, safe for the few display-only call sites. For anything that gates
 * access or must recognize a DB teammate, use resolveAdminUserAsync.
 */
export function resolveAdminUser(email: string): AdminUser {
  const e = email.toLowerCase().trim();
  const match = listAdminUsers().find((u) => u.email === e);
  return match ?? { email: e, name: e.split('@')[0], role: 'staff' };
}

/**
 * Resolve a signed-in user across BOTH the env team and the DB team_members
 * table (the unified identity, migration 045). The DB module is node-only and
 * pulled in via dynamic import so the edge middleware never bundles it. An
 * unknown email falls back to least privilege ('staff'), so a lookup miss can
 * only ever under-grant, never over-grant.
 */
export async function resolveAdminUserAsync(email: string): Promise<AdminUser> {
  const e = email.toLowerCase().trim();
  const envMatch = listAdminUsers().find((u) => u.email === e);
  if (envMatch) return envMatch;
  try {
    const { getTeamMemberByEmail } = await import('@/lib/team-members');
    const m = await getTeamMemberByEmail(e);
    if (m) return { email: m.email, name: m.name, role: m.role === 'owner' ? 'owner' : 'staff' };
  } catch {
    /* DB unavailable -> fall through to least privilege */
  }
  return { email: e, name: e.split('@')[0], role: 'staff' };
}

// ── Public API ─────────────

export type Session = { email: string; expires: number };

export async function createToken(email: string): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${email}:${expires}`;
  const sig = await hmacSign(payload);
  return `${stringToBase64Url(payload)}.${sig}`;
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const payload = base64UrlToString(payloadB64);
    // A magic sign-in token must never be accepted as a session cookie.
    if (payload.startsWith('magic:')) return null;
    const expected = await hmacSign(payload);
    if (!timingSafeEqualStr(sig, expected)) return null;
    const idx = payload.lastIndexOf(':');
    if (idx < 0) return null;
    const email = payload.slice(0, idx);
    const expires = Number(payload.slice(idx + 1));
    if (!email || !expires || Date.now() > expires) return null;
    return { email, expires };
  } catch {
    return null;
  }
}

/**
 * Validate a sign-in against the ENV credentials only (ADMIN_EMAIL/PASSWORD and
 * legacy ADMIN_TEAM). Synchronous and edge-safe. The DB team_members check
 * (which needs node:crypto to verify the password) lives in lib/team-password.ts
 * and is called separately by the login route, so node:crypto never reaches the
 * edge middleware bundle through this file.
 */
export function checkCredentials(email: string, password: string): AdminUser | null {
  const e = email.toLowerCase().trim();

  // Owner: the original ADMIN_EMAIL / ADMIN_PASSWORD pair.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (
    adminEmail &&
    adminPassword &&
    timingSafeEqualStr(e, adminEmail.toLowerCase().trim()) &&
    timingSafeEqualStr(password, adminPassword)
  ) {
    return { email: e, name: process.env.ADMIN_NAME || 'Sarah Scarano', role: 'owner' };
  }

  // Team members from ADMIN_TEAM (legacy env).
  for (const u of parseTeam()) {
    if (timingSafeEqualStr(e, u.email) && timingSafeEqualStr(password, u.password)) {
      return { email: u.email, name: u.name, role: u.role };
    }
  }
  return null;
}

// ── Passwordless magic sign-in ─────────────
//
// The simple, no-password way in: a teammate asks for a link, we email a short
// lived signed token, clicking it mints a normal session. The token is a
// distinct `magic:` payload so it can never be replayed as a session cookie
// (verifyToken rejects the magic prefix), and it is verified against the known
// team at click time so a removed teammate's link stops working.

const MAGIC_MINUTES = 20;

export async function createMagicToken(email: string): Promise<string> {
  const e = email.toLowerCase().trim();
  const expires = Date.now() + MAGIC_MINUTES * 60 * 1000;
  const payload = `magic:${e}:${expires}`;
  const sig = await hmacSign(payload);
  return `${stringToBase64Url(payload)}.${sig}`;
}

/** Returns the email if the magic token is valid and unexpired, else null. */
export async function verifyMagicToken(token: string): Promise<string | null> {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const payload = base64UrlToString(payloadB64);
    if (!payload.startsWith('magic:')) return null;
    const expected = await hmacSign(payload);
    if (!timingSafeEqualStr(sig, expected)) return null;
    const rest = payload.slice('magic:'.length);
    const idx = rest.lastIndexOf(':');
    if (idx < 0) return null;
    const email = rest.slice(0, idx);
    const expires = Number(rest.slice(idx + 1));
    if (!email || !expires || Date.now() > expires) return null;
    return email;
  } catch {
    return null;
  }
}

/** Is this email allowed to sign in (env owner, legacy ADMIN_TEAM, or DB team)? */
export async function isKnownAdmin(email: string): Promise<boolean> {
  const e = email.toLowerCase().trim();
  if (listAdminUsers().some((u) => u.email === e)) return true;
  try {
    const { getTeamMemberByEmail } = await import('@/lib/team-members');
    return !!(await getTeamMemberByEmail(e));
  } catch {
    return false;
  }
}

export async function setSessionCookie(email: string): Promise<void> {
  const token = await createToken(email);
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** The signed-in admin with their resolved name + role, or null. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const session = await getSession();
  if (!session) return null;
  return resolveAdminUserAsync(session.email);
}

export { COOKIE_NAME };
