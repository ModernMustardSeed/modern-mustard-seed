import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { callPatchSchema } from '@/lib/call-prep';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/** Edit the call, its brief, the team's notes, or mark how it went. */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const parsed = await parseBody(req, callPatchSchema);
  if ('error' in parsed) return parsed.error;

  const { data, error } = await guard.supabase
    .from('call_prep')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Call not found' }, { status: error ? 500 : 404 });
  return NextResponse.json({ call: data });
}

/** Take a call off the desk entirely (a duplicate or a mistake). */
export async function DELETE(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const { error } = await guard.supabase.from('call_prep').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
