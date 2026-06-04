import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const STATUSES = ['draft', 'sent', 'accepted', 'declined'];

/** Load one full proposal for editing. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data, error } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('proposal get error', error);
    return NextResponse.json({ error: 'Could not load proposal' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ proposal: data });
}

/** Update a proposal. Accepts a status change, full content, or both. */
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
  const passthrough = [
    'client_name',
    'client_company',
    'client_email',
    'site_url',
    'situation',
    'notes',
    'path_id',
    'lines',
    'prose',
    'one_time_total',
    'monthly_total',
  ];
  for (const k of passthrough) if (k in body) update[k] = body[k];
  if (typeof update.one_time_total === 'number') update.one_time_total = Math.round(update.one_time_total);
  if (typeof update.monthly_total === 'number') update.monthly_total = Math.round(update.monthly_total);
  if (typeof body.status === 'string' && STATUSES.includes(body.status)) update.status = body.status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase.from('proposals').update(update).eq('id', id);
  if (error) {
    console.error('proposal update error', error);
    return NextResponse.json({ error: 'Could not update proposal' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { error } = await supabase.from('proposals').delete().eq('id', id);
  if (error) {
    console.error('proposal delete error', error);
    return NextResponse.json({ error: 'Could not delete proposal' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
