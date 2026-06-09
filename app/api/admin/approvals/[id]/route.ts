import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { executeApproval, type ApprovalRow } from '@/lib/approvals';

export const runtime = 'nodejs';

/** Save edits, approve (execute), or reject a draft. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { subject?: string; bodyText?: string; toEmail?: string; decision?: 'approve' | 'reject' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Apply any edits first.
  const edits: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.subject === 'string') edits.subject = body.subject;
  if (typeof body.bodyText === 'string') edits.body = body.bodyText;
  if (typeof body.toEmail === 'string') edits.to_email = body.toEmail.trim();
  if (Object.keys(edits).length > 1) {
    await supabase.from('approvals').update(edits).eq('id', id);
  }

  if (!body.decision) return NextResponse.json({ ok: true });

  const { data: row } = await supabase.from('approvals').select('*').eq('id', id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.decision === 'reject') {
    await supabase.from('approvals').update({ status: 'rejected', decided_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // approve -> execute
  const err = await executeApproval(row as ApprovalRow);
  if (err) return NextResponse.json({ error: err }, { status: 500 });
  await supabase.from('approvals').update({ status: 'sent', decided_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  await supabase.from('approvals').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
