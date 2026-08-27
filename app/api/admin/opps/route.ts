import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { OPP_GROUPS, OPP_STATUSES, oppCreateSchema } from '@/lib/opps';

export const runtime = 'nodejs';

/** The Opps Desk list. Filters: status, group, q (company or title). */
export async function GET(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const group = url.searchParams.get('group');
  const q = (url.searchParams.get('q') || '').trim();

  let query = guard.supabase
    .from('opps')
    .select('*')
    .order('priority', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (status && (OPP_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);
  if (group && (OPP_GROUPS as readonly string[]).includes(group)) query = query.eq('group', group);
  if (q) query = query.or(`company.ilike.%${q.replace(/[%,]/g, '')}%,title.ilike.%${q.replace(/[%,]/g, '')}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message, opps: [] }, { status: 500 });

  const counts: Record<string, number> = {};
  const { data: all } = await guard.supabase.from('opps').select('status');
  for (const row of all ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;

  return NextResponse.json({ opps: data ?? [], counts });
}

/** Add one opportunity by hand. */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const parsed = await parseBody(req, oppCreateSchema);
  if ('error' in parsed) return parsed.error;

  const { data, error } = await guard.supabase
    .from('opps')
    .insert({ ...parsed.data, last_action_at: new Date().toISOString() })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That listing URL is already on the desk.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ opp: data });
}
