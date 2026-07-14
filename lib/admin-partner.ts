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
 * Resolve an admin LOGIN to their partner identity. The two can differ:
 * Polly signs in with a gmail but her affiliate row lives under her
 * @modernmustardseed.com address. Join order:
 *  1. team_members by login email (the ONE-identity table), then its code.
 *  2. team_members by NAME, for the env-owner login whose email is not a
 *     team_members row (same rule the outbound reps use to match admins).
 *  3. affiliates by the login email directly.
 */
export async function resolveAdminPartner(user: AdminUser): Promise<AdminPartner | null> {
  const member = await getTeamMemberByEmail(user.email);
  if (member?.affiliate_code) {
    const p = await partnerFromCode(member.affiliate_code, member.name || user.name);
    if (p) return p;
  }

  if (!member && user.name) {
    try {
      const members = await listTeamMembers();
      const byName = members.find(
        (m: TeamMember) => m.active && m.affiliate_code && m.name.trim().toLowerCase() === user.name.trim().toLowerCase(),
      );
      if (byName?.affiliate_code) {
        const p = await partnerFromCode(byName.affiliate_code, byName.name);
        if (p) return p;
      }
    } catch {
      /* fall through */
    }
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
