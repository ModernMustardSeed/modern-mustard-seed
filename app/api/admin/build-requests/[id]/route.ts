import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Update a build request: mark delivered (with result), failed, or canceled,
 *  re-queue, or edit the spec. Delivering also posts the live link to the
 *  client's portal so the loop closes. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { status?: string; spec?: string; liveUrl?: string; repoUrl?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: reqRow } = await supabase.from('build_requests').select('*').eq('id', id).maybeSingle();
  if (!reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.spec === 'string') update.spec = body.spec;

  if (body.status === 'requested') {
    update.status = 'requested';
    update.error = null;
  } else if (body.status === 'canceled') {
    update.status = 'canceled';
  } else if (body.status === 'delivered') {
    update.status = 'delivered';
    update.delivered_at = new Date().toISOString();
    update.result = {
      live_url: (body.liveUrl || '').trim() || null,
      repo_url: (body.repoUrl || '').trim() || null,
      notes: (body.notes || '').trim() || null,
    };
    // Close the loop: post the live link into the client's portal.
    const live = (body.liveUrl || '').trim();
    if (live) {
      try {
        const url = /^https?:\/\//i.test(live) ? live : `https://${live}`;
        await supabase.from('client_files').insert({
          client_email: reqRow.client_email,
          label: reqRow.title || 'Delivered build',
          url,
          kind: reqRow.deliverable_type === 'brand_bible' ? 'doc' : 'site',
        });
      } catch (err) {
        console.error('deliver -> client_files insert failed', err);
      }
    }
  }

  const { error } = await supabase.from('build_requests').update(update).eq('id', id);
  if (error) {
    console.error('build_request update error', error);
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  await supabase.from('build_requests').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
