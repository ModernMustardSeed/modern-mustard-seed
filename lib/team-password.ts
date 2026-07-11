/**
 * Team password hashing + credential check. NODE-ONLY (uses node:crypto), so it
 * must never be imported by anything the edge middleware bundles. Only node
 * routes (the login route, the team admin route) import it. admin-auth.ts does
 * NOT import this module, which is what keeps node:crypto out of the edge bundle.
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { getTeamMemberByEmail, type TeamRole } from '@/lib/team-members';

/** scrypt hash as "salt:hash" (both hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Constant-time verify against a stored "salt:hash". */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Validate a DB team login. Returns the member (no secrets) or null. */
export async function checkTeamCredentials(
  email: string,
  password: string,
): Promise<{ email: string; name: string; role: TeamRole } | null> {
  const m = await getTeamMemberByEmail(email);
  if (!m || !m.active) return null;
  if (!verifyPassword(password, m.password_hash)) return null;
  return { email: m.email, name: m.name, role: m.role === 'owner' ? 'owner' : 'staff' };
}
