import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const STATUSES = ['discovery', 'building', 'review', 'launched', 'paused'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === 'string') update.name = body.name.trim();
  if (typeof body.client_email === 'string') update.client_email = body.client_email.trim().toLowerCase();
  if (typeof body.status === 'string' && STATUSES.includes(body.status)) update.status = body.status;
  if ('summary' in body) update.summary = (body.summary as string) ?? null;
  if (typeof body.progress === 'number') update.progress = Math.max(0, Math.min(100, Math.round(body.progress)));
  if (Array.isArray(body.milestones)) update.milestones = body.milestones;
  if ('launch_target' in body) update.launch_target = (body.launch_target as string) || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase.from('projects').update(update).eq('id', id);
  if (error) {
    console.error('project update error', error);
    return NextResponse.json({ error: 'Could not update project' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) {
    console.error('project delete error', error);
    return NextResponse.json({ error: 'Could not delete project' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
