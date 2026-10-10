import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { isRowId, parsePatch } from '@/lib/social-calendar';
import { SOCIAL_COLUMNS, socialCaller } from '@/lib/social-calendar-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One post in full, caption included. The desk loads captions on demand so
 * the page stays light.
 *
 *   GET /api/admin/social/office-hours-01-instagram
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await socialCaller(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { id } = await ctx.params;
  if (!isRowId(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const { data, error } = await sb.from('social_posts').select(SOCIAL_COLUMNS).eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'No post with that id.' }, { status: 404 });
  return NextResponse.json({ row: data });
}

/**
 * Mark one post. Only status and ref move: the desk, a session or a routine
 * calls this the moment a post goes out, with the live link as ref.
 *
 *   PATCH /api/admin/social/office-hours-01-instagram
 *   { "status": "posted", "ref": "https://www.instagram.com/p/..." }
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await socialCaller(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { id } = await ctx.params;
  if (!isRowId(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const body = await req.json().catch(() => undefined);
  const parsed = parsePatch(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await sb
    .from('social_posts')
    .update({ ...parsed.patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SOCIAL_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'No post with that id.' }, { status: 404 });
  return NextResponse.json({ ok: true, row: data });
}
