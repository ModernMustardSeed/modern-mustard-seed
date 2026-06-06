import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const KINDS = ['link', 'site', 'repo', 'doc', 'design', 'download', 'invoice'];

/** List a client's files/links (the deliverables they see in their portal). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ files: [] });

  try {
    const { data } = await supabase
      .from('client_files')
      .select('id, label, url, kind, created_at')
      .ilike('client_email', email)
      .order('created_at', { ascending: false });
    return NextResponse.json({ files: data ?? [] });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

/** Add a file/link to a client's launch deliverables. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { client_email?: string; label?: string; url?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const client_email = String(body.client_email ?? '').trim().toLowerCase();
  const label = String(body.label ?? '').trim();
  let url = String(body.url ?? '').trim();
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : 'link';
  if (!client_email || !label || !url) {
    return NextResponse.json({ error: 'Client, label, and URL are required.' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const { data, error } = await supabase
    .from('client_files')
    .insert({ client_email, label, url, kind })
    .select('id')
    .single();
  if (error) {
    console.error('client_files insert error', error);
    return NextResponse.json({ error: 'Could not add.' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
