import type { SupabaseClient } from '@supabase/supabase-js';
import { projectForEmail, type ClientProject } from '@/lib/client-leads';

/**
 * BUILT BEFORE IT IS BOUGHT. Every Command Center card and route checks this
 * first. Off by default: a client sees nothing of it until Sarah presses
 * "Show the Command Center" on the desk, which she does once they have
 * approved and paid. The desk always sees it.
 */
export async function commandCenterVisible(sb: SupabaseClient, email: string): Promise<boolean> {
  try {
    const { data } = await sb.from('client_command_center').select('visible').eq('client_email', email.toLowerCase()).maybeSingle();
    return Boolean(data?.visible);
  } catch {
    return false;
  }
}

/** The project, only when the client may see their Command Center. */
export async function visibleProject(sb: SupabaseClient, email: string): Promise<ClientProject | null> {
  const project = projectForEmail(email);
  if (!project) return null;
  return (await commandCenterVisible(sb, email)) ? project : null;
}

export async function setCommandCenterVisible(sb: SupabaseClient, email: string, visible: boolean, by: string): Promise<void> {
  await sb.from('client_command_center').upsert({ client_email: email.toLowerCase(), visible, shown_at: visible ? new Date().toISOString() : null, shown_by: visible ? by : null, updated_at: new Date().toISOString() }, { onConflict: 'client_email' });
}
