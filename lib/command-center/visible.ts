import type { SupabaseClient } from '@supabase/supabase-js';
import { projectForEmail, type ClientProject } from '@/lib/client-leads';
import { getClientSession } from '@/lib/client-auth';

/**
 * BUILT BEFORE IT IS BOUGHT. Every Command Center card and route checks this
 * first. Off by default: a client sees nothing of it until Sarah presses
 * "Show the Command Center" on the desk, which she does once they have
 * approved and paid. The desk always sees it, and so does Sarah when she
 * looks at their portal as them from the admin: every card and route opens
 * for her, and nothing changes for the client.
 */
export async function commandCenterVisible(sb: SupabaseClient, email: string): Promise<boolean> {
  try {
    const { data } = await sb.from('client_command_center').select('visible').eq('client_email', email.toLowerCase()).maybeSingle();
    return Boolean(data?.visible);
  } catch {
    return false;
  }
}

/** True when this request is Sarah looking at this client's portal from her admin session. */
export async function lookingAs(email: string): Promise<boolean> {
  try {
    const s = await getClientSession();
    return Boolean(s?.preview && s.email === email.toLowerCase());
  } catch {
    return false; // outside a request (a cron): never a preview
  }
}

/** The project, only when the client may see their Command Center, or Sarah is looking as them. */
export async function visibleProject(sb: SupabaseClient, email: string): Promise<ClientProject | null> {
  const project = projectForEmail(email);
  if (!project) return null;
  if (await lookingAs(email)) return project;
  return (await commandCenterVisible(sb, email)) ? project : null;
}

export async function setCommandCenterVisible(sb: SupabaseClient, email: string, visible: boolean, by: string): Promise<void> {
  await sb.from('client_command_center').upsert({ client_email: email.toLowerCase(), visible, shown_at: visible ? new Date().toISOString() : null, shown_by: visible ? by : null, updated_at: new Date().toISOString() }, { onConflict: 'client_email' });
}
