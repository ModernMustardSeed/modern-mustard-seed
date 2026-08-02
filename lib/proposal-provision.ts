import { getSupabase } from '@/lib/supabase';
import { byId } from '@/data/proposal-menu';
import { cleanDemoLinks } from '@/lib/proposal-links';

type Line = { id: string; scope?: string[] };

/** The same promise a demo buyer gets: two free edits before it goes live. */
const PROPOSAL_REVISIONS_INCLUDED = 2;

/**
 * Turn an accepted proposal into live records on both sides, with FULL parity
 * with the demo funnel's delivery spine:
 *  - upsert a client (keyed by email) so the client portal recognizes them
 *  - create a project seeded from the proposal (deliverables become milestones)
 *    with the same two-free-edits budget a demo buyer gets
 *  - seed the demos we forged for them as client_files, so their portal opens
 *    on the thing that sold them, not an empty shell
 *  - mint a client_products ownership card so they appear in the unified layer
 *    (the client book, the delivery board) like every other buyer
 *
 * Idempotent everywhere: the project via proposals.project_id, the product card
 * via its order_session_id, the files deduped by URL. Every step is best-effort;
 * a hiccup logs loudly and moves on (this runs inside sign + webhook paths that
 * must never fail after the money).
 */
export async function provisionFromProposal(proposalId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: p } = await supabase.from('proposals').select('*').eq('id', proposalId).maybeSingle();
  if (!p || !p.client_email) return;
  const email = String(p.client_email).toLowerCase().trim();
  const lines: Line[] = Array.isArray(p.lines) ? p.lines : [];
  const serviceNames = lines.map((l) => byId(l.id)?.name ?? l.id);

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
  //    The revision budget is set ONLY on insert so a replay can never refill it.
  let projectId = (p.project_id as string | null) ?? null;
  if (!projectId) {
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
          revisions_included: PROPOSAL_REVISIONS_INCLUDED,
          revisions_used: 0,
        })
        .select('id')
        .single();
      if (proj) {
        projectId = proj.id as string;
        await supabase.from('proposals').update({ project_id: projectId }).eq('id', proposalId);
      }
    } catch (err) {
      console.error('provision: project create failed', err);
    }
  }

  // 3. The demos forged for them land in the portal as files (deduped by URL).
  const links = cleanDemoLinks(p.demo_links);
  if (links.length) {
    try {
      const { data: existing } = await supabase.from('client_files').select('url').eq('client_email', email);
      const have = new Set((existing ?? []).map((f) => f.url as string));
      const fresh = links
        .filter((d) => !have.has(d.url))
        .map((d) => ({ client_email: email, label: d.label || 'Built for you', url: d.url, kind: 'site' }));
      if (fresh.length) await supabase.from('client_files').insert(fresh);
    } catch (err) {
      console.error('provision: demo files insert failed', err);
    }
  }

  // 4. The ownership card in the unified layer, idempotent on order_session_id.
  try {
    await supabase.from('client_products').upsert(
      {
        client_email: email,
        kind: 'agency-build',
        label: `${(p.client_company as string) || (p.client_name as string) || 'Agency'} build`,
        status: 'building',
        home_url: '/portal',
        detail: serviceNames.length ? serviceNames.join(' + ') : null,
        order_session_id: `proposal-${proposalId}`,
        project_id: projectId,
        amount_cents: Math.round(Number(p.one_time_total) || 0) * 100,
      },
      { onConflict: 'order_session_id', ignoreDuplicates: true }
    );
  } catch (err) {
    console.error('provision: product card failed', err);
  }
}
