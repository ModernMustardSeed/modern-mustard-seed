import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

type ProposalBody = {
  client_name?: string;
  client_company?: string;
  client_email?: string;
  site_url?: string;
  situation?: string;
  notes?: string;
  path_id?: string;
  status?: string;
  lines?: unknown[];
  prose?: Record<string, unknown>;
  one_time_total?: number;
  monthly_total?: number;
};

const STATUSES = ['draft', 'sent', 'accepted', 'declined'];

/** List saved proposals (compact, for the sidebar list). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data, error } = await supabase
    .from('proposals')
    .select(
      'id, client_name, client_company, client_email, site_url, status, one_time_total, monthly_total, updated_at, signed_at, deposit_status, share_token'
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('proposals list error', error);
    return NextResponse.json({ error: 'Could not load proposals' }, { status: 500 });
  }
  return NextResponse.json({ proposals: data ?? [] });
}

/** Create a new proposal. Returns the new id. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: ProposalBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const status = body.status && STATUSES.includes(body.status) ? body.status : 'draft';

  // Link to a pipeline lead by email, if one exists. Connects the proposal to
  // the lead so a paid deposit can win it and the timeline lines up.
  let leadId: string | null = null;
  const emailKey = body.client_email?.trim().toLowerCase();
  if (emailKey) {
    const { data: lead } = await supabase.from('leads').select('id').ilike('email', emailKey).maybeSingle();
    if (lead) leadId = lead.id as string;
  }

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      client_name: body.client_name?.trim() || null,
      client_company: body.client_company?.trim() || null,
      client_email: body.client_email?.trim() || null,
      lead_id: leadId,
      site_url: body.site_url?.trim() || null,
      situation: body.situation ?? null,
      notes: body.notes ?? null,
      path_id: body.path_id ?? null,
      status,
      lines: body.lines ?? [],
      prose: body.prose ?? {},
      one_time_total: Math.round(body.one_time_total ?? 0),
      monthly_total: Math.round(body.monthly_total ?? 0),
    })
    .select('id')
    .single();

  if (error) {
    console.error('proposal create error', error);
    return NextResponse.json({ error: 'Could not save proposal' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
