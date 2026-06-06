import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { createClientRequest } from '@/lib/client-requests';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Client proposes a new launch date for their project. Routed to Sarah to approve. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { projectId?: string; date?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const date = (body.date || '').trim();
  const reason = (body.reason || '').trim();
  const projectId = (body.projectId || '').trim();
  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Pick a valid date.' }, { status: 400 });

  // The project must belong to this client.
  let projectName = 'your project';
  try {
    const { data: proj } = await supabase
      .from('projects')
      .select('id, name, client_email')
      .eq('id', projectId)
      .maybeSingle();
    if (!proj || String(proj.client_email).toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }
    projectName = (proj.name as string) || projectName;
  } catch {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const human = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const text = `Launch date request for ${projectName}: move the launch to ${human}.${reason ? ` Reason: ${reason}` : ''}`;

  const result = await createClientRequest({
    email: session.email,
    body: text,
    source: 'launch_date',
    projectId,
    proposedDate: date,
  });
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Could not send.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
