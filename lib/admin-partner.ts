import { getSupabase } from '@/lib/supabase';
import { getTeamMemberByEmail, listTeamMembers, type TeamMember } from '@/lib/team-members';
import { getAffiliateByEmail } from '@/lib/affiliate';
import type { AdminUser } from '@/lib/admin-auth';

export type AdminPartner = { code: string; partnerEmail: string; name: string };

async function partnerFromCode(code: string, fallbackName: string): Promise<AdminPartner | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from('affiliates')
      .select('email,name,code,status')
      .eq('code', code)
      .maybeSingle();
    if (data && data.status === 'approved' && data.code) {
      return { code: data.code as string, partnerEmail: data.email as string, name: fallbackName || (data.name as string) };
    }
  } catch {
    /* affiliate row unreadable */
  }
  return null;
}

/**
 * Resolve an admin LOGIN to their team_members row. Login email first (the
 * ONE-identity table), then NAME, for logins whose email is not a
 * team_members row (the env owner, legacy ADMIN_TEAM entries). Same rule the
 * outbound reps use to match admins.
 */
export async function resolveAdminTeamMember(user: AdminUser): Promise<TeamMember | null> {
  const member = await getTeamMemberByEmail(user.email);
  if (member) return member;
  if (!user.name) return null;
  try {
    const members = await listTeamMembers();
    return (
      members.find(
        (m: TeamMember) => m.active && m.name.trim().toLowerCase() === user.name.trim().toLowerCase(),
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Resolve an admin LOGIN to their partner identity. The two can differ:
 * Polly signs in with a gmail but her affiliate row lives under her
 * @modernmustardseed.com address. Join order: team_members (email, then
 * name) to its affiliate code, then affiliates by the login email directly.
 */
export async function resolveAdminPartner(user: AdminUser): Promise<AdminPartner | null> {
  const member = await resolveAdminTeamMember(user);
  if (member?.affiliate_code) {
    const p = await partnerFromCode(member.affiliate_code, member.name || user.name);
    if (p) return p;
  }

  try {
    const aff = await getAffiliateByEmail(user.email);
    if (aff && aff.status === 'approved' && aff.code) {
      return { code: aff.code, partnerEmail: aff.email, name: aff.name || user.name };
    }
  } catch {
    /* not a partner */
  }
  return null;
}
