import type { SupabaseClient } from '@supabase/supabase-js';
import { CLIENT_PROJECTS, type ClientProject } from '@/lib/client-leads';
import { commandCenterVisible } from '@/lib/command-center/visible';
import { normalizeEmail } from '@/lib/client-auth';

/**
 * WHO MAY OPEN A COMMAND CENTER, and as whom.
 *
 * A business is one account, not one inbox. Built Right is Shan's email on the
 * project and Carmen's on the office; either signs in, and both land in the
 * same Command Center, because the data is keyed to the project's one address.
 */

export type CcAccount = {
  /** The address that was typed. */
  typed: string;
  /** The address every row is keyed to. */
  clientEmail: string;
  /** Their first name, when the project names them. */
  person: string | null;
  project: ClientProject;
};

export function accountForEmail(email: string): CcAccount | null {
  const typed = normalizeEmail(email);
  for (const project of Object.values(CLIENT_PROJECTS)) {
    if (normalizeEmail(project.clientEmail) === typed) {
      const named = Object.values(project.people ?? {}).find((p) => normalizeEmail(p.email) === typed);
      return { typed, clientEmail: project.clientEmail, person: named?.name ?? null, project };
    }
    const person = Object.values(project.people ?? {}).find((p) => normalizeEmail(p.email) === typed);
    if (person) return { typed, clientEmail: project.clientEmail, person: person.name, project };
  }
  return null;
}

/** The account behind a live session. Null when their Command Center is off. */
export async function accountForSession(sb: SupabaseClient, email: string, preview = false): Promise<CcAccount | null> {
  const account = accountForEmail(email);
  if (!account) return null;
  if (preview) return account; // Sarah, looking as them, sees it before they do
  return (await commandCenterVisible(sb, account.clientEmail)) ? account : null;
}

/** The brand the Command Center wears: theirs, never ours. */
export function brandFor(project: ClientProject) {
  return {
    business: project.business,
    name: project.office.name,
    logo: project.office.logo,
    logoOnDark: project.office.logoOnDark,
    colors: project.office.colors,
    siteUrl: project.publicUrl || project.siteUrl,
    guideName: project.office.guideName,
  };
}
