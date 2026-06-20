import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { VALID_STATUSES } from '@/lib/prospects';

export const runtime = 'nodejs';

/** Update a prospect's status and/or notes. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { status?: string; notes?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.has(body.status as never)) return NextResponse.json({ error: 'Bad status' }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 2000) || null;
  if (typeof body.phone === 'string') patch.phone = body.phone.slice(0, 40) || null;

  try {
    const { error } = await supabase.from('rep_prospects').update(patch).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not update.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Remove a prospect. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  try {
    const { error } = await supabase.from('rep_prospects').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not delete.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
