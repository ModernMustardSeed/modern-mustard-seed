import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { assembleBuildSpec } from '@/lib/build-spec';

export const runtime = 'nodejs';

const TYPES = ['website', 'app', 'tool', 'software', 'brand_bible', 'other'];

/** List build requests (newest first). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  let q = supabase.from('build_requests').select('*').order('created_at', { ascending: false }).limit(100);
  if (email) q = supabase.from('build_requests').select('*').ilike('client_email', email).order('created_at', { ascending: false }).limit(100);
  const { data } = await q;
  return NextResponse.json({ requests: data ?? [] });
}

/** Queue a build: assemble the full spec from everything on file, then insert. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { email?: string; deliverable_type?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const deliverableType = TYPES.includes(String(body.deliverable_type)) ? String(body.deliverable_type) : 'website';
  const title = String(body.title ?? '').trim() || `${deliverableType} build`;
  if (!email) return NextResponse.json({ error: 'A client email is required.' }, { status: 400 });

  const { spec, projectId } = await assembleBuildSpec({ email, deliverableType, title });

  const { data, error } = await supabase
    .from('build_requests')
    .insert({ client_email: email, project_id: projectId, deliverable_type: deliverableType, title, spec, status: 'requested' })
    .select('id, spec')
    .single();
  if (error) {
    console.error('build_request insert error', error);
    return NextResponse.json({ error: 'Could not queue the build.' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, spec: data.spec });
}
