import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { chatKeyConfigured } from '@/lib/command-center/chats';
import { storedConversations, syncChats } from '@/lib/command-center/chat-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * WHAT PEOPLE ASKED THE WEBSITE. Scoped by the signed-in email through the
 * project's assistant id; the browser never names an assistant.
 *
 * READS THE RECORD, NOT THE PROVIDER. This used to call Vapi on every page
 * view, which made the room as fast and as available as a third party's API and
 * meant an outage rendered as a quiet month. Now it reads `client_chats` and
 * refreshes in the background. The cron at `/api/cron/chat-sync` is what keeps
 * the table current; the refresh here is a courtesy for somebody who just
 * finished a chat and wants to see it, and it is deliberately not awaited when
 * there is already something to show.
 *
 * `read` still means "the provider could be reached". It is now about freshness
 * rather than existence, so it is false only when there is nothing stored AND
 * nothing could be fetched, which is the one case where an empty list would
 * genuinely be a lie.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project?.assistantId) return NextResponse.json({ conversations: [], days: 30, read: true });

  const stored = await storedConversations(sb, session.email, 60);

  // Nothing on file yet: this is the first open, or the table was just added.
  // Sync inline so the room is not empty on the one view where empty is most
  // likely to be read as "the agent is not working".
  if (!stored.length) {
    const got = await syncChats(sb, { clientEmail: session.email, assistantId: project.assistantId, days: 30 });
    const fresh = got.read ? await storedConversations(sb, session.email, 60) : [];
    return NextResponse.json({
      conversations: fresh,
      days: 30,
      read: got.read || !chatKeyConfigured(),
    });
  }

  // There is history to show, so show it now and catch up behind the response.
  void syncChats(sb, { clientEmail: session.email, assistantId: project.assistantId, days: 7 }).catch(() => {});

  return NextResponse.json({ conversations: stored, days: 30, read: true });
}
