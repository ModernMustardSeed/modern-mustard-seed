import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of ['name', 'role', 'company', 'quote', 'outcome', 'status']) {
    if (k in b) update[k] = (b[k] as string)?.toString().trim() || null;
  }
  if ('rating' in b) update.rating = Math.max(1, Math.min(5, Math.round(Number(b.rating) || 5)));
  if ('featured' in b) update.featured = !!b.featured;
  if ('sort' in b) update.sort = Math.round(Number(b.sort) || 0);
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { error } = await supabase.from('testimonials').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
