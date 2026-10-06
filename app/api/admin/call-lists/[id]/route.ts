import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { rowPatchSchema } from '@/lib/call-lists';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/** Mark how the call went, who made it, or add notes. */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const parsed = await parseBody(req, rowPatchSchema);
  if ('error' in parsed) return parsed.error;

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { ...parsed.data, updated_at: now };
  if (parsed.data.outcome) patch.called_at = parsed.data.outcome === 'new' ? null : now;

  const { data, error } = await guard.supabase.from('call_list_rows').update(patch).eq('id', id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Row not found' }, { status: error ? 500 : 404 });
  return NextResponse.json({ row: data });
}
