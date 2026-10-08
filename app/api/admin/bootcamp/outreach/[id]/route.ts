import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { markOutreach, sendOutreachNow } from '@/lib/bootcamp/outreach';

export const runtime = 'nodejs';

const ACTIONS = ['send', 'replied', 'hosting', 'skip', 'requeue'] as const;
type Action = (typeof ACTIONS)[number];

const STATUS_FOR: Record<Exclude<Action, 'send'>, 'replied' | 'hosting' | 'skipped' | 'queued'> = {
  replied: 'replied',
  hosting: 'hosting',
  skip: 'skipped',
  requeue: 'queued',
};

/**
 * One row, one action. Send now shares the cron's send function, so a hand
 * send looks exactly like a morning send in the log and in the inbox.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action as Action | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of ${ACTIONS.join(', ')}.` }, { status: 400 });
  }

  try {
    if (action === 'send') {
      const result = await sendOutreachNow(sb, id);
      if (!result.ok) return NextResponse.json({ error: result.error, item: result.item ?? null }, { status: 400 });
      return NextResponse.json({ ok: true, item: result.item });
    }
    const row = await markOutreach(sb, id, STATUS_FOR[action]);
    if (!row) return NextResponse.json({ error: 'No outreach row with that id.' }, { status: 404 });
    return NextResponse.json({ ok: true, row });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'That action failed.' }, { status: 500 });
  }
}
