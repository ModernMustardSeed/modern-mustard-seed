import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { oppPatchSchema } from '@/lib/opps';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/** One opportunity plus its thread (sent emails and notes). */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: opp, error } = await guard.supabase.from('opps').select('*').eq('id', id).single();
  if (error || !opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const { data: messages } = await guard.supabase
    .from('messages')
    .select('id, direction, channel, from_addr, to_addr, subject, body, snippet, occurred_at')
    .eq('opp_id', id)
    .order('occurred_at', { ascending: false })
    .limit(200);

  return NextResponse.json({ opp, messages: messages ?? [] });
}

/** Status, notes, contact, next step. Status changes stamp last_action_at; applied stamps applied_at. */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const parsed = await parseBody(req, oppPatchSchema);
  if ('error' in parsed) return parsed.error;

  const patch: Record<string, unknown> = { ...parsed.data };
  const now = new Date().toISOString();
  if (parsed.data.status) {
    patch.last_action_at = now;
    if (parsed.data.status === 'applied') {
      const { data: cur } = await guard.supabase.from('opps').select('applied_at').eq('id', id).single();
      if (!cur?.applied_at) patch.applied_at = now;
    }
  }

  const { data, error } = await guard.supabase.from('opps').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  return NextResponse.json({ opp: data });
}

/** Add a note to the thread. Body: { note }. */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  let note = '';
  try {
    const body = (await req.json()) as { note?: string };
    note = typeof body.note === 'string' ? body.note.trim().slice(0, 5000) : '';
  } catch {
    /* fallthrough */
  }
  if (!note) return NextResponse.json({ error: 'Write the note first.' }, { status: 400 });

  const now = new Date().toISOString();
  const { data: message, error } = await guard.supabase
    .from('messages')
    .insert({
      opp_id: id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'sarah@modernmustardseed.com',
      subject: 'Note',
      snippet: note.replace(/\s+/g, ' ').slice(0, 500),
      body: note,
      read: true,
      occurred_at: now,
    })
    .select('id, direction, channel, from_addr, to_addr, subject, body, snippet, occurred_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await guard.supabase.from('opps').update({ last_action_at: now }).eq('id', id);
  return NextResponse.json({ ok: true, message });
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const { error } = await guard.supabase.from('opps').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
