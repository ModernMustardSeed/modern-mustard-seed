import { getSupabase } from '@/lib/supabase';
import { byId } from '@/data/proposal-menu';

type Line = { id: string; scope?: string[] };

/**
 * Turn an accepted proposal into live records on both sides:
 *  - upsert a client (keyed by email) so the client portal recognizes them
 *  - create a project seeded from the proposal (deliverables become milestones)
 * Idempotent: a proposal only ever creates one project (tracked by project_id).
 * Both the admin Projects board and the client portal read these same tables.
 */
export async function provisionFromProposal(proposalId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: p } = await supabase.from('proposals').select('*').eq('id', proposalId).maybeSingle();
  if (!p || !p.client_email) return;
  const email = String(p.client_email).toLowerCase().trim();

  // 1. Client record (so they appear in the portal by email).
  try {
    await supabase
      .from('clients')
      .upsert(
        {
          email,
          name: (p.client_name as string) || null,
          company: (p.client_company as string) || null,
          status: 'active',
        },
        { onConflict: 'email' }
      );
  } catch (err) {
    console.error('provision: client upsert failed', err);
  }

  // 2. Project, once. Deliverables come from the proposal's chosen services.
  if (!p.project_id) {
    const lines: Line[] = Array.isArray(p.lines) ? p.lines : [];
    const milestones = lines.map((l) => ({
      title: byId(l.id)?.name ?? l.id,
      done: false,
    }));
    const name = `${(p.client_company as string) || (p.client_name as string) || 'New'} build`;
    try {
      const { data: proj } = await supabase
        .from('projects')
        .insert({
          client_email: email,
          name,
          status: 'discovery',
          summary: (p.situation as string) || null,
          progress: 0,
          milestones,
        })
        .select('id')
        .single();
      if (proj) {
        await supabase.from('proposals').update({ project_id: proj.id }).eq('id', proposalId);
      }
    } catch (err) {
      console.error('provision: project create failed', err);
    }
  }
}
