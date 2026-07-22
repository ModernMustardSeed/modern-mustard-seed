/**
 * Load a project's direction board with everything the renderers need
 * (board payload, business name, logo, photos). One loader for the portal
 * routes (by client email) and the admin PDF (by project id), so the JSON
 * card, the client PDF, and Sarah's PDF can never disagree about the data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeMoodboard, type Moodboard, type MoodboardStatus } from './moodboard-shared';

type Asset = { url?: string; name?: string; kind?: string };

export type BoardData = {
  projectId: string;
  board: Moodboard;
  status: MoodboardStatus;
  note: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  businessName: string;
  logoUrl: string | null;
  photos: string[];
};

const PROJECT_COLS = 'id, name, client_email, moodboard, moodboard_status, moodboard_note, moodboard_sent_at, moodboard_approved_at';

type ProjectRow = {
  id: string;
  name: string | null;
  moodboard: unknown;
  moodboard_status: string | null;
  moodboard_note: string | null;
  moodboard_sent_at: string | null;
  moodboard_approved_at: string | null;
};

async function hydrate(sb: SupabaseClient, project: ProjectRow | null): Promise<BoardData | null> {
  if (!project?.moodboard) return null;
  const board = sanitizeMoodboard(project.moodboard);
  if (!board) return null;

  let businessName = String(project.name ?? 'Your business');
  let logoUrl: string | null = null;
  let photos: string[] = [];
  try {
    const { data: order } = await sb
      .from('demo_orders')
      .select('business_name, intake')
      .eq('project_id', project.id)
      .maybeSingle();
    if (order?.business_name) businessName = String(order.business_name);
    const assets = (order?.intake as { assets?: Asset[] } | null)?.assets;
    if (Array.isArray(assets)) {
      logoUrl = assets.find((a) => a?.kind === 'logo' && typeof a.url === 'string')?.url ?? null;
      photos = assets
        .filter((a) => (a?.kind === 'photo' || a?.kind === 'product') && typeof a.url === 'string')
        .map((a) => a.url as string)
        .slice(0, 4);
    }
  } catch {
    /* order lookup is garnish, the board still renders */
  }

  return {
    projectId: project.id,
    board,
    status: (project.moodboard_status ?? 'none') as MoodboardStatus,
    note: project.moodboard_note,
    sentAt: project.moodboard_sent_at,
    approvedAt: project.moodboard_approved_at,
    businessName,
    logoUrl,
    photos,
  };
}

/** The signed-in client's board: only ones Sarah has actually sent. */
export async function loadBoardForEmail(sb: SupabaseClient, email: string): Promise<BoardData | null> {
  const { data: project } = await sb
    .from('projects')
    .select(PROJECT_COLS)
    .eq('client_email', email)
    .in('moodboard_status', ['sent', 'changes', 'approved'])
    .order('moodboard_sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return hydrate(sb, project as ProjectRow | null);
}

/** Sarah's view of any project's board, drafts included. */
export async function loadBoardForProject(sb: SupabaseClient, projectId: string): Promise<BoardData | null> {
  const { data: project } = await sb
    .from('projects')
    .select(PROJECT_COLS)
    .eq('id', projectId)
    .maybeSingle();
  return hydrate(sb, project as ProjectRow | null);
}
