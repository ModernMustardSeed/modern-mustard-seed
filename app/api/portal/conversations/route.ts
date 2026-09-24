import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { accountForSession } from '@/lib/cc-access';
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
 *
 * GATED LIKE THE REST OF THE DESK, WHICH IT WAS NOT.
 *
 * This used `visibleProject`, and every other room uses `accountForSession`.
 * The two do not agree, and the disagreement was invisible because it fails
 * silently to an empty list rather than an error:
 *
 *   `projectForEmail` behind it matches ONLY a project's primary clientEmail.
 *   Carmen and Zayne sign in with their own addresses, which `accountForEmail`
 *   resolves and that one does not, so they would have seen sixteen working
 *   rooms and a permanently empty Conversations room with nothing to explain it.
 *
 *   It has no preview, so while the Command Center is still switched off this
 *   room was blank in exactly the demo where everything else works.
 *
 * And the scope has to be the ACCOUNT's client email, not the session's.
 * Conversations are stored under the business, and Carmen's own address is not
 * the business, so scoping a read by whoever happens to be signed in finds
 * nothing for two of the three people who will use this.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const account = sb ? await accountForSession(sb, session.email, true) : null;
  if (!sb || !account?.project.assistantId) return NextResponse.json({ conversations: [], days: 30, read: true });

  const { clientEmail } = account;
  const assistantId = account.project.assistantId;
  const stored = await storedConversations(sb, clientEmail, 60);

  // Nothing on file yet: this is the first open, or the table was just added.
  // Sync inline so the room is not empty on the one view where empty is most
  // likely to be read as "the agent is not working".
  if (!stored.length) {
    const got = await syncChats(sb, { clientEmail, assistantId, days: 30 });
    const fresh = got.read ? await storedConversations(sb, clientEmail, 60) : [];
    return NextResponse.json({
      conversations: fresh,
      days: 30,
      read: got.read || !chatKeyConfigured(),
    });
  }

  // There is history to show, so show it now and catch up behind the response.
  void syncChats(sb, { clientEmail, assistantId, days: 7 }).catch(() => {});

  return NextResponse.json({ conversations: stored, days: 30, read: true });
}
