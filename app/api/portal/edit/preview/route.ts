import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The draft of a client's own edit, for them to SEE before it ships. Returned as
 * JSON so the portal renders it in a sandboxed iframe (srcDoc, no scripts): a
 * picture of the change, safe to show. Scoped hard to the signed-in client's own
 * project, so no one can read another client's draft.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: proj } = await sb
    .from('projects')
    .select('id, site_html_draft, edit_status')
    .ilike('client_email', session.email)
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!proj?.site_html_draft) return NextResponse.json({ error: 'No draft to preview yet.' }, { status: 404 });
  return NextResponse.json({ html: proj.site_html_draft, status: proj.edit_status });
}
