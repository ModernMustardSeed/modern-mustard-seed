import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { chatKeyConfigured } from '@/lib/command-center/chats';
import { syncChats } from '@/lib/command-center/chat-store';
import { ran } from '@/lib/cc-ran';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * WRITE DOWN WHAT THE WEBSITE TALKED ABOUT, hourly.
 *
 * The client's own page refreshes its own conversations when somebody opens the
 * room, which covers the client who is looking. This covers the one who is not:
 * a chat that happened at 9pm on a Saturday is on file by 9:28, whether or not
 * anybody signs in, which is what makes the record complete enough to count and
 * to alert on.
 *
 * Seven days, not thirty. The window only has to be wider than the gap between
 * runs plus a generous margin for a provider that backfills; re-reading a month
 * every hour would spend the provider's rate limit to rewrite rows that have not
 * changed. The room's first-open path still asks for thirty.
 *
 * Every project is independent. One client's assistant being unreachable must
 * not stop the next client's conversations being written, which is why the loop
 * catches per project rather than around the whole thing.
 */
export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'no database' }, { status: 503 });

  // No provider key is a configuration state, not a failure. Saying so plainly
  // beats a run that reports success having read nothing.
  if (!chatKeyConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'no chat provider key', projects: 0 });
  }

  const results: Array<{ project: string; read: boolean; seen: number; written: number }> = [];

  for (const project of Object.values(CLIENT_PROJECTS)) {
    if (!project.assistantId) continue;
    try {
      const got = await syncChats(sb, {
        clientEmail: project.clientEmail,
        assistantId: project.assistantId,
        days: 7,
      });
      results.push({ project: project.key, ...got });
    } catch {
      results.push({ project: project.key, read: false, seen: 0, written: 0 });
    }
  }

  // Stamp that this actually ran. The watchdog infers nothing from side
  // effects: a sync with no new conversations touches no rows, and a cron that
  // is judged by its output alarms every quiet night.
  await ran(sb, 'chat-sync');

  return NextResponse.json({ ok: true, projects: results.length, results });
}
