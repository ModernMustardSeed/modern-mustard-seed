import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { isPlatform, isStatus, mtDate } from '@/lib/social-calendar';
import { SOCIAL_COLUMNS, socialCaller } from '@/lib/social-calendar-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What goes out, for a routine or a session to read before it posts.
 *
 *   GET /api/admin/social                     today in Mountain Time
 *   GET /api/admin/social?from=2026-10-11&to=2026-10-17&platform=x&status=planned
 */
export async function GET(req: Request) {
  if (!(await socialCaller(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const q = new URL(req.url).searchParams;
  const today = mtDate();
  const from = q.get('from') ?? today;
  const to = q.get('to') ?? from;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return NextResponse.json({ error: 'from and to are YYYY-MM-DD.' }, { status: 400 });
  const platform = q.get('platform');
  const status = q.get('status');
  if (platform && !isPlatform(platform)) return NextResponse.json({ error: 'Unknown platform.' }, { status: 400 });
  if (status && !isStatus(status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });

  let query = sb
    .from('social_posts')
    .select(SOCIAL_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('time_mt')
    .limit(1000);
  if (platform) query = query.eq('platform', platform);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ today, from, to, rows: data ?? [] });
}
