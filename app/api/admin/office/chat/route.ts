import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/outbound-server';
import { requireOfficeOwner } from '@/lib/office/server';
import { enqueue, CHIEF_KEY } from '@/lib/office/engine';

export const runtime = 'nodejs';

const schema = z.object({
  body: z.string().trim().min(1, 'Say something to Sower').max(8000),
  missionId: z.string().uuid().optional(),
});

/**
 * Say something to Sower. The message is written and a chief turn is queued;
 * the reply arrives through the state poll when the worker has answered. A
 * message sent while the worker is asleep waits in the queue and is answered
 * the moment it wakes, which is what the dock tells Sarah.
 */
export async function POST(req: Request) {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const { data: msg, error } = await guard.supabase
    .from('office_messages')
    .insert({ role: 'sarah', body: parsed.data.body, mission_id: parsed.data.missionId ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await enqueue(guard.supabase, 'chief', msg.id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach Sower.' }, { status: 500 });
  }
  return NextResponse.json({ message: msg });
}

/** Start a fresh conversation with Sower. Missions, approvals and the shelf stay. */
export async function DELETE() {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  await guard.supabase.from('app_state').upsert({ key: CHIEF_KEY, value: { session_id: null, reset_at: new Date().toISOString() }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  await guard.supabase.from('office_messages').insert({ role: 'system', body: 'New conversation. Sower starts fresh from here and still sees every mission on the floor.' });
  return NextResponse.json({ ok: true });
}
