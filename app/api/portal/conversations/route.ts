import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { listConversations } from '@/lib/command-center/chats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * WHAT PEOPLE ASKED THE WEBSITE. Scoped by the signed-in email through the
 * project's assistant id; the browser never names an assistant. The stitching
 * lives in lib/command-center/chats.ts, shared with the weekly report.
 *
 * `read` is false when the provider could not be reached, so the room can say
 * so instead of showing an empty list that looks like a quiet month.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!project?.assistantId) return NextResponse.json({ conversations: [], days: 30, read: true });

  const conversations = await listConversations(project.assistantId, 30);
  return NextResponse.json({ conversations: (conversations ?? []).slice(0, 60), days: 30, read: conversations !== null });
}
