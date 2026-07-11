/**
 * DB-backed team identity. One row per teammate ties their admin login, partner
 * code, and outbound rep together (see migration 045). This module is NODE-ONLY
 * (it uses node:crypto for scrypt) and must never be imported at the top level of
 * a file that the edge middleware bundles. admin-auth.ts reaches it through a
 * dynamic import inside async functions, so the edge bundle stays clean.
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';

export type TeamRole = 'owner' | 'staff';
export type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  title: string | null;
  active: boolean;
  affiliate_code: string | null;
  rep_name: string | null;
  notify_email: string | null;
  created_at: string;
};

function normEmail(e: string): string {
  return (e || '').trim().toLowerCase();
}

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

/** Active teammate by login email, or null. */
export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from('team_members')
      .select('*')
      .eq('email', normEmail(email))
      .eq('active', true)
      .maybeSingle();
    return (data as TeamMember) ?? null;
  } catch {
    return null;
  }
}

/** All teammates, oldest first, for the team dashboard. Never returns secrets. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data } = await sb
      .from('team_members')
      .select('id,email,name,role,title,active,affiliate_code,rep_name,notify_email,created_at')
      .order('created_at', { ascending: true });
    return (data as TeamMember[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Validate a DB team login. Returns the member (minus secrets) on a correct
 * password, else null. Safe against unknown emails and null hashes.
 */
export async function checkTeamCredentials(
  email: string,
  password: string,
): Promise<{ email: string; name: string; role: TeamRole } | null> {
  const m = await getTeamMemberByEmail(email);
  if (!m || !m.active) return null;
  if (!verifyPassword(password, (m as TeamMember & { password_hash?: string }).password_hash)) return null;
  return { email: m.email, name: m.name, role: m.role === 'owner' ? 'owner' : 'staff' };
}
