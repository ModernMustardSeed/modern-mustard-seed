import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const STATUSES = ['discovery', 'building', 'review', 'launched', 'paused'];

/** List all projects for the board. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('projects list error', error);
    return NextResponse.json({ error: 'Could not load projects' }, { status: 500 });
  }
  return NextResponse.json({ projects: data ?? [] });
}

/** Create a project. The client portal reads this same table by client_email. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const client_email = String(body.client_email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim();
  if (!client_email || !name) {
    return NextResponse.json({ error: 'Client email and a project name are required.' }, { status: 400 });
  }
  const status = typeof body.status === 'string' && STATUSES.includes(body.status) ? body.status : 'discovery';

  // Create or update the client record too, so starting a project also creates
  // the client (name, company saved against their email).
  const clientName = String(body.client_name ?? '').trim();
  const clientCompany = String(body.client_company ?? '').trim();
  if (clientName || clientCompany) {
    try {
      const patch: Record<string, unknown> = { email: client_email };
      if (clientName) patch.name = clientName;
      if (clientCompany) patch.company = clientCompany;
      await supabase.from('clients').upsert(patch, { onConflict: 'email' });
    } catch (err) {
      console.error('client upsert (non-fatal)', err);
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_email,
      name,
      status,
      summary: (body.summary as string) ?? null,
      progress: Math.max(0, Math.min(100, Math.round(Number(body.progress) || 0))),
      milestones: Array.isArray(body.milestones) ? body.milestones : [],
      launch_target: (body.launch_target as string) || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('project create error', error);
    return NextResponse.json({ error: 'Could not create project' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
