/**
 * DB-backed team identity, QUERY side only (migration 045). This module is
 * reachable from admin-auth.ts (which the edge middleware imports), so it must
 * stay edge-safe: NO node:crypto, NO node-only APIs. Password hashing/verifying
 * lives in lib/team-password.ts, which only node routes import.
 */
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

/** Active teammate by login email (includes password_hash for the credential
 *  check in team-password.ts), or null. */
export async function getTeamMemberByEmail(email: string): Promise<(TeamMember & { password_hash?: string | null }) | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from('team_members')
      .select('*')
      .eq('email', normEmail(email))
      .eq('active', true)
      .maybeSingle();
    return (data as TeamMember & { password_hash?: string | null }) ?? null;
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
